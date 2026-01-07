/**
 * Route Probing System
 * Pre-flight checks for routes to ensure data exists before rendering
 */

import { supabase } from '@/lib/supabase';
import { ensureCourseHasData } from '@/lib/database/ensureDatabaseReady';

interface RouteProbeResult {
  ready: boolean;
  issues: string[];
  fixed: boolean;
}

/**
 * Probe course route data
 */
export async function probeCourseRoute(courseId: string): Promise<RouteProbeResult> {
  const issues: string[] = [];
  let fixed = false;

  try {
    // Check if course exists
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      issues.push(`Course ${courseId} does not exist`);
      return { ready: false, issues, fixed: false };
    }

    // Check if course has modules
    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select('id')
      .eq('course_id', courseId)
      .limit(1);

    if (modulesError) {
      issues.push(`Error checking modules: ${modulesError.message}`);
      return { ready: false, issues, fixed: false };
    }

    if (!modules || modules.length === 0) {
      issues.push(`Course has no modules`);
      // Try to fix it
      const fixedData = await ensureCourseHasData(courseId);
      if (fixedData) {
        fixed = true;
        issues.push(`→ Created default module and lesson`);
      } else {
        return { ready: false, issues, fixed: false };
      }
    }

    // Check if modules have lessons
    if (modules && modules.length > 0) {
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id')
        .in('module_id', modules.map(m => m.id))
        .limit(1);

      if (lessonsError) {
        issues.push(`Error checking lessons: ${lessonsError.message}`);
        return { ready: false, issues, fixed: false };
      }

      if (!lessons || lessons.length === 0) {
        issues.push(`Modules have no lessons`);
        // Try to fix it
        const fixedData = await ensureCourseHasData(courseId);
        if (fixedData) {
          fixed = true;
          issues.push(`→ Created default lesson`);
        } else {
          return { ready: false, issues, fixed: false };
        }
      }
    }

    return { ready: true, issues: [], fixed };
  } catch (error: any) {
    issues.push(`Probe error: ${error.message}`);
    return { ready: false, issues, fixed: false };
  }
}

/**
 * Probe dashboard route data
 */
export async function probeDashboardRoute(userId: string): Promise<RouteProbeResult> {
  const issues: string[] = [];

  try {
    // Check if user profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      issues.push(`User profile does not exist`);
      return { ready: false, issues, fixed: false };
    }

    return { ready: true, issues: [], fixed: false };
  } catch (error: any) {
    issues.push(`Probe error: ${error.message}`);
    return { ready: false, issues, fixed: false };
  }
}

/**
 * Probe schedule route data
 */
export async function probeScheduleRoute(userId: string): Promise<RouteProbeResult> {
  const issues: string[] = [];

  try {
    // Check if study_plans table is accessible
    const { error: plansError } = await supabase
      .from('study_plans')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (plansError && plansError.code !== 'PGRST116') {
      issues.push(`Error accessing study_plans: ${plansError.message}`);
      return { ready: false, issues, fixed: false };
    }

    return { ready: true, issues: [], fixed: false };
  } catch (error: any) {
    issues.push(`Probe error: ${error.message}`);
    return { ready: false, issues, fixed: false };
  }
}

/**
 * Generic route probe based on pathname
 */
export async function probeRoute(pathname: string, userId?: string): Promise<RouteProbeResult> {
  // Extract course ID from paths like /course/:id or /courses/:id/play
  const courseMatch = pathname.match(/\/course[s]?\/([^/]+)/);
  if (courseMatch && courseMatch[1]) {
    return await probeCourseRoute(courseMatch[1]);
  }

  // Dashboard routes
  if (pathname.startsWith('/dashboard') || pathname === '/') {
    if (userId) {
      return await probeDashboardRoute(userId);
    }
    return { ready: true, issues: [], fixed: false };
  }

  // Schedule routes
  if (pathname.includes('/schedule')) {
    if (userId) {
      return await probeScheduleRoute(userId);
    }
    return { ready: true, issues: [], fixed: false };
  }

  // Default: route is ready
  return { ready: true, issues: [], fixed: false };
}

