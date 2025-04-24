import alchemy from 'alchemy'
import { D1Database, Queue, VectorizeIndex, Worker } from 'alchemy/cloudflare'
import 'alchemy/os'

import { scraperJobs } from './jobs'

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
	name: 'tldrmodels-db',
	accountId: Bun.env.CLOUDFLARE_ACCOUNT_ID,
})

export const discussionsIndex = await VectorizeIndex('tldrmodels-index', {
	name: 'tldrmodels-index',
	accountId: Bun.env.CLOUDFLARE_ACCOUNT_ID,
	dimensions: 768,
	metric: 'cosine',
})

export const queue = await Queue('tldrmodels-queue', {
	name: 'tldrmodels-queue',
	accountId: Bun.env.CLOUDFLARE_ACCOUNT_ID,
})

export const scraper = await Worker('tldrmodels-scraper', {
	name: 'tldrmodels-scraper',
	accountId: Bun.env.CLOUDFLARE_ACCOUNT_ID,
	entrypoint: './scraper/worker.ts',
	crons: Object.keys(scraperJobs),
	bindings: {
		DB: database,
		REDDIT_CLIENT_ID: redditClientId,
		REDDIT_CLIENT_SECRET: redditClientSecret,
		QUEUE: queue,
	},
})

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

export type WorkersEnv = typeof scraper.Env
// export type WorkersEnv = typeof embeddings.Env & typeof scraper.Env

await app.finalize()
