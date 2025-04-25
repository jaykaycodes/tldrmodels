import { zodToJsonSchema } from 'zod-to-json-schema'

import { BenchmarksSchema } from '../src/schemas/benchmarks.schema'
import { ModelsSchema } from '../src/schemas/models.schema'
import { VibesSchema } from '../src/schemas/vibes.schema'

const modelsSchema = zodToJsonSchema(ModelsSchema, 'Models')
const vibesSchema = zodToJsonSchema(VibesSchema, 'Vibes')
const benchmarksSchema = zodToJsonSchema(BenchmarksSchema, 'Benchmarks')

await Promise.all([
	Bun.write('src/schemas/models.schema.json', JSON.stringify(modelsSchema, null, 2)),
	Bun.write('src/schemas/vibes.schema.json', JSON.stringify(vibesSchema, null, 2)),
	Bun.write('src/schemas/benchmarks.schema.json', JSON.stringify(benchmarksSchema, null, 2)),
])

console.log('Schemas built successfully at `src/schemas/*.schema.json`')
