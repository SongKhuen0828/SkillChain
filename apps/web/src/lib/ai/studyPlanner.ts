import { supabase } from '@/lib/supabase';

export interface AdaptationLog {
  timestamp: string;
  action: 'shift' | 'review_scheduled' | 'plan_regenerated';
  reason: string;
  details?: any;
}

/**
 * Trigger schedule recalculation after a quiz submission
 * Uses course's passing_score (set by instructor) instead of hardcoded values
 */
export async function triggerRecalculationAfterQuiz(userId: string, courseId: string): Promise<void> {
  try {
    await recalculatePlan(userId, courseId);
  } catch (error) {
    console.error('Error triggering schedule recalculation:', error);
  }
}

/**
 * Recalculate study plan based on quiz performance
 * Uses instructor-defined passing_score from courses table
 */
export async function recalculatePlan(userId: string, courseId: string): Promise<void> {
  try {
    // 1. Fetch the course to get instructor-defined passing_score
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('passing_score')
      .eq('id', courseId)
      .single();

    if (courseError) throw courseError;

    // Use instructor's passing_score, default to 80 if not set
    const instructorPassingScore = course?.passing_score || 80;

    // 2. Fetch the user's study plan for this course
    const { data: planData, error: planError } = await supabase
      .from('study_plans')
      .select('id, schedule, adaptation_logs, available_days, target_date, status')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (planError) throw planError;
    if (!planData || !planData.schedule) return; // No plan exists yet

    let schedule = Array.isArray(planData.schedule) ? [...planData.schedule] : [];
    let adaptationLogs: AdaptationLog[] = planData.adaptation_logs || [];

    // 3. Fetch latest quiz submissions for this course
    const { data: quizSubmissions, error: quizError } = await supabase
      .from('quiz_submissions')
      .select(`
        id,
        score,
        passed,
        created_at,
        quizzes!inner(
          id,
          lesson_id,
          passing_score
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (quizError) throw quizError;

    // 4. Find failed quizzes (score < instructor's passing_score)
    const failedQuizzes = (quizSubmissions || []).filter(
      (submission: any) => submission.score < instructorPassingScore
    );

    if (failedQuizzes.length === 0) {
      // No failures, no need to adjust schedule
      return;
    }

    // 5. Get the most recent failed quiz
    const latestFailed = failedQuizzes[0];
    const failedLessonId = Array.isArray(latestFailed.quizzes) 
      ? latestFailed.quizzes[0]?.lesson_id 
      : latestFailed.quizzes?.lesson_id;

    if (!failedLessonId) return;

    // 6. Find the corresponding lesson in the schedule
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todayTaskIndex = -1;
    for (let i = 0; i < schedule.length; i++) {
      const task = schedule[i];
      const taskDate = new Date(task.scheduled_at);
      taskDate.setHours(0, 0, 0, 0);

      // Check if this is today's task and matches the failed lesson
      if (
        taskDate.getTime() === today.getTime() &&
        task.lesson_id === failedLessonId
      ) {
        todayTaskIndex = i;
        break;
      }
    }

    if (todayTaskIndex === -1) {
      // Task not found in schedule, skip adjustment
      return;
    }

    // 7. Insert a "Review Session" task for today
    const reviewTask = {
      lesson_id: failedLessonId,
      scheduled_at: new Date().toISOString(),
      status: 'review_retake',
      type: 'review',
      original_score: latestFailed.score,
      instructor_threshold: instructorPassingScore,
    };

    // Insert review task after the failed quiz
    schedule.splice(todayTaskIndex + 1, 0, reviewTask);

    // 8. Shift all subsequent tasks by one day (or to next available slot)
    const availableDays = planData.available_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    for (let i = todayTaskIndex + 2; i < schedule.length; i++) {
      const currentTask = schedule[i];
      const currentDate = new Date(currentTask.scheduled_at);
      
      // Find next available day
      let newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 1);
      
      // Skip to next available day of week
      while (!availableDays.includes(newDate.toLocaleDateString('en-US', { weekday: 'long' }))) {
        newDate.setDate(newDate.getDate() + 1);
      }

      if (!schedule[i].original_scheduled_at) {
        schedule[i].original_scheduled_at = schedule[i].scheduled_at;
      }
      schedule[i].scheduled_at = newDate.toISOString();
    }

    // 9. Add adaptation log
    const log: AdaptationLog = {
      timestamp: new Date().toISOString(),
      action: 'review_scheduled',
      reason: `Review session assigned due to Quiz Score: ${latestFailed.score}% / Instructor Goal: ${instructorPassingScore}%`,
      details: {
        failedQuizId: latestFailed.id,
        score: latestFailed.score,
        threshold: instructorPassingScore,
        reviewLessonId: failedLessonId,
      },
    };

    adaptationLogs.push(log);

    // 10. Update study plan in database
    const { error: updateError } = await supabase
      .from('study_plans')
      .update({
        schedule,
        adaptation_logs: adaptationLogs,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planData.id);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Error recalculating plan:', error);
    throw error;
  }
}

/**
 * Generate initial study plan
 */
export async function generateInitialPlan(
  userId: string,
  courseId: string,
  availableDays: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  targetDate?: string
): Promise<void> {
  try {
    // Fetch course lessons
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select(`
        id,
        modules (
          id,
          lessons (
            id,
            title,
            type,
            order_index
          )
        )
      `)
      .eq('id', courseId)
      .single();

    if (courseError) throw courseError;

    // Flatten lessons
    const lessons: any[] = [];
    if (courseData?.modules) {
      courseData.modules.forEach((module: any) => {
        if (module.lessons) {
          module.lessons.forEach((lesson: any) => {
            lessons.push(lesson);
          });
        }
      });
    }

    // Sort by order_index
    lessons.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    // Generate schedule
    const schedule: any[] = [];
    const startDate = new Date();
    startDate.setHours(9, 0, 0, 0); // Start at 9 AM

    let currentDate = new Date(startDate);

    lessons.forEach((lesson) => {
      // Find next available day
      while (!availableDays.includes(currentDate.toLocaleDateString('en-US', { weekday: 'long' }))) {
        currentDate.setDate(currentDate.getDate() + 1);
      }

      schedule.push({
        lesson_id: lesson.id,
        scheduled_at: new Date(currentDate).toISOString(),
        status: 'pending',
        type: lesson.type,
      });

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    });

    // Upsert study plan
    const { error: upsertError } = await supabase
      .from('study_plans')
      .upsert(
        {
          user_id: userId,
          course_id: courseId,
          schedule,
          available_days: availableDays,
          target_date: targetDate || null,
          adaptation_logs: [],
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,course_id' }
      );

    if (upsertError) throw upsertError;
  } catch (error) {
    console.error('Error generating initial plan:', error);
    throw error;
  }
}

/**
 * Generate a study schedule using the AI backend
 * Calls the Python FastAPI service and saves the plan to Supabase
 * NOTE: This function requires the Python backend to be running
 */
export async function generateSchedule(
  userId: string,
  availability: Record<string, boolean>
): Promise<any[]> {
  const AI_API_URL = 'http://127.0.0.1:8000';

  try {
    // Convert availability object to list of available days
    const availableDays = Object.keys(availability).filter(
      (day) => availability[day] === true
    );

    // Call the Python AI backend
    const response = await fetch(`${AI_API_URL}/generate-schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        availability: availableDays,
      }),
    });

    if (!response.ok) {
      if (response.status === 0 || !response.status) {
        throw new Error(
          'AI service is offline. Please make sure the Python backend is running on http://127.0.0.1:8000'
        );
      }
      const errorText = await response.text();
      throw new Error(`AI service error: ${errorText || response.statusText}`);
    }

    const aiResponse: { plan: Record<string, string>; generated_at: string } = await response.json();

    // Convert AI plan (date -> lesson_id) to study_plans format
    const studyPlans: any[] = Object.entries(aiResponse.plan).map(([date, lessonId]) => {
      // Parse date string (YYYY-MM-DD) and create ISO timestamp at 9 AM
      const scheduledDate = new Date(date);
      scheduledDate.setHours(9, 0, 0, 0);

      return {
        user_id: userId,
        lesson_id: lessonId,
        scheduled_at: scheduledDate.toISOString(),
        status: 'pending' as const,
      };
    });

    // Insert study plans into database
    if (studyPlans.length > 0) {
      const { data: insertedPlans, error: insertError } = await supabase
        .from('study_plans')
        .insert(studyPlans)
        .select();

      if (insertError) throw insertError;

      return insertedPlans || [];
    }

    return [];
  } catch (error) {
    console.error('Error generating schedule:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to generate schedule');
  }
}
