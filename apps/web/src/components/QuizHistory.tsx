import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface QuizHistoryProps {
  quizId: string;
  userId: string;
}

export function QuizHistory({ quizId, userId }: QuizHistoryProps) {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      if (!quizId || !userId) return;

      console.log("🔍 History Component: Fetching for", { quizId, userId });

      const { data, error } = await supabase
        .from('quiz_submissions')
        .select('*')
        .eq('quiz_id', quizId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("❌ History fetch error:", error);
      } else {
        console.log("✅ History loaded:", data);
        setAttempts(data || []);
      }
      setLoading(false);
    }

    fetchHistory();
  }, [quizId, userId]);

  if (loading) return <div className="text-xs text-slate-500 mt-4">Loading history...</div>;
  if (attempts.length === 0) return null; // Don't show anything if no history

  return (
    <div className="mt-8 w-full max-w-md border-t border-slate-800 pt-6">
      <h3 className="text-slate-400 text-sm font-medium mb-4 uppercase tracking-wider">
        Previous Attempts
      </h3>
      <div className="space-y-3">
        {attempts.map((attempt) => (
          <div 
            key={attempt.id} 
            className="flex items-center justify-between p-3 rounded bg-slate-800/50 border border-slate-700/50"
          >
            <div className="flex flex-col">
              <span className="text-sm text-slate-300">
                {new Date(attempt.created_at).toLocaleDateString()}
              </span>
              <span className="text-xs text-slate-500">
                {new Date(attempt.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
               <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wide ${
                 attempt.passed 
                   ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                   : 'bg-red-500/10 text-red-400 border border-red-500/20'
               }`}>
                 {attempt.passed ? 'Passed' : 'Failed'}
               </span>
               <span className={`font-mono font-bold ${
                 attempt.passed ? 'text-teal-400' : 'text-slate-400'
               }`}>
                 {Math.round(attempt.score)}%
               </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

