-- FlowForge Database Schema for Supabase
-- Run this in the Supabase SQL Editor

-- ==================== CONVERSATIONS ====================
CREATE TABLE IF NOT EXISTS flowforge_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identity
  tool_name TEXT,
  description TEXT,
  unit TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  icon TEXT DEFAULT 'default',
  
  -- Creator
  created_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  created_by_email TEXT,
  
  -- Workflow Link
  engine_workflow_id TEXT,
  engine_workflow_url TEXT,
  current_workflow_json JSONB,
  workflow_version INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'building' CHECK (status IN (
    'building', 'ready', 'pending_approval', 'changes_requested',
    'deployed', 'active', 'inactive', 'error', 'draft',
    'update_pending_approval', 'archived'
  )),
  
  -- Tool Metadata
  trigger_type TEXT,
  trigger_description TEXT,
  systems_used TEXT[] DEFAULT '{}',
  
  -- Execution Tracking
  execution_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_execution_at TIMESTAMPTZ,
  last_error_message TEXT,
  
  -- Alert Config
  alert_on_failure BOOLEAN DEFAULT true,
  alert_channels TEXT[] DEFAULT '{"slack"}',
  
  -- Access
  access_level TEXT DEFAULT 'unit',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deployed_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fc_unit ON flowforge_conversations(unit);
CREATE INDEX IF NOT EXISTS idx_fc_status ON flowforge_conversations(status);
CREATE INDEX IF NOT EXISTS idx_fc_created_by ON flowforge_conversations(created_by);

-- ==================== MESSAGES ====================
CREATE TABLE IF NOT EXISTS flowforge_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES flowforge_conversations(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  -- Voice
  has_voice BOOLEAN DEFAULT false,
  voice_url TEXT,
  voice_duration_seconds INTEGER,
  voice_transcription TEXT,
  
  -- Rich Content
  has_workflow_preview BOOLEAN DEFAULT false,
  workflow_preview_json JSONB,
  workflow_version INTEGER,
  
  has_action_buttons BOOLEAN DEFAULT false,
  action_buttons JSONB,
  
  has_execution_result BOOLEAN DEFAULT false,
  execution_result JSONB,
  
  has_duplicate_alert BOOLEAN DEFAULT false,
  duplicate_data JSONB,
  
  has_integration_check BOOLEAN DEFAULT false,
  integration_check_data JSONB,
  
  -- Metadata
  message_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fm_conversation ON flowforge_messages(conversation_id, message_index);

-- ==================== APPROVALS ====================
CREATE TABLE IF NOT EXISTS flowforge_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES flowforge_conversations(id),
  
  -- Request
  request_type TEXT NOT NULL CHECK (request_type IN ('new_tool', 'update', 'activate', 'delete', 'move')),
  requested_by TEXT NOT NULL,
  requested_by_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  
  -- Content
  request_summary TEXT NOT NULL,
  request_details JSONB NOT NULL,
  current_state JSONB,
  proposed_changes JSONB,
  impact_assessment JSONB,
  similar_tools_found JSONB,
  
  -- Workflow Data
  proposed_workflow_json JSONB,
  current_workflow_json JSONB,
  
  -- Decision
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'changes_requested', 'cancelled')),
  decided_by TEXT,
  decided_by_name TEXT,
  decision_note TEXT,
  decided_at TIMESTAMPTZ,
  
  -- Notifications
  admin_notified BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,
  reminder_sent_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fa_status ON flowforge_approvals(status);
CREATE INDEX IF NOT EXISTS idx_fa_unit ON flowforge_approvals(unit);
CREATE INDEX IF NOT EXISTS idx_fa_conversation ON flowforge_approvals(conversation_id);

-- ==================== ADMINS ====================
CREATE TABLE IF NOT EXISTS flowforge_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  admin_type TEXT NOT NULL CHECK (admin_type IN ('unit_admin', 'company_admin')),
  unit TEXT,
  assigned_by TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, unit)
);

