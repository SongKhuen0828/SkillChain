-- ========================================
-- Fix org_members insert for join_organization_with_code
-- Ensure SECURITY DEFINER function can insert without RLS blocking
-- This migration fixes the function to properly handle case-insensitive codes
-- and adds better error handling and verification
-- ========================================

-- Note: This will replace the function from organization_complete_fix.sql
-- with an improved version that handles case-insensitive codes and has better error handling

CREATE OR REPLACE FUNCTION join_organization_with_code(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite org_invite_codes%ROWTYPE;
  v_user_id UUID;
  v_user_role TEXT;
  v_existing_membership UUID;
  v_inserted_id UUID;
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
  WHERE code = UPPER(TRIM(p_code))
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
  
  -- Insert user into org_members (SECURITY DEFINER bypasses RLS)
  INSERT INTO org_members (org_id, user_id, role, invited_by)
  VALUES (v_invite.org_id, v_user_id, 'learner', v_invite.created_by)
  RETURNING id INTO v_inserted_id;
  
  -- Verify insertion succeeded
  IF v_inserted_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Failed to join organization');
  END IF;
  
  -- Update user's profile with org_id (CRITICAL: This allows RLS policies to work)
  UPDATE profiles 
  SET org_id = v_invite.org_id
  WHERE id = v_user_id;
  
  -- Update invite code usage
  UPDATE org_invite_codes 
  SET current_uses = current_uses + 1
  WHERE id = v_invite.id;
  
  -- Return success with org details
  RETURN json_build_object(
    'success', true, 
    'org_id', v_invite.org_id,
    'member_id', v_inserted_id,
    'message', 'Successfully joined organization'
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'error', 'You already belong to an organization');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Database error: ' || SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION join_organization_with_code(TEXT) TO authenticated;

COMMENT ON FUNCTION join_organization_with_code IS 'Allows learners to join an organization using an invite code. Bypasses RLS using SECURITY DEFINER.';

