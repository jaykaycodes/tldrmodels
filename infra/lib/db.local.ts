// https://github.com/drizzle-team/drizzle-orm/issues/2086
/** biome-ignore-all lint/suspicious/noExplicitAny: <explanation> */

import { drizzle } from 'drizzle-orm/sqlite-proxy'

const CLOUDFLARE_ACCOUNT_ID = Bun.env.CLOUDFLARE_ACCOUNT_ID
const CLOUDFLARE_DATABASE_ID = Bun.env.CLOUDFLARE_DATABASE_ID
const CLOUDFLARE_D1_TOKEN = Bun.env.CLOUDFLARE_API_TOKEN

const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${CLOUDFLARE_DATABASE_ID}`

type Query = {
	sql: string
	params: any[]
}

// https://orm.drizzle.team/docs/get-started-sqlite#http-proxy
function d1Query(query: Query): Promise<{ rows: any[] }>
function d1Query(queries: Query[]): Promise<{ rows: any[] }[]>
async function d1Query(queries: Query | Query[]): Promise<{ rows: any[] } | { rows: any[] }[]> {
	const isBatch = Array.isArray(queries)
	const sql = isBatch ? queries.map((q) => q.sql).join('; ') : queries.sql
	const params = isBatch ? queries.flatMap((q) => q.params) : queries.params

	const res = await fetch(`${baseUrl}/query`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${CLOUDFLARE_D1_TOKEN}`,
		},
		body: JSON.stringify({ sql, params }),
	})

	const data = (await res.json()) as Record<string, any>

	if (data.errors.length > 0 || !data.success) {
		throw new Error(`Error from sqlite proxy server: \n${JSON.stringify(data)}}`)
	}

	const qResults = data.result as { success: boolean; results: any[] }[]

	if (!isBatch && !qResults[0]?.success) {
		throw new Error(`Error from sqlite proxy server: \n${JSON.stringify(data)}`)
	}

	const rows = qResults.map((q) => ({ rows: q.results.map((r: any) => Object.values(r)) }))
	return isBatch ? rows : rows[0]!
}

export const localDb = drizzle((sql, params) => d1Query({ sql, params }), d1Query)
// TODO couldnt get batch api working...
// export const localDb = drizzle((sql, params) => d1Query({ sql, params }), d1Query)
