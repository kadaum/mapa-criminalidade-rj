CREATE TABLE `contribution_rate_limits` (
	`ip_hash` text NOT NULL,
	`window_start` integer NOT NULL,
	`request_count` integer DEFAULT 1 NOT NULL,
	`expires_at` integer NOT NULL,
	PRIMARY KEY(`ip_hash`, `window_start`)
);
--> statement-breakpoint
CREATE INDEX `contribution_rate_limits_expires_idx` ON `contribution_rate_limits` (`expires_at`);--> statement-breakpoint
CREATE TABLE `contributions` (
	`id` text PRIMARY KEY NOT NULL,
	`protocol_hash` text NOT NULL,
	`kind` text NOT NULL,
	`source_url` text,
	`comment` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`moderator_note` text,
	`created_at` integer NOT NULL,
	`reviewed_at` integer,
	`expires_at` integer NOT NULL,
	CONSTRAINT "contributions_kind_check" CHECK("contributions"."kind" in ('camera_broken', 'correct_location', 'suggest_source')),
	CONSTRAINT "contributions_status_check" CHECK("contributions"."status" in ('pending', 'reviewing', 'accepted', 'rejected'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contributions_protocol_hash_unique` ON `contributions` (`protocol_hash`);--> statement-breakpoint
CREATE INDEX `contributions_status_created_idx` ON `contributions` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `contributions_expires_idx` ON `contributions` (`expires_at`);