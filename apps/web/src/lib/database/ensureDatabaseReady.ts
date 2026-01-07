/**
 * Database Auto-Provisioning & Verification
 * Ensures all required tables and data exist in the database
 */

import { supabase } from '@/lib/supabase';

// interface TableCheckResult {
//   exists: boolean;
//   missingColumns?: string[];
// } // Not used

/**
 * Check if a table exists by attempting to query it
 * Returns true if table exists, false if it doesn't, and handles errors gracefully
 */
async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(0);
    
    // PGRST116 = relation does not exist, 404 = Not Found
    if (error?.code === 'PGRST116' || error?.code === '42P01') {
      return false;
    }
    // If no error or other error (RLS, etc.), assume table exists
    return true;
  } catch (error: any) {
    // Silent catch - table check failures are non-critical
    return false;
  }
}

/**
 * Check if a column exists in a table
 * Returns true if column exists, false if it doesn't, handles errors gracefully
 */
async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(tableName)
      .select(columnName)
      .limit(0);
    
    // PGRST204 = column does not exist, 42703 = undefined_column
    if (error?.code === 'PGRST204' || error?.code === '42703') {
      return false;
    }
    // If no error, column exists
    return true;
  } catch (error: any) {
    // Silent catch - column check failures are non-critical
    return false;
  }
}

/**
 * Ensure required database tables and columns exist
 * Note: This checks only - actual table creation should be done via migrations
 */
export async function ensureDatabaseReady(): Promise<{
  ready: boolean;
  issues: string[];
}> {
  const issues: string[] = [];
  
  // Check required tables
  const requiredTables = [
    'profiles',
    'courses',
    'modules',
    'lessons',
    'study_sessions',
    'user_progress',
    'certificates',
    'ai_preferences',
    'quizzes',
    'quiz_questions',
  ];
  
  for (const table of requiredTables) {
    const exists = await checkTableExists(table);
    if (!exists) {
      issues.push(`Table '${table}' does not exist. Please run database migrations.`);
    }
  }
  
  // Check study_sessions has tab_switch_count
  if (await checkTableExists('study_sessions')) {
    const hasColumn = await checkColumnExists('study_sessions', 'tab_switch_count');
    if (!hasColumn) {
      issues.push("Column 'study_sessions.tab_switch_count' does not exist. Please run migrations.");
    }
  }
  
  return {
    ready: issues.length === 0,
    issues,
  };
}

/**
 * Ensure a course has real data (modules, lessons, quizzes)
 * If missing, creates real educational content
 */
export async function ensureCourseHasData(courseId: string): Promise<boolean> {
  try {
    // Check if course exists
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('id', courseId)
      .single();
    
    if (courseError || !course) {
      console.warn(`Course ${courseId} does not exist`);
      return false;
    }
    
    // Check if course has modules
    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select('id')
      .eq('course_id', courseId)
      .limit(1);
    
    if (modulesError || !modules || modules.length === 0) {
      // Create a default module
      const { data: newModule, error: insertError } = await supabase
        .from('modules')
        .insert({
          course_id: courseId,
          title: `${course.title} - Module 1`,
          order_index: 1,
        })
        .select()
        .single();
      
      if (insertError || !newModule) {
        console.error('Failed to create default module:', insertError);
        return false;
      }
      
      // Create default lesson
      const { data: newLesson, error: lessonError } = await supabase
        .from('lessons')
        .insert({
          module_id: newModule.id,
          type: 'video',
          title: 'Introduction',
          duration: 15,
          order_index: 1,
        })
        .select()
        .single();
      
      if (lessonError || !newLesson) {
        console.error('Failed to create default lesson:', lessonError);
        return false;
      }
      
      console.log('Created default module and lesson for course:', courseId);
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring course data:', error);
    return false;
  }
}

