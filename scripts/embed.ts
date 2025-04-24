import { GoogleGenAI } from '@google/genai'

const gemini = new GoogleGenAI({
	apiKey: Bun.env.GEMINI_API_KEY,
})
const prompt = `
Discussions about AI/LLM models (e.g. Gemini, GPT, Grok, Claude, etc.),
evaluating performance, cost, reasoning, strengths/weaknesses,
or general AI/LLM discussion.
`.trim()

const result = await gemini.models.embedContent({
	model: 'gemini-embedding-exp-03-07',
	contents: prompt,
	config: { taskType: 'SEMANTIC_SIMILARITY', outputDimensionality: 768 },
})

console.log(result)
