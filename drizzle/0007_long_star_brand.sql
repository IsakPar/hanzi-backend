CREATE TABLE `prompt_template_history` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`from_version` integer,
	`to_version` integer NOT NULL,
	`reason` text,
	`changed_by` text,
	`created_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX `prompt_template_history_slug_idx` ON `prompt_template_history` (`slug`,`created_at`);--> statement-breakpoint
CREATE TABLE `prompt_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`version` integer NOT NULL,
	`status` text NOT NULL,
	`body` text NOT NULL,
	`notes` text,
	`metadata` text,
	`created_by` text,
	`promoted_by` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE INDEX `prompt_templates_slug_version_idx` ON `prompt_templates` (`slug`,`version`);--> statement-breakpoint
CREATE INDEX `prompt_templates_slug_status_idx` ON `prompt_templates` (`slug`,`status`);--> statement-breakpoint
ALTER TABLE `api_usage` ADD `prompt_slug` text;--> statement-breakpoint
ALTER TABLE `api_usage` ADD `prompt_version` integer;--> statement-breakpoint
CREATE INDEX `api_usage_prompt_idx` ON `api_usage` (`prompt_slug`,`prompt_version`);