import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
// import { schedulingEngine } from '@/lib/ai/AdaptiveSchedulingEngine'; // Not used directly
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  Brain, 
  CheckCircle2, 
  Circle,
  AlertCircle,
  Sparkles,
  BarChart3,
  Target,
  ArrowRight,
  RefreshCw,
  ChevronDown
} from 'lucide-react';
import { format, addDays, startOfDay, isToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface StudyPlan {
  id: string;
  lesson_id: string;
  scheduled_at: string;
  status: 'pending' | 'done' | 'missed' | 'review_retake';
  lesson?: {
    id: string;
    title: string;
    type: string;
    modules?: Array<{
      courses?: {
        title: string;
      };
    }>;
  };
}

interface StudySession {
  started_at: string;
  method_used: string;
  completed: boolean;
  duration_seconds: number;
}

interface AdaptationLog {
  timestamp: string;
  action: 'shift' | 'review_scheduled' | 'plan_regenerated';
  reason: string;
  details?: any;
}

export function SchedulePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [adaptationLogs, setAdaptationLogs] = useState<AdaptationLog[]>([]);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [hasEnrolledCourses, setHasEnrolledCourses] = useState(false);
  const [stats, setStats] = useState({
    mostProductiveHour: 10,
    bestMethod: 'pomodoro',
    completionRate: 0,
    avgSessionDuration: 0
  });

  // Generate weekly dates (7 days starting from today)
  const weeklyDates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  // Check if user has enrolled courses
  const checkEnrollment = useCallback(async () => {
    if (!user) {
      setHasEnrolledCourses(false);
      return;
    }

    try {
      // Check if user has any progress (simpler query)
      const { data: userProgressLessons, error: progressLessonsError } = await supabase
        .from('user_progress')
        .select('lesson_id, lessons(id, course_id)')
        .eq('user_id', user.id)
        .limit(1);

      if (progressLessonsError) {
        console.error('Error checking enrollment:', progressLessonsError);
        setHasEnrolledCourses(false);
        return;
      }

      const enrolledCourseIds = new Set<string>();
      if (userProgressLessons && userProgressLessons.length > 0) {
        userProgressLessons.forEach((progress: any) => {
          const courseId = progress.lessons?.course_id;
          if (courseId) {
            enrolledCourseIds.add(courseId);
          }
        });
      }

      setHasEnrolledCourses(enrolledCourseIds.size > 0);
    } catch (error) {
      console.error('Error checking enrollment:', error);
      setHasEnrolledCourses(false);
    }
  }, [user]);

  // Fetch study plans, sessions, and adaptation logs (extracted to reusable function)
  const fetchData = async () => {
      setLoading(true);
      
      try {
        // STEP 1: Fetch study plans (simple query, no joins) - Only pending plans
        if (!user) return;
        
        const { data: plansData, error: plansError } = await supabase
          .from('study_plans')
          .select('id, lesson_id, scheduled_at, status')
          .eq('user_id', user.id)
          .eq('status', 'pending') // Only show pending (not completed) lessons
          .order('scheduled_at', { ascending: true })
          .limit(100);

        if (plansError) throw plansError;

        // STEP 2: Fetch lessons for the plans
        const lessonIds = [...new Set((plansData || []).map(p => p.lesson_id))];
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('id, title, type, duration, module_id')
          .in('id', lessonIds);

        if (lessonsError) throw lessonsError;

        // STEP 3: Fetch modules for the lessons
        const moduleIds = [...new Set((lessonsData || []).map(l => l.module_id).filter(Boolean))];
        const { data: modulesData, error: modulesError } = await supabase
          .from('modules')
          .select('id, course_id')
          .in('id', moduleIds);

        if (modulesError) throw modulesError;

        // STEP 4: Fetch courses for the modules
        const courseIds = [...new Set((modulesData || []).map(m => m.course_id).filter(Boolean))];
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('id, title')
          .in('id', courseIds);

        if (coursesError) throw coursesError;

        // STEP 5: Combine the data
        const courseMap = new Map(coursesData?.map(c => [c.id, c.title]) || []);
        const moduleMap = new Map(modulesData?.map(m => [m.id, {
          id: m.id,
          course_id: m.course_id,
          courses: {
            id: m.course_id,
            title: courseMap.get(m.course_id) || 'Unknown Course'
          }
        }]) || []);
        
        const lessonMap = new Map((lessonsData || []).map(l => [
          l.id,
          {
            id: l.id,
            title: l.title,
            type: l.type,
            duration: l.duration,
            modules: l.module_id ? [moduleMap.get(l.module_id)].filter(Boolean) : []
          }
        ]));

        const enrichedPlans = (plansData || []).map(plan => ({
          ...plan,
          lesson: lessonMap.get(plan.lesson_id) || null
        }));

        // Remove duplicates: same lesson_id + scheduled_at combination
        const uniquePlansMap = new Map<string, typeof enrichedPlans[0]>();
        const duplicateCount: { [key: string]: number } = {};
        
        enrichedPlans.forEach(plan => {
          // Create a unique key: lesson_id + scheduled_at (rounded to minute)
          const scheduledTime = new Date(plan.scheduled_at);
          const timeKey = format(scheduledTime, 'yyyy-MM-dd HH:mm');
          const uniqueKey = `${plan.lesson_id}_${timeKey}`;
          
          if (uniquePlansMap.has(uniqueKey)) {
            // Duplicate found - keep the first one (with earliest id or created_at)
            duplicateCount[uniqueKey] = (duplicateCount[uniqueKey] || 1) + 1;
            console.warn(`⚠️ Duplicate plan detected (filtered): lesson ${plan.lesson_id} at ${timeKey}`);
          } else {
            uniquePlansMap.set(uniqueKey, plan);
          }
        });

        const uniquePlans = Array.from(uniquePlansMap.values());
        const totalDuplicates = Object.values(duplicateCount).reduce((sum, count) => sum + (count - 1), 0);
        
        if (totalDuplicates > 0) {
          console.warn(`⚠️ Filtered ${totalDuplicates} duplicate plans from display`);
          // Don't show toast - it's annoying for the user
        }

        // Sort by scheduled_at to maintain chronological order
        uniquePlans.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

        setStudyPlans(uniquePlans as any);

        // Fetch study sessions for stats
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('study_sessions')
          .select('started_at, method_used, completed, duration_seconds')
          .eq('user_id', user!.id)
          .order('started_at', { ascending: false })
          .limit(100);

        if (sessionsError) throw sessionsError;
        // Sessions data processed inline, no need for state

        // Fetch adaptation logs (skip if column doesn't exist)
        try {
          const { data: planRecords, error: planRecordsError } = await supabase
            .from('study_plans')
            .select('adaptation_logs')
            .eq('user_id', user!.id)
            .not('adaptation_logs', 'is', null)
            .limit(10);

          if (!planRecordsError && planRecords) {
            const allLogs: AdaptationLog[] = [];
            planRecords.forEach((record: any) => {
              if (record.adaptation_logs && Array.isArray(record.adaptation_logs)) {
                record.adaptation_logs.forEach((log: AdaptationLog) => {
                  allLogs.push({
                    ...log,
                  });
                });
              }
            });
            allLogs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setAdaptationLogs(allLogs.slice(0, 10));
          }
        } catch (logsError) {
          console.warn('Could not fetch adaptation logs:', logsError);
          setAdaptationLogs([]);
        }

        // Calculate stats
        calculateStats(sessionsData || []);

        // Get AI recommended method for current hour
        // await getAIRecommendation(); // Function removed, using stats-based recommendation

      } catch (error) {
        console.error('Error fetching schedule data:', error);
      } finally {
        setLoading(false);
      }
    };

  // Fetch data on mount
  useEffect(() => {
    if (!user) return;
    checkEnrollment();
    fetchData();
  }, [user, checkEnrollment]);

  // Refresh handler
  const handleRefresh = async () => {
    if (!user) {
      toast.error('Please log in to refresh schedule');
      return;
    }
    setLoading(true);
    try {
      // Force refresh by calling fetchData
      await fetchData();
      toast.success('Schedule refreshed successfully!');
    } catch (error: any) {
      console.error('Error refreshing schedule:', error);
      toast.error(error?.message || 'Failed to refresh schedule');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (sessions: StudySession[]) => {
    if (sessions.length === 0) return;

    // Most productive hour
    const hourCounts: Record<number, number> = {};
    sessions.forEach(s => {
      const hour = new Date(s.started_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + (s.completed ? 1 : 0);
    });
    const mostProductiveHour = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 10;

    // Best method
    const methodCounts: Record<string, number> = {};
    sessions.forEach(s => {
      if (s.completed) {
        methodCounts[s.method_used] = (methodCounts[s.method_used] || 0) + 1;
      }
    });
    const bestMethod = Object.entries(methodCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'pomodoro';

    // Completion rate
    const completed = sessions.filter(s => s.completed).length;
    const completionRate = (completed / sessions.length) * 100;

    // Average duration
    const avgDuration = sessions.reduce((sum, s) => sum + s.duration_seconds, 0) / sessions.length / 60;

    // Calculate best focus window (2-hour window with most completed sessions)
    const windowScores: Record<string, number> = {};
    sessions.forEach(s => {
      if (s.completed) {
        const hour = new Date(s.started_at).getHours();
        // Create 2-hour windows
        for (let h = hour; h < hour + 2 && h < 24; h++) {
          const windowKey = `${Math.floor(h / 2) * 2}-${Math.floor(h / 2) * 2 + 2}`;
          windowScores[windowKey] = (windowScores[windowKey] || 0) + 1;
        }
      }
    });

    // Calculate best window (not used in UI currently)
    // const bestWindow = Object.entries(windowScores)
    //   .sort((a, b) => b[1] - a[1])[0]?.[0];

    // Removed setBestFocusWindow and setAiRecommendedMethod - not used in UI

    setStats({
      mostProductiveHour: parseInt(String(mostProductiveHour)),
      bestMethod,
      completionRate,
      avgSessionDuration: Math.round(avgDuration)
    });
  };

  // Generate AI Schedule - Weekly schedule based on user progress and preferences
  const handleGenerateSchedule = async () => {
    if (!user) {
      toast.error('Please log in to generate schedule');
      return;
    }

    // Check if AI Companion is enabled (default to true if not set)
    if (profile?.ai_companion_enabled === false) {
      toast.error('Please enable AI Companion in Settings first');
      return;
    }
    
    setGenerating(true);
    try {
      // STEP 0: Get user's AI preferences (goal and weekly hours)
      const { data: userPreferences, error: prefsError } = await supabase
        .from('ai_preferences')
        .select('goal, hours, preferred_study_time')
        .eq('user_id', user.id)
        .maybeSingle();

      if (prefsError && prefsError.code !== 'PGRST116') {
        console.warn('Error fetching user preferences:', prefsError);
      }

      if (!user) return;
      
      // Get weekly hours commitment (default to 10 hours if not set)
      const weeklyHours = userPreferences?.hours?.[0] || 10;
      const preferredTime = userPreferences?.preferred_study_time || 'flexible';

      // STEP 1: Get user's completed lessons
      const { data: completedProgress, error: progressError } = await supabase
        .from('user_progress')
        .select('lesson_id')
        .eq('user_id', user.id);

      if (progressError) throw progressError;
      const completedLessonIds = new Set((completedProgress || []).map(p => p.lesson_id));

      // STEP 1.5: Get courses that user has started (has at least one lesson progress)
      // Only schedule courses that the user has actually started learning
      const { data: userProgressLessons, error: progressLessonsError } = await supabase
        .from('user_progress')
        .select('lesson_id, lessons!inner(id, course_id)')
        .eq('user_id', user.id)
        .limit(1000);

      if (progressLessonsError) throw progressLessonsError;

      // Extract unique course IDs that user has started
      const enrolledCourseIds = new Set<string>();
      if (userProgressLessons && userProgressLessons.length > 0) {
        userProgressLessons.forEach((progress: any) => {
          const courseId = progress.lessons?.course_id;
          if (courseId) {
            enrolledCourseIds.add(courseId);
          }
        });
      }

      // If user has not started any courses, show error
      if (enrolledCourseIds.size === 0) {
        toast.error('You need to enroll and start a course before generating a schedule. Please visit the Courses page to get started.');
        return;
      }

      // STEP 2: Get only the courses that user has enrolled in (started learning)
      const { data: publishedCourses, error: coursesError } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          modules(
            id,
            order_index,
            lessons(
              id,
              title,
              type,
              duration,
              order_index
            )
          )
        `)
        .eq('is_published', true)
        .in('id', Array.from(enrolledCourseIds))
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;
      if (!publishedCourses || publishedCourses.length === 0) {
        toast.error('No enrolled courses found. Please start learning a course first.');
        return;
      }

      // STEP 3: Collect ALL uncompleted lessons from all courses (following order)
      const allUncompletedLessons: Array<{
        lesson_id: string;
        course_id: string;
        course_title: string;
        lesson_title: string;
        module_order: number;
        lesson_order: number;
        global_order: number; // For sorting across all courses
      }> = [];

      publishedCourses.forEach((course: any) => {
        if (!course.modules || course.modules.length === 0) return;

        // Sort modules by order_index
        const sortedModules = [...course.modules].sort((a: any, b: any) => 
          (a.order_index || 0) - (b.order_index || 0)
        );

        // Collect ALL uncompleted lessons from all modules
        sortedModules.forEach((module: any) => {
          if (!module.lessons || module.lessons.length === 0) return;

          // Sort lessons by order_index
          const sortedLessons = [...module.lessons].sort((a: any, b: any) =>
            (a.order_index || 0) - (b.order_index || 0)
          );

          // Add all uncompleted lessons (not just the first one)
          sortedLessons.forEach((lesson: any) => {
            if (!completedLessonIds.has(lesson.id)) {
              allUncompletedLessons.push({
                lesson_id: lesson.id,
                course_id: course.id,
                course_title: course.title,
                lesson_title: lesson.title || 'Untitled Lesson',
                module_order: module.order_index || 0,
                lesson_order: lesson.order_index || 0,
                global_order: allUncompletedLessons.length,
              });
            }
          });
        });
      });

      // Sort by course -> module -> lesson order to maintain proper learning sequence
      allUncompletedLessons.sort((a, b) => {
        if (a.course_id !== b.course_id) {
          // Keep courses in original order (by global_order of first lesson)
          return a.global_order - b.global_order;
        }
        if (a.module_order !== b.module_order) {
          return a.module_order - b.module_order;
        }
        return a.lesson_order - b.lesson_order;
      });

      // Remove duplicate lessons (by lesson_id) - keep only the first occurrence
      const seenLessonIds = new Set<string>();
      const uniqueLessons = allUncompletedLessons.filter(lesson => {
        if (seenLessonIds.has(lesson.lesson_id)) {
          return false;
        }
        seenLessonIds.add(lesson.lesson_id);
        return true;
      });

      const nextLessons = uniqueLessons;

      console.log(`📚 Found ${nextLessons.length} uncompleted lessons across all courses`);

      if (nextLessons.length === 0) {
        toast.info('All available lessons are completed! 🎉');
        return;
      }

      // STEP 4: Generate weekly schedule (7 days, 2 lessons per day = 14 lessons total)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Clear ALL existing pending plans (not just next week) to avoid duplicates when regenerating
      // Delete all pending plans from today onwards
      const { error: deleteError } = await supabase
        .from('study_plans')
        .delete()
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .gte('scheduled_at', today.toISOString());
      
      if (deleteError) {
        console.warn('⚠️ Warning: Could not delete existing plans:', deleteError);
        toast.warning('Could not clear old schedule, duplicates may occur');
        // Continue anyway - we'll handle duplicates in the insert logic
      } else {
        console.log('✅ Cleared existing pending study plans');
      }

      const plansToInsert: Array<{
        user_id: string;
        lesson_id: string;
        scheduled_at: string;
        status: 'pending';
      }> = [];

      // Calculate lessons per day based on weekly hours commitment
      // Use actual lesson durations when available, fallback to 30 minutes average
      const avgLessonDurationHours = 0.5; // 30 minutes default
      
      // Calculate total lessons based on user's weekly hours commitment
      // Strictly follow user's weekly hours setting, no minimum enforced
      const totalLessonsForWeek = Math.ceil(weeklyHours / avgLessonDurationHours);
      
      console.log(`📅 User's weekly commitment: ${weeklyHours} hours/week`);
      console.log(`📚 Calculating schedule: ${weeklyHours} hours = ~${totalLessonsForWeek} lessons (assuming ${avgLessonDurationHours * 60} min/lesson)`);
      
      // Determine study hours based on preferred time
      let studyHours: number[] = [9, 14]; // Default: 9 AM and 2 PM
      if (preferredTime === 'routine') {
        studyHours = [8, 13]; // Morning routine: 8 AM and 1 PM
      } else if (preferredTime === 'weekend') {
        // Weekend warriors: focus on weekends, lighter on weekdays
        studyHours = [10, 15]; // 10 AM and 3 PM
      } else {
        // Flexible: spread throughout the day
        studyHours = [9, 14, 19]; // 9 AM, 2 PM, 7 PM (3 slots if needed)
      }

      // Take enough lessons to fill the week
      const lessonsToSchedule = nextLessons.slice(0, totalLessonsForWeek);

      // Generate schedule for next 7 days
      let lessonIndex = 0;
      const actualLessonsToSchedule = Math.min(lessonsToSchedule.length, totalLessonsForWeek);
      const actualLessonsPerDay = Math.floor(actualLessonsToSchedule / 7);
      const remainder = actualLessonsToSchedule % 7;
      
      console.log(`📚 Available lessons: ${lessonsToSchedule.length}, Need: ${totalLessonsForWeek}, Will schedule: ${actualLessonsToSchedule}`);
      console.log(`📅 Distribution: ${actualLessonsPerDay} per day, ${remainder} extra lessons`);
      
      // Force loop through all 7 days - distribute evenly
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() + day);

        // Calculate lessons for this day (distribute evenly, with remainder distributed to first days)
        const dayLessons = actualLessonsPerDay + (day < remainder ? 1 : 0);

        // Only schedule if we have lessons left
        if (lessonIndex >= lessonsToSchedule.length || dayLessons <= 0) {
          console.log(`⏭️ Day ${day + 1}: No more lessons to schedule (index: ${lessonIndex}/${lessonsToSchedule.length})`);
          continue;
        }

        console.log(`📅 Day ${day + 1} (${format(currentDate, 'EEE, MMM d')}): Scheduling ${dayLessons} lessons (starting from index ${lessonIndex})`);

        // Schedule lessons for this day
        const scheduledLessonIdsToday = new Set<string>(); // Track lessons already scheduled today
        const scheduledTimesToday = new Set<string>(); // Track time slots already used today
        let lessonsScheduledToday = 0;
        let slot = 0;
        
        // Schedule exactly dayLessons lessons for this day
        while (lessonsScheduledToday < dayLessons && lessonIndex < lessonsToSchedule.length) {
          const currentLessonId = lessonsToSchedule[lessonIndex].lesson_id;
          
          // Skip if we've already scheduled this lesson today (should not happen, but safety check)
          if (scheduledLessonIdsToday.has(currentLessonId)) {
            console.log(`⚠️ Skipping duplicate lesson: ${currentLessonId} on day ${day + 1}, moving to next lesson`);
            lessonIndex++;
            continue;
          }

          const hourIndex = slot % studyHours.length;
          const scheduledTime = new Date(currentDate);
          scheduledTime.setHours(studyHours[hourIndex] + Math.floor(slot / studyHours.length) * 4, 0, 0);
          
          // Create a unique time key (date + hour:minute)
          const timeKey = format(scheduledTime, 'yyyy-MM-dd HH:mm');
          
          // Skip if this exact time slot is already used today
          if (scheduledTimesToday.has(timeKey)) {
            console.log(`⚠️ Skipping duplicate time slot: ${timeKey} on day ${day + 1}`);
            // Try next hour
            scheduledTime.setHours(scheduledTime.getHours() + 1);
            const newTimeKey = format(scheduledTime, 'yyyy-MM-dd HH:mm');
            if (scheduledTimesToday.has(newTimeKey)) {
              lessonIndex++;
              slot++;
              continue;
            }
            scheduledTimesToday.add(newTimeKey);
          } else {
            scheduledTimesToday.add(timeKey);
          }

          plansToInsert.push({
            user_id: user.id,
            lesson_id: currentLessonId,
            scheduled_at: scheduledTime.toISOString(),
            status: 'pending' as const,
          });

          scheduledLessonIdsToday.add(currentLessonId);
          lessonsScheduledToday++;
          lessonIndex++;
          slot++;
        }
        
        console.log(`✅ Day ${day + 1}: Scheduled ${lessonsScheduledToday}/${dayLessons} lessons`);
      }
      
      console.log(`✅ Total plans created: ${plansToInsert.length} across 7 days`);
      
      // Group by date for debugging
      const plansByDate = new Map<string, number>();
      plansToInsert.forEach(plan => {
        const date = format(new Date(plan.scheduled_at), 'yyyy-MM-dd');
        plansByDate.set(date, (plansByDate.get(date) || 0) + 1);
      });
      console.log('📅 Plans by date:', Object.fromEntries(plansByDate));

      if (plansToInsert.length === 0) {
        toast.error('No lessons to schedule');
        return;
      }

      // STEP 5: Remove duplicates (same lesson_id + scheduled_at combination)
      const uniquePlansMap = new Map<string, typeof plansToInsert[0]>();
      const duplicateKeys: string[] = [];
      
      plansToInsert.forEach(plan => {
        // Create a unique key: lesson_id + scheduled_at (rounded to minute)
        const timeKey = format(new Date(plan.scheduled_at), 'yyyy-MM-dd HH:mm');
        const uniqueKey = `${plan.lesson_id}_${timeKey}`;
        
        if (uniquePlansMap.has(uniqueKey)) {
          duplicateKeys.push(uniqueKey);
          console.warn(`⚠️ Duplicate detected: lesson ${plan.lesson_id} at ${timeKey}`);
        } else {
          uniquePlansMap.set(uniqueKey, plan);
        }
      });

      const finalPlansToInsert = Array.from(uniquePlansMap.values());
      
      if (duplicateKeys.length > 0) {
        console.warn(`⚠️ Removed ${duplicateKeys.length} duplicate plans`);
        // Don't show toast - handled silently
      }

      if (finalPlansToInsert.length === 0) {
        toast.error('No unique lessons to schedule after removing duplicates');
        return;
      }

      console.log(`✅ Inserting ${finalPlansToInsert.length} unique plans (removed ${plansToInsert.length - finalPlansToInsert.length} duplicates)`);

      // STEP 6: Insert study plans
      const { error: insertError, data: insertedData } = await supabase
        .from('study_plans')
        .insert(finalPlansToInsert)
        .select();

      if (insertError) {
        console.error('❌ Insert error:', insertError);
        throw insertError;
      }

      console.log(`✅ Successfully inserted ${insertedData?.length || plansToInsert.length} study plans`);

      toast.success(`AI schedule generated! ${plansToInsert.length} lessons scheduled for the week.`);
      
      // Reload data using fetchData instead of page reload
      await fetchData();
    } catch (error: any) {
      console.error('Error generating schedule:', error);
      toast.error(error.message || 'Failed to generate schedule');
    } finally {
      setGenerating(false);
    }
  };

  // Get tasks for selected date
  const getTasksForDate = (date: Date) => {
    const dateStr = format(startOfDay(date), 'yyyy-MM-dd');
    return studyPlans.filter(plan => {
      const planDate = format(startOfDay(parseISO(plan.scheduled_at)), 'yyyy-MM-dd');
      return planDate === dateStr;
    });
  };

  const selectedTasks = getTasksForDate(selectedDate);
  const hasAnyPlans = studyPlans.length > 0;

  const formatMethodName = (method: string) => {
    const names: Record<string, string> = {
      'pomodoro': 'Pomodoro (25 min)',
      'flowtime': 'Flowtime (Deep Work)',
      'blitz': 'Blitz (15 min)',
      '52_17': '52/17 (Deep Focus)'
    };
    return names[method] || method;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="text-slate-400">Loading your AI-powered schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3">
              <Sparkles className="text-teal-400" />
              AI-Powered Schedule
            </h1>
            <p className="text-slate-400 mt-2">Adaptive time management tailored to your learning patterns</p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={loading}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </motion.div>

        {/* ROW 1: Weekly Timeline + AI Adjustments */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Weekly Timeline */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-800 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-400" />
                  Weekly Timeline
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Scroll to see your upcoming schedule
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-slate-800 [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:hover:bg-slate-500">
                  {weeklyDates.map((day, idx) => {
                    const dayTasks = getTasksForDate(day);
                    const taskCount = dayTasks.length;
                    const isSelected = format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
                    const isTodayDate = isToday(day);
                    
                    return (
                      <motion.button
                        key={idx}
                        onClick={() => setSelectedDate(day)}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all min-w-[120px] flex-shrink-0",
                          isSelected
                            ? "border-teal-500 bg-teal-500/10 shadow-lg shadow-teal-500/20"
                            : isTodayDate
                            ? "border-cyan-500/50 bg-cyan-500/5 hover:border-cyan-500"
                            : "border-slate-700 hover:border-slate-600 bg-slate-800/50"
                        )}
                      >
                        <span className="text-xs text-slate-400 uppercase font-semibold">
                          {format(day, 'EEE')}
                        </span>
                        <span className={cn(
                          "text-3xl font-bold",
                          isSelected ? "text-teal-400" : isTodayDate ? "text-cyan-400" : "text-slate-300"
                        )}>
                          {format(day, 'd')}
                        </span>
                        {isTodayDate && (
                          <Badge variant="secondary" className="text-[10px] bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                            Today
                          </Badge>
                        )}
                        {taskCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {taskCount} task{taskCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Adjustments Feed */}
          <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-800 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="w-5 h-5 text-teal-400" />
                AI Adjustments
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Recent intelligent schedule changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {adaptationLogs.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-sm">
                  <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No recent adjustments</p>
                  <p className="text-xs mt-1">AI will adapt as you learn</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[180px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-800 [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded">
                  {adaptationLogs.slice(0, 5).map((log, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-800/50 border border-slate-700 text-xs"
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">
                          {log.action === 'shift' && <Clock className="w-3 h-3 text-yellow-400" />}
                          {log.action === 'review_scheduled' && <AlertCircle className="w-3 h-3 text-orange-400" />}
                          {log.action === 'plan_regenerated' && <Sparkles className="w-3 h-3 text-teal-400" />}
                        </div>
                        <p className="text-slate-300 leading-tight line-clamp-2">{log.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ROW 2: Tasks + Productivity Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Task Detail Card */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-800 h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="w-5 h-5 text-teal-400" />
                    Tasks for {format(selectedDate, 'EEEE, MMMM d')}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{selectedTasks.length} scheduled</Badge>
                    <Button
                      onClick={handleGenerateSchedule}
                      disabled={generating || profile?.ai_companion_enabled === false || !hasEnrolledCourses}
                      variant="outline"
                      size="sm"
                      className="border-primary/50 text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        profile?.ai_companion_enabled === false
                          ? 'Please enable AI Companion in Settings first'
                          : !hasEnrolledCourses
                          ? 'Please enroll and start a course first'
                          : generating
                          ? 'Generating schedule...'
                          : undefined
                      }
                    >
                      {generating ? (
                        <>
                          <Sparkles className="w-3 h-3 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 mr-2" />
                          {hasAnyPlans ? 'Regenerate' : 'Generate'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {selectedTasks.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No tasks scheduled for this day</p>
                    {!hasAnyPlans ? (
                      <>
                        <p className="text-sm mt-2 mb-4">
                          {profile?.ai_companion_enabled === false
                            ? 'Enable AI Companion in Settings to generate a schedule'
                            : !hasEnrolledCourses
                            ? 'Enroll and start a course to generate a schedule'
                            : 'Generate an AI-powered schedule to get started'}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm mt-2 mb-4">Your schedule is clear for this day! 🎉</p>
                    )}
                    <Button
                      onClick={handleGenerateSchedule}
                      disabled={generating || profile?.ai_companion_enabled === false || !hasEnrolledCourses}
                      className="bg-primary hover:bg-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      title={
                        profile?.ai_companion_enabled === false
                          ? 'Please enable AI Companion in Settings first'
                          : !hasEnrolledCourses
                          ? 'Please enroll and start a course first'
                          : undefined
                      }
                    >
                      {generating ? (
                        <>
                          <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          {hasAnyPlans ? 'Regenerate AI Schedule' : 'Generate AI Schedule'}
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-800 [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:hover:bg-slate-500 pr-2">
                    {(showAllTasks ? selectedTasks : selectedTasks.slice(0, 5)).map((plan, idx) => {
                      const lesson = (plan.lesson as any);
                      const modules = lesson?.modules;
                      const courseTitle = (Array.isArray(modules) && modules.length > 0 && modules[0]?.courses?.title) 
                                        || 'Unknown Course';
                      
                      return (
                        <motion.div
                          key={plan.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            {/* Status Indicator */}
                            <div className="flex-shrink-0">
                              {plan.status === 'done' ? (
                                <CheckCircle2 className="w-5 h-5 text-teal-400" />
                              ) : plan.status === 'missed' ? (
                                <AlertCircle className="w-5 h-5 text-red-400" />
                              ) : plan.status === 'review_retake' ? (
                                <AlertCircle className="w-5 h-5 text-yellow-400" />
                              ) : (
                                <Circle className="w-5 h-5 text-slate-500" />
                              )}
                            </div>

                            {/* Task Info */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-white text-sm truncate">
                                {lesson?.title || 'Untitled Lesson'}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                                <span className="truncate max-w-[120px]">{courseTitle}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(plan.scheduled_at), 'h:mm a')}
                                </span>
                                <Badge variant="outline" className="text-[10px] py-0 px-1">
                                  {lesson?.type || 'video'}
                                </Badge>
                              </div>
                            </div>

                            {/* Start Button */}
                            <Button
                              onClick={() => {
                                const courseId = (Array.isArray(modules) && modules.length > 0 && modules[0]?.courses?.id) 
                                  || (Array.isArray(modules) && modules.length > 0 && modules[0]?.course_id)
                                  || null;
                                if (courseId) {
                                  navigate(`/course/${courseId}/learn`);
                                } else {
                                  toast.error('Course not available');
                                }
                              }}
                              size="sm"
                              className="flex-shrink-0 bg-primary hover:bg-primary/90 text-white text-xs px-3"
                            >
                              <ArrowRight className="w-3 h-3 mr-1" />
                              Start
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
                {selectedTasks.length > 5 && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <Button
                      onClick={() => setShowAllTasks(!showAllTasks)}
                      variant="outline"
                      size="sm"
                      className="w-full border-slate-600 text-slate-300 hover:bg-slate-800"
                    >
                      {showAllTasks ? (
                        <>
                          <ChevronDown className="w-4 h-4 mr-2 rotate-180" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-2" />
                          Show More ({selectedTasks.length - 5} more)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Productivity Stats */}
          <Card className="bg-slate-900/80 backdrop-blur-sm border-slate-800 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-5 h-5 text-teal-400" />
                Productivity Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-400" />
                  <span className="text-sm text-slate-400">Most Productive</span>
                </div>
                <span className="font-bold text-sm">{stats.mostProductiveHour}:00</span>
              </div>
              
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-400" />
                  <span className="text-sm text-slate-400">Best Method</span>
                </div>
                <Badge className="bg-primary/20 text-primary text-xs">
                  {formatMethodName(stats.bestMethod)}
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-teal-400" />
                  <span className="text-sm text-slate-400">Completion Rate</span>
                </div>
                <span className="font-bold text-sm">{stats.completionRate.toFixed(0)}%</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-teal-400" />
                  <span className="text-sm text-slate-400">Avg Duration</span>
                </div>
                <span className="font-bold text-sm">{stats.avgSessionDuration} min</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}