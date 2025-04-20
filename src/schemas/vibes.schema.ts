import { z } from 'astro/zod'

import { TaskCategorySchema } from './benchmarks.schema'

// Task vibe schema
export const TaskVibeSchema = z
	.object({
		vibe_score: z.number().min(0).max(1).describe('The computed vibe score (0 to 1) for the task category.'),
		total_mentions: z.number().int().min(0).describe('The total number of mentions related to the task category.'),
		positive_mentions: z.number().int().min(0).describe('The number of positive mentions for the task category.'),
		negative_mentions: z.number().int().min(0).describe('The number of negative mentions for the task category.'),
		neutral_mentions: z.number().int().min(0).describe('The number of neutral mentions for the task category.'),
	})
	.strict()
export type TaskVibe = z.infer<typeof TaskVibeSchema>

// Main vibe schema
export const ModelVibesSchema = z
	.object({
		id: z
			.string()
			.describe('The unique identifier of the AI model, matching the id field in the static model info schema.'),
		discussion_summary: z
			.string()
			.describe('A few paragraphs summarizing the overall community discussion about the model.'),
		task_vibes: z.record(TaskCategorySchema, TaskVibeSchema),
		computation_date: z.string().describe('The date when the vibe data was computed (YYYY-MM-DD).'),
	})
	.strict()
export type ModelVibes = z.infer<typeof ModelVibesSchema>

// Schema for array of vibes
export const VibesSchema = z.array(ModelVibesSchema)
export type Vibes = z.infer<typeof VibesSchema>
