-- Migration: Add org_invites and project_shares tables
-- =============================================================================

-- Create org_invites table for pending invitations to join an organization
CREATE TABLE IF NOT EXISTS `org_invites` (
  `id` text PRIMARY KEY NOT NULL,
  `org_id` text NOT NULL REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  `email` text NOT NULL,
  `role` text DEFAULT 'member' NOT NULL,
  `invited_by` text REFERENCES `users`(`id`),
  `invited_at` integer NOT NULL,
  `accepted_at` integer,
  `expires_at` integer
);

-- Create index on email for faster lookups when user signs up
CREATE INDEX IF NOT EXISTS `org_invites_email_idx` ON `org_invites` (`email`);

-- Create project_shares table for sharing projects with other organizations
CREATE TABLE IF NOT EXISTS `project_shares` (
  `id` text PRIMARY KEY NOT NULL,
  `project_id` text NOT NULL REFERENCES `projects`(`id`) ON DELETE CASCADE,
  `org_id` text NOT NULL REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  `permission` text DEFAULT 'editor' NOT NULL,
  `invited_by` text REFERENCES `users`(`id`),
  `invited_at` integer NOT NULL,
  `accepted_at` integer
);

-- Create index for querying shares by org
CREATE INDEX IF NOT EXISTS `project_shares_org_idx` ON `project_shares` (`org_id`);

-- Create index for querying shares by project
CREATE INDEX IF NOT EXISTS `project_shares_project_idx` ON `project_shares` (`project_id`);
