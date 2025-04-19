import { defineCollection, z } from 'astro:content'
import type { icons as lucideIcons } from '@iconify-json/lucide'
import type { icons as simpleIcons } from '@iconify-json/simple-icons'
import { glob } from 'astro/loaders'

const lucideIconSchema = z.object({
	type: z.literal('lucide'),
	name: z.custom<keyof typeof lucideIcons>(),
})

const simpleIconSchema = z.object({
	type: z.literal('simple-icons'),
	name: z.custom<keyof typeof simpleIcons>(),
})

const models = defineCollection({
	loader: glob({ base: 'src/content/models', pattern: '**/*.{json}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			date: z.coerce.date(),
			image: image(),
			link: z.string().url().optional(),
			info: z.array(
				z.object({
					text: z.string(),
					icon: z.union([lucideIconSchema, simpleIconSchema]),
					link: z.string().url().optional(),
				}),
			),
		}),
})

export const collections = { models }
