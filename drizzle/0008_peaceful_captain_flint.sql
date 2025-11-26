ALTER TABLE `system_events` ADD `model_used` text;--> statement-breakpoint
ALTER TABLE `system_events` ADD `prompt_slug` text;--> statement-breakpoint
ALTER TABLE `system_events` ADD `prompt_version` integer;--> statement-breakpoint
ALTER TABLE `system_events` ADD `latency_ms` integer;--> statement-breakpoint
ALTER TABLE `system_events` ADD `cost_usd` real;