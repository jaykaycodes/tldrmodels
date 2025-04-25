import { gemini } from '#/lib/utils'

import keywords from './keywords.txt'

if (Bun.main) generateKeywordEmbedding().catch(console.error)

async function generateKeywordEmbedding() {
	const result = await gemini.models.embedContent({
		model: 'gemini-embedding-exp-03-07',
		contents: keywords,
		config: { taskType: 'SEMANTIC_SIMILARITY', outputDimensionality: 768 },
	})

	const [embedding] = result.embeddings ?? []

	if (!embedding?.values) throw new Error('No embeddings generated!')

	const path = Bun.fileURLToPath(import.meta.url).replace('.ts', '.json')
	await Bun.write(path, JSON.stringify(embedding.values))

	console.log(`Keyword embedding written to ${path}`)
}
