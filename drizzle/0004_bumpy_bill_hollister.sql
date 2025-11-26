CREATE TABLE `ai_models` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`provider` text NOT NULL,
	`cost_per_1k_input` real NOT NULL,
	`cost_per_1k_output` real NOT NULL,
	`is_active` integer DEFAULT false,
	`tier` text NOT NULL,
	`max_tokens` integer DEFAULT 4096,
	`supports_json` integer DEFAULT true,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE TABLE `api_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`request_id` text NOT NULL,
	`model_used` text NOT NULL,
	`input_tokens` integer DEFAULT 0,
	`output_tokens` integer DEFAULT 0,
	`total_tokens` integer DEFAULT 0,
	`estimated_cost` real DEFAULT 0,
	`latency_ms` integer,
	`success` integer DEFAULT true,
	`error_message` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `api_usage_user_idx` ON `api_usage` (`user_id`);--> statement-breakpoint
CREATE INDEX `api_usage_model_idx` ON `api_usage` (`model_used`);--> statement-breakpoint
CREATE INDEX `api_usage_date_idx` ON `api_usage` (`created_at`);