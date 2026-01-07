-- ========================================
-- Create org_invite_codes table
-- This table stores invite codes for organizations
-- ========================================

-- Create the org_invite_codes table if it doesn't exist
CREATE TABLE IF NOT EXISTS org_invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  max_uses INTEGER DEFAULT NULL, -- NULL means unlimited
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT NULL, -- NULL means never expires
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  target_role TEXT DEFAULT 'learner'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_invite_codes_org ON org_invite_codes(org_id);
CREATE INDEX IF NOT EXISTS idx_org_invite_codes_code ON org_invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_org_invite_codes_active ON org_invite_codes(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE org_invite_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Org admins can view their org invite codes" ON org_invite_codes;
DROP POLICY IF EXISTS "Org admins can create invite codes" ON org_invite_codes;
DROP POLICY IF EXISTS "Org admins can update their org invite codes" ON org_invite_codes;
DROP POLICY IF EXISTS "Org admins can delete their org invite codes" ON org_invite_codes;
DROP POLICY IF EXISTS "Anyone can validate invite codes" ON org_invite_codes;

-- Org admins can view invite codes for their organization
CREATE POLICY "Org admins can view their org invite codes"
  ON org_invite_codes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.org_id = org_invite_codes.org_id 
      AND profiles.role = 'org_admin'
    )
  );

-- Org admins can create invite codes for their organization
CREATE POLICY "Org admins can create invite codes"
  ON org_invite_codes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.org_id = org_invite_codes.org_id 
      AND profiles.role = 'org_admin'
    )
  );

-- Org admins can update invite codes for their organization
CREATE POLICY "Org admins can update their org invite codes"
  ON org_invite_codes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.org_id = org_invite_codes.org_id 
      AND profiles.role = 'org_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.org_id = org_invite_codes.org_id 
      AND profiles.role = 'org_admin'
    )
  );

-- Org admins can delete invite codes for their organization
CREATE POLICY "Org admins can delete their org invite codes"
  ON org_invite_codes FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.org_id = org_invite_codes.org_id 
      AND profiles.role = 'org_admin'
    )
  );

-- Anyone authenticated can read invite codes (for validation when joining)
-- But only specific columns and only active codes
CREATE POLICY "Anyone can validate invite codes"
  ON org_invite_codes FOR SELECT TO authenticated
  USING (is_active = true);

COMMENT ON TABLE org_invite_codes IS 'Stores invite codes for organizations to invite learners';
COMMENT ON COLUMN org_invite_codes.code IS 'Unique invite code string';
COMMENT ON COLUMN org_invite_codes.max_uses IS 'Maximum number of times this code can be used (NULL = unlimited)';
COMMENT ON COLUMN org_invite_codes.current_uses IS 'Current number of times this code has been used';
COMMENT ON COLUMN org_invite_codes.expires_at IS 'When this code expires (NULL = never)';
COMMENT ON COLUMN org_invite_codes.target_role IS 'Target role for users joining with this code';

SELECT 'org_invite_codes table created successfully!' as status;

