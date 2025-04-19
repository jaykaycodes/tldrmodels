import { kebabCase } from 'change-case'
import type * as giscus from 'giscus'

import constants from './constants'

interface GiscusOptionsBase {
	repo: giscus.Repo
	repoId: string
	reactionsEnabled: boolean
	emitMetadata: boolean
	lang: giscus.AvailableLanguage
	loading?: giscus.Loading
	theme: giscus.Theme
	inputPosition: giscus.InputPosition
}

interface GiscusOptionsFuzzy extends GiscusOptionsBase {
	mapping: Exclude<giscus.Mapping, 'number' | 'specific'>
	strict?: boolean
	category: string
	categoryId: string
}

interface GiscusOptionsNumber extends GiscusOptionsBase {
	mapping: 'number'
	term: number
}

interface GiscusOptionsTerm extends Omit<GiscusOptionsFuzzy, 'mapping'> {
	mapping: 'specific'
	term: string
}

export type GiscusOptions = GiscusOptionsFuzzy | GiscusOptionsNumber | GiscusOptionsTerm

const defaultOptions: GiscusOptionsBase = {
	repo: constants.GITHUB_REPO,
	repoId: 'R_kgDOOcE0SQ',
	reactionsEnabled: true,
	emitMetadata: false,
	lang: 'en',
	/** lazy load comments */
	loading: 'lazy',
	inputPosition: 'top',
	theme: 'dark',
}

const modelRequestOptions: GiscusOptions = {
	...defaultOptions,
	mapping: 'number',
	term: 1,
}

const getModelTalkOptions = (model: string): GiscusOptions => ({
	...defaultOptions,
	mapping: 'specific',
	term: model,
	category: 'Model Talk',
	categoryId: 'DIC_kwDOOcE0Sc4CpQA_',
})

export function buildGiscusScriptHtml(model?: string) {
	const options = model ? getModelTalkOptions(model) : modelRequestOptions
	let prefix = '<script src="https://giscus.app/client.js"'
	let suffix = 'crossorigin="anonymous" async></script>'

	for (const [key, value] of Object.entries(options)) {
		const k = kebabCase(key)
		const v = typeof value === 'boolean' ? (value ? '1' : '0') : value
		prefix += ` data-${k}="${v}"`
	}

	return `${prefix} ${suffix}`
}
