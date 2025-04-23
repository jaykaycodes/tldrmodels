// https://github.com/oven-sh/bun/issues/1003

import { plugin } from 'bun'

await plugin({
	name: 'YAML',
	async setup(build) {
		const { load } = await import('js-yaml')
		build.onLoad({ filter: /\.(yaml|yml)$/ }, async (args) => {
			const text = await Bun.file(args.path).text()
			return { exports: { default: load(text) }, loader: 'object' }
		})
	},
})
