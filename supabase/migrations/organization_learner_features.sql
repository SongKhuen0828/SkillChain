-- ========================================
-- Organization Learner Features Migration
-- 1. Allow inviting Learners (not just Educators)
-- 2. Add profile_public field for Learners
-- 3. Add course visibility (private/public/org_only)
-- 4. Learner can only belong to ONE organization
-- ========================================

-- 1. Add profile_public to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_public BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN profiles.profile_public IS 'Whether learner profile is visible to organizations for invitations';

-- 2. Add visibility to courses table
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' 
CHECK (visibility IN ('private', 'public', 'org_only'));

COMMENT ON COLUMN courses.visibility IS 'Course visibility: private (only creator), public (everyone), org_only (organization members only)';

-- 3. Update org_invite_codes to support Learner invitations
-- Add target_role column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'org_invite_codes' AND column_name = 'target_role'
  ) THEN
    ALTER TABLE org_invite_codes ADD COLUMN target_role TEXT DEFAULT 'learner';
  END IF;
END $$;

-- Update existing codes to target learners
UPDATE org_invite_codes SET target_role = 'learner' WHERE target_role IS NULL;

-- 4. Create org_members table for tracking organization membership
CREATE TABLE IF NOT EXISTS org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'learner', -- 'learner' | 'educator' | 'admin'
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id) -- Learner can only belong to ONE organization
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for org_members
CREATE POLICY "Users can view their own membership"
  ON org_members FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Org admins can view all members"
  ON org_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.org_id = org_members.org_id 
      AND profiles.role = 'org_admin'
    )
  );

CREATE POLICY "Org admins can insert members"
  ON org_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.org_id = org_members.org_id 
      AND profiles.role = 'org_admin'
    )
  );

CREATE POLICY "Org admins can delete members"
  ON org_members FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.org_id = org_members.org_id 
      AND profiles.role = 'org_admin'
    )
  );

-- 5. Function to join organization using invite code (for Learners)
CREATE OR REPLACE FUNCTION join_organization_with_code(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite org_invite_codes%ROWTYPE;
  v_user_id UUID;
  v_user_role TEXT;
  v_existing_membership UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get user's current role
  SELECT role INTO v_user_role FROM profiles WHERE id = v_user_id;
  
  -- Check if code is valid
  SELECT * INTO v_invite 
  FROM org_invite_codes 
  WHERE code = p_code 
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR current_uses < max_uses);
  
  IF v_invite.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invite code');
  END IF;
  
  -- Check if user already belongs to an organization
  SELECT id INTO v_existing_membership FROM org_members WHERE user_id = v_user_id;
  
  IF v_existing_membership IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'You already belong to an organization');
  END IF;
  
  -- Add user to org_members
  INSERT INTO org_members (org_id, user_id, role, invited_by)
  VALUES (v_invite.org_id, v_user_id, 'learner', v_invite.created_by);
  
  -- Update invite code usage
  UPDATE org_invite_codes 
  SET current_uses = current_uses + 1
  WHERE id = v_invite.id;
  
  -- Return success
  RETURN json_build_object(
    'success', true, 
    'org_id', v_invite.org_id,
    'message', 'Successfully joined organization'
  );
END;
$$;

-- 6. Function to send organization invitation notification
CREATE OR REPLACE FUNCTION send_org_invitation(
  p_org_id UUID,
  p_user_id UUID,
  p_invite_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_name TEXT;
BEGIN
  -- Get organization name
  SELECT name INTO v_org_name FROM organizations WHERE id = p_org_id;
  
  -- Create notification
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    p_user_id,
    'org_invitation',
    'Organization Invitation',
    'You have been invited to join ' || v_org_name,
    json_build_object(
      'org_id', p_org_id,
      'org_name', v_org_name,
      'invite_code', p_invite_code
    )::jsonb
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- 7. Update course visibility RLS
-- First drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view public courses" ON courses;
DROP POLICY IF EXISTS "Users can view org courses" ON courses;

-- Create new policies
CREATE POLICY "Users can view public courses"
  ON courses FOR SELECT TO authenticated
  USING (
    visibility = 'public' 
    OR visibility IS NULL 
    OR educator_id = auth.uid()
  );

CREATE POLICY "Org members can view org_only courses"
  ON courses FOR SELECT TO authenticated
  USING (
    visibility = 'org_only'
    AND org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
      UNION
      SELECT org_id FROM profiles WHERE id = auth.uid() AND org_id IS NOT NULL
    )
  );

-- 8. Index for public profiles search
CREATE INDEX IF NOT EXISTS idx_profiles_public ON profiles(profile_public) WHERE profile_public = true;

COMMENT ON TABLE org_members IS 'Tracks learner membership in organizations';

