-- ========================================
-- Add Storage Policies for Org Logo Buckets
-- ========================================

-- Policy 1: Public read for organization-logos
CREATE POLICY "Public read org logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'organization-logos');

-- Policy 2: Org admin can upload to organization-logos
CREATE POLICY "Org admin upload org logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'organization-logos'
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'org_admin'
);

-- Policy 3: Org admin can update organization-logos
CREATE POLICY "Org admin update org logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'org_admin'
);

-- Policy 4: Org admin can delete organization-logos
CREATE POLICY "Org admin delete org logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'org_admin'
);

-- Same for org-logos bucket
CREATE POLICY "Public read org-logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'org-logos');

CREATE POLICY "Org admin upload org-logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'org-logos'
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'org_admin'
);

CREATE POLICY "Org admin update org-logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'org-logos'
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'org_admin'
);

CREATE POLICY "Org admin delete org-logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'org-logos'
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'org_admin'
);

SELECT 'Storage policies added!' as status;

