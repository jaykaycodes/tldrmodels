import { env } from 'cloudflare:workers'
import { and, desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import db from '#/lib/db'
import { Discussion, type DiscussionComment, type DiscussionInsert } from '#/lib/models'

const BASE_URL = 'https://oauth.reddit.com'

export const DiscussionsParamsSchema = z.object({
	source: z.literal('reddit'),
	subreddit: z.string(),
	sort: z.enum(['new', 'top']),
})
type DiscussionsParams = z.infer<typeof DiscussionsParamsSchema>

export const CommentsParamsSchema = z.object({
	source: z.literal('reddit'),
	discussionId: z.number(),
})
type CommentsParams = z.infer<typeof CommentsParamsSchema>

export async function fetchDiscussions({ subreddit, sort }: DiscussionsParams): Promise<DiscussionInsert[]> {
	let cutoffDate: Date | null = null
	if (sort === 'new') {
		const [disc] = await db
			.select()
			.from(Discussion)
			.where(and(eq(Discussion.source, 'reddit'), eq(Discussion.subsource, subreddit)))
			.orderBy(desc(Discussion.timestamp))
			.limit(1)

		cutoffDate = disc?.timestamp ?? null
	}

	const accessToken = await getAccessToken()
	console.log(`Crawling ${subreddit} by ${sort}`)

	let after: string | null = null
	const discussions: DiscussionInsert[] = []

	for (let i = 0; i < 10; i++) {
		console.log('Scraping page', i)

		try {
			const results = await fetchPage(subreddit, sort, accessToken, after)

			if (results?.discussions) discussions.push(...results.discussions)

			if (!results?.nextAfter) {
				console.log(`No more posts to scrape for ${subreddit}, exiting...`)
				break
			}

			if (cutoffDate && results.discussions.some((d) => d.timestamp < cutoffDate)) {
				console.log(`Reached cutoff date ${cutoffDate}, exiting...`)
				break
			}

			after = results.nextAfter
			await new Promise((resolve) => setTimeout(resolve, 5_000))
		} catch (error) {
			console.error(error)
			break
		}
	}

	return discussions
}

const CommentSchema = z.object({
	kind: z.literal('t1'),
	data: z.object({
		id: z.string(),
		body: z.string(),
		author: z.string(),
		score: z.number(),
		created: z.number(),
		replies: z.unknown(),
	}),
})

const PostSchema = z.object({
	kind: z.literal('t3'),
	data: z.object({
		id: z.string(),
		title: z.string(),
		selftext: z.string().nullable(),
		author: z.string(),
		score: z.number(),
		num_comments: z.number(),
		created_utc: z.number(),
	}),
})

const AccountSchema = z.object({ kind: z.literal('t2') })
const MessageSchema = z.object({ kind: z.literal('t4') })
const SubredditSchema = z.object({ kind: z.literal('t5') })
const AwardSchema = z.object({ kind: z.literal('t6') })
const MoreChildrenSchema = z.object({ kind: z.literal('more') })

const AnyElementSchema = z.discriminatedUnion('kind', [
	CommentSchema,
	PostSchema,
	AccountSchema,
	MessageSchema,
	SubredditSchema,
	AwardSchema,
	MoreChildrenSchema,
])

const ListingSchema = z.object({
	kind: z.literal('Listing'),
	data: z.object({
		after: z.string().nullable(),
		before: z.string().nullable(),
		children: z.array(AnyElementSchema),
	}),
})

/** Crawls a single page of a subreddit */
async function fetchPage(
	_subreddit: string,
	sort: 'new' | 'top',
	accessToken: string,
	after?: string | null,
): Promise<{
	discussions: DiscussionInsert[]
	nextAfter: string | null
} | null> {
	const subreddit = _subreddit.trim().toLowerCase()

	const url = new URL(`${BASE_URL}/r/${subreddit}/${sort}`)

	url.searchParams.set('show', 'all')
	url.searchParams.set('limit', '100')
	if (sort === 'top') url.searchParams.set('t', 'year')
	if (after) url.searchParams.set('after', after)

	console.log(`Fetching ${url}`)
	const res = await fetch(url, {
		headers: {
			'User-Agent': 'tldrmodels/1.0',
			Authorization: `Bearer ${accessToken}`,
		},
	})

	console.log('Response', res.status, res.statusText)
	const json = await res.json()
	const { data } = ListingSchema.parse(json)

	if (!data?.children || data.children.length === 0) {
		console.log('No posts found. Exiting...')
		return null
	}

	console.log(`Fetched ${data.children.length} posts`)
	const discussions: DiscussionInsert[] = []
	for (const child of data.children) {
		if (child.kind === 't3')
			discussions.push({
				source: 'reddit',
				subsource: subreddit,
				title: child.data.title,
				author: child.data.author,
				score: child.data.score,
				timestamp: new Date(child.data.created_utc * 1000),
				text: child.data.selftext ?? '',
				sourceId: child.data.id,
				numComments: child.data.num_comments,
				relevance: 1, // NOTE: since we're scraping specific subreddits, they're all relevant
				raw: child.data,
			})
	}

	return { nextAfter: data.after, discussions }
}

export async function fetchComments(id: string): Promise<DiscussionComment[]> {
	const accessToken = await getAccessToken()

	const url = new URL(`${BASE_URL}/comments/${id}`)

	const res = await fetch(url, {
		headers: {
			'User-Agent': 'tldrmodels/1.0',
			Authorization: `Bearer ${accessToken}`,
		},
	})

	const json = await res.json()
	const [_post, commentsListing] = ListingSchema.array().parse(json)

	if (!commentsListing || !commentsListing.data?.children || commentsListing.data.children.length === 0) {
		console.log('No comments found. Exiting...')
		return []
	}

	return mapComments(commentsListing.data.children)
}

function mapComments(comments: z.infer<typeof AnyElementSchema>[]): DiscussionComment[] {
	const result: DiscussionComment[] = []
	for (const c of comments) {
		if (c.kind !== 't1') continue

		const parsed = ListingSchema.safeParse(c.data.replies)

		result.push({
			id: c.data.id,
			text: c.data.body,
			author: c.data.author,
			score: c.data.score,
			timestamp: new Date(c.data.created * 1000).getTime(),
			comments: mapComments(parsed.data?.data.children ?? []),
		})
	}

	return result
}

async function getAccessToken() {
	const response = await fetch(`${BASE_URL}/api/v1/access_token`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'User-Agent': 'tldrmodels/1.0',
			Authorization: `Basic ${btoa(`${env.REDDIT_CLIENT_ID}:${env.REDDIT_CLIENT_SECRET}`)}`,
		},
		body: new URLSearchParams({
			grant_type: 'client_credentials',
		}),
	})

	if (!response.ok) throw new Error('Failed to authenticate with Reddit')
	const data = (await response.json()) as { access_token: string }
	return data.access_token
}
