-- ========================================
-- Organization Complete Fix Migration
-- Handles existing policies and adds missing RLS for org_admin
-- ========================================

-- 1. Add profile_public to profiles table (IF NOT EXISTS)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_public BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN profiles.profile_public IS 'Whether learner profile is visible to organizations for invitations';

-- 2. Add visibility to courses table (IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'courses' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE courses ADD COLUMN visibility TEXT DEFAULT 'public';
  END IF;
END $$;

-- Add check constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'courses_visibility_check' AND table_name = 'courses'
  ) THEN
    ALTER TABLE courses ADD CONSTRAINT courses_visibility_check 
    CHECK (visibility IN ('private', 'public', 'org_only'));
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Constraint might already exist with different name
  NULL;
END $$;

COMMENT ON COLUMN courses.visibility IS 'Course visibility: private (only creator), public (everyone), org_only (organization members only)';

-- 3. Update org_invite_codes to support Learner invitations
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
  role TEXT DEFAULT 'learner',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- 5. Drop and recreate org_members policies
DROP POLICY IF EXISTS "Users can view their own membership" ON org_members;
DROP POLICY IF EXISTS "Org admins can view all members" ON org_members;
DROP POLICY IF EXISTS "Org admins can insert members" ON org_members;
DROP POLICY IF EXISTS "Org admins can delete members" ON org_members;
DROP POLICY IF EXISTS "Users can join with invite code" ON org_members;

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

-- Allow users to insert themselves (for join_organization_with_code function)
CREATE POLICY "Users can join with invite code"
  ON org_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 6. COURSES TABLE RLS POLICIES FOR ORG_ADMIN
-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can view public courses" ON courses;
DROP POLICY IF EXISTS "Org members can view org_only courses" ON courses;
DROP POLICY IF EXISTS "Educators can create courses" ON courses;
DROP POLICY IF EXISTS "Org admins can create courses" ON courses;
DROP POLICY IF EXISTS "Course creators can update" ON courses;
DROP POLICY IF EXISTS "Org admins can update org courses" ON courses;

-- Recreate course policies
-- SELECT: Public courses visible to all authenticated users
CREATE POLICY "Users can view public courses"
  ON courses FOR SELECT TO authenticated
  USING (
    visibility = 'public' 
    OR visibility IS NULL 
    OR educator_id = auth.uid()
    OR (
      visibility = 'org_only' 
      AND org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
        UNION
        SELECT org_id FROM profiles WHERE id = auth.uid() AND org_id IS NOT NULL
      )
    )
  );

-- INSERT: Educators and Org Admins can create courses
CREATE POLICY "Educators and org admins can create courses"
  ON courses FOR INSERT TO authenticated
  WITH CHECK (
    educator_id = auth.uid()
    AND (
      -- Educator role
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'educator'
      )
      OR
      -- Org Admin role (can create courses for their org)
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'org_admin'
        AND profiles.org_id IS NOT NULL
      )
    )
  );

-- UPDATE: Course creator or Org Admin can update
CREATE POLICY "Course creators and org admins can update"
  ON courses FOR UPDATE TO authenticated
  USING (
    educator_id = auth.uid()
    OR (
      org_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.org_id = courses.org_id 
        AND profiles.role = 'org_admin'
      )
    )
  )
  WITH CHECK (
    educator_id = auth.uid()
    OR (
      org_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.org_id = courses.org_id 
        AND profiles.role = 'org_admin'
      )
    )
  );

-- DELETE: Course creator or Org Admin can delete
CREATE POLICY "Course creators and org admins can delete"
  ON courses FOR DELETE TO authenticated
  USING (
    educator_id = auth.uid()
    OR (
      org_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.org_id = courses.org_id 
        AND profiles.role = 'org_admin'
      )
    )
  );

-- 7. Function to join organization using invite code (for Learners)
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

-- 8. Function to send organization invitation notification
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

-- 9. Index for public profiles search
CREATE INDEX IF NOT EXISTS idx_profiles_public ON profiles(profile_public) WHERE profile_public = true;

-- 10. Ensure modules, lessons, quizzes policies allow org_admin
-- Modules
DROP POLICY IF EXISTS "Org admins can manage modules" ON modules;
CREATE POLICY "Org admins can manage modules"
  ON modules FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN profiles p ON p.org_id = c.org_id
      WHERE c.id = modules.course_id
      AND p.id = auth.uid()
      AND p.role = 'org_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN profiles p ON p.org_id = c.org_id
      WHERE c.id = modules.course_id
      AND p.id = auth.uid()
      AND p.role = 'org_admin'
    )
  );

-- Lessons
DROP POLICY IF EXISTS "Org admins can manage lessons" ON lessons;
CREATE POLICY "Org admins can manage lessons"
  ON lessons FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM modules m
      JOIN courses c ON c.id = m.course_id
      JOIN profiles p ON p.org_id = c.org_id
      WHERE m.id = lessons.module_id
      AND p.id = auth.uid()
      AND p.role = 'org_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM modules m
      JOIN courses c ON c.id = m.course_id
      JOIN profiles p ON p.org_id = c.org_id
      WHERE m.id = lessons.module_id
      AND p.id = auth.uid()
      AND p.role = 'org_admin'
    )
  );

-- Quizzes (quizzes are linked via lesson_id -> lessons -> modules -> courses)
DROP POLICY IF EXISTS "Org admins can manage quizzes" ON quizzes;
CREATE POLICY "Org admins can manage quizzes"
  ON quizzes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      JOIN profiles p ON p.org_id = c.org_id
      WHERE l.id = quizzes.lesson_id
      AND p.id = auth.uid()
      AND p.role = 'org_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      JOIN profiles p ON p.org_id = c.org_id
      WHERE l.id = quizzes.lesson_id
      AND p.id = auth.uid()
      AND p.role = 'org_admin'
    )
  );

-- Quiz Questions
DROP POLICY IF EXISTS "Org admins can manage quiz_questions" ON quiz_questions;
CREATE POLICY "Org admins can manage quiz_questions"
  ON quiz_questions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN lessons l ON l.id = q.lesson_id
      JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      JOIN profiles p ON p.org_id = c.org_id
      WHERE q.id = quiz_questions.quiz_id
      AND p.id = auth.uid()
      AND p.role = 'org_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN lessons l ON l.id = q.lesson_id
      JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      JOIN profiles p ON p.org_id = c.org_id
      WHERE q.id = quiz_questions.quiz_id
      AND p.id = auth.uid()
      AND p.role = 'org_admin'
    )
  );

COMMENT ON TABLE org_members IS 'Tracks learner membership in organizations';

-- Done!
SELECT 'Organization RLS policies updated successfully!' as status;

