ALTER TABLE `contact_requests` ADD `details_json` text;--> statement-breakpoint
ALTER TABLE `contact_requests` ADD `reference_code` text;--> statement-breakpoint
CREATE UNIQUE INDEX `contact_reference_code_unique` ON `contact_requests` (`reference_code`);