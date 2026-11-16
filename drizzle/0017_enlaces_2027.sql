CREATE TABLE `enlaces_applications` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`cycle` text NOT NULL,
	`track` text DEFAULT '' NOT NULL,
	`commission` text DEFAULT '' NOT NULL,
	`community_kind` text DEFAULT '' NOT NULL,
	`community_name` text DEFAULT '' NOT NULL,
	`birth_date` text DEFAULT '' NOT NULL,
	`city_tie` text DEFAULT '' NOT NULL,
	`city_tie_detail` text DEFAULT '' NOT NULL,
	`motives_text` text DEFAULT '' NOT NULL,
	`previous_participation` text DEFAULT '' NOT NULL,
	`proposal` text DEFAULT '' NOT NULL,
	`publish_name_ok` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`reference_code` text NOT NULL,
	`notice_version` text NOT NULL,
	`notice_snapshot` text NOT NULL,
	`consent_at` integer NOT NULL,
	`submitted_at` integer,
	`interview_note` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`retention_until` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `staff_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enlaces_reference_unique` ON `enlaces_applications` (`reference_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `enlaces_active_account_unique` ON `enlaces_applications` (`account_id`,`cycle`) WHERE "enlaces_applications"."status" <> 'withdrawn';--> statement-breakpoint
CREATE INDEX `enlaces_cycle_status_idx` ON `enlaces_applications` (`cycle`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `enlaces_scores` (
	`application_id` text PRIMARY KEY NOT NULL,
	`motives` integer NOT NULL,
	`proposal` integer NOT NULL,
	`participation` integer NOT NULL,
	`recommendation` integer NOT NULL,
	`total` integer NOT NULL,
	`scored_by` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `enlaces_applications`(`id`) ON UPDATE no action ON DELETE cascade
);
