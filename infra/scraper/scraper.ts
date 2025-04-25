import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import db from '#/lib/db'
import { Discussion, type DiscussionComment, type DiscussionInsert } from '#/lib/models'
import { safeChunkInsertValues } from '#/lib/utils'

import * as hn from './hn'
import * as reddit from './reddit'

export function runScraper(params: ScraperParams) {
	switch (params.type) {
		case 'discussions':
			return scrapeDiscussions(params.params)
		case 'comments':
			return scrapeComments(params.params)
	}
}

const DiscussionsParamsSchema = z.discriminatedUnion('source', [
	reddit.DiscussionsParamsSchema,
	hn.DiscussionsParamsSchema,
])
type DiscussionsParams = z.infer<typeof DiscussionsParamsSchema>

const CommentsParamsSchema = z.discriminatedUnion('source', [reddit.CommentsParamsSchema, hn.CommentsParamsSchema])
type CommentsParams = z.infer<typeof CommentsParamsSchema>

export const ScraperParamsSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('discussions'), params: DiscussionsParamsSchema }),
	z.object({ type: z.literal('comments'), params: CommentsParamsSchema }),
])
export type ScraperParams = z.infer<typeof ScraperParamsSchema>

async function scrapeDiscussions(params: DiscussionsParams) {
	let discussions: DiscussionInsert[] = []
	if (params.source === 'reddit') {
		discussions = await reddit.fetchDiscussions(params)
	} else if (params.source === 'hackernews') {
		discussions = await hn.fetchDiscussions()
	} else {
		throw new Error(`Unknown scraper type: ${params}`)
	}

	if (discussions.length === 0) {
		console.log('No discussions scraped, exiting')
		return
	}
	const chunks = safeChunkInsertValues(Discussion, discussions)
	await db.batch(
		chunks.map(
			(chunk) =>
				db
					.insert(Discussion)
					.values(chunk)
					.onConflictDoUpdate({
						target: [Discussion.source, Discussion.sourceId],
						set: {
							score: sql`excluded.score`,
							numComments: sql`excluded.num_comments`,
							updatedAt: new Date(),
						},
					}),
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		) as any,
	)

	console.log(`Upserted ${discussions.length} discussions`)
}

async function scrapeComments(params: CommentsParams) {
	let comments: DiscussionComment[] = []

	const [discussion] = await db
		.select({ id: Discussion.id, sourceId: Discussion.sourceId })
		.from(Discussion)
		.where(and(eq(Discussion.source, params.source), eq(Discussion.id, params.discussionId)))
		.limit(1)

	if (!discussion)
		throw new Error(`Discussion ${params.discussionId} not found for source ${params.source}. Exiting...`)

	if (params.source === 'reddit') {
		comments = await reddit.fetchComments(discussion.sourceId)
	} else if (params.source === 'hackernews') {
		comments = await hn.fetchComments(discussion.sourceId)
	} else {
		throw new Error(`Unknown scraper type: ${params}`)
	}

	await db
		.update(Discussion)
		.set({
			comments,
			commentsUpdatedAt: new Date(),
		})
		.where(eq(Discussion.id, params.discussionId))

	console.log(`Upserted ${comments.length} comments for discussion ${params.discussionId}`)
}
