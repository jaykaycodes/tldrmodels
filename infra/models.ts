import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const DISCUSSION_SOURCES = ['hackernews', 'reddit', 'twitter', 'article'] as const
export type DiscussionSource = (typeof DISCUSSION_SOURCES)[number]

export interface DiscussionData {
	id: string
	type: 'op' | 'reply'
	text: string
	timestamp: number
	author?: string
	authorId?: string
	raw?: unknown
}

export const Discussion = sqliteTable('discussions', {
	id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
	source: text('source', { enum: DISCUSSION_SOURCES }).notNull(),
	data: text('data', { mode: 'json' }).notNull().$type<DiscussionData>(),
	sourceId: text('source_id').notNull(),
	scrapedAt: integer('scraped_at', { mode: 'timestamp' }).notNull().default(sql`(CURRENT_TIMESTAMP)`),
})
