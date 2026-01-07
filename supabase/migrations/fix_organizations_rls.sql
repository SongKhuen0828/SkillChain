-- ========================================
-- Fix Organizations Table RLS Policies
-- ========================================

-- Ensure RLS is enabled on organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can manage organizations" ON organizations;
DROP POLICY IF EXISTS "Org admins can update their organization" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations during signup" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;

-- 1. SELECT: Anyone authenticated can view organizations
CREATE POLICY "Anyone can view organizations"
  ON organizations FOR SELECT TO authenticated
  USING (true);

-- 2. INSERT: Allow Admin role to create organizations
CREATE POLICY "Admins can create organizations"
  ON organizations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 3. INSERT: Allow authenticated users to create organizations (for OrgSignUp flow)
-- This is needed when a new org_admin signs up and creates their organization
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT TO authenticated
  WITH CHECK (true);

-- 4. UPDATE: Org admins can update their own organization
CREATE POLICY "Org admins can update their organization"
  ON organizations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.org_id = organizations.id 
      AND profiles.role = 'org_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.org_id = organizations.id 
      AND profiles.role = 'org_admin'
    )
  );

-- 5. UPDATE: Admins can update any organization
CREATE POLICY "Admins can update organizations"
  ON organizations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- 6. DELETE: Only admins can delete organizations
CREATE POLICY "Admins can delete organizations"
  ON organizations FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Add comment
COMMENT ON TABLE organizations IS 'Organizations table with RLS policies for admin and org_admin management';

SELECT 'Organizations RLS policies created successfully!' as status;

