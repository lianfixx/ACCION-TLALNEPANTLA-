CREATE TABLE `request_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`kind` text NOT NULL,
	`body` text NOT NULL,
	`actor_email` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `contact_requests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `request_entries_request_created_idx` ON `request_entries` (`request_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`values_json` text NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by` text NOT NULL
);
