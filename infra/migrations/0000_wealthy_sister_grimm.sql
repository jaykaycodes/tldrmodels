CREATE TABLE `discussions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text NOT NULL,
	`data` text NOT NULL,
	`source_id` text NOT NULL,
	`scraped_at` integer DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
