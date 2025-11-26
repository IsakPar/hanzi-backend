CREATE TABLE `content_library` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`subtitle` text,
	`author` text,
	`narrator` text,
	`description` text,
	`content_type` text NOT NULL,
	`format` text,
	`hsk_level` integer,
	`difficulty` text,
	`target_audience` text,
	`r2_key` text NOT NULL,
	`file_size` integer,
	`duration` integer,
	`page_count` integer,
	`cover_image_r2_key` text,
	`sample_r2_key` text,
	`category` text,
	`genre` text,
	`series_name` text,
	`series_order` integer,
	`is_published` integer DEFAULT false,
	`is_featured` integer DEFAULT false,
	`is_free` integer DEFAULT true,
	`requires_premium` integer DEFAULT false,
	`view_count` integer DEFAULT 0,
	`favorite_count` integer DEFAULT 0,
	`average_rating` real,
	`language` text DEFAULT 'zh',
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	`published_at` integer
);
--> statement-breakpoint
CREATE INDEX `content_type_idx` ON `content_library` (`content_type`);--> statement-breakpoint
CREATE INDEX `content_hsk_idx` ON `content_library` (`hsk_level`);--> statement-breakpoint
CREATE INDEX `content_category_idx` ON `content_library` (`category`);--> statement-breakpoint
CREATE INDEX `content_published_idx` ON `content_library` (`is_published`);--> statement-breakpoint
CREATE INDEX `content_featured_idx` ON `content_library` (`is_featured`);--> statement-breakpoint
CREATE TABLE `content_tags` (
	`content_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`content_id`, `tag_id`),
	FOREIGN KEY (`content_id`) REFERENCES `content_library`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `content_tags_content_idx` ON `content_tags` (`content_id`);--> statement-breakpoint
CREATE INDEX `content_tags_tag_idx` ON `content_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`category` text,
	`color` text,
	`description` text,
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `tags_slug_unique` ON `tags` (`slug`);--> statement-breakpoint
CREATE TABLE `user_library` (
	`user_id` text NOT NULL,
	`content_id` text NOT NULL,
	`is_favorite` integer DEFAULT false,
	`status` text DEFAULT 'not_started',
	`progress_seconds` integer DEFAULT 0,
	`progress_page` integer DEFAULT 0,
	`progress_percentage` real DEFAULT 0,
	`user_rating` integer,
	`started_at` integer,
	`completed_at` integer,
	`last_accessed_at` integer DEFAULT (strftime('%s', 'now')),
	PRIMARY KEY(`user_id`, `content_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`content_id`) REFERENCES `content_library`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_library_user_idx` ON `user_library` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_library_favorites_idx` ON `user_library` (`user_id`,`is_favorite`);--> statement-breakpoint
CREATE INDEX `user_library_status_idx` ON `user_library` (`user_id`,`status`);