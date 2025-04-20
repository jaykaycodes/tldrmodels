import { z } from 'astro/zod'

// Reusable enums
export const MODEL_PROVIDERS = [
	'OpenAI',
	'Anthropic',
	'Google',
	'Meta',
	'Cohere',
	'DeepSeek',
	'Cursor',
	'xAI',
	'Mistral',
	'Qwen',
	'Other',
	'Open Source',
] as const
export const ModelProviderSchema = z.enum(MODEL_PROVIDERS)
export type ModelProvider = z.infer<typeof ModelProviderSchema>

export const MODEL_STATUS = ['beta', 'stable', 'experimental', 'deprecated'] as const
export const ModelStatusSchema = z.enum(MODEL_STATUS)
export type ModelStatus = z.infer<typeof ModelStatusSchema>

export const MODEL_FEATURES = [
	'multimodal',
	'fine-tuning',
	'thinking',
	'tool-use',
	'image-gen',
	'open-source',
	'voice',
	'web-search',
	'mcp',
] as const
export const ModelFeatureSchema = z.enum(MODEL_FEATURES)
export type ModelFeature = z.infer<typeof ModelFeatureSchema>

// Reusable schemas
export const ContextWindowSchema = z
	.object({
		input: z.number().int().min(0).nullable(),
		output: z.number().int().min(0).nullable(),
		total: z.number().int().min(0).nullable(),
	})
	.strict()
export type ContextWindow = z.infer<typeof ContextWindowSchema>

export const ModelPricingSchema = z
	.object({
		input: z.number().min(0).nullable(),
		cached_input: z.number().min(0).nullable(),
		output: z.number().min(0).nullable(),
	})
	.strict()
export type ModelPricing = z.infer<typeof ModelPricingSchema>

export const ModelCompatibilitySchema = z
	.object({
		mcp: z.boolean(),
		api: z.boolean(),
		openai_api: z.boolean(),
		anthropic_api: z.boolean(),
		google_vertex_ai: z.boolean(),
	})
	.strict()
export type ModelCompatibility = z.infer<typeof ModelCompatibilitySchema>

// Main model schema
export const ModelSchema = z
	.object({
		id: z.string().describe('The unique identifier of the model.'),
		status: z.enum(MODEL_STATUS).nullable().describe('The current status of the model.'),
		provider: z.enum(MODEL_PROVIDERS).describe('The company or organization providing the model.'),
		providerUrl: z.string().url().nullable().describe("URL of the model documentation on the provider's website."),
		releaseDate: z.string().nullable().describe('The release date of the model (YYYY-MM-DD or empty/null if unknown).'),
		knowledgeCutoff: z
			.string()
			.nullable()
			.describe('The knowledge cutoff date of the model (YYYY-MM-DD or empty/null if unknown).'),
		contextWindow: ContextWindowSchema.describe('Token limits for input and output.'),
		pricing: ModelPricingSchema.describe('Pricing details per million tokens.'),
		tokensPerSecond: z
			.number()
			.int()
			.min(0)
			.nullable()
			.describe('The number of tokens per second the model can process.'),
		features: z.array(ModelFeatureSchema).describe('List of features supported by the model.'),
		compatibility: ModelCompatibilitySchema.describe('Compatibility with various APIs and protocols.'),
	})
	.strict()
export type Model = z.infer<typeof ModelSchema>

export const ModelsSchema = z.array(ModelSchema)
export type Models = z.infer<typeof ModelsSchema>
