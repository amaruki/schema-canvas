CREATE TABLE `schema_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`schema_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`label` text,
	`snapshot` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`schema_id`) REFERENCES `schemas`(`id`) ON UPDATE no action ON DELETE cascade
);
