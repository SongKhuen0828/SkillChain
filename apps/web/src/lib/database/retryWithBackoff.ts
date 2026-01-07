/**
 * Retry utility with exponential backoff
 * For real-time database updates that must succeed
 */

import { supabase } from '@/lib/supabase';

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 5,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
  } = options;
  
  let lastError: Error | null = null;
  let delay = initialDelay;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }
  }
  
  throw lastError || new Error('Retry failed: Unknown error');
}

/**
 * Update study session with retry logic
 */
export async function updateStudySessionWithRetry(
  sessionData: {
    user_id: string;
    course_id?: string;
    method_used?: string;
    duration_seconds?: number;
    completed?: boolean;
    started_at?: string;
    tab_switch_count?: number;
  }
): Promise<void> {
  await retryWithBackoff(async () => {
    const { error } = await supabase
      .from('study_sessions')
      .insert(sessionData);
    
    if (error) {
      throw error;
    }
  });
}
