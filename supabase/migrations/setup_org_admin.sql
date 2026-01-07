-- ========================================
-- Setup Org Admin User
-- Run this AFTER organization_complete_fix.sql
-- ========================================

-- This script helps link an existing org_admin user to their organization
-- Replace the email and org_name with your actual values

DO $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_email TEXT := 'YOUR_ORG_ADMIN_EMAIL@example.com'; -- CHANGE THIS
  v_org_name TEXT := 'YOUR_ORGANIZATION_NAME'; -- CHANGE THIS
BEGIN
  -- Get user ID from auth.users by email
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User with email % not found', v_email;
    RETURN;
  END IF;
  
  -- Get organization ID
  SELECT id INTO v_org_id 
  FROM organizations 
  WHERE name = v_org_name;
  
  IF v_org_id IS NULL THEN
    RAISE NOTICE 'Organization % not found', v_org_name;
    RETURN;
  END IF;
  
  -- Update profile with org_id
  UPDATE profiles 
  SET 
    org_id = v_org_id,
    role = 'org_admin'
  WHERE id = v_user_id;
  
  RAISE NOTICE 'Successfully linked user % to organization %', v_email, v_org_name;
END $$;

-- ========================================
-- Alternative: View current org_admin users and their org_id
-- ========================================

SELECT 
  p.id,
  u.email,
  p.full_name,
  p.role,
  p.org_id,
  o.name as org_name
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.id
LEFT JOIN organizations o ON o.id = p.org_id
WHERE p.role = 'org_admin';

-- ========================================
-- List all organizations
-- ========================================

SELECT id, name, created_at FROM organizations;

