ALTER TABLE `discussions` ADD `title` text NOT NULL;--> statement-breakpoint
ALTER TABLE `discussions` ADD `text` text NOT NULL;--> statement-breakpoint
ALTER TABLE `discussions` ADD `author` text NOT NULL;--> statement-breakpoint
ALTER TABLE `discussions` ADD `score` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `discussions` ADD `subsource` text;--> statement-breakpoint
ALTER TABLE `discussions` ADD `comments` text;--> statement-breakpoint
ALTER TABLE `discussions` ADD `num_comments` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `discussions` ADD `relevance` real;--> statement-breakpoint
ALTER TABLE `discussions` ADD `timestamp` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `discussions` ADD `raw` text;--> statement-breakpoint
ALTER TABLE `discussions` ADD `created_at` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL;--> statement-breakpoint
ALTER TABLE `discussions` ADD `updated_at` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL;--> statement-breakpoint
ALTER TABLE `discussions` ADD `comments_updated_at` integer;--> statement-breakpoint
CREATE INDEX `discussion_source_index` ON `discussions` (`source`);--> statement-breakpoint
CREATE INDEX `discussion_subsource_index` ON `discussions` (`subsource`);--> statement-breakpoint
CREATE INDEX `discussion_timestamp_index` ON `discussions` (`timestamp`);--> statement-breakpoint
CREATE UNIQUE INDEX `discussion_source_source_id_unique` ON `discussions` (`source`,`source_id`);--> statement-breakpoint
CREATE INDEX `discussion_num_comments_index` ON `discussions` (`num_comments`);--> statement-breakpoint
CREATE INDEX `discussion_relevance_index` ON `discussions` (`relevance`);--> statement-breakpoint
ALTER TABLE `discussions` DROP COLUMN `data`;--> statement-breakpoint
ALTER TABLE `discussions` DROP COLUMN `scraped_at`;