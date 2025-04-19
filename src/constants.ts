const SITE_NAME = 'tl;dr models'
const SITE_DESCRIPTION = 'just tell me which damn model to use already'
const THEME_COLOR = '#8c5cf5'
const TWITTER_HANDLE = 'jaykaycodes'
const GITHUB_REPO = 'jaykaycodes/tldrmodels'

const OPEN_GRAPH = {
	home: {
		title: SITE_NAME,
		description: SITE_DESCRIPTION,
	},
	// blog: {
	// 	title: 'Blog',
	// 	description: 'News and guides for Spectre.'
	// },
	// projects: {
	// 	title: 'Projects'
	// }
} as const

const constants = {
	SITE_NAME,
	SITE_DESCRIPTION,
	THEME_COLOR,
	TWITTER_HANDLE,
	GITHUB_REPO,
	OPEN_GRAPH,
} as const

export default constants
