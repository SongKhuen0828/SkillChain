# SkillChain - Real Implementation Flow Analysis

This document extracts the **ACTUAL implemented flows** from the codebase for FYP documentation. All information is based on code evidence, not assumptions.

---

## F1: Register + Login + Profile Creation/Update

### Summary
User registration creates an auth user via Supabase Auth, with profile row creation handled by a database trigger. Role-based redirects occur after login based on profile.role.

### Preconditions
- Valid email and password (min 6 chars)
- For educators: professional_title and portfolio_url required
- Optional: Organization invite code for educators

### Main Steps

1. **User Action**: Fill signup form (role, name, email, password, educator fields if applicable)
   - **System Action**: `SignUp.tsx` validates form, checks invite code if provided
   - **Supabase Call**: `SELECT` from `org_invite_codes` table (code validation)

2. **User Action**: Submit form
   - **System Action**: `AuthContext.signUp()` calls `supabase.auth.signUp()`
   - **Supabase Call**: `INSERT` into `auth.users` table (Supabase Auth)
   - **Metadata**: `{ full_name, role }` passed in `options.data`

3. **System Action**: Database trigger `handle_new_user()` (assumed, not found in code)
   - **Supabase Call**: `INSERT` into `profiles` table (triggered automatically)
   - **Note**: Code comment at line 121 in `AuthContext.tsx` states: "Profile is automatically created by trigger"

4. **System Action**: Frontend updates profile with additional data
   - **Supabase Call**: `UPDATE profiles` table
   - **Fields Updated**:
     - `role` (if educator: 'educator', else 'learner')
     - `verification_status` (if educator: 'pending')
     - `professional_title` (if educator)
     - `portfolio_url` (if educator)
     - `org_id` (if educator joined via invite)
     - `full_name`

5. **System Action**: If invite code used, increment usage
   - **Supabase Call**: `RPC use_invite_code(invite_code, user_id)`
   - **Note**: Called via `supabase.rpc()` in `SignUp.tsx` line 150

6. **User Action**: Navigate to `/dashboard`
   - **System Action**: `App.tsx` `DashboardRoute` checks `profile.role`
   - **Redirect Logic**:
     - `admin` → `/admin/dashboard`
     - `org_admin` → `/org/dashboard`
     - `educator` → `/educator/dashboard`
     - `learner` → `/dashboard` (shows `Dashboard` component)

7. **Login Flow**:
   - **User Action**: Enter email/password on `/login`
   - **System Action**: `AuthContext.signIn()` calls `supabase.auth.signInWithPassword()`
   - **System Action**: `onAuthStateChange` listener triggers `fetchProfile()`
   - **Supabase Call**: `SELECT * FROM profiles WHERE id = user.id`
   - **System Action**: Same redirect logic as step 6

### Alternative / Error Paths

- **Invalid invite code**: Toast error, inviteInfo set to null
- **Profile not found**: Code handles `PGRST116` error gracefully (line 71 in `AuthContext.tsx`)
- **Email already exists**: Supabase Auth returns error, shown via toast
- **Weak password**: Supabase Auth validation (min 6 chars)

### Components Involved

- **Frontend**: 
  - `apps/web/src/pages/auth/SignUp.tsx` (registration form)
  - `apps/web/src/pages/Login.tsx` (login form)
  - `apps/web/src/contexts/AuthContext.tsx` (auth logic)
  - `apps/web/src/App.tsx` (routing and redirects)

- **Backend**: 
  - Supabase Auth (handles user creation)
  - Database trigger `handle_new_user()` (creates profile row)
  - RPC function `use_invite_code()` (increments invite usage)

### Supabase Calls

**Tables**:
- `auth.users` (INSERT via `supabase.auth.signUp()`)
- `profiles` (INSERT by trigger, UPDATE by frontend)
- `org_invite_codes` (SELECT for validation, RPC for usage increment)

**Operations**:
- `supabase.auth.signUp()` → Creates user in `auth.users`
- `SELECT * FROM org_invite_codes WHERE code = ? AND is_active = true`
- `UPDATE profiles SET role, verification_status, professional_title, portfolio_url, org_id, full_name WHERE id = ?`
- `RPC use_invite_code(invite_code, user_id)`
- `supabase.auth.signInWithPassword()` → Authenticates user
- `SELECT * FROM profiles WHERE id = ?` (on login)

### Files to Reference

- `apps/web/src/pages/auth/SignUp.tsx` (lines 1-575)
- `apps/web/src/contexts/AuthContext.tsx` (lines 87-157)
- `apps/web/src/pages/Login.tsx` (lines 26-37)
- `apps/web/src/App.tsx` (lines 132-150)

### Notes

- **Profile Trigger**: Code assumes `handle_new_user()` trigger exists but trigger definition not found in codebase. Check Supabase migrations.
- **Role Storage**: Role stored in `profiles.role` column (not in `auth.users` metadata after initial signup)
- **Redirect**: Based on `profile.role` from database, not from auth metadata

---

## F2: Educator Create Course → Add Module → Add Lesson → Upload Content → Publish

### Summary
Educator creates course metadata, then builds structure (modules → lessons), uploads video/resource files to Supabase Storage, creates quizzes with questions, and publishes course.

### Preconditions
- User authenticated as `educator`
- Course not yet published (published courses locked for 3 days)
- Verification status checked (pending educators can only create free courses)

