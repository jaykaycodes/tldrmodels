export const scraperJobs = {
	'0 */6 * * *': 'discussions',
	'*/30 * * * *': 'comments',
} as const

export type ScraperJob = (typeof scraperJobs)[keyof typeof scraperJobs]
