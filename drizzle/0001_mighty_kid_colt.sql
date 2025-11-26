CREATE TABLE `user_knowledge_snapshot` (
	`user_id` text NOT NULL,
	`atom_id` text NOT NULL,
	`bucket` text NOT NULL,
	`proficiency` real NOT NULL,
	`stability` real NOT NULL,
	`last_review` integer NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	PRIMARY KEY(`user_id`, `atom_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `uks_bucket_idx` ON `user_knowledge_snapshot` (`user_id`,`bucket`);