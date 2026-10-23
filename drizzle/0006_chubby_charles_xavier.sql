CREATE TABLE `membership_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_email` text NOT NULL,
	`name` text NOT NULL,
	`commission` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`reference_code` text NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`notice_version` text NOT NULL,
	`notice_snapshot` text NOT NULL,
	`consent_text` text NOT NULL,
	`consent_at` integer NOT NULL,
	`adult_self_declared` integer NOT NULL,
	`retention_until` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `membership_reference_unique` ON `membership_applications` (`reference_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `membership_active_owner_unique` ON `membership_applications` (`owner_email`) WHERE "membership_applications"."status" IN ('submitted','in_review','accepted');--> statement-breakpoint
CREATE INDEX `membership_owner_created_idx` ON `membership_applications` (`owner_email`,`created_at`);--> statement-breakpoint
CREATE INDEX `membership_status_created_idx` ON `membership_applications` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `membership_retention_idx` ON `membership_applications` (`retention_until`);--> statement-breakpoint
CREATE TABLE `membership_events` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`kind` text NOT NULL,
	`body` text NOT NULL,
	`actor_type` text NOT NULL,
	`actor_email` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `membership_applications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `membership_events_application_idx` ON `membership_events` (`application_id`,`created_at`);