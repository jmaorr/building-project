-- Add new columns to files table for stage support
-- SQLite doesn't support adding columns with constraints easily, so we need to recreate the table

-- Step 1: Create new files table with updated schema
CREATE TABLE `files_new` (
	`id` text PRIMARY KEY NOT NULL,
	`stage_id` text NOT NULL,
	`module_id` text,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`type` text,
	`size` integer,
	`category` text,
	`round_number` integer DEFAULT 1 NOT NULL,
	`uploaded_by` text,
	`created_at` integer NOT NULL
);

-- Step 2: Copy data from old table (if any exists)
INSERT INTO `files_new` (`id`, `stage_id`, `module_id`, `name`, `url`, `type`, `size`, `category`, `round_number`, `uploaded_by`, `created_at`)
SELECT `id`, COALESCE(`module_id`, 'unknown'), `module_id`, `name`, `url`, `type`, `size`, `category`, 1, `uploaded_by`, `created_at`
FROM `files`;

-- Step 3: Drop old table
DROP TABLE `files`;

-- Step 4: Rename new table to original name
ALTER TABLE `files_new` RENAME TO `files`;

