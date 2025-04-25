import { sql } from 'drizzle-orm'
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const DISCUSSION_SOURCES = ['hackernews', 'reddit', 'twitter', 'article'] as const
export type DiscussionSource = (typeof DISCUSSION_SOURCES)[number]

export interface DiscussionComment {
	id: string
	text: string
	score: number
	author: string
	timestamp: number
	comments: DiscussionComment[]
}

export const Discussion = sqliteTable(
	'discussions',
	{
		id: integer({ mode: 'number' }).primaryKey({ autoIncrement: true }),
		title: text('title').notNull(),
		text: text('text').notNull(),
		author: text('author').notNull(),
		score: integer('score').notNull(),
		source: text('source', { enum: DISCUSSION_SOURCES }).notNull(),
		/** used for subreddit indexing */
		subsource: text('subsource'),
		sourceId: text('source_id').notNull(),
		comments: text('comments', { mode: 'json' }).$type<DiscussionComment[]>(),
		numComments: integer('num_comments').notNull().default(0),
		relevance: real('relevance'),
		timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
		raw: text('raw', { mode: 'json' }),
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(CURRENT_TIMESTAMP)`),
		updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(CURRENT_TIMESTAMP)`),
		commentsUpdatedAt: integer('comments_updated_at', { mode: 'timestamp' }),
	},
	(t) => [
		index('discussion_source_index').on(t.source),
		index('discussion_subsource_index').on(t.subsource),
		index('discussion_timestamp_index').on(t.timestamp),
		uniqueIndex('discussion_source_source_id_unique').on(t.source, t.sourceId),
		index('discussion_num_comments_index').on(t.numComments),
		index('discussion_relevance_index').on(t.relevance),
	],
)
export type Discussion = typeof Discussion.$inferSelect
export type DiscussionInsert = typeof Discussion.$inferInsert
