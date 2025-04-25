import type { WorkerEnv } from '#/alchemy.run'

declare module 'cloudflare:workers' {
	namespace Cloudflare {
		export interface Env extends WorkerEnv {}
	}
}

declare module 'bun' {
	interface Env {
		NODE_ENV: 'development' | 'production'
		GEMINI_API_KEY: string
		REDDIT_CLIENT_ID: string
		REDDIT_CLIENT_SECRET: string
	}
}