-- ==================== WORKFLOW INVENTORY ====================
CREATE TABLE IF NOT EXISTS flowforge_workflow_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  engine_workflow_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  nodes_summary TEXT,
  trigger_type TEXT,
  is_active BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  unit TEXT,
  conversation_id UUID REFERENCES flowforge_conversations(id),
  is_flowforge_created BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  engine_created_at TIMESTAMPTZ,
  engine_updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fwi_engine_id ON flowforge_workflow_inventory(engine_workflow_id);

-- ==================== WORKFLOW VERSIONS ====================
CREATE TABLE IF NOT EXISTS flowforge_workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES flowforge_conversations(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  workflow_json JSONB NOT NULL,
  change_description TEXT,
  deployed BOOLEAN DEFAULT false,
  approval_id UUID REFERENCES flowforge_approvals(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== INTEGRATIONS ====================
CREATE TABLE IF NOT EXISTS flowforge_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  internal_type TEXT NOT NULL UNIQUE,
  credential_name TEXT,
  status TEXT DEFAULT 'not_connected' CHECK (status IN ('connected', 'not_connected', 'needs_setup')),
  icon TEXT,
  last_verified_at TIMESTAMPTZ,
  setup_instructions TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default integrations with user-friendly names
INSERT INTO flowforge_integrations (display_name, internal_type, status, icon) VALUES
  ('Database Access', 'supabase', 'connected', 'database'),
  ('Email Sending (Gmail)', 'gmail', 'not_connected', 'mail'),
  ('Calendar Access (Google Calendar)', 'google_calendar', 'not_connected', 'calendar'),
  ('Spreadsheet Access (Google Sheets)', 'google_sheets', 'not_connected', 'table'),
  ('Team Notifications (Slack)', 'slack', 'not_connected', 'message-square'),
  ('WhatsApp Messaging', 'whatsapp', 'not_connected', 'phone'),
  ('LinkedIn Integration', 'linkedin', 'not_connected', 'linkedin'),
  ('AI Text Generation', 'anthropic', 'connected', 'bot'),
  ('Voice Processing', 'whisper', 'connected', 'mic'),
  ('External API Connection', 'http_request', 'connected', 'globe'),
  ('Scheduled Automation', 'cron', 'connected', 'clock')
ON CONFLICT (internal_type) DO NOTHING;

-- ==================== EXECUTION LOG ====================
CREATE TABLE IF NOT EXISTS flowforge_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES flowforge_conversations(id),
  engine_execution_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'running', 'waiting')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  trigger_source TEXT,
  error_message TEXT,
  execution_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fel_conversation ON flowforge_execution_log(conversation_id, created_at DESC);

-- ==================== ACTIVITY ====================
CREATE TABLE IF NOT EXISTS flowforge_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES flowforge_conversations(id),
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== NOTIFICATIONS ====================
CREATE TABLE IF NOT EXISTS flowforge_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fn_user ON flowforge_notifications(user_id, is_read, created_at DESC);

-- Enable Row Level Security
ALTER TABLE flowforge_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowforge_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowforge_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowforge_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowforge_workflow_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowforge_workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowforge_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowforge_execution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowforge_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE flowforge_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for service role (full access)
CREATE POLICY "Service role has full access to conversations" ON flowforge_conversations FOR ALL USING (true);
CREATE POLICY "Service role has full access to messages" ON flowforge_messages FOR ALL USING (true);
CREATE POLICY "Service role has full access to approvals" ON flowforge_approvals FOR ALL USING (true);
CREATE POLICY "Service role has full access to admins" ON flowforge_admins FOR ALL USING (true);
CREATE POLICY "Service role has full access to inventory" ON flowforge_workflow_inventory FOR ALL USING (true);
CREATE POLICY "Service role has full access to versions" ON flowforge_workflow_versions FOR ALL USING (true);
CREATE POLICY "Service role has full access to integrations" ON flowforge_integrations FOR ALL USING (true);
CREATE POLICY "Service role has full access to execution_log" ON flowforge_execution_log FOR ALL USING (true);
CREATE POLICY "Service role has full access to activity" ON flowforge_activity FOR ALL USING (true);
CREATE POLICY "Service role has full access to notifications" ON flowforge_notifications FOR ALL USING (true);

-- Done
SELECT 'FlowForge schema created successfully' as status;
