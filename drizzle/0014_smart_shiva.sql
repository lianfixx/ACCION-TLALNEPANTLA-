CREATE TABLE `media_uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_upload_object_key_unique` ON `media_uploads` (`object_key`);--> statement-breakpoint
CREATE INDEX `media_upload_expiry_idx` ON `media_uploads` (`expires_at`);