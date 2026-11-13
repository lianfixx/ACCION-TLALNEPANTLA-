CREATE TABLE `outbound_emails` (
	`id` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`account_id` text,
	`subject` text NOT NULL,
	`status` text NOT NULL,
	`provider_id` text,
	`sent_by` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `staff_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `outbound_emails_account_idx` ON `outbound_emails` (`account_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `outbound_emails_batch_idx` ON `outbound_emails` (`batch_id`);--> statement-breakpoint
CREATE TABLE `person_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`body` text NOT NULL,
	`author_email` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `staff_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `person_notes_account_idx` ON `person_notes` (`account_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `person_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`tag` text NOT NULL,
	`created_at` integer NOT NULL,
	`created_by` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `staff_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `person_tag_unique` ON `person_tags` (`account_id`,`tag`);--> statement-breakpoint
CREATE INDEX `person_tags_tag_idx` ON `person_tags` (`tag`);--> statement-breakpoint
CREATE TABLE `site_content` (
	`key` text PRIMARY KEY NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `site_documents` (
	`slug` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`file_name` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`sha256` text NOT NULL,
	`uploaded_at` integer NOT NULL,
	`uploaded_by` text NOT NULL
);
