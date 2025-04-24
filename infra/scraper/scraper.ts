import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import type { ScraperJob } from '#infra/jobs'

import { Discussion, type DiscussionComment, type DiscussionInsert } from '../models'
import { db, safeChunkInsertValues } from '../utils'
import * as hn from './hn'
import * as reddit from './reddit'

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

export const scrapers = {
	discussions: scrapeDiscussions,
	comments: scrapeComments,
} as const satisfies Record<ScraperJob, Function>

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
	if (params.source === 'reddit') {
		comments = await reddit.fetchComments(params)
	} else if (params.source === 'hackernews') {
		console.log('Hackernews comments not implemented')
		return
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
