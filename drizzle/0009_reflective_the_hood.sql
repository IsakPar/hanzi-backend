CREATE TABLE `content_exports` (
	`id` text PRIMARY KEY NOT NULL,
	`content_type` text NOT NULL,
	`hsk_level` integer NOT NULL,
	`version` text NOT NULL,
	`content_hash` text NOT NULL,
	`file_url` text NOT NULL,
	`exported_by` text,
	`exported_at` integer DEFAULT (strftime('%s', 'now')),
	`file_size_bytes` integer,
	`record_count` integer
);
--> statement-breakpoint
CREATE INDEX `content_exports_type_idx` ON `content_exports` (`content_type`,`hsk_level`);--> statement-breakpoint
CREATE TABLE `stories` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`subtitle` text,
	`author` text,
	`content_library_id` text,
	`description` text,
	`topic` text,
	`hsk_level` integer NOT NULL,
	`difficulty` text DEFAULT 'medium',
	`estimated_minutes` integer,
	`access_tier` text DEFAULT 'premium',
	`cover_image_r2_key` text,
	`practice_blocks` text,
	`is_published` integer DEFAULT false,
	`published_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`content_library_id`) REFERENCES `content_library`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `story_hsk_idx` ON `stories` (`hsk_level`);--> statement-breakpoint
CREATE INDEX `story_published_idx` ON `stories` (`is_published`);--> statement-breakpoint
CREATE INDEX `story_difficulty_idx` ON `stories` (`difficulty`);--> statement-breakpoint
CREATE TABLE `story_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`story_id` text NOT NULL,
	`order_index` integer NOT NULL,
	`question` text NOT NULL,
	`question_english` text,
	`question_type` text DEFAULT 'multiple_choice',
	`options` text,
	`correct_answer` text NOT NULL,
	`explanation` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `story_questions_story_idx` ON `story_questions` (`story_id`);--> statement-breakpoint
CREATE TABLE `story_sentences` (
	`id` text PRIMARY KEY NOT NULL,
	`story_id` text NOT NULL,
	`order_index` integer NOT NULL,
	`chinese` text NOT NULL,
	`pinyin` text NOT NULL,
	`english` text NOT NULL,
	`audio_r2_key` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `story_sentences_story_idx` ON `story_sentences` (`story_id`);--> statement-breakpoint
CREATE INDEX `story_sentences_order_idx` ON `story_sentences` (`story_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `story_vocabulary` (
	`story_id` text NOT NULL,
	`vocab_id` text NOT NULL,
	`context_sentence` text,
	PRIMARY KEY(`story_id`, `vocab_id`),
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vocab_id`) REFERENCES `vocabulary`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `story_vocab_story_idx` ON `story_vocabulary` (`story_id`);--> statement-breakpoint
CREATE TABLE `units` (
	`id` text PRIMARY KEY NOT NULL,
	`hsk_level` integer NOT NULL,
	`unit_number` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`gradient_start` text DEFAULT '#EEF2FF',
	`gradient_end` text DEFAULT '#C7D2FE',
	`accent_color` text DEFAULT '#4F46E5',
	`order_index` integer,
	`is_published` integer DEFAULT false,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX `units_hsk_level_idx` ON `units` (`hsk_level`,`unit_number`);--> statement-breakpoint
CREATE INDEX `units_published_idx` ON `units` (`is_published`);--> statement-breakpoint
CREATE TABLE `waitlist` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`source` text DEFAULT 'website',
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `waitlist_email_unique` ON `waitlist` (`email`);--> statement-breakpoint
CREATE INDEX `waitlist_email_idx` ON `waitlist` (`email`);--> statement-breakpoint
ALTER TABLE `content_library` ADD `upload_status` text DEFAULT 'ready';--> statement-breakpoint
ALTER TABLE `lessons` ADD `unit_id` text REFERENCES units(id);--> statement-breakpoint
ALTER TABLE `lessons` ADD `order_in_unit` integer;--> statement-breakpoint
ALTER TABLE `lessons` ADD `subtitle` text;--> statement-breakpoint
ALTER TABLE `lessons` ADD `lesson_number` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `lessons` ADD `lesson_type` text DEFAULT 'lesson' NOT NULL;--> statement-breakpoint
ALTER TABLE `lessons` ADD `display_order` integer;--> statement-breakpoint
ALTER TABLE `lessons` ADD `estimated_minutes` integer DEFAULT 15;--> statement-breakpoint
ALTER TABLE `lessons` ADD `grammar_points` text;--> statement-breakpoint
ALTER TABLE `lessons` ADD `tags` text;--> statement-breakpoint
ALTER TABLE `lessons` ADD `target_vocabulary` text;--> statement-breakpoint
CREATE INDEX `lessons_unit_idx` ON `lessons` (`unit_id`,`order_in_unit`);--> statement-breakpoint
CREATE INDEX `lessons_ordering_idx` ON `lessons` (`hsk_level`,`lesson_type`,`lesson_number`);--> statement-breakpoint
CREATE INDEX `lessons_type_idx` ON `lessons` (`lesson_type`);--> statement-breakpoint
CREATE INDEX `lessons_display_order_idx` ON `lessons` (`hsk_level`,`display_order`);--> statement-breakpoint
ALTER TABLE `vocabulary` ADD `word_audio_r2_key` text;--> statement-breakpoint
ALTER TABLE `vocabulary` ADD `example_chinese` text;--> statement-breakpoint
ALTER TABLE `vocabulary` ADD `example_pinyin` text;--> statement-breakpoint
ALTER TABLE `vocabulary` ADD `example_english` text;--> statement-breakpoint
ALTER TABLE `vocabulary` ADD `example_audio_r2_key` text;