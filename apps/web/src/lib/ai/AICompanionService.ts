/**
 * AI Companion Service
 * 
 * Handles communication with Groq API for natural language generation.
 * Uses Supabase Edge Function for secure API key management.
 */

interface AICompanionContext {
  userStats?: {
    streak?: number;
    totalSessions?: number;
    completionRate?: number;
    bestMethod?: string;
    mostProductiveHour?: number;
  };
  tfData?: {
    method?: string;
    confidence?: number;
    scores?: Record<string, number>;
  };
  scheduleData?: {
    shiftedLessons?: number;
    reason?: string;
  };
}

/**
 * Call Groq AI Companion via Edge Function
 * 
 * @param prompt The prompt/question for the AI
 * @param context Additional context data
 * @returns AI-generated response
 */
export async function getAICompanionResponse(
  prompt: string,
  context?: AICompanionContext
): Promise<string> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { detectCORSError, logCORSError } = await import('@/lib/system/corsDetector');
    
    const { data, error } = await supabase.functions.invoke('ai-companion', {
      body: { prompt, context },
    });

    if (error) {
      // Check if it's a CORS error
      const corsInfo = detectCORSError(error);
      if (corsInfo.isCORS) {
        logCORSError(error, 'AI Companion Edge Function');
      } else {
        console.warn('AI Companion error (using fallback):', error);
      }
      return getFallbackResponse(prompt, context);
    }

    return data?.response || getFallbackResponse(prompt, context);
  } catch (error: any) {
    // Check if it's a CORS error
    const { detectCORSError, logCORSError } = await import('@/lib/system/corsDetector');
    const corsInfo = detectCORSError(error);
    
    if (corsInfo.isCORS) {
      logCORSError(error, 'AI Companion Edge Function');
    } else {
      console.warn('AI Companion failed (using fallback):', error?.message || error);
    }
    
    return getFallbackResponse(prompt, context);
  }
}

/**
 * Get AI explanation for scheduling decisions
 * 
 * @param method The recommended method
 * @param confidence The confidence score
 * @param userStats User statistics
 * @returns AI-generated explanation
 */
export async function getSchedulingExplanation(
  method: string,
  confidence: number,
  userStats?: AICompanionContext['userStats']
): Promise<string> {
  const prompt = `Based on your learning patterns, I recommend "${method}" for your next study session. 
Confidence: ${(confidence * 100).toFixed(0)}%. Explain why this method is best for the user right now.`;

  const context: AICompanionContext = {
    tfData: { method, confidence },
    userStats,
  };

  return getAICompanionResponse(prompt, context);
}

/**
 * Get encouragement message for Focus Timer
 * 
 * @param method The recommended focus method
 * @param streak Current study streak
 * @param userStats User statistics
 * @returns Encouragement message
 */
export async function getEncouragement(
  method: string,
  streak: number,
  userStats?: AICompanionContext['userStats']
): Promise<string> {
  const prompt = `The user has a ${streak}-day study streak and is about to start a "${method}" session. 
Give a brief, motivating one-sentence encouragement.`;

  const context: AICompanionContext = {
    userStats: { ...userStats, streak },
    tfData: { method },
  };

  return getAICompanionResponse(prompt, context);
}

/**
 * Get dashboard companion note
 * 
 * @param userStats User statistics
 * @param tfData TensorFlow prediction data
 * @param additionalContext Additional context (quiz profile, etc.)
 * @returns Dashboard companion note
 */
export async function getDashboardNote(
  userStats?: AICompanionContext['userStats'],
  tfData?: AICompanionContext['tfData'],
  additionalContext?: {
    quizProfile?: any;
    profileDescription?: string;
  }
): Promise<string> {
  let prompt = `Generate a brief, personalized study companion note (2 lines max) for the dashboard. `;
  
  if (additionalContext?.profileDescription) {
    prompt += `The user is a ${additionalContext.profileDescription}. `;
  }
  
  if (tfData?.method && userStats?.bestMethod) {
    prompt += `Their best performing method is "${userStats.bestMethod}" and I'm recommending "${tfData.method}" for their next session. `;
  }
  
  prompt += `Mention that you've adapted their schedule based on their initial settings and recent progress. Be motivational and concise.`;

  const context: AICompanionContext = {
    userStats,
    tfData,
  };

  return getAICompanionResponse(prompt, context);
}

