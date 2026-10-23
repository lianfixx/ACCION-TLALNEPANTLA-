CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text NOT NULL,
	`identity_hash` text NOT NULL,
	`window_started_at` integer NOT NULL,
	`count` integer DEFAULT 1 NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_limits_expiry_idx` ON `rate_limits` (`expires_at`);--> statement-breakpoint
ALTER TABLE `comments` ADD `notice_version` text NOT NULL DEFAULT 'legacy-unversioned';--> statement-breakpoint
ALTER TABLE `comments` ADD `consent_at` integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `comments` ADD `retention_until` integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `contact_requests` ADD `notice_version` text NOT NULL DEFAULT 'legacy-unversioned';--> statement-breakpoint
ALTER TABLE `contact_requests` ADD `retention_until` integer NOT NULL DEFAULT 0;
