-- ========================================
-- Fix org_requests RLS Policies
-- The "Users can view own request" policy was trying to access auth.users
-- which causes "permission denied for table users" error
-- ========================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view own request" ON org_requests;

-- Recreate with a workaround using auth.jwt() instead of auth.users
-- Note: auth.jwt() returns the JWT claims which include email
CREATE POLICY "Users can view own request"
  ON org_requests FOR SELECT
  TO authenticated
  USING (
    contact_email = (auth.jwt() ->> 'email')
  );

-- Also ensure the admin policy is correct
DROP POLICY IF EXISTS "Admins can view all requests" ON org_requests;
CREATE POLICY "Admins can view all requests"
  ON org_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

SELECT 'org_requests RLS policies fixed!' as status;

