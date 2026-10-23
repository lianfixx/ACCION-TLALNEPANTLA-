CREATE TABLE `commission_affiliations` (
	`account_id` text PRIMARY KEY NOT NULL,
	`folio` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'reported' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`verification_source` text DEFAULT '' NOT NULL,
	`reviewed_by` text,
	`verified_at` integer,
	`updated_at` integer NOT NULL,
	`retention_until` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `staff_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `commission_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`item_id` text,
	`category` text NOT NULL,
	`object_key` text NOT NULL,
	`name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`review_note` text DEFAULT '' NOT NULL,
	`reviewed_by` text,
	`notice_snapshot` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`retention_until` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `staff_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `commission_documents_owner_idx` ON `commission_documents` (`owner_id`,`category`);--> statement-breakpoint
CREATE INDEX `commission_documents_expiry_idx` ON `commission_documents` (`retention_until`);--> statement-breakpoint
CREATE TABLE `commission_items` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`commission` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`details_json` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`venue` text DEFAULT '' NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`space_confirmed` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`retention_until` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `staff_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `commission_items_area_idx` ON `commission_items` (`commission`,`updated_at`);--> statement-breakpoint
CREATE INDEX `commission_items_expiry_idx` ON `commission_items` (`retention_until`);--> statement-breakpoint
CREATE TABLE `commission_members` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`commission` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `staff_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `commission_member_unique` ON `commission_members` (`account_id`,`commission`);--> statement-breakpoint
CREATE TABLE `commission_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `commission_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `staff_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `commission_messages_item_idx` ON `commission_messages` (`item_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `workspace_consents` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`version` text NOT NULL,
	`snapshot` text NOT NULL,
	`accepted_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `staff_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `staff_accounts` ADD `registration_notice` text;--> statement-breakpoint
ALTER TABLE `staff_accounts` ADD `registration_consent_at` integer;--> statement-breakpoint
ALTER TABLE `staff_accounts` ADD `self_registered` integer DEFAULT false NOT NULL;