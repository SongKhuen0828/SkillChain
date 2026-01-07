/**
 * Analytics Engine
 * 
 * Analyzes study session data to extract productivity patterns,
 * best learning hours, and most effective methods.
 */

export interface Session {
  start_time: string;
  is_completed: number | boolean;
  duration_minutes?: number;
  duration_seconds?: number;
  method: string;
  method_used?: string;
  focus_score?: number;
  tab_switch_count?: number;
}

export interface ProductivityAnalysis {
  peakHour: number;
  bestMethod: string;
  averageSuccessRate: number;
  hourlyStats: Record<number, { total: number; success: number; successRate: number }>;
  methodStats: Record<string, { total: number; success: number; successRate: number }>;
}

/**
 * Analyze productivity patterns from study sessions
 * 
 * @param sessions Array of study session records
 * @returns Productivity analysis including peak hour, best method, and success rates
 */
export const analyzeProductivity = (sessions: Session[]): ProductivityAnalysis => {
  const hourlyStats: Record<number, { total: number; success: number }> = {};
  const methodStats: Record<string, { total: number; success: number }> = {};

  sessions.forEach((s) => {
    // Handle both boolean and number completion status
    const isCompleted = typeof s.is_completed === 'boolean' 
      ? s.is_completed 
      : s.is_completed === 1 || s.is_completed === true;
    
    // Use method_used if method is not available
    const method = s.method || s.method_used || 'unknown';
    
    // Parse start time
    const startTime = s.start_time || (s as any).started_at;
    if (!startTime) return;
    
    const hour = new Date(startTime).getHours();
    
    // 按小时统计
    if (!hourlyStats[hour]) hourlyStats[hour] = { total: 0, success: 0 };
    hourlyStats[hour].total += 1;
    if (isCompleted) hourlyStats[hour].success += 1;

    // 按方法统计
    if (!methodStats[method]) methodStats[method] = { total: 0, success: 0 };
    methodStats[method].total += 1;
    if (isCompleted) methodStats[method].success += 1;
  });

  // Calculate success rates for hourly stats
  const hourlyStatsWithRates: Record<number, { total: number; success: number; successRate: number }> = {};
  Object.entries(hourlyStats).forEach(([hour, stats]) => {
    hourlyStatsWithRates[parseInt(hour)] = {
      ...stats,
      successRate: stats.total > 0 ? stats.success / stats.total : 0,
    };
  });

  // Calculate success rates for method stats
  const methodStatsWithRates: Record<string, { total: number; success: number; successRate: number }> = {};
  Object.entries(methodStats).forEach(([method, stats]) => {
    methodStatsWithRates[method] = {
      ...stats,
      successRate: stats.total > 0 ? stats.success / stats.total : 0,
    };
  });

  // 计算最佳小时 (需要至少3次尝试才有意义)
  const validHourlyStats = Object.entries(hourlyStatsWithRates).filter(([, stats]) => stats.total >= 3);
  const peakHourEntry = validHourlyStats.length > 0
    ? validHourlyStats.reduce((a, b) => 
        a[1].successRate > b[1].successRate ? a : b
      )
    : Object.entries(hourlyStatsWithRates)[0];

  // 计算最有效方法 (需要至少3次尝试才有意义)
  const validMethodStats = Object.entries(methodStatsWithRates).filter(([, stats]) => stats.total >= 3);
  const bestMethodEntry = validMethodStats.length > 0
    ? validMethodStats.reduce((a, b) => 
        a[1].successRate > b[1].successRate ? a : b
      )
    : Object.entries(methodStatsWithRates)[0];

  const peakHour = peakHourEntry ? parseInt(peakHourEntry[0]) : 10; // Default to 10 AM
  const bestMethod = bestMethodEntry ? bestMethodEntry[0] : 'pomodoro';

  // Calculate overall success rate
  const totalCompleted = sessions.filter(s => {
    const completed = typeof s.is_completed === 'boolean' 
      ? s.is_completed 
      : s.is_completed === 1 || s.is_completed === true;
    return completed;
  }).length;
  const averageSuccessRate = sessions.length > 0 ? totalCompleted / sessions.length : 0;

  // Calculate focus scores for sessions that have duration and tab_switch_count
  sessions.forEach(s => {
    const durationSeconds = s.duration_seconds || (s.duration_minutes ? s.duration_minutes * 60 : 0);
    const tabSwitches = s.tab_switch_count || 0;
    
    if (durationSeconds > 0) {
      // FocusScore = (CompletedTime / TotalTime) * 100 - (TabSwitches * 5)
      // For completed sessions, CompletedTime = TotalTime
      const completedTime = (typeof s.is_completed === 'boolean' && s.is_completed) || 
                            (typeof s.is_completed === 'number' && s.is_completed === 1)
                            ? durationSeconds 
                            : durationSeconds * 0.5; // Assume 50% completion for incomplete
      
      const focusScore = Math.max(0, (completedTime / durationSeconds) * 100 - (tabSwitches * 5));
      (s as any).focus_score = focusScore;
    }
  });

  return {
    peakHour,
    bestMethod,
    averageSuccessRate,
    hourlyStats: hourlyStatsWithRates,
    methodStats: methodStatsWithRates,
  };
};

