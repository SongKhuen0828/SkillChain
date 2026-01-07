-- ========================================
-- Fix Pause Reasons Policies Only
-- Run this if you already ran seed script but got policy exists error
-- ========================================

DROP POLICY IF EXISTS "Users can read their own pause reasons" ON pause_reasons;
CREATE POLICY "Users can read their own pause reasons"
  ON pause_reasons FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own pause reasons" ON pause_reasons;
CREATE POLICY "Users can insert their own pause reasons"
  ON pause_reasons FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

SELECT 'Pause reasons policies fixed!' as status;

