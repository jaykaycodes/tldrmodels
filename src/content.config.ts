import { defineCollection } from 'astro:content'
import { file } from 'astro/loaders'

import { BenchmarksSchema } from './schemas/benchmarks.schema'
import { ModelsSchema } from './schemas/models.schema'
import { VibesSchema } from './schemas/vibes.schema'

const models = defineCollection({
	loader: file('src/data/models.yaml'),
	schema: ModelsSchema,
})

const vibes = defineCollection({
	loader: file('src/data/vibes.yaml'),
	schema: VibesSchema,
})

const benchmarks = defineCollection({
	loader: file('src/data/benchmarks.yaml'),
	schema: BenchmarksSchema,
})

export const collections = { models, vibes, benchmarks }
