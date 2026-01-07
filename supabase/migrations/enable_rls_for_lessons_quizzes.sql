-- ========================================
-- Enable RLS for lessons, quiz_questions, and quizzes tables
-- Fixes security linter errors: policy_exists_rls_disabled and rls_disabled_in_public
-- ========================================

-- Enable RLS on lessons table
ALTER TABLE IF EXISTS public.lessons
  ENABLE ROW LEVEL SECURITY;

-- Enable RLS on quiz_questions table
ALTER TABLE IF EXISTS public.quiz_questions
  ENABLE ROW LEVEL SECURITY;

-- Enable RLS on quizzes table
ALTER TABLE IF EXISTS public.quizzes
  ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled (these will show in logs)
DO $$
DECLARE
  v_lessons_rls BOOLEAN;
  v_quiz_questions_rls BOOLEAN;
  v_quizzes_rls BOOLEAN;
BEGIN
  -- Check lessons
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lessons') THEN
    SELECT relrowsecurity INTO v_lessons_rls
    FROM pg_class
    WHERE relname = 'lessons' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    IF NOT v_lessons_rls THEN
      RAISE EXCEPTION 'RLS not enabled on lessons table';
    END IF;
    RAISE NOTICE 'RLS enabled on lessons table';
  END IF;

  -- Check quiz_questions
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quiz_questions') THEN
    SELECT relrowsecurity INTO v_quiz_questions_rls
    FROM pg_class
    WHERE relname = 'quiz_questions' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    IF NOT v_quiz_questions_rls THEN
      RAISE EXCEPTION 'RLS not enabled on quiz_questions table';
    END IF;
    RAISE NOTICE 'RLS enabled on quiz_questions table';
  END IF;

  -- Check quizzes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quizzes') THEN
    SELECT relrowsecurity INTO v_quizzes_rls
    FROM pg_class
    WHERE relname = 'quizzes' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    IF NOT v_quizzes_rls THEN
      RAISE EXCEPTION 'RLS not enabled on quizzes table';
    END IF;
    RAISE NOTICE 'RLS enabled on quizzes table';
  END IF;
END $$;

COMMENT ON TABLE public.lessons IS 'RLS enabled for security. Policies control access based on course publication status and user roles.';
COMMENT ON TABLE public.quiz_questions IS 'RLS enabled for security. Policies control access based on quiz ownership and user roles.';
COMMENT ON TABLE public.quizzes IS 'RLS enabled for security. Policies control access based on quiz ownership and user roles.';

