-- ========================================
-- Diagnostic SQL for Organization Invite Issues
-- Run this in Supabase SQL Editor to check the current state
-- ========================================

-- 1. Check if org_invite_codes table exists and has data
SELECT 'org_invite_codes table:' as check_name;
SELECT * FROM org_invite_codes LIMIT 5;

-- 2. Check if org_members table has any data
SELECT 'org_members table:' as check_name;
SELECT * FROM org_members LIMIT 10;

-- 3. Check profiles with org_id set
SELECT 'profiles with org_id:' as check_name;
SELECT id, full_name, role, org_id FROM profiles WHERE org_id IS NOT NULL LIMIT 10;

-- 4. Check the current function definition
SELECT 'Current function definition:' as check_name;
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'join_organization_with_code';

-- 5. Check if there are any organizations
SELECT 'organizations table:' as check_name;
SELECT id, name FROM organizations LIMIT 5;


