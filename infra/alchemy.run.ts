import alchemy from 'alchemy'
import { D1Database, Queue, Worker } from 'alchemy/cloudflare'
import 'alchemy/os'

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

export const database = await D1Database('tldrmodels-db', {
	name: 'tldrmodels-db',
	accountId: Bun.env.CLOUDFLARE_ACCOUNT_ID,
})

export const queue = await Queue('tldrmodels-queue', {
	name: 'tldrmodels-queue',
	accountId: Bun.env.CLOUDFLARE_ACCOUNT_ID,
})

export const scraper = await Worker('tldrmodels-scraper', {
	name: 'tldrmodels-scraper',
	accountId: Bun.env.CLOUDFLARE_ACCOUNT_ID,
	entrypoint: './scraper/worker.ts',
	bindings: {
		DB: database,
		REDDIT_CLIENT_ID: redditClientId,
		REDDIT_CLIENT_SECRET: redditClientSecret,
		QUEUE: queue,
	},
})
export type ScraperEnv = typeof scraper.Env

await app.finalize()
