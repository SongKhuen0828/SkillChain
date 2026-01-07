-- ========================================
-- AI Training Seed Data
-- 生成大量训练数据用于 AI 模型
-- ========================================

-- 先创建 pause_reasons 表 (用于追踪用户暂停原因)
CREATE TABLE IF NOT EXISTS pause_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  reason_type TEXT NOT NULL, -- 'need_break', 'other_tasks', 'too_difficult', 'custom'
  custom_reason TEXT, -- 用户自定义输入
  pause_duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pause_reasons_user ON pause_reasons(user_id);
CREATE INDEX IF NOT EXISTS idx_pause_reasons_course ON pause_reasons(course_id);

ALTER TABLE pause_reasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own pause reasons" ON pause_reasons;
CREATE POLICY "Users can read their own pause reasons"
  ON pause_reasons FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own pause reasons" ON pause_reasons;
CREATE POLICY "Users can insert their own pause reasons"
  ON pause_reasons FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE pause_reasons IS 'Tracks why users pause during learning for behavior analysis';

-- ========================================
-- 生成 study_sessions 种子数据
-- ========================================

DO $$
DECLARE
  v_user_id UUID;
  v_course_id UUID;
  v_method TEXT;
  v_methods TEXT[] := ARRAY['pomodoro', 'flowtime', 'blitz', '52_17'];
  v_hour INTEGER;
  v_duration INTEGER;
  v_completed BOOLEAN;
  v_tab_switches INTEGER;
  v_start_date TIMESTAMPTZ;
  i INTEGER;
  j INTEGER;
BEGIN
  -- 获取所有用户和课程
  FOR v_user_id IN SELECT id FROM auth.users LOOP
    FOR v_course_id IN SELECT id FROM courses LOOP
      -- 为每个用户-课程组合生成 50-100 条记录 (增加数据量)
      FOR i IN 1..floor(random() * 50 + 50)::INTEGER LOOP
        -- 随机选择学习方法
        v_method := v_methods[floor(random() * 4 + 1)::INTEGER];
        
        -- 随机时间 (过去 30 天)
        v_start_date := NOW() - (random() * 30)::INTEGER * INTERVAL '1 day' 
                      - (random() * 24)::INTEGER * INTERVAL '1 hour';
        v_hour := EXTRACT(HOUR FROM v_start_date);
        
        -- 根据时间和方法设置完成率 (模拟真实模式)
        -- 早上 6-12 点完成率较高
        -- Pomodoro 方法完成率最高
        IF v_hour BETWEEN 6 AND 12 THEN
          v_completed := random() < 0.75; -- 75% 完成率
        ELSIF v_hour BETWEEN 13 AND 18 THEN
          v_completed := random() < 0.65; -- 65% 完成率
        ELSE
          v_completed := random() < 0.45; -- 45% 完成率
        END IF;
        
        -- Pomodoro 有更高完成率
        IF v_method = 'pomodoro' AND random() < 0.2 THEN
          v_completed := TRUE;
        END IF;
        
        -- 学习时长 (分钟转秒)
        CASE v_method
          WHEN 'pomodoro' THEN v_duration := (25 + floor(random() * 10)::INTEGER) * 60;
          WHEN 'flowtime' THEN v_duration := (30 + floor(random() * 60)::INTEGER) * 60;
          WHEN 'blitz' THEN v_duration := (10 + floor(random() * 15)::INTEGER) * 60;
          WHEN '52_17' THEN v_duration := (52 + floor(random() * 10)::INTEGER) * 60;
          ELSE v_duration := (20 + floor(random() * 40)::INTEGER) * 60;
        END CASE;
        
        -- 如果未完成，时长减少
        IF NOT v_completed THEN
          v_duration := floor(v_duration * (0.3 + random() * 0.5))::INTEGER;
        END IF;
        
        -- Tab 切换次数 (影响专注度)
        IF v_completed THEN
          v_tab_switches := floor(random() * 3)::INTEGER; -- 0-2 次
        ELSE
          v_tab_switches := floor(random() * 10 + 3)::INTEGER; -- 3-12 次
        END IF;
        
        -- 插入记录 (使用 CAST 转换为 focus_method 枚举类型)
        INSERT INTO study_sessions (
          user_id, course_id, method_used, duration_seconds, 
          completed, started_at, tab_switch_count
        ) VALUES (
          v_user_id, v_course_id, v_method::focus_method, v_duration,
          v_completed, v_start_date, v_tab_switches
        ) ON CONFLICT DO NOTHING;
        
      END LOOP;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Study sessions seed data generated!';
END $$;

-- ========================================
-- 生成 quiz_submissions 种子数据
-- ========================================

DO $$
DECLARE
  v_user_id UUID;
  v_quiz_id UUID;
  v_score INTEGER;
  v_passed BOOLEAN;
  v_attempt INTEGER;
  v_start_date TIMESTAMPTZ;
  i INTEGER;