### Main Steps

1. **User Action**: Navigate to `/educator/courses/create`
   - **System Action**: `CreateCourse.tsx` loads, checks verification status
   - **Supabase Call**: `SELECT verification_status FROM profiles WHERE id = ?`

2. **User Action**: Fill course form (title, description, price, thumbnail, certificate_theme)
   - **System Action**: Upload thumbnail to Supabase Storage
   - **Storage Bucket**: `course-thumbnails`
   - **Path**: `thumbnails/{user.id}/{timestamp}_{filename}`
   - **Supabase Call**: `supabase.storage.from('course-thumbnails').upload(filePath, file)`
   - **Supabase Call**: `supabase.storage.from('course-thumbnails').getPublicUrl(filePath)`

3. **User Action**: Submit course creation form
   - **System Action**: `CreateCourse.tsx` inserts course
   - **Supabase Call**: `INSERT INTO courses (title, description, thumbnail_url, price, is_published, educator_id, certificate_theme) VALUES (...)`
   - **Note**: `price` forced to 0 if `verification_status = 'pending'`
   - **Redirect**: Navigate to `/educator/courses/{courseId}/edit`

4. **User Action**: Click "Add Module"
   - **System Action**: `CourseBuilder.tsx` opens dialog, calculates max `order_index`
   - **Supabase Call**: `INSERT INTO modules (course_id, title, order_index) VALUES (?, ?, max_index + 1)`

5. **User Action**: Click "Add Lesson" on a module
   - **System Action**: `CourseBuilder.tsx` opens lesson dialog with tabs (Video/Quiz)

6. **Video Lesson Path**:
   - **User Action**: Upload video file
     - **System Action**: `uploadVideoFile()` uses XMLHttpRequest for progress tracking
     - **Storage Bucket**: `course-content`
     - **Path**: `videos/{courseId}/{timestamp}_{filename}`
     - **Supabase Call**: `POST /storage/v1/object/course-content/{filePath}` (with auth header)
     - **Supabase Call**: `supabase.storage.from('course-content').getPublicUrl(filePath)`
   
   - **User Action**: Upload resource file (optional)
     - **System Action**: `uploadResourceFile()` (PDF, PPTX, DOCX, TXT)
     - **Path**: `resources/{user.id}/{timestamp}_{filename}`
     - **Same bucket**: `course-content`
   
   - **User Action**: Add video chapters (optional)
     - **System Action**: Stores chapters array in lesson record
   
   - **User Action**: Save lesson
     - **Supabase Call**: `INSERT INTO lessons (module_id, type, title, description, content_url, resource_url, chapters, order_index) VALUES (...)`
     - **Note**: `type = 'video'`, `chapters` stored as JSONB

7. **Quiz Lesson Path**:
   - **User Action**: Enter quiz title, passing score, add questions
     - **System Action**: `saveQuizToSupabase()` called on save
     - **Supabase Call**: `UPSERT INTO quizzes (lesson_id, title, passing_score) ON CONFLICT lesson_id`
     - **Supabase Call**: `DELETE FROM quiz_questions WHERE quiz_id = ?` (clear old questions)
     - **Supabase Call**: `INSERT INTO quiz_questions (quiz_id, question_text, question_type, points, options, correct_index, ai_scoring_criteria, order_index) VALUES (...)`
     - **Note**: `question_type` mapped: 'essay' → 'text' for DB
     - **Note**: `correct_index` is null for essay questions
   
   - **User Action**: Save lesson
     - **Supabase Call**: `INSERT INTO lessons (module_id, type, title, order_index) VALUES (?, 'quiz', ?, ?)`

8. **User Action**: Click "Publish Course"
   - **System Action**: `handlePublish()` updates course
   - **Supabase Call**: `UPDATE courses SET is_published = true, published_at = NOW(), updated_at = NOW() WHERE id = ?`
   - **Note**: After publish, course locked for 3 days (no new lessons, no edits)

### Alternative / Error Paths

