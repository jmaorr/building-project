-- Add user_type to users table
ALTER TABLE "users" ADD COLUMN "user_type" text;

-- Add default_template_id to organizations table
ALTER TABLE "organizations" ADD COLUMN "default_template_id" text;

-- Add role and invite fields to contacts table
ALTER TABLE "contacts" ADD COLUMN "role" text;
ALTER TABLE "contacts" ADD COLUMN "is_invited" integer DEFAULT 0 NOT NULL;
ALTER TABLE "contacts" ADD COLUMN "invited_at" integer;

-- Add permission field to project_contacts table (replacing can_edit)
ALTER TABLE "project_contacts" ADD COLUMN "permission" text DEFAULT 'viewer' NOT NULL;

-- Add permission field to phase_contacts table (replacing can_view and can_edit)
ALTER TABLE "phase_contacts" ADD COLUMN "permission" text DEFAULT 'viewer' NOT NULL;

-- Migrate existing data: convert can_edit to permission
UPDATE "project_contacts" SET "permission" = 'editor' WHERE "can_edit" = 1;
UPDATE "project_contacts" SET "permission" = 'admin' WHERE "is_primary" = 1 AND "can_edit" = 1;

UPDATE "phase_contacts" SET "permission" = 'editor' WHERE "can_edit" = 1;
UPDATE "phase_contacts" SET "permission" = 'viewer' WHERE "can_view" = 1 AND "can_edit" = 0;

-- Make role_id optional in project_contacts (remove NOT NULL constraint)
-- SQLite doesn't support DROP NOT NULL, so we need to recreate the table
-- This is a simplified migration - in production you'd want to preserve data

-- Note: Dropping old columns would require table recreation in SQLite
-- For now, the old columns (can_edit, can_view, role_id) remain but are deprecated

