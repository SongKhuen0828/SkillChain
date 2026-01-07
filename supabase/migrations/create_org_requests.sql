-- ========================================
-- Organization Requests Table
-- For organizations to apply and admins to approve
-- ========================================

-- Create org_requests table
CREATE TABLE IF NOT EXISTS org_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization info
  org_name TEXT NOT NULL,
  org_description TEXT,
  org_website TEXT,
  
  -- Contact person info
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  
  -- Request details
  reason TEXT, -- Why they want to create an org
  expected_members INTEGER, -- How many learners they expect
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  
  -- Tracking
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_requests_status ON org_requests(status);
CREATE INDEX IF NOT EXISTS idx_org_requests_email ON org_requests(contact_email);
CREATE INDEX IF NOT EXISTS idx_org_requests_created ON org_requests(created_at DESC);

ALTER TABLE org_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can submit a request (even anonymous for contact form)
DROP POLICY IF EXISTS "Anyone can submit org request" ON org_requests;
CREATE POLICY "Anyone can submit org request"
  ON org_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can view all requests
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

-- Users can view their own request by email
DROP POLICY IF EXISTS "Users can view own request" ON org_requests;
CREATE POLICY "Users can view own request"
  ON org_requests FOR SELECT
  TO authenticated
  USING (
    contact_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Only admins can update requests
DROP POLICY IF EXISTS "Admins can update requests" ON org_requests;
CREATE POLICY "Admins can update requests"
  ON org_requests FOR UPDATE
  TO authenticated
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

-- Function to approve org request and create organization + user
CREATE OR REPLACE FUNCTION approve_org_request(
  p_request_id UUID,
  p_temp_password TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request org_requests%ROWTYPE;
  v_org_id UUID;
  v_user_id UUID;
  v_admin_id UUID;
BEGIN
  v_admin_id := auth.uid();
  
  -- Get the request
  SELECT * INTO v_request FROM org_requests WHERE id = p_request_id;
  
  IF v_request.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Request not found');
  END IF;
  
  IF v_request.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Request already processed');
  END IF;
  
  -- Create organization
  INSERT INTO organizations (name, description, website, contact_email)
  VALUES (v_request.org_name, v_request.org_description, v_request.org_website, v_request.contact_email)
  RETURNING id INTO v_org_id;
  
  -- Update request status
  UPDATE org_requests
  SET 
    status = 'approved',
    reviewed_by = v_admin_id,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;
  
  -- Return success with org_id (user will be created via auth API)
  RETURN json_build_object(
    'success', true,
    'org_id', v_org_id,
    'org_name', v_request.org_name,
    'contact_email', v_request.contact_email,
    'message', 'Organization created. Please create user account via Auth.'
  );
END;
$$;

-- Function to reject org request
CREATE OR REPLACE FUNCTION reject_org_request(
  p_request_id UUID,
  p_reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request org_requests%ROWTYPE;
  v_admin_id UUID;
BEGIN
  v_admin_id := auth.uid();
  
  -- Get the request
  SELECT * INTO v_request FROM org_requests WHERE id = p_request_id;
  
  IF v_request.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Request not found');
  END IF;
  
  IF v_request.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Request already processed');
  END IF;
  
  -- Update request status
  UPDATE org_requests
  SET 
    status = 'rejected',
    rejection_reason = p_reason,
    reviewed_by = v_admin_id,
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Request rejected'
  );
END;
$$;

COMMENT ON TABLE org_requests IS 'Stores organization registration requests for admin approval';

SELECT 'org_requests table created!' as status;

