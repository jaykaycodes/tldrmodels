import { env } from 'cloudflare:workers'
import { and, gte, isNotNull, isNull, lt, or } from 'drizzle-orm'

import type { ScraperJob } from '../jobs'
import { Discussion } from '../models'
import { db, subreddits } from '../utils'
import type { ScraperParams } from './scraper'

export async function queueJobs(type: ScraperJob) {
	let jobs: MessageSendRequest<ScraperParams>[] = []
	switch (type) {
		case 'discussions':
			jobs = await getDiscussionJobs()
			break
		case 'comments':
			jobs = await getCommentJobs()
			break
		default:
			throw new Error(`Unknown job: ${type}`)
	}

	console.log(`Queueing ${jobs.length} ${type} jobs`)

	// Chunk jobs into batches of 100 to avoid hitting queue limits
	for (let i = 0; i < jobs.length; i += 100) {
		const chunk = jobs.slice(i, i + 100)
		await env.QUEUE.sendBatch(chunk)
	}
}

async function getDiscussionJobs() {
	// HN new discussions
	const jobs: MessageSendRequest<ScraperParams>[] = []
	jobs.push({
		body: { type: 'discussions', params: { source: 'hackernews' } } satisfies ScraperParams,
	})

	jobs.push(
		...subreddits.map(
			(subreddit, index) =>
				({
					body: {
						type: 'discussions',
						params: { source: 'reddit', subreddit, sort: 'new' },
					},
					// fan out the requests to avoid rate limiting
					delaySeconds: index * 60 * 2,
				}) satisfies MessageSendRequest<ScraperParams>,
		),
	)

	return jobs
}

async function getCommentJobs() {
	const now = new Date().getTime()
	const day = 1000 * 60 * 60 * 24
	const oneDayAgo = new Date(now - day)
	const oneWeekAgo = new Date(now - day * 7)

	const discussions = await db
		.select({ id: Discussion.id, source: Discussion.source })
		.from(Discussion)
		.where(
			or(
				// all newly scraped discussions
				and(
					isNull(Discussion.commentsUpdatedAt),
					gte(Discussion.numComments, 1),
					// lt(Discussion.timestamp, oneDayAgo),
				),
				// refresh daily up to a week old
				and(
					isNotNull(Discussion.commentsUpdatedAt),
					lt(Discussion.commentsUpdatedAt, oneDayAgo),
					gte(Discussion.timestamp, oneWeekAgo),
				),
			),
		)
		.limit(100)

	const result: MessageSendRequest<ScraperParams>[] = []
	for (const d of discussions) {
		if (d.source === 'reddit' || d.source === 'hackernews')
			result.push({
				body: {
					type: 'comments',
					params: { source: d.source, discussionId: d.id },
				} satisfies ScraperParams,
			})
	}
	return result
}
