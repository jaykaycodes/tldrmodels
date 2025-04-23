import { env } from 'cloudflare:workers'
import { z } from 'zod'

import { type DiscussionInsert } from '#infra/models'

export const ParamsSchema = z.object({
	type: z.literal('reddit'),
	subreddit: z.string(),
	sort: z.enum(['new', 'top']),
})

export async function fetchDiscussions(subreddit: string, sort: 'new' | 'top'): Promise<DiscussionInsert[]> {
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

			after = results.nextAfter
			await new Promise((resolve) => setTimeout(resolve, 5_000))
		} catch (error) {
			console.error(error)
			break
		}
	}

	return discussions
}

const BASE_URL = 'https://oauth.reddit.com'

const ListingSchema = z.object({
	data: z.object({
		after: z.string().nullable(),
		children: z.array(
			z.object({
				kind: z.string(),
				data: z.object({
					id: z.string(),
					title: z.string(),
					selftext: z.string().nullable(),
					author: z.string(),
					score: z.number(),
					num_comments: z.number(),
					created_utc: z.number(),
				}),
			}),
		),
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

	console.log(`Fetching ${url} with access token ${accessToken}`)
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
	const discussions: DiscussionInsert[] = data.children.map((child) => ({
		source: 'reddit',
		subsource: subreddit,
		title: child.data.title,
		author: child.data.author,
		score: child.data.score,
		timestamp: new Date(child.data.created_utc * 1000),
		text: child.data.selftext ?? '',
		sourceId: child.data.id,
		numComments: child.data.num_comments,
		raw: child.data,
	}))

	return { nextAfter: data.after, discussions }
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
