import { z } from 'astro/zod'

export const TASK_CATEGORIES = [
	'overall',
	'coding',
	'writing',
	'research',
	'chat',
	'image_tasks',
	'translation',
] as const
export const TaskCategorySchema = z.enum(TASK_CATEGORIES)
export type TaskCategory = z.infer<typeof TaskCategorySchema>

export const METRIC_NAMES = [
	'Accuracy',
	'Pass@1',
	'Elo Rating',
	'Accuracy (Pass@1)',
	'Resolved Rate',
	'LC Win Rate',
] as const
export const MetricNameSchema = z.enum(METRIC_NAMES)
export type MetricName = z.infer<typeof MetricNameSchema>

export const METRIC_UNITS = ['%', 'Elo'] as const
export const MetricUnitSchema = z.enum(METRIC_UNITS)
export type MetricUnit = z.infer<typeof MetricUnitSchema>

// Model result schema
export const ModelResultSchema = z
	.object({
		model_id: z
			.string()
			.describe(
				'The unique identifier of the AI model evaluated, matching the id field in the static model info schema.',
			),
		score: z.number().describe("The numerical score achieved by the model on the benchmark's primary metric."),
		score_date: z
			.string()
			.nullish()
			.describe('Optional date (YYYY-MM-DD) indicating when the score was recorded or published.'),
	})
	.strict()
export type ModelResult = z.infer<typeof ModelResultSchema>

// Main benchmark schema
export const BenchmarkSchema = z
	.object({
		id: z.string().describe('The unique identifier of the benchmark.'),
		benchmark_name: z.string().describe('The common name of the benchmark (e.g., MMLU, HumanEval).'),
		benchmark_url: z
			.string()
			.url()
			.nullable()
			.describe("Optional URL linking to the benchmark's official site, paper, or leaderboard."),
		primary_task_category: TaskCategorySchema.describe(
			'The most fitting primary task category evaluated by the benchmark.',
		),
		primary_metric_name: MetricNameSchema.describe(
			'The name of the main score metric reported for this benchmark (e.g., Accuracy, Pass@1, Elo Rating).',
		),
		primary_metric_unit: MetricUnitSchema.nullable().describe(
			"The unit of the main score metric (e.g., '%', 'Elo', 'points'). Null if unitless.",
		),
		model_results: z
			.array(ModelResultSchema)
			.min(1)
			.describe('An array containing performance results for specific models on this benchmark.'),
	})
	.strict()
export type Benchmark = z.infer<typeof BenchmarkSchema>

export const BenchmarksSchema = z.array(BenchmarkSchema)
export type Benchmarks = z.infer<typeof BenchmarksSchema>
