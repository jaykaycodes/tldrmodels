import { env } from 'cloudflare:workers'
import { sql } from 'drizzle-orm'
import { z } from 'zod'

import { Discussion, type DiscussionInsert } from '#infra/models'

import * as hn from './hn'
import * as reddit from './reddit'
import { db, safeChunkInsertValues, subreddits } from './utils'

const ParamsSchema = z.discriminatedUnion('type', [reddit.ParamsSchema, hn.ParamsSchema])
type Params = z.infer<typeof ParamsSchema>

async function runScrape(params: Params) {
	let discussions: DiscussionInsert[] = []
	if (params.type === 'reddit') {
		discussions = await reddit.fetchDiscussions(params.subreddit, params.sort)
	} else if (params.type === 'hn') {
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

export default {
	async fetch(request: Request) {
		const url = new URL(request.url)

		try {
			let res: unknown = null
			if (url.pathname.startsWith('/r/')) {
				const [_, _r, subreddit, sort] = url.pathname.split('/')
				if (!subreddit || !sort) return Response.json({ error: 'Invalid path' }, { status: 400 })

				res = await runScrape({ type: 'reddit', subreddit, sort: sort as 'new' })
			} else if (url.pathname === '/hn') {
				res = await runScrape({ type: 'hn' })
			} else {
				return Response.json({ error: 'Unknown request' }, { status: 400 })
			}

			return Response.json(res)
		} catch (error) {
			console.error(error)
			return Response.json({ error: 'Internal server error' }, { status: 500 })
		}
	},
	async queue(event: MessageBatch<Params>) {
		let [message, ...rest] = event.messages
		if (!message) throw new Error('No message')
		if (rest.length > 0) console.error('Expected exactly one message, only queueing the first one', event.messages)

		const params = ParamsSchema.parse(message.body)
		await runScrape(params)
		message.ack()
	},
	async scheduled() {
		await env.QUEUE.sendBatch([
			{
				body: { type: 'hn' } satisfies Params,
			},
			...subreddits.map((subreddit, index) => ({
				body: { type: 'reddit', subreddit, sort: 'new' } satisfies Params,
				// fan out the requests to avoid rate limiting
				delay: index * 1000 * 60 * 10,
			})),
		])
	},
}
