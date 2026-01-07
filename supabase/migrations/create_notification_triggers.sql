-- ========================================
-- Notification Triggers for Course Events
-- This migration creates automatic notifications for:
-- 1. Course enrollment
-- 2. Course completion
-- 3. Weekly learning summary
-- ========================================

-- 1. Function to create enrollment notification
CREATE OR REPLACE FUNCTION notify_course_enrollment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_title TEXT;
  v_educator_name TEXT;
  v_educator_id UUID;
BEGIN
  -- Get course details
  SELECT c.title, c.educator_id, p.full_name
  INTO v_course_title, v_educator_id, v_educator_name
  FROM courses c
  LEFT JOIN profiles p ON c.educator_id = p.id
  WHERE c.id = NEW.course_id;

  -- Notify the learner about successful enrollment
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    NEW.user_id,
    'course_enrolled',
    'Course Enrolled Successfully',
    'You have enrolled in "' || v_course_title || '"',
    jsonb_build_object(
      'course_id', NEW.course_id,
      'course_title', v_course_title,
      'educator_name', v_educator_name,
      'enrolled_at', NEW.enrolled_at
    )
  );

  -- Notify the educator about new student
  IF v_educator_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      v_educator_id,
      'new_student',
      'New Student Enrolled',
      'A new student has enrolled in "' || v_course_title || '"',
      jsonb_build_object(
        'course_id', NEW.course_id,
        'course_title', v_course_title,
        'student_id', NEW.user_id,
        'enrolled_at', NEW.enrolled_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for enrollment
DROP TRIGGER IF EXISTS trigger_notify_course_enrollment ON enrollments;
CREATE TRIGGER trigger_notify_course_enrollment
  AFTER INSERT ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION notify_course_enrollment();

-- 2. Function to create course completion notification
CREATE OR REPLACE FUNCTION notify_course_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_course_title TEXT;
  v_total_lessons INT;
  v_completed_lessons INT;
  v_course_id UUID;
  v_educator_id UUID;
  v_learner_name TEXT;
BEGIN
  -- Get the course_id from the lesson
  SELECT l.course_id INTO v_course_id
  FROM lessons l
  WHERE l.id = NEW.lesson_id;

  IF v_course_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get course details
  SELECT c.title, c.educator_id
  INTO v_course_title, v_educator_id
  FROM courses c
  WHERE c.id = v_course_id;

  -- Count total lessons in the course
  SELECT COUNT(*) INTO v_total_lessons
  FROM lessons
  WHERE course_id = v_course_id;

  -- Count completed lessons by this user
  SELECT COUNT(*) INTO v_completed_lessons
  FROM user_progress up
  JOIN lessons l ON up.lesson_id = l.id
  WHERE l.course_id = v_course_id
    AND up.user_id = NEW.user_id;

  -- Check if course is now complete
  IF v_completed_lessons >= v_total_lessons AND v_total_lessons > 0 THEN
    -- Get learner name
    SELECT full_name INTO v_learner_name FROM profiles WHERE id = NEW.user_id;

    -- Notify the learner about course completion
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.user_id,
      'course_completed',
      '🎉 Course Completed!',
      'Congratulations! You have completed "' || v_course_title || '"',
      jsonb_build_object(
        'course_id', v_course_id,
        'course_title', v_course_title,
        'completed_at', NOW(),
        'total_lessons', v_total_lessons
      )
    )
    ON CONFLICT DO NOTHING; -- Prevent duplicate notifications

    -- Notify the educator
    IF v_educator_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES (
        v_educator_id,
        'student_completed',
        'Student Completed Course',
        COALESCE(v_learner_name, 'A student') || ' has completed "' || v_course_title || '"',
        jsonb_build_object(
          'course_id', v_course_id,
          'course_title', v_course_title,
          'student_id', NEW.user_id,
          'student_name', v_learner_name,
          'completed_at', NOW()
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for lesson completion (user_progress insert)
DROP TRIGGER IF EXISTS trigger_notify_course_completion ON user_progress;
CREATE TRIGGER trigger_notify_course_completion
  AFTER INSERT ON user_progress
  FOR EACH ROW
  EXECUTE FUNCTION notify_course_completion();

-- 3. Function to generate weekly learning summary
CREATE OR REPLACE FUNCTION generate_learning_summary(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lessons_completed INT;
  v_study_minutes INT;
  v_courses_in_progress INT;
  v_certificates_earned INT;
  v_streak_days INT;
  v_user_name TEXT;
BEGIN
  -- Get user name
  SELECT full_name INTO v_user_name FROM profiles WHERE id = p_user_id;

  -- Count lessons completed this week
  SELECT COUNT(*) INTO v_lessons_completed
  FROM user_progress
  WHERE user_id = p_user_id
    AND completed_at >= NOW() - INTERVAL '7 days';

  -- Calculate study time this week (from study_sessions)
  SELECT COALESCE(SUM(duration_seconds) / 60, 0) INTO v_study_minutes
  FROM study_sessions
  WHERE user_id = p_user_id
    AND started_at >= NOW() - INTERVAL '7 days';

  -- Count courses in progress
  SELECT COUNT(DISTINCT l.course_id) INTO v_courses_in_progress
  FROM user_progress up
  JOIN lessons l ON up.lesson_id = l.id
  WHERE up.user_id = p_user_id
    AND up.completed_at >= NOW() - INTERVAL '30 days';

  -- Count certificates earned this week
  SELECT COUNT(*) INTO v_certificates_earned
  FROM certificates
  WHERE user_id = p_user_id
    AND issued_at >= NOW() - INTERVAL '7 days';

  -- Calculate streak (consecutive days with activity)
  WITH daily_activity AS (
    SELECT DISTINCT DATE(completed_at) as activity_date
    FROM user_progress
    WHERE user_id = p_user_id
    ORDER BY activity_date DESC
  ),
  streak_calc AS (
    SELECT activity_date,
           activity_date - (ROW_NUMBER() OVER (ORDER BY activity_date DESC))::INT as grp
    FROM daily_activity
    WHERE activity_date >= CURRENT_DATE - 30
  )
  SELECT COUNT(*) INTO v_streak_days
  FROM streak_calc
  WHERE grp = (SELECT grp FROM streak_calc WHERE activity_date = CURRENT_DATE LIMIT 1);

  v_streak_days := COALESCE(v_streak_days, 0);

  -- Only create notification if there's some activity
  IF v_lessons_completed > 0 OR v_study_minutes > 0 THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      p_user_id,
      'weekly_summary',
      '📊 Your Weekly Learning Summary',
      'You completed ' || v_lessons_completed || ' lessons and studied for ' || v_study_minutes || ' minutes this week!',
      jsonb_build_object(
        'lessons_completed', v_lessons_completed,
        'study_minutes', v_study_minutes,
        'courses_in_progress', v_courses_in_progress,
        'certificates_earned', v_certificates_earned,
        'streak_days', v_streak_days,
        'period_start', NOW() - INTERVAL '7 days',
        'period_end', NOW()
      )
    );
  END IF;

  RETURN TRUE;
END;
$$;

-- 4. Function to generate summaries for all active users (to be called by cron job)
CREATE OR REPLACE FUNCTION generate_all_learning_summaries()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_count INT := 0;
BEGIN
  -- Loop through all users who have been active in the last 30 days
  FOR v_user_id IN 
    SELECT DISTINCT user_id 
    FROM user_progress 
    WHERE completed_at >= NOW() - INTERVAL '30 days'
  LOOP
    PERFORM generate_learning_summary(v_user_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 5. Function to log study activity and generate milestone notifications
CREATE OR REPLACE FUNCTION notify_study_milestone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_study_hours NUMERIC;
  v_milestone_hours INT[] := ARRAY[1, 5, 10, 25, 50, 100, 250, 500];
  v_milestone INT;
  v_already_notified BOOLEAN;
BEGIN
  -- Calculate total study hours for this user
  SELECT COALESCE(SUM(duration_seconds) / 3600.0, 0) INTO v_total_study_hours
  FROM study_sessions
  WHERE user_id = NEW.user_id;

  -- Check each milestone
  FOREACH v_milestone IN ARRAY v_milestone_hours
  LOOP
    IF v_total_study_hours >= v_milestone THEN
      -- Check if already notified for this milestone
      SELECT EXISTS(
        SELECT 1 FROM notifications 
        WHERE user_id = NEW.user_id 
          AND type = 'study_milestone'
          AND data->>'milestone_hours' = v_milestone::TEXT
      ) INTO v_already_notified;

      IF NOT v_already_notified THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
          NEW.user_id,
          'study_milestone',
          '🏆 Study Milestone Reached!',
          'Amazing! You''ve studied for ' || v_milestone || ' hours total!',
          jsonb_build_object(
            'milestone_hours', v_milestone,
            'total_hours', ROUND(v_total_study_hours::NUMERIC, 1),
            'achieved_at', NOW()
          )
        );
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger for study session completion
DROP TRIGGER IF EXISTS trigger_notify_study_milestone ON study_sessions;
CREATE TRIGGER trigger_notify_study_milestone
  AFTER INSERT OR UPDATE ON study_sessions
  FOR EACH ROW
  WHEN (NEW.duration_seconds > 0)
  EXECUTE FUNCTION notify_study_milestone();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_learning_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_all_learning_summaries() TO service_role;

-- Add comments
COMMENT ON FUNCTION notify_course_enrollment IS 'Automatically creates notifications when a user enrolls in a course';
COMMENT ON FUNCTION notify_course_completion IS 'Automatically creates notifications when a user completes all lessons in a course';
COMMENT ON FUNCTION generate_learning_summary IS 'Generates a weekly learning summary notification for a specific user';
COMMENT ON FUNCTION generate_all_learning_summaries IS 'Generates weekly summaries for all active users (for cron jobs)';
COMMENT ON FUNCTION notify_study_milestone IS 'Creates milestone notifications when users reach study hour goals';

SELECT 'Notification triggers created successfully!' as status;

