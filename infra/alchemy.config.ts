import alchemy from 'alchemy'
import { D1Database } from 'alchemy/cloudflare'
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

const database = await D1Database('tldrmodels-db', {
	name: 'tldrmodels-db',
	accountId: Bun.env.CLOUDFLARE_ACCOUNT_ID,
})

// export const [authStore, storage] = await Promise.all([
//   KVNamespace("KV_STORE", {
//     title: "tldrmodels-kv-store",
//   }),
//   R2Bucket("scrape-data", {
//     name: "tldrmodels-scrape-data",
//     allowPublicAccess: false,
//   }),
// ]);

await app.finalize()
