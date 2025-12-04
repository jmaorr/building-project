-- Migration: Create/Update approvals table with assignee fields
-- Drop existing table if it exists and recreate with new schema
DROP TABLE IF EXISTS approvals;

CREATE TABLE approvals (
  id TEXT PRIMARY KEY,
  stage_id TEXT NOT NULL,
  module_id TEXT,
  title TEXT NOT NULL DEFAULT 'Approval Request',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revision_required')),
  document_url TEXT,
  round_number INTEGER NOT NULL DEFAULT 1,
  requested_by TEXT,
  requester_name TEXT,
  requested_at INTEGER NOT NULL,
  assigned_to TEXT,
  assignee_name TEXT,
  approved_by TEXT,
  approved_at INTEGER,
  notes TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Create index for faster queries
CREATE INDEX idx_approvals_stage_round ON approvals(stage_id, round_number);
CREATE INDEX idx_approvals_status ON approvals(status);
