import { scraperJobs } from '#/lib/jobs'

import { queueJobs } from './queuer'
import { runScraper, type ScraperParams, ScraperParamsSchema } from './scraper'

export default {
	async queue(event: MessageBatch<ScraperParams>) {
		let [message, ...rest] = event.messages
		if (!message) throw new Error('No message')
		if (rest.length > 0) console.error('Expected exactly one message, only queueing the first one', event.messages)

		const params = ScraperParamsSchema.parse(message.body)
		await runScraper(params)

		message.ack()
	},
	async scheduled(event: ScheduledEvent) {
		const type = scraperJobs[event.cron as keyof typeof scraperJobs]
		if (!type) throw new Error(`Unknown cron: ${event.cron}`)
		await queueJobs(type)
	},
	// custom fetch handler for testing
	fetch: handleFetch,
}

async function handleFetch(request: Request) {
	const url = new URL(request.url)

	try {
		let res: unknown = null
		if (url.pathname.startsWith('/r/')) {
			const [_, _r, subreddit, sort] = url.pathname.split('/')
			if (!subreddit || !sort) return Response.json({ error: 'Invalid path' }, { status: 400 })

			res = await runScraper({ type: 'discussions', params: { source: 'reddit', subreddit, sort: sort as 'new' } })
		} else if (url.pathname === '/hn') {
			res = await runScraper({ type: 'discussions', params: { source: 'hackernews' } })
		} else if (url.pathname === '/qd') {
			await queueJobs('discussions')
		} else if (url.pathname === '/qc') {
			await queueJobs('comments')
		} else {
			return Response.json({ error: 'Unknown request' }, { status: 400 })
		}

		return Response.json(res)
	} catch (error) {
		console.error(error)
		return Response.json({ error: 'Internal server error' }, { status: 500 })
	}
}
