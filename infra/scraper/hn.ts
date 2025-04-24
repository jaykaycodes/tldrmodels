import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'

import { Discussion, type DiscussionInsert } from '../models'
import { db } from '../utils'

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
			points: z.number(),
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
		score: hit.points,
		numComments: hit.num_comments,
		raw: hit,
		scrapedAt: new Date(),
	}))

	return discussions

	// if (discussions.length === 0) {
	// 	console.log('No new discussions found. Exiting...')
	// 	return
	// }

	// const res = await db
	// 	.insert(Discussion)
	// 	.values(discussions)
	// 	.onConflictDoUpdate({
	// 		target: [Discussion.source, Discussion.sourceId],
	// 		set: {
	// 			title: sql`excluded.title`,
	// 			text: sql`excluded.story_text`,
	// 			score: sql`excluded.score`,
	// 			numComments: sql`excluded.num_comments`,
	// 			raw: sql`excluded.raw`,
	// 		},
	// 	})
	// 	.returning({ id: Discussion.id })

	// console.log(`Inserted ${res.length} discussions (${discussions.length - res.length} already existed)`)
}

const BaseCommentSchema = z.object({
	id: z.number(),
	created_at: z.coerce.date(),
	author: z.string(),
	text: z.string(),
	points: z.number(),
})
type BaseComment = z.infer<typeof BaseCommentSchema>
type Comment = BaseComment & { children: Comment[] }
const CommentSchema: z.ZodType<Comment> = BaseCommentSchema.extend({
	children: z.lazy(() => CommentSchema.array()),
})

/** Fetches comments for a discussion */
export async function fetchComments(discussion: Discussion) {
	const url = new URL(COMMENTS_URL)
	throw new Error('Not implemented')
}
