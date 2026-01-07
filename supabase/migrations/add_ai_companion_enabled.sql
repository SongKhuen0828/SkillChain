-- Add ai_companion_enabled column to profiles table
-- Default to TRUE so new users have AI Companion enabled by default

-- Add column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'ai_companion_enabled'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ai_companion_enabled BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Update existing NULL values to TRUE (for users who signed up before this column existed)
UPDATE profiles 
SET ai_companion_enabled = TRUE 
WHERE ai_companion_enabled IS NULL;

-- Add comment
COMMENT ON COLUMN profiles.ai_companion_enabled IS 'Whether AI Learning Companion is enabled for this user. Defaults to TRUE.';

SELECT 'ai_companion_enabled column added/updated successfully!' as status;

