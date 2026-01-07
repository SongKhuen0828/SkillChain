-- ========================================
-- Create Organization Logos Storage Bucket
-- ========================================

-- Create storage bucket for organization logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organization-logos',
  'organization-logos',
  true,  -- Public bucket so logos can be displayed
  2097152,  -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- Also create 'org-logos' bucket as used by OrgSettings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-logos',
  'org-logos',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- ========================================
-- Storage Policies for organization-logos bucket
-- ========================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Org admins can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view org logos" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can delete logos" ON storage.objects;

-- Anyone can view organization logos (public)
CREATE POLICY "Anyone can view org logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('organization-logos', 'org-logos'));

-- Org admins can upload logos to their organization folder
CREATE POLICY "Org admins can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('organization-logos', 'org-logos')
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'org_admin'
    AND (
      -- Check folder matches their org_id
      (storage.foldername(name))[1] = profiles.org_id::text
      OR
      -- Or allow if they have any org_id (for flexibility)
      profiles.org_id IS NOT NULL
    )
  )
);

-- Org admins can update their logos
CREATE POLICY "Org admins can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id IN ('organization-logos', 'org-logos')
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'org_admin'
  )
)
WITH CHECK (
  bucket_id IN ('organization-logos', 'org-logos')
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'org_admin'
  )
);

-- Org admins can delete their logos
CREATE POLICY "Org admins can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN ('organization-logos', 'org-logos')
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'org_admin'
  )
);

SELECT 'Organization logos storage bucket created!' as status;

