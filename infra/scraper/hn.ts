import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import db from '#/lib/db'
import { Discussion, type DiscussionComment, type DiscussionInsert } from '#/lib/models'

export const DiscussionsParamsSchema = z.object({
	source: z.literal('hackernews'),
})
export type DiscussionsParams = z.infer<typeof DiscussionsParamsSchema>

export const CommentsParamsSchema = z.object({
	source: z.literal('hackernews'),
	discussionId: z.number(),
})
export type CommentsParams = z.infer<typeof CommentsParamsSchema>

const HN_API_URL = 'https://hn.algolia.com/api/v1'
const SEARCH_URL = `${HN_API_URL}/search_by_date`
const COMMENTS_URL = `${HN_API_URL}/items`

const SearchResultsSchema = z.object({
	hits: z.array(
		z.object({
			author: z.string(),
			created_at_i: z.number(),
			objectID: z.string(),
			points: z.number().nullish(),
			title: z.string(),
			story_text: z.string().nullish(),
			url: z.string().nullish(),
			num_comments: z.number(),
		}),
	),
})

/** Fetches recent hn discussions, backstopped to either our most recently scraped discussion or 24 hours ago */
export async function fetchDiscussions(): Promise<DiscussionInsert[]> {
	let to = Date.now() / 1000
	let from = to - 24 * 60 * 60

	// fetch the oldest & newest discussions we have
	const [newest] = await db
		.select({
			timestamp: Discussion.timestamp,
		})
		.from(Discussion)
		.where(eq(Discussion.source, 'hackernews'))
		.orderBy(desc(Discussion.timestamp))
		.limit(1)
	if (newest?.timestamp) from = new Date(newest.timestamp).getTime() / 1000

	console.log(`Scraping from ${new Date(from * 1000).toISOString()} to ${new Date(to * 1000).toISOString()}`)

	const params = new URLSearchParams()
	params.set('tags', 'story')
	params.set('numericFilters', `created_at_i>=${from},created_at_i<=${to}`)
	params.set('hitsPerPage', '1000')

	const url = new URL(SEARCH_URL)
	url.search = params.toString()

	const response = await fetch(url)
	const { hits } = SearchResultsSchema.parse(await response.json())

	console.log(`Found ${hits.length} discussions`)

	const discussions: DiscussionInsert[] = hits.map((hit) => ({
		source: 'hackernews',
		sourceId: hit.objectID,
		title: hit.title,
		author: hit.author,
		text: hit.story_text ?? '',
		timestamp: new Date(hit.created_at_i * 1000),
		score: hit.points ?? 0,
		numComments: hit.num_comments,
		raw: hit,
		scrapedAt: new Date(),
	}))

	return discussions
}

const BaseCommentSchema = z.object({
	id: z.number(),
	created_at: z.coerce.date(),
	author: z.string(),
	text: z.string(),
	points: z.number().nullish(),
})
type BaseComment = z.infer<typeof BaseCommentSchema>
type Comment = BaseComment & { children: Comment[] }
const CommentSchema: z.ZodType<Comment> = BaseCommentSchema.extend({
	children: z.lazy(() => CommentSchema.array()),
})

/** Fetches comments for a discussion */
export async function fetchComments(id: string): Promise<DiscussionComment[]> {
	const url = new URL(`${COMMENTS_URL}/${id}`)
	const response = await fetch(url)
	const { children } = CommentSchema.parse(await response.json())

	return children.map(parseComment)
}

function parseComment(comment: Comment): DiscussionComment {
	return {
		author: comment.author,
		id: comment.id.toString(),
		score: comment.points ?? 0,
		text: comment.text,
		timestamp: comment.created_at.getTime(),
		comments: comment.children?.map(parseComment),
	}
}
