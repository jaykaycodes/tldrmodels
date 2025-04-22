const SITE_NAME = 'tl;dr models'
const SITE_DESCRIPTION = "find the right ai model or your money back! (it's free)"
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
	TWITTER_HANDLE,
	GITHUB_REPO,
	OPEN_GRAPH,
} as const

export default constants
