CREATE TABLE `staff_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text,
	`credential_version` integer DEFAULT 1 NOT NULL,
	`activation_hash` text,
	`activation_expires_at` integer,
	`disabled_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_email_unique` ON `staff_accounts` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `staff_activation_unique` ON `staff_accounts` (`activation_hash`);--> statement-breakpoint
CREATE TABLE `staff_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`credential_version` integer NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `staff_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `staff_sessions_account_idx` ON `staff_sessions` (`account_id`);--> statement-breakpoint
CREATE INDEX `staff_sessions_expiry_idx` ON `staff_sessions` (`expires_at`);