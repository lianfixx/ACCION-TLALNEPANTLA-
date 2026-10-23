ALTER TABLE `staff_accounts` ADD `username` text;--> statement-breakpoint
CREATE UNIQUE INDEX `staff_username_unique` ON `staff_accounts` (`username`);