import { defineCollection, z } from 'astro:content'
import type { icons as lucideIcons } from '@iconify-json/lucide'
import type { icons as simpleIcons } from '@iconify-json/simple-icons'
import { file } from 'astro/loaders'

import { BenchmarksSchema } from './schemas/benchmarks.schema'
import { ModelsSchema } from './schemas/models.schema'
import { VibesSchema } from './schemas/vibes.schema'

const lucideIconSchema = z.object({
	type: z.literal('lucide'),
	name: z.custom<keyof typeof lucideIcons>(),
})

const simpleIconSchema = z.object({
	type: z.literal('simple-icons'),
	name: z.custom<keyof typeof simpleIcons>(),
})

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
