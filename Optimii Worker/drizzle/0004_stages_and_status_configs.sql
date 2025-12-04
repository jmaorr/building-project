-- Migration: Create stages table and status_configs table
-- Stages table for persistent stage data

-- Drop existing stages table if it exists and recreate
DROP TABLE IF EXISTS stages;

CREATE TABLE stages (
  id TEXT PRIMARY KEY,
  phase_id TEXT NOT NULL,
  module_type_id TEXT NOT NULL,
  template_module_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  custom_name TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'awaiting_approval', 'completed', 'on_hold')),
  allows_rounds INTEGER NOT NULL DEFAULT 0,
  current_round INTEGER NOT NULL DEFAULT 1,
  requires_approval INTEGER NOT NULL DEFAULT 0,
  approval_contact_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Create indexes for stages
CREATE INDEX idx_stages_phase ON stages(phase_id);
CREATE INDEX idx_stages_status ON stages(status);

-- Status configs table for customizable status workflows
DROP TABLE IF EXISTS status_configs;

CREATE TABLE status_configs (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  project_id TEXT,
  entity_type TEXT NOT NULL DEFAULT 'stage' CHECK (entity_type IN ('stage', 'project', 'phase')),
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'gray',
  "order" INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0,
  is_final INTEGER NOT NULL DEFAULT 0,
  triggers_approval INTEGER NOT NULL DEFAULT 0,
  is_system INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Create indexes for status_configs
CREATE INDEX idx_status_configs_org ON status_configs(org_id);
CREATE INDEX idx_status_configs_project ON status_configs(project_id);
CREATE INDEX idx_status_configs_entity ON status_configs(entity_type);

-- Seed default stage statuses (system-wide)
INSERT INTO status_configs (id, org_id, project_id, entity_type, code, label, color, "order", is_default, is_final, triggers_approval, is_system, created_at, updated_at)
VALUES 
  ('status-not-started', NULL, NULL, 'stage', 'not_started', 'Not Started', 'gray', 0, 1, 0, 0, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('status-in-progress', NULL, NULL, 'stage', 'in_progress', 'In Progress', 'blue', 1, 0, 0, 0, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('status-awaiting-approval', NULL, NULL, 'stage', 'awaiting_approval', 'Awaiting Approval', 'amber', 2, 0, 0, 0, 1, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('status-completed', NULL, NULL, 'stage', 'completed', 'Completed', 'green', 3, 0, 1, 1, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000),
  ('status-on-hold', NULL, NULL, 'stage', 'on_hold', 'On Hold', 'yellow', 4, 0, 0, 0, 0, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000);

