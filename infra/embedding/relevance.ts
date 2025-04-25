import { and, eq, isNull } from 'drizzle-orm'

import db from '#/lib/db'
import { Discussion, type DiscussionSource } from '#/lib/models'
import { cosineSimilarity, gemini, isWorker } from '#/lib/utils'

import keywordEmbedding from './keywords.json'

export async function batchComputeRelevancy(source: DiscussionSource) {
	const discussions = await db
		.select({ id: Discussion.id, title: Discussion.title, text: Discussion.text })
		.from(Discussion)
		.where(and(isNull(Discussion.relevance), eq(Discussion.source, source)))
		.limit(10)

	console.log(`Computing relevance for ${discussions.length} discussions`)

	const results = await gemini.models.embedContent({
		model: 'gemini-embedding-exp-03-07',
		contents: discussions.map((d) => `${d.title} ${d.text}`),
		config: {
			outputDimensionality: 768,
			taskType: 'SEMANTIC_SIMILARITY',
		},
	})

	const updates: Pick<Discussion, 'id' | 'relevance'>[] = []
	for (const [i, d] of discussions.entries()) {
		const embedding = results.embeddings?.[i]
		if (!embedding?.values) throw new Error(`No embedding for discussion ${d.id}. This should never happen!`)
		const relevance = cosineSimilarity(embedding.values, keywordEmbedding)
		updates.push({ id: d.id, relevance })
	}

	if (isWorker) {
		await db.batch(
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			updates.map((u) => db.update(Discussion).set({ relevance: u.relevance }).where(eq(Discussion.id, u.id))) as any,
		)

		console.log(
			`Updated ${updates.length} discussions with relevance scores:\n`,
			updates.map((u) => `  ${u.id}: ${u.relevance}`).join('\n'),
		)
	} else {
		for (const u of updates) {
			console.log(`Updating discussion ${u.id} with relevance ${u.relevance}`)
			await db.update(Discussion).set({ relevance: u.relevance }).where(eq(Discussion.id, u.id))
		}
	}
}

if (Bun.main) {
	await batchComputeRelevancy('hackernews')
}
