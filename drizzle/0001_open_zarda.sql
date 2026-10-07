CREATE TABLE `camera_observation_attempts` (
	`round_id` text NOT NULL,
	`camera_id` text NOT NULL,
	`started_at_ms` integer NOT NULL,
	`ended_at_ms` integer NOT NULL,
	`received_at_ms` integer NOT NULL,
	`outcome` text NOT NULL,
	`payload_json` text NOT NULL,
	`payload_sha256` text NOT NULL,
	`expires_at` integer NOT NULL,
	PRIMARY KEY(`round_id`, `camera_id`),
	FOREIGN KEY (`round_id`) REFERENCES `camera_observation_rounds`(`round_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "camera_observation_attempts_outcome_check" CHECK("camera_observation_attempts"."outcome" in ('playing', 'first_frame_only', 'failed', 'unknown', 'restricted', 'external'))
);
--> statement-breakpoint
CREATE INDEX `camera_observation_attempts_latest_idx` ON `camera_observation_attempts` (`camera_id`,`ended_at_ms`,`received_at_ms`,`round_id`);--> statement-breakpoint
CREATE INDEX `camera_observation_attempts_expires_idx` ON `camera_observation_attempts` (`expires_at`);--> statement-breakpoint
CREATE TABLE `camera_observation_rounds` (
	`round_id` text PRIMARY KEY NOT NULL,
	`expected_ids_json` text NOT NULL,
	`expected_count` integer NOT NULL,
	`state` text DEFAULT 'open' NOT NULL,
	`collector_id` text NOT NULL,
	`started_at_ms` integer NOT NULL,
	`finished_at_ms` integer,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	CONSTRAINT "camera_observation_rounds_state_check" CHECK("camera_observation_rounds"."state" in ('open', 'complete', 'partial', 'failed'))
);
--> statement-breakpoint
CREATE INDEX `camera_observation_rounds_state_started_idx` ON `camera_observation_rounds` (`state`,`started_at_ms`);--> statement-breakpoint
CREATE INDEX `camera_observation_rounds_expires_idx` ON `camera_observation_rounds` (`expires_at`);