import { env } from 'cloudflare:workers'
import { drizzle } from 'drizzle-orm/d1'

const db = drizzle(env.DB)

export default db
