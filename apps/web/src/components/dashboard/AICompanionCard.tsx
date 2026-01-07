import { useState, useEffect } from 'react';
import { Brain, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getDashboardNote } from '@/lib/ai/AICompanionService';
import { schedulingEngine } from '@/lib/ai/AdaptiveSchedulingEngine';
import { Card, CardContent } from '@/components/ui/card';

interface AICompanionCardProps {
  className?: string;
}

/**
 * AI Companion Card Component
 * 
 * Displays personalized AI-generated insights based on user's onboarding quiz
 * and learning patterns. Uses Groq for natural language generation.
 */
export function AICompanionCard({ className = '' }: AICompanionCardProps) {
  const { user, profile } = useAuth();
  const [companionNote, setCompanionNote] = useState<string>('Analyzing your learning patterns...');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quizProfile, setQuizProfile] = useState<any>(null);

  // Check if AI Companion is enabled
  const aiCompanionEnabled = profile?.ai_companion_enabled !== false; // Default to true

  useEffect(() => {
    if (!user || !aiCompanionEnabled) {
      setIsLoading(false);
      setCompanionNote('AI Companion is disabled. Enable it in Settings to get personalized insights.');
      return;
    }

    const fetchCompanionNote = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 1. Fetch user's onboarding quiz data
        const { data: preferences } = await supabase
          .from('ai_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        setQuizProfile(preferences);

        // 2. Initialize and get TF.js predictions
        await schedulingEngine.init(user.id);
        const { method, confidence, allScores } = await schedulingEngine.predictBestMethod(user.id);

        // 3. Get user stats for context
        const { data: sessions } = await supabase
          .from('study_sessions')
          .select('method_used, completed, started_at')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false })
          .limit(100);

        const completed = sessions?.filter(s => s.completed).length || 0;
        const completionRate = sessions?.length ? completed / sessions.length : 0;

        // Get best method (most successful)
        const methodCounts: Record<string, number> = {};
        sessions?.filter(s => s.completed).forEach(s => {
          methodCounts[s.method_used] = (methodCounts[s.method_used] || 0) + 1;
        });
        const bestMethod = Object.keys(methodCounts).reduce((a, b) => 
          methodCounts[a] > methodCounts[b] ? a : b, 'pomodoro'
        );

        // Get most productive hour
        const hourCounts: Record<number, number> = {};
        sessions?.filter(s => s.completed).forEach(s => {
          const hour = new Date(s.started_at).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        const mostProductiveHour = Object.keys(hourCounts).reduce((a, b) => 
          hourCounts[parseInt(a)] > hourCounts[parseInt(b)] ? a : b, '10'
        );

        const userStats = {
          streak: profile?.streak || 0,
          totalSessions: sessions?.length || 0,
          completionRate,
          bestMethod,
          mostProductiveHour: parseInt(mostProductiveHour),
        };

        // 4. Build quiz profile description
        let profileDescription = 'new learner';
        if (preferences) {
          const parts: string[] = [];
          if (preferences.goal) parts.push(`goal: ${preferences.goal}`);
          if (preferences.struggle) parts.push(`focus challenge: ${preferences.struggle}`);
          if (preferences.preferred_study_time) parts.push(`${preferences.preferred_study_time} learner`);
          profileDescription = parts.join(', ');
        }

        // 5. Generate AI Companion note using Groq
        const note = await getDashboardNote(userStats, {
          method,
          confidence,
          scores: allScores,
        }, {
          quizProfile: preferences,
          profileDescription,
        });

        setCompanionNote(note);
      } catch (err: any) {
        console.error('Error fetching AI Companion note:', err);
        setError('Failed to load AI insights');
        setCompanionNote('Keep learning consistently to see the best results. You\'re making progress!');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanionNote();
  }, [user, profile, aiCompanionEnabled]);

  if (!aiCompanionEnabled) {
    return null; // Don't show card if disabled
  }

  return (
    <Card className={`bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border-violet-500/20 ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/20 border border-primary/30">
            <Brain className="h-5 w-5 text-violet-400" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">
                AI Study Companion
              </span>
              {isLoading && (
                <Loader2 className="h-3 w-3 text-violet-400 animate-spin" />
              )}
            </div>
            
            {error ? (
              <p className="text-sm text-slate-400">{error}</p>
            ) : (
              <p className="text-sm text-slate-200 leading-relaxed">
                {companionNote}
              </p>
            )}
            
            {quizProfile && (
              <p className="text-xs text-slate-500 mt-2 italic">
                Based on your {quizProfile.goal || 'learning'} goals and recent progress
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

