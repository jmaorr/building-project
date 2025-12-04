-- Migration: Update costs table and add costId to files
-- Recreate costs table with new unified schema

-- Drop existing costs table and recreate with new schema
DROP TABLE IF EXISTS costs;

CREATE TABLE costs (
  id TEXT PRIMARY KEY,
  
  -- Hierarchical linking - project required, phase/stage optional
  project_id TEXT NOT NULL,
  phase_id TEXT,
  stage_id TEXT,
  
  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  
  -- Amount tracking
  quoted_amount REAL,
  actual_amount REAL,
  paid_amount REAL DEFAULT 0,
  
  -- Payment status
  payment_status TEXT NOT NULL DEFAULT 'not_started' CHECK (payment_status IN ('not_started', 'quoted', 'approved', 'partially_paid', 'paid')),
  
  -- Vendor/Payee
  vendor_contact_id TEXT,
  vendor_name TEXT,
  
  -- Payment tracking
  payment_method TEXT CHECK (payment_method IN ('external', 'platform')),
  paid_at INTEGER,
  
  notes TEXT,
  
  created_by TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE CASCADE,
  FOREIGN KEY (stage_id) REFERENCES stages(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_contact_id) REFERENCES contacts(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Create indexes for costs
CREATE INDEX idx_costs_project ON costs(project_id);
CREATE INDEX idx_costs_phase ON costs(phase_id);
CREATE INDEX idx_costs_stage ON costs(stage_id);
CREATE INDEX idx_costs_status ON costs(payment_status);

-- Add cost_id column to files table for cost attachments
ALTER TABLE files ADD COLUMN cost_id TEXT REFERENCES costs(id) ON DELETE CASCADE;

-- Create index for cost files
CREATE INDEX idx_files_cost ON files(cost_id);

