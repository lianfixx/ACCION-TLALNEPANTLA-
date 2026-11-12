CREATE TABLE `staff_email_verifications` (
	`account_id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`email` text NOT NULL,
	`credential_version` integer NOT NULL,
	`return_to` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `staff_accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_email_verification_token_unique` ON `staff_email_verifications` (`token_hash`);--> statement-breakpoint
ALTER TABLE `staff_accounts` ADD `email_verification_required` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `staff_accounts` ADD `email_verified_at` integer;