import { env } from 'cloudflare:workers'
import { z } from 'zod'

import * as hn from './hn'
import * as reddit from './reddit'
import { subreddits } from './utils'

const ParamsSchema = z.discriminatedUnion('type', [reddit.ParamsSchema, hn.ParamsSchema])
type Params = z.infer<typeof ParamsSchema>

export default {
	async fetch(request: Request) {
		const url = new URL(request.url)

		try {
			let res: unknown = null
			if (url.pathname.startsWith('/r/')) {
				const [_, _r, subreddit, sort] = url.pathname.split('/')
				if (!subreddit || !sort) return Response.json({ error: 'Invalid path' }, { status: 400 })

				res = await reddit.scrapeDiscussions(subreddit, sort as 'new')
			} else if (url.pathname === '/hn') {
				const params = hn.ParamsSchema.parse(url.searchParams)
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

		let res: unknown
		if (params.type === 'reddit') {
			res = await reddit.scrapeDiscussions(params.subreddit, params.sort)
		} else if (params.type === 'hn') {
			res = await hn.scrapeDiscussions()
		} else {
			// @ts-expect-error
			throw new Error(`Unknown scraper type: ${params.type}`)
		}

		message.ack()

		return res
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
