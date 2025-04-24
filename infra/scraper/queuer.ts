import { env } from 'cloudflare:workers'
import { and, gte, isNotNull, isNull } from 'drizzle-orm'

import type { ScraperJob } from '../jobs'
import { Discussion } from '../models'
import { db, subreddits } from '../utils'
import type { ScraperParams } from './scraper'

export async function queueJobs(type: ScraperJob) {
	const job = jobGetters[type]
	if (!job) throw new Error(`Unknown job: ${type}`)

	const jobs = await job()
	console.log(`Queueing ${jobs.length} ${type} jobs`)
	console.log(jobs)

	// Chunk jobs into batches of 100 to avoid hitting queue limits
	for (let i = 0; i < jobs.length; i += 100) {
		const chunk = jobs.slice(i, i + 100)
		await env.QUEUE.sendBatch(chunk)
	}
}

type GetJobsFn = () => Promise<MessageSendRequest<ScraperParams>[]>

const jobGetters: Record<ScraperJob, GetJobsFn> = {
	discussions: getDiscussionJobs,
	comments: getCommentJobs,
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
	const oneDayAgo = new Date(Date.now() - 1000 * 60 * 60 * 24)
	const discussions = await db
		.select({ id: Discussion.id, source: Discussion.source })
		.from(Discussion)
		.where(
			and(
				isNull(Discussion.commentsUpdatedAt),
				isNotNull(Discussion.relevance),
				gte(Discussion.relevance, 0.2),
				gte(Discussion.numComments, 1),
				// lt(Discussion.timestamp, oneDayAgo),
			),
		)
		.limit(100)

	return buildCommentJobs(discussions)
}

function buildCommentJobs(discussion: Pick<Discussion, 'id' | 'source'>[]): MessageSendRequest<ScraperParams>[] {
	const result: MessageSendRequest<ScraperParams>[] = []
	for (const d of discussion) {
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
