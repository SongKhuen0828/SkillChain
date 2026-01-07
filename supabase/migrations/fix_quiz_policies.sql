-- ========================================
-- Fix Quiz Policies Only
-- Run this if you already ran the main script but got quiz error
-- ========================================

-- Quizzes (quizzes are linked via lesson_id -> lessons -> modules -> courses)
DROP POLICY IF EXISTS "Org admins can manage quizzes" ON quizzes;
CREATE POLICY "Org admins can manage quizzes"
  ON quizzes FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      JOIN profiles p ON p.org_id = c.org_id
      WHERE l.id = quizzes.lesson_id
      AND p.id = auth.uid()
      AND p.role = 'org_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lessons l
      JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      JOIN profiles p ON p.org_id = c.org_id
      WHERE l.id = quizzes.lesson_id
      AND p.id = auth.uid()
      AND p.role = 'org_admin'
    )
  );

-- Quiz Questions
DROP POLICY IF EXISTS "Org admins can manage quiz_questions" ON quiz_questions;
CREATE POLICY "Org admins can manage quiz_questions"
  ON quiz_questions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN lessons l ON l.id = q.lesson_id
      JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      JOIN profiles p ON p.org_id = c.org_id
      WHERE q.id = quiz_questions.quiz_id
      AND p.id = auth.uid()
      AND p.role = 'org_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quizzes q
      JOIN lessons l ON l.id = q.lesson_id
      JOIN modules m ON m.id = l.module_id
      JOIN courses c ON c.id = m.course_id
      JOIN profiles p ON p.org_id = c.org_id
      WHERE q.id = quiz_questions.quiz_id
      AND p.id = auth.uid()
      AND p.role = 'org_admin'
    )
  );

SELECT 'Quiz policies fixed!' as status;

