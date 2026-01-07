-- ============================================================================
-- COMPREHENSIVE DATA SEEDING SCRIPT
-- ============================================================================
-- Seeds: 1 course with videos + 5 quizzes, ai_preferences, and ensures 5000 study_sessions

-- 1. Ensure AI Preferences exists for seeded user
-- ============================================================================
INSERT INTO ai_preferences (user_id, preferred_study_time, focus_span, struggle)
VALUES ('4d70bd24-a23f-494f-8946-e96b712ccfc6', 'evening', 25, 'distractions')
ON CONFLICT (user_id) DO UPDATE SET
  preferred_study_time = EXCLUDED.preferred_study_time,
  focus_span = EXCLUDED.focus_span,
  struggle = EXCLUDED.struggle;

-- 2. Create/Update a comprehensive course with videos and quizzes
-- ============================================================================
-- Course: Blockchain & Web3 Fundamentals
INSERT INTO courses (id, title, description, thumbnail_url, is_published)
VALUES (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'Blockchain & Web3 Fundamentals',
  'Complete guide to blockchain technology, smart contracts, and decentralized applications. Learn from basics to advanced concepts.',
  'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800',
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  is_published = TRUE;

-- Module 1: Blockchain Basics
INSERT INTO modules (id, course_id, title, order_index)
VALUES (
  'f1111111-1111-1111-1111-111111111111',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'Blockchain Basics',
  1
)
ON CONFLICT (id) DO NOTHING;

-- Module 2: Smart Contracts
INSERT INTO modules (id, course_id, title, order_index)
VALUES (
  'f2222222-2222-2222-2222-222222222222',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'Smart Contracts',
  2
)
ON CONFLICT (id) DO NOTHING;

-- 3. Create Lessons (3 videos + 2 quizzes in Module 1, 2 videos + 3 quizzes in Module 2 = 5 quizzes total)
-- ============================================================================
-- Module 1 Lessons
INSERT INTO lessons (id, module_id, type, content_url, duration, title, order_index)
VALUES 
  ('fl111111-1111-1111-1111-111111111111', 'f1111111-1111-1111-1111-111111111111', 'video', 'https://example.com/videos/blockchain-intro.mp4', 20, 'Introduction to Blockchain', 1),
  ('fl222222-2222-2222-2222-222222222222', 'f1111111-1111-1111-1111-111111111111', 'video', 'https://example.com/videos/cryptography.mp4', 25, 'Cryptography Fundamentals', 2),
  ('fl333333-3333-3333-3333-333333333333', 'f1111111-1111-1111-1111-111111111111', 'quiz', NULL, 15, 'Blockchain Basics Quiz 1', 3),
  ('fl444444-4444-4444-4444-444444444444', 'f1111111-1111-1111-1111-111111111111', 'video', 'https://example.com/videos/consensus.mp4', 22, 'Consensus Mechanisms', 4),
  ('fl555555-5555-5555-5555-555555555555', 'f1111111-1111-1111-1111-111111111111', 'quiz', NULL, 12, 'Blockchain Basics Quiz 2', 5)
ON CONFLICT (id) DO NOTHING;

-- Module 2 Lessons
INSERT INTO lessons (id, module_id, type, content_url, duration, title, order_index)
VALUES 
  ('fl666666-6666-6666-6666-666666666666', 'f2222222-2222-2222-2222-222222222222', 'video', 'https://example.com/videos/smart-contracts-intro.mp4', 20, 'Smart Contracts Introduction', 1),
  ('fl777777-7777-7777-7777-777777777777', 'f2222222-2222-2222-2222-222222222222', 'quiz', NULL, 15, 'Smart Contracts Quiz 1', 2),
  ('fl888888-8888-8888-8888-888888888888', 'f2222222-2222-2222-2222-222222222222', 'video', 'https://example.com/videos/solidity.mp4', 30, 'Solidity Programming', 3),
  ('fl999999-9999-9999-9999-999999999999', 'f2222222-2222-2222-2222-222222222222', 'quiz', NULL, 18, 'Smart Contracts Quiz 2', 4),
  ('flaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'f2222222-2222-2222-2222-222222222222', 'quiz', NULL, 20, 'Smart Contracts Quiz 3', 5)
ON CONFLICT (id) DO NOTHING;

-- 4. Create Quizzes linked to quiz-type lessons
-- ============================================================================
INSERT INTO quizzes (id, lesson_id, title, description, passing_score, time_limit)
VALUES 
  ('fq111111-1111-1111-1111-111111111111', 'fl333333-3333-3333-3333-333333333333', 'Blockchain Basics Quiz 1', 'Test your understanding of blockchain fundamentals', 80, 15),
  ('fq222222-2222-2222-2222-222222222222', 'fl555555-5555-5555-5555-555555555555', 'Blockchain Basics Quiz 2', 'Advanced blockchain concepts quiz', 80, 12),
  ('fq333333-3333-3333-3333-333333333333', 'fl777777-7777-7777-7777-777777777777', 'Smart Contracts Quiz 1', 'Introduction to smart contracts', 80, 15),
  ('fq444444-4444-4444-4444-444444444444', 'fl999999-9999-9999-9999-999999999999', 'Smart Contracts Quiz 2', 'Smart contracts implementation', 80, 18),
  ('fq555555-5555-5555-5555-555555555555', 'flaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Smart Contracts Quiz 3', 'Advanced smart contracts concepts', 80, 20)
ON CONFLICT (id) DO NOTHING;

-- 5. Create Sample Quiz Questions (for first quiz as example)
-- ============================================================================
INSERT INTO quiz_questions (id, quiz_id, question_text, question_type, options, correct_answer, points, order_index)
VALUES 
  ('fqq11111-1111-1111-1111-111111111111', 'fq111111-1111-1111-1111-111111111111', 'What is a blockchain?', 'multiple_choice', 
   ARRAY['A distributed ledger', 'A type of database', 'A cryptocurrency', 'A programming language'], 
   'A distributed ledger', 10, 1),
  ('fqq22222-2222-2222-2222-222222222222', 'fq111111-1111-1111-1111-111111111111', 'Blockchain is immutable.', 'true_false',
   NULL, 'True', 10, 2)
ON CONFLICT (id) DO NOTHING;

-- Note: study_sessions should be seeded using the seed_study_sessions.ts script
-- This ensures 5000 records with proper Night Owl pattern