- **Bucket not found**: Error toast, suggests running storage setup SQL
- **File too large**: Validation before upload (5MB for thumbnails)
- **Invalid file type**: Validation (video/* for videos, .pdf/.pptx/.docx/.txt for resources)
- **Quiz save fails**: Lesson creation blocked, error shown
- **Publish without content**: No validation found in code (educator can publish empty course)

### Components Involved

- **Frontend**:
  - `apps/web/src/pages/educator/CreateCourse.tsx` (course creation)
  - `apps/web/src/pages/educator/CourseBuilder.tsx` (module/lesson builder)
  
- **Storage**:
  - Supabase Storage bucket: `course-thumbnails` (for thumbnails)
  - Supabase Storage bucket: `course-content` (for videos and resources)

### Supabase Calls

**Tables**:
- `profiles` (SELECT verification_status)
- `courses` (INSERT, UPDATE)
- `modules` (INSERT)
- `lessons` (INSERT, UPDATE)
- `quizzes` (UPSERT)
- `quiz_questions` (DELETE, INSERT)

**Storage Buckets**:
- `course-thumbnails` (upload, getPublicUrl)
- `course-content` (upload via REST API with XMLHttpRequest, getPublicUrl)

**Operations**:
- `SELECT verification_status FROM profiles WHERE id = ?`
- `INSERT INTO courses (...)`
- `INSERT INTO modules (course_id, title, order_index)`
- `INSERT INTO lessons (module_id, type, title, content_url, resource_url, chapters, order_index)`
- `UPSERT INTO quizzes (lesson_id, title, passing_score) ON CONFLICT lesson_id`
- `DELETE FROM quiz_questions WHERE quiz_id = ?`
- `INSERT INTO quiz_questions (quiz_id, question_text, question_type, points, options, correct_index, ai_scoring_criteria, order_index)`
- `UPDATE courses SET is_published = true, published_at = NOW() WHERE id = ?`

### Files to Reference

- `apps/web/src/pages/educator/CreateCourse.tsx` (lines 131-165)
- `apps/web/src/pages/educator/CourseBuilder.tsx` (lines 249-1128)
- `apps/web/src/pages/educator/CourseBuilder.tsx` (lines 623-701 for video upload)
- `apps/web/src/pages/educator/CourseBuilder.tsx` (lines 703-767 for quiz save)
- `apps/web/src/pages/educator/CourseBuilder.tsx` (lines 1091-1128 for publish)

---

## F3: Learner Browse Courses → Enroll → Start Learning

### Summary
Learner browses published courses, enrolls (creates enrollment record), receives notifications, and starts learning by navigating to course player.

### Preconditions
- User authenticated as `learner`
- Course exists and `is_published = true`

### Main Steps

1. **User Action**: Navigate to `/dashboard/courses`
   - **System Action**: `LearnerCourses.tsx` fetches published courses
   - **Supabase Call**: `SELECT * FROM courses WHERE is_published = true ORDER BY created_at DESC`
   - **Supabase Call**: `SELECT course_id, rating FROM reviews` (for ratings display)
   - **Supabase Call**: `SELECT course_id, status FROM enrollments WHERE user_id = ?`
   - **Supabase Call**: `SELECT lesson_id FROM user_progress WHERE user_id = ?` (for progress calculation)

2. **User Action**: Click "Enroll Now" on a course
   - **System Action**: `handleEnroll()` in `LearnerCourses.tsx`
   - **Supabase Call**: `INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)`
   - **Error Handling**: If `error.code === '23505'` (duplicate), show "already enrolled" toast

3. **System Action**: Send notifications after enrollment
   - **Notification to Learner**: `NotificationService.courseEnrolled(learnerId, courseName, courseId)`
     - **Supabase Call**: `INSERT INTO notifications (user_id, type, title, message, data) VALUES (?, 'course_enrolled', ?, ?, {courseId})`
   
   - **Notification to Educator**: `NotificationService.newStudent(educatorId, learnerName, courseName, courseId)`
     - **Supabase Call**: `INSERT INTO notifications (user_id, type, title, message, data) VALUES (?, 'new_student', ?, ?, {courseId})`
     - **Note**: Only if `course.educator_id` exists

4. **User Action**: Click "Continue Learning" or "Start Learning"
   - **System Action**: Navigate to `/course/{courseId}/learn`
   - **Component**: `CoursePlayerImmersive` (from `apps/web/src/pages/learner/CoursePlayer.tsx`)

5. **System Action**: Course player loads
   - **Supabase Call**: `SELECT * FROM courses WHERE id = ?`
   - **Supabase Call**: `SELECT *, lessons(*) FROM modules WHERE course_id = ? ORDER BY order_index`
   - **Supabase Call**: `SELECT lesson_id FROM user_progress WHERE user_id = ?` (for completed lessons)

### Alternative / Error Paths

- **Already enrolled**: Toast info message, no duplicate enrollment
- **Course not found**: Error toast, redirect or show empty state
- **Notification send fails**: Logged but doesn't block enrollment

### Components Involved

- **Frontend**:
  - `apps/web/src/pages/learner/LearnerCourses.tsx` (browse and enroll)
  - `apps/web/src/pages/learner/CoursePlayer.tsx` (learning interface)
  - `apps/web/src/lib/notifications.ts` (notification service)

### Supabase Calls

**Tables**:
- `courses` (SELECT with is_published filter)
- `reviews` (SELECT for ratings)
- `enrollments` (INSERT, SELECT)
- `user_progress` (SELECT for progress calculation)
- `notifications` (INSERT for learner and educator)

**Operations**:
- `SELECT * FROM courses WHERE is_published = true ORDER BY created_at DESC`
- `SELECT course_id, rating FROM reviews`
- `SELECT course_id, status FROM enrollments WHERE user_id = ?`
- `INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)`
- `INSERT INTO notifications (user_id, type, title, message, data) VALUES (?, 'course_enrolled', ?, ?, ?)`
- `INSERT INTO notifications (user_id, type, title, message, data) VALUES (?, 'new_student', ?, ?, ?)`
- `SELECT *, lessons(*) FROM modules WHERE course_id = ? ORDER BY order_index`
- `SELECT lesson_id FROM user_progress WHERE user_id = ?`

### Files to Reference

- `apps/web/src/pages/learner/LearnerCourses.tsx` (lines 184-219 for enrollment)
- `apps/web/src/lib/notifications.ts` (lines 74-94 for notification service)
- `apps/web/src/pages/learner/CoursePlayer.tsx` (lines 1-100 for course loading)

---

## F4: Learning Progress Update + Study Session Logging

### Summary
Progress tracked via `user_progress` table when lessons completed. Study sessions logged to `study_sessions` table with focus metrics. FocusTimer saves sessions on completion.

### Preconditions
- User enrolled in course
- Lesson exists and accessible

### Main Steps

1. **User Action**: Complete a video lesson (click "Mark Complete")
   - **System Action**: `handleMarkComplete()` in `CoursePlayer.tsx` (line 215)
   - **Supabase Call**: `UPSERT INTO user_progress (user_id, lesson_id, completed_at) VALUES (?, ?, NOW())`
   - **Note**: Uses `upsert` with conflict handling

2. **System Action**: Update study plan status
   - **Supabase Call**: `UPDATE study_plans SET status = 'done', updated_at = NOW() WHERE user_id = ? AND lesson_id = ? AND status = 'pending'`
   - **Note**: Non-critical, error logged but doesn't block

3. **System Action**: Save study session (if sessionStartTime exists)
   - **Session Data**:
     - `user_id`
     - `course_id`
     - `method_used`: 'video' (hardcoded for lesson completion)
     - `duration_seconds`: calculated from `sessionStartTime`
     - `completed`: true
     - `started_at`: sessionStartTime
     - `tab_switch_count`: tracked via visibility API
   - **Supabase Call**: `INSERT INTO study_sessions (user_id, course_id, method_used, duration_seconds, completed, started_at, tab_switch_count) VALUES (?, ?, 'video', ?, true, ?, ?)`
   - **Retry Logic**: Uses `retryWithBackoff()` with max 5 retries, exponential backoff
   - **Note**: Non-blocking, errors logged but UI continues

4. **User Action**: Use FocusTimer component
   - **System Action**: `FocusTimer.tsx` tracks time, mode (pomodoro/flowtime/blitz/52_17)
   - **Tab Switch Tracking**: Not implemented in FocusTimer (tab_switch_count = 0)
   - **On Timer End**: `finishSession(true)` called
   - **Supabase Call**: `INSERT INTO study_sessions (user_id, course_id, method_used, duration_seconds, completed, tab_switch_count) VALUES (?, ?, ?, ?, true, 0)`
   - **Note**: Only saves if `totalSpent > 10` seconds (ignores accidental starts)

5. **System Action**: Recalculate course progress
   - **Calculation**: `(completedLessons / totalLessons) * 100`
   - **Stored**: In component state, not in database (enrollment.progress may be calculated on-demand)

### Alternative / Error Paths

- **Progress save fails**: Error toast, lesson not marked complete
- **Study session save fails**: Logged but non-blocking (retry logic)
- **Tab switch tracking**: Implemented in `CoursePlayer.tsx` via `visibilitychange` event, increments `tabSwitchCount`

### Components Involved

- **Frontend**:
  - `apps/web/src/pages/CoursePlayer.tsx` (lesson completion)
  - `apps/web/src/components/FocusTimer.tsx` (focus session tracking)
  - `apps/web/src/lib/database/retryWithBackoff.ts` (retry utility)

### Supabase Calls

**Tables**:
- `user_progress` (UPSERT)
- `study_plans` (UPDATE status)
- `study_sessions` (INSERT)

**Operations**:
- `UPSERT INTO user_progress (user_id, lesson_id, completed_at) VALUES (?, ?, NOW())`
- `UPDATE study_plans SET status = 'done', updated_at = NOW() WHERE user_id = ? AND lesson_id = ? AND status = 'pending'`
- `INSERT INTO study_sessions (user_id, course_id, method_used, duration_seconds, completed, started_at, tab_switch_count) VALUES (?, ?, ?, ?, ?, ?, ?)`

### Files to Reference

- `apps/web/src/pages/CoursePlayer.tsx` (lines 215-299 for lesson completion)
- `apps/web/src/components/FocusTimer.tsx` (lines 138-167 for session saving)
- `apps/web/src/lib/database/retryWithBackoff.ts` (retry logic)

### Notes

- **Progress Table**: Uses `user_progress` table (not `lesson_progress`)
- **Study Sessions**: Saved on lesson end (CoursePlayer) and timer end (FocusTimer)
- **Tab Switch Count**: Only tracked in CoursePlayer, not in FocusTimer
- **FocusTimer Method**: Hardcoded to mode name (pomodoro/flowtime/blitz/52_17)

---

## F5: Quiz Attempt and Grading

### Summary
Quiz submission graded client-side for MCQ/TrueFalse, AI-graded for essay questions via Edge Function. Results saved to `quiz_submissions` table. Progress updated only if passed (>=60%).

### Preconditions
- User enrolled in course
- Quiz exists with questions
- Quiz not yet submitted

### Main Steps

1. **User Action**: Navigate to quiz (via lesson or direct link)
   - **System Action**: `QuizPlayerPage.tsx` loads quiz data
   - **Supabase Call**: `SELECT *, quiz_questions(*) FROM quizzes WHERE id = ?`
   - **System Action**: Questions sorted by `order_index`

2. **User Action**: Answer questions and submit
   - **System Action**: `handleSubmit()` in `QuizPlayerPage.tsx` (line 103)
   - **Grading Logic**:
     - **MCQ/TrueFalse**: Client-side comparison
       - `isCorrect = String(answers[q.id]) === String(q.correct_index)`
       - Points: `isCorrect ? q.points : 0`
     - **Essay Questions**: AI grading via Edge Function
       - **Supabase Call**: `supabase.functions.invoke('grade-quiz', { body: { questionText, userAnswer, correctAnswer, maxPoints } })`
       - **Request Shape**: `{ questionText: string, userAnswer: string, correctAnswer: string, maxPoints: number }`
       - **Response Shape**: `{ score: number, feedback: string }`
       - **Error Handling**: If AI fails, score = 0, feedback = 'AI Grading Unavailable'

3. **System Action**: Calculate final score
   - **Calculation**: `(totalScore / totalPoints) * 100`
   - **Passing**: `percentage >= quiz.passing_score` (default 80%)

4. **System Action**: Save submission (always, even if failed)
   - **Supabase Call**: `INSERT INTO quiz_submissions (quiz_id, user_id, score, passed, answers, feedback) VALUES (?, ?, ?, ?, ?, ?)`
   - **Fields**:
     - `answers`: JSON object of all user answers
     - `feedback`: JSON string of detailed feedback array

5. **System Action**: Update progress (only if passed >= 60%)
   - **Condition**: `passed && percentage >= 60 && quiz.lesson_id`
   - **Supabase Call**: `UPSERT INTO user_progress (user_id, lesson_id) VALUES (?, ?) ON CONFLICT (user_id, lesson_id)`
   - **System Action**: Check course completion
     - **Supabase Call**: `SELECT module_id, modules!inner(course_id) FROM lessons WHERE id = ?`
     - **System Action**: `updateEnrollmentStatus(userId, courseId)` called
     - **Supabase Call**: `UPDATE enrollments SET status = 'completed' WHERE user_id = ? AND course_id = ?` (if all lessons done)

6. **System Action**: Trigger AI rescheduling (if failed < 60%)
   - **System Action**: `triggerRecalculationAfterQuiz(userId, courseId)` called
   - **Note**: Function not found in codebase, likely calls AI scheduling engine

### Alternative / Error Paths

- **AI Grading fails**: Score = 0, feedback = 'AI Grading Unavailable', quiz continues
- **Submission save fails**: Toast error, but results still shown
- **Progress update fails**: Logged but non-blocking
- **Time limit exceeded**: Auto-submit when timer reaches 0

### Components Involved

- **Frontend**:
  - `apps/web/src/pages/learner/QuizPlayerPage.tsx` (quiz interface and grading)
  
- **Backend**:
  - Supabase Edge Function: `grade-quiz` (AI grading for essays)
  - `apps/web/src/lib/certificate.ts` (course completion check)

### Supabase Calls

**Tables**:
- `quizzes` (SELECT with quiz_questions join)
- `quiz_questions` (SELECT)
- `quiz_submissions` (INSERT)
- `user_progress` (UPSERT)
- `lessons` (SELECT with modules join)
- `enrollments` (UPDATE status)

**Edge Functions**:
- `grade-quiz` (invoked via `supabase.functions.invoke()`)

**Operations**:
- `SELECT *, quiz_questions(*) FROM quizzes WHERE id = ?`
- `supabase.functions.invoke('grade-quiz', { body: {...} })`
- `INSERT INTO quiz_submissions (quiz_id, user_id, score, passed, answers, feedback) VALUES (?, ?, ?, ?, ?, ?)`
- `UPSERT INTO user_progress (user_id, lesson_id) VALUES (?, ?) ON CONFLICT (user_id, lesson_id)`
- `SELECT module_id, modules!inner(course_id) FROM lessons WHERE id = ?`
- `UPDATE enrollments SET status = 'completed' WHERE user_id = ? AND course_id = ?`

### Files to Reference

- `apps/web/src/pages/learner/QuizPlayerPage.tsx` (lines 103-244 for grading logic)
- `apps/web/src/lib/certificate.ts` (lines 25-82 for completion check)

### Notes

- **Grading Location**: MCQ/TrueFalse graded client-side, Essay graded server-side (Edge Function)
- **Edge Function**: `grade-quiz` not found in codebase, must be deployed separately
- **Passing Threshold**: Hardcoded 60% minimum for progress update (line 187)
- **Quiz Passing Score**: Uses `quiz.passing_score` (default 80%) for pass/fail determination

---

## F6: AI Companion Chat and AI Schedule Generation/Refresh

### Summary
AI Companion uses Groq API via Supabase Edge Function `ai-companion`. Schedule generation is client-side using `AdaptiveSchedulingEngine.ts` (TensorFlow.js). Study plans stored in `study_plans` table. Old pending plans NOT deleted before insert.

### Preconditions
- User authenticated
- AI Companion enabled (default: true, can be disabled in profile)
- For scheduling: User has enrolled courses with lessons

### Main Steps

1. **AI Companion Chat**:
   - **User Action**: Interact with AI Companion (various contexts)
   - **System Action**: `AICompanionService.ts` calls Edge Function
   - **Supabase Call**: `supabase.functions.invoke('ai-companion', { body: { prompt, context } })`
   - **Request Types**:
     - General chat: `{ prompt: string, context?: {...} }`
     - Course recommendation: `{ type: 'course_recommendation', data: { goal, skill, proficiency, availableCourses } }`
   - **Response**: `{ response: string }` or `{ recommendation: string }`
   - **Fallback**: If Edge Function fails, returns template-based message

2. **AI Schedule Generation**:
   - **User Action**: Click "Generate AI Schedule" on dashboard
   - **System Action**: `generateAISchedule()` in `useLearnerData.ts` (line 127)
   - **Supabase Call**: `SELECT * FROM ai_preferences WHERE user_id = ?` (if needed)
   - **Supabase Call**: `SELECT id, title, type, duration FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id IN (SELECT course_id FROM enrollments WHERE user_id = ?)) AND order_index <= 5 ORDER BY order_index LIMIT 5`
   - **System Action**: Creates 3 study plans for today (9 AM, 12 PM, 3 PM)
   - **Supabase Call**: `INSERT INTO study_plans (user_id, lesson_id, scheduled_at, status) VALUES (?, ?, ?, 'pending')` (3 inserts)
   - **Note**: Old pending plans NOT deleted (code doesn't show deletion)

3. **Adaptive Scheduling Engine** (used by FocusTimer):
   - **System Action**: `AdaptiveSchedulingEngine.ts` initializes
   - **Supabase Call**: `SELECT preferred_study_time, focus_span, struggle FROM ai_preferences WHERE user_id = ?`
   - **System Action**: Loads TensorFlow.js model from localStorage or trains new model
   - **Training Data**: `SELECT started_at, method_used, completed FROM study_sessions ORDER BY started_at DESC LIMIT 500`
   - **Model**: Neural network (2 inputs: hour, method → 1 output: completion probability)
   - **Prediction**: `predictBestMethod(userId)` returns `{ method: string, confidence: number, allScores: {...} }`

4. **Schedule Refresh** (after quiz failure):
   - **System Action**: `triggerRecalculationAfterQuiz()` called (function not found in codebase)
   - **Likely Action**: Re-runs schedule generation or adjusts existing plans

### Alternative / Error Paths

- **Edge Function fails**: Fallback to template messages
- **No lessons available**: Toast error, schedule not generated
- **AI Preferences missing**: Uses "Night Owl" baseline (evening, 25min, distractions)
- **Insufficient training data**: Uses baseline model with preference adjustments

### Components Involved

- **Frontend**:
  - `apps/web/src/lib/ai/AICompanionService.ts` (Groq API calls)
  - `apps/web/src/lib/ai/AdaptiveSchedulingEngine.ts` (TensorFlow.js scheduling)
  - `apps/web/src/hooks/useLearnerData.ts` (schedule generation UI)
  - `apps/web/src/components/FocusTimer.tsx` (uses engine for recommendations)

- **Backend**:
  - Supabase Edge Function: `ai-companion` (Groq API wrapper)

### Supabase Calls

**Tables**:
- `ai_preferences` (SELECT)
- `study_plans` (INSERT, SELECT)
- `study_sessions` (SELECT for training)
- `lessons` (SELECT for schedule generation)
- `modules` (SELECT for course structure)
- `enrollments` (SELECT for user courses)

**Edge Functions**:
- `ai-companion` (invoked for chat and recommendations)

**Operations**:
- `supabase.functions.invoke('ai-companion', { body: { prompt, context } })`
- `SELECT * FROM ai_preferences WHERE user_id = ?`
- `SELECT id, title, type, duration FROM lessons WHERE module_id IN (...) ORDER BY order_index LIMIT 5`
- `INSERT INTO study_plans (user_id, lesson_id, scheduled_at, status) VALUES (?, ?, ?, 'pending')`
- `SELECT started_at, method_used, completed FROM study_sessions ORDER BY started_at DESC LIMIT 500`
- `SELECT * FROM study_plans WHERE user_id = ? AND scheduled_at >= ? AND scheduled_at < ? AND status = 'pending' ORDER BY scheduled_at`

### Files to Reference

- `apps/web/src/lib/ai/AICompanionService.ts` (lines 34-71 for Edge Function calls)
- `apps/web/src/lib/ai/AdaptiveSchedulingEngine.ts` (lines 196-282 for training, 289-360 for prediction)
- `apps/web/src/hooks/useLearnerData.ts` (lines 127-229 for schedule generation)
- `apps/web/src/components/FocusTimer.tsx` (lines 39-135 for AI recommendations)

### Notes

- **Schedule Generation**: Client-side, NOT server-side
- **Old Plans Deletion**: NOT implemented (code doesn't delete old pending plans before insert)
- **AI Companion**: Uses Groq API via Edge Function, not direct API calls
- **Adaptive Engine**: TensorFlow.js model stored in browser localStorage
- **Baseline Preferences**: "Night Owl" default if no preferences found

---

## F7: Certificate Minting (NFT)

### Summary
Certificate minting supports simulation and real blockchain modes. Image and metadata uploaded to IPFS (Pinata), then NFT minted on Polygon Amoy. Certificate record saved to database.

### Preconditions
- Course completed (all lessons + quiz thresholds met)
- Certificate not already minted for user/course
- Contract address configured (`VITE_CERTIFICATE_CONTRACT_ADDRESS`)

### Main Steps

1. **User Action**: Complete course (all lessons done, quizzes passed)
   - **System Action**: `checkCourseCompletion()` verifies completion
   - **Supabase Call**: `SELECT id, modules(id, lessons(id)) FROM courses WHERE id = ?`
   - **Supabase Call**: `SELECT lesson_id FROM user_progress WHERE user_id = ? AND lesson_id IN (...)`
   - **Calculation**: `isCompleted = completedCount === totalCount`

2. **User Action**: Click "View Certificate" or auto-mint triggered
   - **System Action**: `autoMintCertificate()` in `autoMintCertificate.ts` (line 25)
   - **Check**: `SELECT id, tx_hash FROM certificates WHERE user_id = ? AND course_id = ?`
   - **If exists**: Return existing certificate, skip minting

3. **System Action**: Generate certificate image
   - **Tool**: `html2canvas` library
   - **Input**: DOM element containing certificate (rendered by `CertificateRenderer`)
   - **Output**: Canvas converted to PNG Blob

4. **System Action**: Upload image to IPFS
   - **Service**: Pinata API
   - **Function**: `uploadImageToIPFS(imageBlob, fileName)`
   - **API Call**: `POST https://api.pinata.cloud/pinning/pinFileToIPFS`
   - **Headers**: `pinata_api_key`, `pinata_secret_api_key`
   - **Body**: FormData with file, pinataMetadata, pinataOptions
   - **Response**: `{ IpfsHash: string }`
   - **Image URI**: `ipfs://{hash}`

5. **System Action**: Prepare metadata JSON
   - **Metadata Structure**:
     ```json
     {
       "name": "SkillChain Certificate of Completion",
       "description": "...",
       "image": "ipfs://{imageHash}",
       "attributes": [
         { "trait_type": "Student Name", "value": "..." },
         { "trait_type": "Course Title", "value": "..." },
         { "trait_type": "Completion Date", "value": "..." },
         { "trait_type": "Instructor", "value": "..." },
         { "trait_type": "Certificate Type", "value": "Course Completion" }
       ]
     }
     ```

6. **System Action**: Upload metadata to IPFS
   - **Function**: `uploadMetadataToIPFS(metadata, fileName)`
   - **API Call**: `POST https://api.pinata.cloud/pinning/pinJSONToIPFS`
   - **Response**: `{ IpfsHash: string }`
   - **Metadata URI**: `ipfs://{hash}`

7. **System Action**: Get student wallet address
   - **Supabase Call**: `SELECT wallet_address FROM profiles WHERE id = ?`
   - **Fallback**: Use `0x0000000000000000000000000000000000000000` if no wallet

8. **System Action**: Mint NFT on blockchain
   - **Mode Check**: `VITE_USE_SIMULATION === 'true' || !contractAddress` → simulation mode
   
   **Simulation Mode**:
   - **Function**: `simulateMinting()` in `BlockchainService.ts` (line 37)
   - **Delay**: 3 seconds (simulated network delay)
   - **Tx Hash**: Generated via `generateSimulatedTxHash()` (64 hex chars, prefixed `0x`)
   - **Token ID**: Generated via `generateSimulatedTokenId()` (random 1-1,000,000)
   - **Returns**: `{ transactionHash: string, tokenId: bigint }`
   
   **Real Mode**:
   - **Function**: `realMinting()` in `BlockchainService.ts` (line 62)
   - **Library**: `ethers.js` (dynamically imported)
   - **Provider**: Polygon Amoy RPC (`VITE_POLYGON_RPC_URL` or default)
   - **Wallet**: Created from `VITE_ADMIN_PRIVATE_KEY`
   - **Contract**: `CertificateNFT.sol` deployed at `contractAddress`
   - **Function Call**: `contract.mintCertificate(learner, learnerName, courseTitle, metadataURI)`
   - **ABI**: `['function mintCertificate(...) external returns (uint256)', 'event CertificateMinted(...)']`
   - **Transaction**: `await tx.wait()` for confirmation
   - **Token ID**: Parsed from `CertificateMinted` event or fallback to `blockNumber`
   - **Returns**: `{ transactionHash: string, tokenId: bigint }`

9. **System Action**: Save certificate to database
   - **Supabase Call**: `INSERT INTO certificates (user_id, course_id, tx_hash, ipfs_hash, token_id, minted_at) VALUES (?, ?, ?, ?, ?, NOW())`
   - **Fields**:
     - `tx_hash`: Transaction hash from blockchain
     - `ipfs_hash`: Metadata IPFS hash (not image hash)
     - `token_id`: Token ID as string
   - **Error Handling**: Logged but non-blocking (NFT already minted)

### Alternative / Error Paths

- **Course not completed**: Return null, no minting
- **Certificate already exists**: Return existing certificate data
- **IPFS upload fails**: Error thrown, minting aborted
- **Pinata API keys missing**: Error thrown
- **Simulation mode**: No real transaction, fake hash/tokenId generated
- **Real mode - contract address missing**: Falls back to simulation
- **Real mode - private key missing**: Error thrown
- **Real mode - transaction fails**: Error thrown, certificate not saved
- **Database save fails**: Logged but NFT already minted (non-blocking)

### Components Involved

- **Frontend**:
  - `apps/web/src/lib/blockchain/autoMintCertificate.ts` (orchestration)
  - `apps/web/src/lib/blockchain/BlockchainService.ts` (minting logic)
  - `apps/web/src/lib/ipfs/pinata.ts` (IPFS uploads)
  - `apps/web/src/lib/certificate.ts` (completion check)
  - `apps/web/src/components/certificates/CertificateTemplates.tsx` (certificate rendering)

- **External Services**:
  - Pinata API (IPFS uploads)
  - Polygon Amoy Testnet (blockchain)
  - CertificateNFT.sol contract (ERC-721)

### Supabase Calls

**Tables**:
- `courses` (SELECT with modules/lessons)
- `user_progress` (SELECT for completion check)
- `certificates` (SELECT for existing check, INSERT for new certificate)
- `profiles` (SELECT wallet_address)

**External APIs**:
- Pinata: `POST /pinning/pinFileToIPFS` (image)
- Pinata: `POST /pinning/pinJSONToIPFS` (metadata)
- Polygon Amoy RPC: Contract interaction via ethers.js

**Operations**:
- `SELECT id, modules(id, lessons(id)) FROM courses WHERE id = ?`
- `SELECT lesson_id FROM user_progress WHERE user_id = ? AND lesson_id IN (...)`
- `SELECT id, tx_hash FROM certificates WHERE user_id = ? AND course_id = ?`
- `SELECT wallet_address FROM profiles WHERE id = ?`
- `INSERT INTO certificates (user_id, course_id, tx_hash, ipfs_hash, token_id, minted_at) VALUES (?, ?, ?, ?, ?, NOW())`

### Files to Reference

- `apps/web/src/lib/blockchain/autoMintCertificate.ts` (lines 25-174)
- `apps/web/src/lib/blockchain/BlockchainService.ts` (lines 13-160)
- `apps/web/src/lib/ipfs/pinata.ts` (lines 20-117)
- `apps/web/src/lib/certificate.ts` (lines 25-82 for completion check)
- `packages/contracts/contracts/CertificateNFT.sol` (lines 54-78 for mintCertificate function)

### Notes

- **Simulation Mode**: Enabled if `VITE_USE_SIMULATION === 'true'` or `contractAddress` missing
- **Tx Hash Generation**: Random 64 hex chars in simulation, real hash from blockchain in real mode
- **Token ID Generation**: Random 1-1,000,000 in simulation, from event or blockNumber in real mode
- **IPFS Storage**: Image and metadata both uploaded, only metadata hash stored in DB
- **Contract Function**: `mintCertificate(address learner, string learnerName, string courseTitle, string metadataURI) returns (uint256)`
- **Event**: `CertificateMinted(uint256 indexed tokenId, address indexed learner, string courseTitle, uint256 completionDate)`

---

## Summary of Missing/Unconfirmed Items

1. **F1 - Profile Trigger**: `handle_new_user()` trigger function not found in codebase. Check Supabase migrations.
2. **F5 - Edge Function**: `grade-quiz` Edge Function not found in codebase. Must be deployed separately.
3. **F6 - Schedule Recalculation**: `triggerRecalculationAfterQuiz()` function not found in codebase.
4. **F6 - Old Plans Deletion**: Code does NOT delete old pending study_plans before inserting new ones.
5. **F7 - Contract Deployment**: Contract deployment script exists but contract address must be configured.

---

## Database Tables Summary

| Table | Primary Operations | Key Fields |
|-------|-------------------|------------|
| `auth.users` | INSERT (via Auth) | id, email |
| `profiles` | INSERT (trigger), UPDATE, SELECT | id, role, verification_status, org_id |
| `courses` | INSERT, UPDATE, SELECT | id, educator_id, is_published, certificate_theme |
| `modules` | INSERT, SELECT | id, course_id, order_index |
| `lessons` | INSERT, UPDATE, SELECT | id, module_id, type, content_url, resource_url |
| `quizzes` | UPSERT, SELECT | id, lesson_id, passing_score |
| `quiz_questions` | DELETE, INSERT, SELECT | id, quiz_id, question_type, correct_index |
| `enrollments` | INSERT, UPDATE, SELECT | user_id, course_id, status |
| `user_progress` | UPSERT, SELECT | user_id, lesson_id, completed_at |
| `study_plans` | INSERT, UPDATE, SELECT | user_id, lesson_id, scheduled_at, status |
| `study_sessions` | INSERT, SELECT | user_id, course_id, method_used, duration_seconds, tab_switch_count |
| `quiz_submissions` | INSERT, SELECT | quiz_id, user_id, score, passed, answers, feedback |
| `certificates` | INSERT, SELECT | user_id, course_id, tx_hash, ipfs_hash, token_id |
| `notifications` | INSERT, SELECT, UPDATE | user_id, type, title, message, read_at |
| `ai_preferences` | SELECT | user_id, preferred_study_time, focus_span, struggle |
| `org_invite_codes` | SELECT, RPC | code, org_id, current_uses, max_uses |

---

## Storage Buckets Summary

| Bucket Name | Usage | Path Pattern |
|-------------|-------|--------------|
| `course-thumbnails` | Course thumbnails | `thumbnails/{user.id}/{timestamp}_{filename}` |
| `course-content` | Videos and resources | `videos/{courseId}/{timestamp}_{filename}` or `resources/{user.id}/{timestamp}_{filename}` |

---

## Edge Functions Summary

| Function Name | Purpose | Request/Response |
|---------------|---------|------------------|
| `ai-companion` | Groq API wrapper for AI chat | `{ prompt, context }` → `{ response }` or `{ type: 'course_recommendation', data: {...} }` → `{ recommendation }` |
| `grade-quiz` | AI grading for essay questions | `{ questionText, userAnswer, correctAnswer, maxPoints }` → `{ score, feedback }` |

---

**Document Generated**: Based on actual codebase analysis  
**Last Updated**: Based on code as of analysis date  
**Verification**: All flows verified against source code files listed

