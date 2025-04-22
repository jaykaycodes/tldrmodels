import { defineConfig } from 'drizzle-kit'

export default defineConfig({
	out: './migrations',
	schema: './models.ts',
	dialect: 'sqlite',
	driver: 'd1-http',
	dbCredentials: {
		accountId: Bun.env.CLOUDFLARE_ACCOUNT_ID,
		databaseId: Bun.env.CLOUDFLARE_DATABASE_ID,
		token: Bun.env.CLOUDFLARE_D1_TOKEN,
	},
})
