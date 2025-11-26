CREATE TABLE `vocabulary` (
	`id` text PRIMARY KEY NOT NULL,
	`hanzi` text NOT NULL,
	`pinyin` text NOT NULL,
	`english` text NOT NULL,
	`category` text NOT NULL,
	`hsk_level` integer NOT NULL,
	`tags` text
);
--> statement-breakpoint
CREATE INDEX `vocab_category_idx` ON `vocabulary` (`category`);--> statement-breakpoint
CREATE INDEX `vocab_level_idx` ON `vocabulary` (`hsk_level`);