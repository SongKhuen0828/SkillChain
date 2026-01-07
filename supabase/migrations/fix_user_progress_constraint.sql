-- ========================================
-- Fix user_progress table unique constraint
-- This migration adds a unique constraint on (user_id, lesson_id)
-- to support upsert operations
-- ========================================

-- First, remove any duplicate entries (keep the earliest one)
DELETE FROM user_progress a
USING user_progress b
WHERE a.id > b.id
  AND a.user_id = b.user_id
  AND a.lesson_id = b.lesson_id;

-- Check if the unique constraint already exists
DO $$
BEGIN
  -- Try to create the unique constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_progress_user_lesson_unique'
  ) THEN
    ALTER TABLE user_progress
    ADD CONSTRAINT user_progress_user_lesson_unique 
    UNIQUE (user_id, lesson_id);
    
    RAISE NOTICE 'Unique constraint created successfully';
  ELSE
    RAISE NOTICE 'Unique constraint already exists';
  END IF;
END $$;

-- Also create an index if it doesn't exist (for performance)
CREATE INDEX IF NOT EXISTS idx_user_progress_user_lesson 
ON user_progress(user_id, lesson_id);

-- Verify the constraint exists
SELECT 
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'user_progress'::regclass
  AND contype = 'u';

SELECT 'user_progress constraint fix completed!' as status;

