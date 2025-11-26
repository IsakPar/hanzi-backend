CREATE TABLE `daily_usage` (
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`request_count` integer DEFAULT 0,
	`token_count` integer DEFAULT 0,
	PRIMARY KEY(`user_id`, `date`)
);
