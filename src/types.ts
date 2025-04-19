/** Represents benchmark scores for a task category - e.g., { "HumanEval": 85, "MBPP": 75 } */
export type ModelBenchmarks = Record<string, number>

/** Represents a task category with rating, sentiment, and benchmarks */
export interface ModelCategoryInfo {
	/** Letter grade for the task - e.g., "B+" */
	rating: string
	/** Community sentiment for the task - e.g., "Solid all-around performer." */
	sentiment: string
	/** Benchmarks for the task */
	benchmarks: ModelBenchmarks
}

/** Represents the token limits for input and output */
export interface ModelContextWindow {
	input_tokens: number
	output_tokens: number
}

/** Represents pricing details per million tokens */
export interface ModelPricing {
	input: number
	cached_input: number
	output: number
}

/** Represents compatibility with various APIs and protocols */
export interface ModelCompatibility {
	mcp: boolean
	api: boolean
	openai_api: boolean
	anthropic_api: boolean
	google_vertex_ai: boolean
}

export const MODEL_CATEGORIES = [
	'overall',
	'coding',
	'writing',
	'research',
	'chat',
	'image_tasks',
	'translation',
] as const
export type ModelCategory = (typeof MODEL_CATEGORIES)[number]

export const MODEL_PROVIDERS = ['OpenAI', 'Anthropic', 'Google', 'Meta', 'Cohere'] as const
export type ModelProvider = (typeof MODEL_PROVIDERS)[number]

export const MODEL_SPEEDS = ['slow', 'medium', 'fast'] as const
export type ModelSpeed = (typeof MODEL_SPEEDS)[number]

export const MODEL_REASONING_CAPABILITIES = ['lower', 'medium', 'higher'] as const
export type ModelReasoningCapability = (typeof MODEL_REASONING_CAPABILITIES)[number]

export const MODEL_FEATURES = [
	'multimodal',
	'fine-tuning',
	'thinking',
	'tool-use',
	'image-gen',
	'open-source',
] as const
export type ModelFeature = (typeof MODEL_FEATURES)[number]

export interface ModelInfo {
	/** Name of the model - e.g., "o4-mini" */
	name: string
	/** Provider of the model - e.g., "OpenAI" */
	provider: ModelProvider
	/** Snarky tagline for the model - e.g., "Small but mighty—perfect for coding sprints." */
	tagline: string
	/** Ratings, sentiment, and benchmarks for each task category */
	categories: Record<ModelCategory, ModelCategoryInfo>
	/** Speed rating of the model - e.g., "medium" */
	speed: ModelSpeed
	/** Reasoning capability rating - e.g., "higher" */
	reasoning: ModelReasoningCapability
	/** Token limits for input and output */
	context_window: ModelContextWindow
	/** Date of knowledge cutoff - e.g., "May 31, 2024" */
	knowledge_cutoff: string
	/** Pricing details per million tokens */
	pricing: ModelPricing
	/** Compatibility with various APIs and protocols */
	compatibility: ModelCompatibility
	/** List of supported features - e.g., ["multimodal", "fine-tuning"] */
	features: ModelFeature[]
	/** Score for trustworthiness of user feedback - e.g., 0.85 */
	trustworthiness_score: number
}
