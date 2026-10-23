CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`author_email` text NOT NULL,
	`author_name` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	`moderated_at` integer,
	`moderated_by` text,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `comments_post_status_idx` ON `comments` (`post_id`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `contact_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text,
	`email` text,
	`phone` text,
	`institution` text,
	`message` text NOT NULL,
	`consent_at` integer,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `contact_status_created_idx` ON `contact_requests` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`alt_text` text NOT NULL,
	`visibility` text DEFAULT 'private' NOT NULL,
	`uploaded_by` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_object_key_unique` ON `media` (`object_key`);--> statement-breakpoint
CREATE INDEX `media_visibility_idx` ON `media` (`visibility`,`created_at`);--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`excerpt` text NOT NULL,
	`body` text NOT NULL,
	`cover_media_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`author_email` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`published_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `posts_slug_unique` ON `posts` (`slug`);--> statement-breakpoint
CREATE INDEX `posts_status_published_idx` ON `posts` (`status`,`published_at`);--> statement-breakpoint
CREATE TABLE `user_roles` (
	`email` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	`created_by` text NOT NULL
);
