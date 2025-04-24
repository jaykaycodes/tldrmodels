import { env } from 'cloudflare:workers'
import type { AnyTable, InferInsertModel } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import type { TableConfig } from 'drizzle-orm/sqlite-core'
import { getTableColumns } from 'drizzle-orm/utils'
import { z } from 'zod'
import { errorMap } from 'zod-validation-error'

import type { WorkersEnv } from './alchemy.run'

z.setErrorMap(errorMap)

declare module 'cloudflare:workers' {
	namespace Cloudflare {
		export interface Env extends WorkersEnv {}
	}
}

export const db = drizzle(env.DB)

export const subreddits = [
	'artificial',
	'ArtificialIntelligence',
	'machinelearningnews',
	'MachineLearning',
	'OpenAI',
	'languagemodels',
	'LargeLanguageModels',
	'AI',
	'NLP',
	'DeepLearning',
	'singularity',
	'agi',
	'LLMDevs',
	'LLMs',
	'Cursor',
	'AutoGPT',
	'NovelAI',
	'ChatGPT',
	'WritingWithAI',
	'Chatbots',
	'AIAssisted',
	'machinetranslation',
	'GenerativeAI',
	'StableDiffusion',
	'AIethics',
	'AIpolicy',
]

export function uniq<T>(arr: T[]): T[] {
	return Array.from(new Set(arr))
}

// https://developers.cloudflare.com/d1/platform/limits/#:~:text=Maximum%20number%20of%20columns%20per%20table
const D1_MAX_SQL_VARIABLES = 100
export function safeChunkInsertValues<T extends AnyTable<TableConfig>>(table: T, values: InferInsertModel<T>[]) {
	const columns = getTableColumns(table)
	const defaultColumns = Object.entries(columns)
		.filter(([_k, v]) => {
			return v.hasDefault
		})
		.map(([k]) => k)
	let chunkArgsLength = 0
	const chunks: InferInsertModel<T>[][] = []
	for (const it of values) {
		const args = uniq([...Object.keys(it), ...defaultColumns])
		if (chunkArgsLength + args.length >= D1_MAX_SQL_VARIABLES) {
			chunks.push([it])
			chunkArgsLength = args.length
			continue
		}
		const lastChunk = chunks[chunks.length - 1]
		if (lastChunk) lastChunk.push(it)
		else chunks.push([it])

		chunkArgsLength += args.length
	}
	return chunks
}

export function cosineSimilarity(a: number[], b: number[]): number {
	let productSum = 0
	let normSumA = 0
	let normSumB = 0

	const maxLen = Math.max(a.length, b.length)

	// The vector that is smaller is effectively padded with 0s
	for (let i = 0; i < maxLen; i++) {
		const aVal = a[i] ?? 0
		const bVal = b[i] ?? 0

		productSum += aVal * bVal
		normSumA += aVal * aVal
		normSumB += bVal * bVal
	}

	return productSum / (Math.sqrt(normSumA) * Math.sqrt(normSumB))
}
