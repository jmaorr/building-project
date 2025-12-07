-- Clean Database Script
-- This script deletes all data from all tables while preserving the schema
-- Run with: wrangler d1 execute optimii-db --file=scripts/clean-db.sql --remote

-- Disable foreign key checks temporarily
PRAGMA foreign_keys = OFF;

-- Delete all data from tables (in reverse dependency order to be safe)
DELETE FROM approvals;
DELETE FROM tasks;
DELETE FROM payments;
DELETE FROM costs;
DELETE FROM files;
DELETE FROM project_shares;
DELETE FROM phase_contacts;
DELETE FROM project_contacts;
DELETE FROM contacts;
DELETE FROM contact_roles;
DELETE FROM org_invites;
DELETE FROM organization_members;
DELETE FROM organizations;
DELETE FROM users;
DELETE FROM phase_modules;
DELETE FROM stages;
DELETE FROM phases;
DELETE FROM projects;
DELETE FROM template_modules;
DELETE FROM template_phases;
DELETE FROM project_templates;
DELETE FROM status_configs;
DELETE FROM module_types;
DELETE FROM notes;
DELETE FROM timeline_events;

-- Re-enable foreign key checks
PRAGMA foreign_keys = ON;

-- Verify tables are empty (optional - for debugging)
-- SELECT 'activity_logs' as table_name, COUNT(*) as count FROM activity_logs
-- UNION ALL SELECT 'approvals', COUNT(*) FROM approvals
-- UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
-- UNION ALL SELECT 'payments', COUNT(*) FROM payments
-- UNION ALL SELECT 'costs', COUNT(*) FROM costs
-- UNION ALL SELECT 'files', COUNT(*) FROM files
-- UNION ALL SELECT 'project_shares', COUNT(*) FROM project_shares
-- UNION ALL SELECT 'phase_contacts', COUNT(*) FROM phase_contacts
-- UNION ALL SELECT 'project_contacts', COUNT(*) FROM project_contacts
-- UNION ALL SELECT 'contacts', COUNT(*) FROM contacts
-- UNION ALL SELECT 'contact_roles', COUNT(*) FROM contact_roles
-- UNION ALL SELECT 'org_invites', COUNT(*) FROM org_invites
-- UNION ALL SELECT 'organization_members', COUNT(*) FROM organization_members
-- UNION ALL SELECT 'organizations', COUNT(*) FROM organizations
-- UNION ALL SELECT 'users', COUNT(*) FROM users
-- UNION ALL SELECT 'phase_modules', COUNT(*) FROM phase_modules
-- UNION ALL SELECT 'stages', COUNT(*) FROM stages
-- UNION ALL SELECT 'phases', COUNT(*) FROM phases
-- UNION ALL SELECT 'projects', COUNT(*) FROM projects
-- UNION ALL SELECT 'template_stages', COUNT(*) FROM template_stages
-- UNION ALL SELECT 'template_phases', COUNT(*) FROM template_phases
-- UNION ALL SELECT 'project_templates', COUNT(*) FROM project_templates
-- UNION ALL SELECT 'status_configs', COUNT(*) FROM status_configs
-- UNION ALL SELECT 'module_types', COUNT(*) FROM module_types;

