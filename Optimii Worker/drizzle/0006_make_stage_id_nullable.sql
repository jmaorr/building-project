-- Migration: Make stage_id nullable in files table to support cost attachments
-- Files can now be attached to costs without requiring a stage_id

-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table
-- Step 1: Create new files table with nullable stage_id
CREATE TABLE `files_new` (
	`id` text PRIMARY KEY NOT NULL,
	`stage_id` text,
	`module_id` text,
	`cost_id` text,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`type` text,
	`size` integer,
	`category` text,
	`round_number` integer DEFAULT 1 NOT NULL,
	`uploaded_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`cost_id`) REFERENCES `costs`(`id`) ON DELETE CASCADE
);

-- Step 2: Copy data from old table
INSERT INTO `files_new` (`id`, `stage_id`, `module_id`, `cost_id`, `name`, `url`, `type`, `size`, `category`, `round_number`, `uploaded_by`, `created_at`)
SELECT `id`, `stage_id`, `module_id`, `cost_id`, `name`, `url`, `type`, `size`, `category`, `round_number`, `uploaded_by`, `created_at`
FROM `files`;

-- Step 3: Drop old table
DROP TABLE `files`;

-- Step 4: Rename new table to original name
ALTER TABLE `files_new` RENAME TO `files`;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_files_cost ON files(cost_id);
CREATE INDEX IF NOT EXISTS idx_files_stage ON files(stage_id);







