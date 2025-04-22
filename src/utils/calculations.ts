import type { TaskCategory } from '../schemas/benchmarks.schema'
import type { Model } from '../schemas/models.schema'
import type { ModelVibes } from '../schemas/vibes.schema'

// Calculate letter grade from numerical score
export function calculateGrade(score: number): string {
	if (score >= 90) return 'A+'
	if (score >= 85) return 'A'
	if (score >= 80) return 'A-'
	if (score >= 75) return 'B+'
	if (score >= 70) return 'B'
	if (score >= 65) return 'B-'
	if (score >= 60) return 'C+'
	if (score >= 55) return 'C'
	if (score >= 50) return 'C-'
	if (score >= 45) return 'D+'
	if (score >= 40) return 'D'
	return 'F'
}

// Helper function to calculate reasoning score (1-5) based on model features
export function calculateReasoningScore(model?: { data: Model }): number {
	if (!model) return 0

	// Could be improved with actual reasoning benchmarks
	// For now just a placeholder based on context window and other features
	let score = 0

	// Reasoning correlates with model size - use context window as a proxy
	if (model.data.contextWindow.total) {
		if (model.data.contextWindow.total >= 1000000) score += 2
		else if (model.data.contextWindow.total >= 200000) score += 1.5
		else if (model.data.contextWindow.total >= 100000) score += 1
		else if (model.data.contextWindow.total >= 50000) score += 0.5
	}

	// Check for thinking/tool-use features
	if (model.data.features) {
		if (model.data.features.includes('thinking')) score += 2
		if (model.data.features.includes('tool-use')) score += 1
	}

	// Adjust for provider (based on known performance)
	if (['Anthropic', 'OpenAI'].includes(model.data.provider)) score += 1

	return Math.min(Math.round(score), 5)
}

// Helper function to format price
export function formatPrice(model?: { data: Model }): string {
	if (!model || !model.data.pricing) return 'N/A'

	const input = model.data.pricing.input
	const output = model.data.pricing.output

	if (input === null && output === null) return 'Free'
	if (input === null || output === null) return input !== null ? `$${input}` : `$${output}`

	return `$${input}/$${output}`
}

// Format model name from ID
export function formatModelName(modelId: string): string {
	return modelId
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}

// Get vibe score for a specific task, with fallback
export function getVibeScore(modelVibes?: { data: ModelVibes }, task?: TaskCategory, defaultScore = 0.5): number {
	if (!modelVibes || !task) return defaultScore
	const taskVibe = modelVibes.data.task_vibes[task]
	return taskVibe?.vibe_score || defaultScore
}

// Get badge class based on score
export function getBadgeClass(score: number): string {
	return score > 0.8 ? 'badge-success' : score > 0.6 ? 'badge-secondary' : 'badge-accent'
}

// Get speed rating (1-5) based on tokens per second
export function getSpeedRating(tokensPerSecond: number): number {
	return Math.min(Math.max(Math.floor(tokensPerSecond / 40), 1), 5)
}
