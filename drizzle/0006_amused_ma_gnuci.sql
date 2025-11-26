CREATE TABLE `system_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`request_id` text,
	`user_id` text,
	`metadata` text,
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX `system_events_type_idx` ON `system_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `system_events_created_idx` ON `system_events` (`created_at`);