ALTER TABLE `media` ADD `updated_at` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE media SET updated_at=created_at;