BEGIN
  FOR v_user_id IN SELECT id FROM auth.users LOOP
    FOR v_quiz_id IN SELECT id FROM quizzes LOOP
      -- 每个用户每个测验 5-15 次尝试 (增加数据量)
      FOR i IN 1..floor(random() * 10 + 5)::INTEGER LOOP
        v_start_date := NOW() - (random() * 30)::INTEGER * INTERVAL '1 day';
        
        -- 分数分布: 正态分布约 70 分
        v_score := LEAST(100, GREATEST(30, 
          floor(70 + (random() - 0.5) * 40)::INTEGER
        ));
        
        -- 后续尝试分数更高
        IF i > 1 THEN
          v_score := LEAST(100, v_score + floor(random() * 15)::INTEGER);
        END IF;
        
        v_passed := v_score >= 60;
        
        INSERT INTO quiz_submissions (
          user_id, quiz_id, score, passed, created_at
        ) VALUES (
          v_user_id, v_quiz_id, v_score, v_passed, v_start_date
        ) ON CONFLICT DO NOTHING;
        
      END LOOP;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Quiz submissions seed data generated!';
END $$;

-- ========================================
-- 生成 user_progress 种子数据
-- ========================================

DO $$
DECLARE
  v_user_id UUID;
  v_lesson_id UUID;
  v_completed_date TIMESTAMPTZ;
BEGIN
  FOR v_user_id IN SELECT id FROM auth.users LOOP
    FOR v_lesson_id IN SELECT id FROM lessons LOOP
      -- 70% 概率完成 (每个用户会处理所有50个lessons)
      IF random() < 0.7 THEN
        v_completed_date := NOW() - (random() * 30)::INTEGER * INTERVAL '1 day';
        
        INSERT INTO user_progress (
          user_id, lesson_id, completed_at
        ) VALUES (
          v_user_id, v_lesson_id, v_completed_date
        ) ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'User progress seed data generated!';
END $$;

-- ========================================
-- 生成 ai_preferences 种子数据
-- ========================================

DO $$
DECLARE
  v_user_id UUID;
  v_study_time TEXT;
  v_study_times TEXT[] := ARRAY['Early Bird', 'Night Owl', 'Afternoon Focus', 'Flexible'];
  v_focus_span INTEGER;
  v_struggle TEXT;
  v_struggles TEXT[] := ARRAY['Staying focused', 'Understanding concepts', 'Time management', 'Motivation', 'Retention'];
BEGIN
  FOR v_user_id IN SELECT id FROM auth.users LOOP
    -- 随机选择偏好
    v_study_time := v_study_times[floor(random() * 4 + 1)::INTEGER];
    v_focus_span := floor(random() * 45 + 15)::INTEGER; -- 15-60 分钟
    v_struggle := v_struggles[floor(random() * 5 + 1)::INTEGER];
    
    INSERT INTO ai_preferences (
      user_id,
      preferred_study_time,
      focus_span,
      struggle
    ) VALUES (
      v_user_id,
      v_study_time,
      v_focus_span,
      v_struggle
    ) ON CONFLICT (user_id) DO UPDATE SET
      preferred_study_time = EXCLUDED.preferred_study_time,
      focus_span = EXCLUDED.focus_span,
      struggle = EXCLUDED.struggle;
      
  END LOOP;
  
  RAISE NOTICE 'AI preferences seed data generated!';
END $$;

-- ========================================
-- 生成 pause_reasons 种子数据
-- ========================================

DO $$
DECLARE
  v_user_id UUID;
  v_course_id UUID;
  v_lesson_id UUID;
  v_reason_type TEXT;
  v_reason_types TEXT[] := ARRAY['need_break', 'other_tasks', 'too_difficult', 'distracted', 'custom'];
  v_custom_reasons TEXT[] := ARRAY[
    'Phone rang',
    'Had to answer door',
    'Food delivery arrived',
    'Needed bathroom break',
    'Got a message',
    'Technical issues',
    'Internet disconnected',
    'Computer frozen'
  ];
  v_start_date TIMESTAMPTZ;
  i INTEGER;
BEGIN
  FOR v_user_id IN SELECT id FROM auth.users LOOP
    FOR v_course_id IN SELECT id FROM courses LOOP
      -- 获取该课程的一个 lesson
      SELECT id INTO v_lesson_id FROM lessons 
        WHERE module_id IN (SELECT id FROM modules WHERE course_id = v_course_id)
        LIMIT 1;
      
      -- 每个用户-课程 10-30 个暂停记录 (增加数据量)
      FOR i IN 1..floor(random() * 20 + 10)::INTEGER LOOP
        v_start_date := NOW() - (random() * 30)::INTEGER * INTERVAL '1 day';
        v_reason_type := v_reason_types[floor(random() * 5 + 1)::INTEGER];
        
        INSERT INTO pause_reasons (
          user_id, lesson_id, course_id, reason_type, 
          custom_reason, pause_duration_seconds, created_at
        ) VALUES (
          v_user_id,
          v_lesson_id,
          v_course_id,
          v_reason_type,
          CASE WHEN v_reason_type = 'custom' 
               THEN v_custom_reasons[floor(random() * 8 + 1)::INTEGER]
               ELSE NULL END,
          floor(random() * 600 + 30)::INTEGER, -- 30秒 - 10分钟
          v_start_date
        );
        
      END LOOP;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Pause reasons seed data generated!';
END $$;

-- ========================================
-- 显示生成的数据统计
-- ========================================

SELECT 'study_sessions' AS table_name, COUNT(*) AS count FROM study_sessions
UNION ALL
SELECT 'quiz_submissions', COUNT(*) FROM quiz_submissions
UNION ALL
SELECT 'user_progress', COUNT(*) FROM user_progress
UNION ALL
SELECT 'ai_preferences', COUNT(*) FROM ai_preferences
UNION ALL
SELECT 'pause_reasons', COUNT(*) FROM pause_reasons;

