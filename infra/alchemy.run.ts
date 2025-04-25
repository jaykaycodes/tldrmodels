import alchemy from 'alchemy'
import { D1Database, Queue, Worker } from 'alchemy/cloudflare'
import 'alchemy/os'

import { scraperJobs } from './lib/jobs'

const stage = Bun.env.ALCHEMY_STAGE ?? (Bun.env.NODE_ENV === 'production' ? 'prod' : 'dev')
const phase = Bun.argv.includes('--destroy') ? 'destroy' : 'up'
const quiet = !Bun.argv.includes('--verbose')
const password = Bun.env.ALCHEMY_SECRETS_PASSWORD

const app = await alchemy('tldrmodels', {
	stage,
	phase,
	quiet,
	password,
})

const redditClientId = alchemy.secret(Bun.env.REDDIT_CLIENT_ID)
const redditClientSecret = alchemy.secret(Bun.env.REDDIT_CLIENT_SECRET)
const geminiApiKey = alchemy.secret(Bun.env.GEMINI_API_KEY)

export const database = await D1Database('tldrmodels-db', {
	adopt: true,
	name: 'tldrmodels-db',
	accountId: Bun.env.CLOUDFLARE_ACCOUNT_ID,
})

export const queue = await Queue('tldrmodels-jobs', {
	name: 'tldrmodels-jobs',
	accountId: Bun.env.CLOUDFLARE_ACCOUNT_ID,
})

export const worker = await Worker('tldrmodels-scraper', {
	name: 'tldrmodels-scraper',
	accountId: Bun.env.CLOUDFLARE_ACCOUNT_ID,
	entrypoint: './scraper/worker.ts',
	crons: Object.keys(scraperJobs),
	bundle: {
		options: { define: { 'Bun.env.NODE_ENV': JSON.stringify('production') } },
	},
	bindings: {
		DB: database,
		REDDIT_CLIENT_ID: redditClientId,
		REDDIT_CLIENT_SECRET: redditClientSecret,
		QUEUE: queue,
		GEMINI_API_KEY: geminiApiKey,
	},
})

export type WorkerEnv = typeof worker.Env

// export const embeddings = await Worker('tldrmodels-embeddings', {
// 	name: 'tldrmodels-embeddings',
// 	accountId: Bun.env.CLOUDFLARE_ACCOUNT_ID,
// 	entrypoint: './workers/embeddings.ts',
// 	crons: Object.keys(embeddingsJobs),
// 	bindings: {
// 		DB: database,
// 		VECTORIZE: discussionsIndex,
// 		GEMINI_API_KEY: geminiApiKey,
// 	},
// })

await app.finalize()
