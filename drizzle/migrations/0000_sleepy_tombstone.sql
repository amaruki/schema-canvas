CREATE TABLE `columns` (
	`id` text PRIMARY KEY NOT NULL,
	`table_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`nullable` integer DEFAULT false NOT NULL,
	`primary_key` integer DEFAULT false NOT NULL,
	`unique` integer DEFAULT false NOT NULL,
	`default_value` text,
	`note` text,
	`increment` integer,
	`description` text,
	`foreign_key_table_id` text,
	`foreign_key_column_id` text,
	`foreign_key_on_delete` text,
	`foreign_key_on_update` text,
	FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `relationships` (
	`id` text PRIMARY KEY NOT NULL,
	`schema_id` text NOT NULL,
	`source_table_id` text NOT NULL,
	`source_column_id` text NOT NULL,
	`target_table_id` text NOT NULL,
	`target_column_id` text NOT NULL,
	`type` text NOT NULL,
	`is_inline` integer,
	`name` text,
	`on_delete` text,
	`on_update` text,
	FOREIGN KEY (`schema_id`) REFERENCES `schemas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `schemas` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT 'Untitled Schema' NOT NULL,
	`description` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tables` (
	`id` text PRIMARY KEY NOT NULL,
	`schema_id` text NOT NULL,
	`name` text NOT NULL,
	`alias` text,
	`note` text,
	`header_color` text,
	`position_x` real DEFAULT 0 NOT NULL,
	`position_y` real DEFAULT 0 NOT NULL,
	`description` text,
	`color` text,
	FOREIGN KEY (`schema_id`) REFERENCES `schemas`(`id`) ON UPDATE no action ON DELETE cascade
);