/**
 * Get explanation for schedule adjustments
 * 
 * @param scheduleData Schedule adjustment data
 * @param userStats User statistics
 * @returns Explanation for schedule changes
 */
export async function getScheduleAdjustmentExplanation(
  scheduleData: AICompanionContext['scheduleData'],
  userStats?: AICompanionContext['userStats']
): Promise<string> {
  const prompt = `Explain to the user why their study schedule was adjusted. 
Be concise and encouraging.`;

  const context: AICompanionContext = {
    scheduleData,
    userStats,
  };

  return getAICompanionResponse(prompt, context);
}

/**
 * Get AI Course Recommendation
 * Uses Groq to generate personalized course recommendations
 */
export async function getCourseRecommendation(
  userGoal: string | null,
  userSkill: string | null,
  skillProficiency: number | null,
  availableCourses: Array<{ id: string; title: string; description: string | null }>
): Promise<string> {
  try {
    const { supabase } = await import('@/lib/supabase');
    
    const { data, error } = await supabase.functions.invoke('ai-companion', {
      body: {
        type: 'course_recommendation',
        data: {
          goal: userGoal || 'learn new skills',
          skill: userSkill || 'general learning',
          proficiency: skillProficiency || 50,
          availableCourses: availableCourses.map(c => ({
            title: c.title,
            description: c.description || '',
          })),
        },
      },
    });

    if (error) {
      console.error('AI Companion error:', error);
      throw error;
    }

    return data?.recommendation || data?.message || '';
  } catch (error: any) {
    console.error('Error getting course recommendation:', error);
    // Fallback recommendation
    const courseName = availableCourses.length > 0 
      ? availableCourses[0].title 
      : 'our recommended courses';
    return `Based on your learning goals, I suggest exploring ${courseName} to advance your skills.`;
  }
}

/**
 * Fallback response when AI is unavailable
 * Provides encouraging messages based on context to ensure UI always has content
 */
const ENCOURAGING_MESSAGES = [
  "Stay focused!",
  "You're doing great!",
  "Blockchain awaits your success!",
  "Keep up the excellent work!",
  "Every session counts!",
  "You're making great progress!",
  "Stay motivated and keep learning!",
  "Your dedication is paying off!",
];

function getFallbackResponse(prompt: string, context?: AICompanionContext): string {
  const method = context?.tfData?.method || 'focus session';
  const streak = context?.userStats?.streak || 0;
  const hour = new Date().getHours();
  
  // Template-based fallbacks with contextual messages
  if (prompt.includes('recommend') || prompt.includes('method')) {
    const randomMsg = ENCOURAGING_MESSAGES[Math.floor(Math.random() * ENCOURAGING_MESSAGES.length)];
    return `Based on your learning patterns, ${method} should work well for you right now. ${randomMsg}`;
  }
  
  if (prompt.includes('encouragement') || prompt.includes('streak')) {
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    if (streak > 0) {
      return `Great ${timeOfDay}! Your ${streak}-day streak shows real dedication. Keep it up!`;
    }
    return ENCOURAGING_MESSAGES[Math.floor(Math.random() * ENCOURAGING_MESSAGES.length)];
  }
  
  if (prompt.includes('dashboard') || prompt.includes('companion note')) {
    if (streak > 3) {
      return `Excellent progress! Your ${streak}-day streak is impressive. Keep learning consistently!`;
    }
    return ENCOURAGING_MESSAGES[Math.floor(Math.random() * ENCOURAGING_MESSAGES.length)];
  }
  
  if (prompt.includes('course') || prompt.includes('recommendation')) {
    return `Based on your learning goals, I suggest exploring our recommended courses to advance your skills.`;
  }
  
  // Default: Return random encouraging message
  return ENCOURAGING_MESSAGES[Math.floor(Math.random() * ENCOURAGING_MESSAGES.length)];
}
