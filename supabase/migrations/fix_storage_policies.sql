-- ========================================
-- Fix Storage Policies - Simplified Version
-- ========================================

-- First, drop ALL existing policies on storage.objects for these buckets
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND (policyname LIKE '%org%' OR policyname LIKE '%logo%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Simpler policies that should work

-- 1. Anyone can READ from both buckets (public)
CREATE POLICY "public_read_org_logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('org-logos', 'organization-logos'));

-- 2. Any authenticated user can INSERT (for testing - can restrict later)
CREATE POLICY "authenticated_insert_org_logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('org-logos', 'organization-logos'));

-- 3. Any authenticated user can UPDATE
CREATE POLICY "authenticated_update_org_logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id IN ('org-logos', 'organization-logos'))
WITH CHECK (bucket_id IN ('org-logos', 'organization-logos'));

-- 4. Any authenticated user can DELETE
CREATE POLICY "authenticated_delete_org_logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id IN ('org-logos', 'organization-logos'));

SELECT 'Storage policies simplified!' as status;

