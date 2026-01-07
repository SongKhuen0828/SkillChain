import { useState, useEffect } from 'react';
import { Timer, Play, Pause, BrainCircuit, Zap, Coffee, Infinity, ChevronDown, Lock, Unlock } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { schedulingEngine } from '@/lib/ai/AdaptiveSchedulingEngine';
import { getEncouragement } from '@/lib/ai/AICompanionService';
import { useAuth } from '@/contexts/AuthContext';
import { retryWithBackoff } from '@/lib/database/retryWithBackoff';

type FocusMode = 'pomodoro' | 'flowtime' | 'blitz' | '52_17';

export function FocusTimer({ 
  userId, 
  courseId,
  lessonId,
  lessonType: _lessonType,
  recommendedMethod,
  autoStart = false,
  onLockStateChange
}: { 
  userId: string
  courseId: string
  lessonId?: string
  lessonType?: string
  recommendedMethod?: string
  autoStart?: boolean
  onLockStateChange?: (isLocked: boolean) => void
}) {
  const { profile } = useAuth();
  const [mode, setMode] = useState<FocusMode>('pomodoro');
  const [isActive, setIsActive] = useState(false);
  const [seconds, setSeconds] = useState(25 * 60);
  const [totalSpent, setTotalSpent] = useState(0);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);

  // Notify parent component when lock state changes
  useEffect(() => {
    onLockStateChange?.(isScreenLocked);
  }, [isScreenLocked, onLockStateChange]);

  // Reset timer when lesson changes
  useEffect(() => {
    // When lesson changes, stop current session and reset
    if (isActive) {
      finishSession(false);
    }
    setHasAutoStarted(false);
    setIsScreenLocked(false);
    setShowUnlockConfirm(false);
    setTotalSpent(0);
    // Reset timer based on mode
    if (mode === 'pomodoro') setSeconds(25 * 60);
    if (mode === 'blitz') setSeconds(15 * 60);
    if (mode === '52_17') setSeconds(52 * 60);
    if (mode === 'flowtime') setSeconds(0);
  }, [lessonId]);

  // Check if AI Companion is enabled
  const aiCompanionEnabled = profile?.ai_companion_enabled !== false; // Default to true

  // 🔥 AI 预测逻辑 (使用 AdaptiveSchedulingEngine + Groq)
  useEffect(() => {
    if (!aiCompanionEnabled) {
      return; // Don't run AI if disabled
    }

    const runAI = async () => {
      try {
        // 初始化并训练 (如果是第一次)
        await schedulingEngine.init(userId);

        // 获取预测 (优先使用recommendedMethod，否则从engine获取)
        let method = recommendedMethod || 'pomodoro';
        let confidence = 0.7;
        
        if (!recommendedMethod) {
          const prediction = await schedulingEngine.predictBestMethod(userId);
          method = prediction.method;
          confidence = prediction.confidence;
        }
        
        console.log(`🤖 AI Prediction: Best=${method}, Confidence=${(confidence*100).toFixed(1)}%`);

        // 只有信心足够高时才弹出建议
        if (confidence > 0.65) {
          // Use Groq to generate encouragement if enabled
          if (aiCompanionEnabled) {
            try {
              const encouragement = await getEncouragement(
                method,
                profile?.streak || 0,
                {
                  streak: profile?.streak || 0,
                  totalSessions: 0, // Could fetch if needed
                  completionRate: 0,
                  bestMethod: method,
                }
              );
              setAiSuggestion(encouragement);
            } catch (groqError) {
              console.error("Groq error, using fallback:", groqError);
              // Fallback to template
              const hour = new Date().getHours();
              let reasoning = "matches your peak energy.";
              if (hour > 21) reasoning = "best for late-night consistency.";
              if (hour < 11) reasoning = "optimized for morning focus.";
              setAiSuggestion(`Mode '${method}' has a ${(confidence * 100).toFixed(0)}% success rate now. It ${reasoning}`);
            }
          } else {
            // Fallback template if Groq disabled
            const hour = new Date().getHours();
            let reasoning = "matches your peak energy.";
            if (hour > 21) reasoning = "best for late-night consistency.";
            if (hour < 11) reasoning = "optimized for morning focus.";
            setAiSuggestion(`Mode '${method}' has a ${(confidence * 100).toFixed(0)}% success rate now. It ${reasoning}`);
          }
        }

        // 🔥 Auto-start logic: If autoStart is true and we haven't auto-started yet
        if (autoStart && !hasAutoStarted && method) {
          // Map method string to FocusMode
          const modeMap: Record<string, FocusMode> = {
            'pomodoro': 'pomodoro',
            'blitz': 'blitz',
            '52_17': '52_17',
            '52/17': '52_17',
            'flowtime': 'flowtime'
          };
          
          const focusMode = modeMap[method.toLowerCase()] || 'pomodoro';
          setMode(focusMode);
          
          // Set timer based on mode
          if (focusMode === 'pomodoro') setSeconds(25 * 60);
          if (focusMode === 'blitz') setSeconds(15 * 60);
          if (focusMode === '52_17') setSeconds(52 * 60);
          if (focusMode === 'flowtime') setSeconds(0);
          
          // Auto-start the timer and lock screen
          setIsActive(true);
          setHasAutoStarted(true);
          setIsScreenLocked(true);
          toast.info('Focus mode activated! Screen is locked. Complete the timer to unlock.', { duration: 5000 });
          console.log(`🚀 Auto-started Focus Timer with mode: ${focusMode} (Screen Locked)`);
        }
      } catch (error) {
        console.error("🤖 AI Engine Error:", error);
        // Fallback to simple rule-based suggestion
        const h = new Date().getHours();
        if (h >= 22 || h < 2) {
          setAiSuggestion("It's late 🌙. 'Blitz Mode' (15m) is recommended to keep consistency without burnout.");
        } else if (h >= 8 && h <= 11) {
          setAiSuggestion("Morning peak ☀️. Perfect time for 'Deep Work' (52/17) or Flowtime.");
        }
      }
    };

    // 延迟 1 秒执行，避免阻塞 UI 渲染
    setTimeout(runAI, 1000);
  }, [userId, aiCompanionEnabled, profile, recommendedMethod, autoStart, hasAutoStarted]);

  // 4. 完成并保存数据 (with retry logic)
  const finishSession = async (completed: boolean) => {
    setIsActive(false);
    setIsScreenLocked(false); // Unlock screen when session ends
    if (totalSpent > 10) { // 忽略误触
      const sessionData = {
        user_id: userId,
        course_id: courseId,
        method_used: mode,
        duration_seconds: totalSpent,
        completed: completed,
        tab_switch_count: 0, // FocusTimer doesn't track tab switches
      };
      
      // Retry with exponential backoff until successful
      try {
        await retryWithBackoff(async () => {
          const { error } = await supabase.from('study_sessions').insert(sessionData);
          if (error) throw error;
        }, { maxRetries: 5, initialDelay: 1000 });
        console.log("📝 Session Logged for AI Training");
      } catch (error) {
        console.error("Failed to save study session after retries:", error);
        toast.error("Failed to save session data. Please try again.");
      }
    }
    
    if (completed) {
      toast.success("Focus session complete! Take a break. ☕");
      new Audio('/bell.mp3').play().catch(() => {}); 
    }
  };

  // 2. 计时器逻辑
  useEffect(() => {
    let interval: any;
    if (isActive) {
      interval = setInterval(() => {
        setTotalSpent(t => t + 1);
        if (mode === 'flowtime') {
          setSeconds(s => s + 1); // 正向计时
        } else {
          setSeconds(s => {
            if (s <= 1) {
              finishSession(true);
              return 0;
            }
            return s - 1; // 倒计时
          });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, mode]);

  // 3. 切换模式
  const switchMode = (m: FocusMode) => {
    setIsActive(false);
    setMode(m);
    setTotalSpent(0);
    if (m === 'pomodoro') setSeconds(25 * 60);
    if (m === 'blitz') setSeconds(15 * 60);
    if (m === '52_17') setSeconds(52 * 60);
    if (m === 'flowtime') setSeconds(0);
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  };

  const formatMiniTime = (s: number) => {
    const min = Math.floor(s / 60).toString();
    const sec = (s % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  };

  // 1. MINI VIEW (Collapsed)
  if (!isExpanded) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {/* AI Hint Tooltip (Only show if hovered or new) */}
        {aiSuggestion && !isActive && (
           <div className="bg-primary/90 text-primary-foreground text-[10px] px-3 py-1.5 rounded-lg mb-1 animate-in fade-in shadow-lg backdrop-blur-sm border border-primary/50 max-w-[150px]">
             AI: {aiSuggestion.substring(0, 60)}...
           </div>
        )}

        <button 
          onClick={() => setIsExpanded(true)}
          className={cn(
            "h-12 flex items-center gap-2 px-4 rounded-full shadow-2xl transition-all duration-300 border backdrop-blur-md hover:scale-105",
            isActive 
              ? "bg-primary/90 border-primary text-white w-auto" 
              : "bg-slate-900/80 border-slate-700 text-slate-400 w-12 justify-center hover:text-white hover:bg-slate-800"
          )}
        >
          {isActive ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
              </span>
              <span className="font-mono font-bold text-sm tracking-widest">{formatMiniTime(seconds)}</span>
            </>
          ) : (
            <div className="relative">
              <BrainCircuit className="w-6 h-6" />
              {aiSuggestion && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-slate-900 animate-pulse"></span>}
            </div>
          )}
        </button>
      </div>
    );
  }

  // Handle unlock request
  const handleUnlockRequest = () => {
    setShowUnlockConfirm(true);
  };

  const confirmUnlock = () => {
    setIsScreenLocked(false);
    setShowUnlockConfirm(false);
    finishSession(false);
    toast.warning('Focus session ended early. Try to complete next time!');
  };

  // 2.5 FLOATING LOCK BAR (doesn't block video content)
  if (isScreenLocked && isActive) {
    return (
      <>
        {/* Top Lock Bar - Floating */}
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-b from-slate-950/95 to-transparent pb-8 pt-4 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-teal-500/30 rounded-2xl p-4 shadow-2xl shadow-teal-500/10">
              <div className="flex items-center justify-between gap-4">
                {/* Left: Lock Status */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <p className="text-teal-400 font-semibold text-sm">Focus Mode Active</p>
                    <p className="text-slate-500 text-xs">Navigation locked • Complete timer to unlock</p>
                  </div>
                </div>
                
                {/* Center: Timer */}
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-4xl font-mono font-bold text-teal-400 tracking-tight">
                      {formatTime(seconds)}
                    </div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">{mode.replace('_', '/')}</p>
                  </div>
                </div>
                
                {/* Right: Unlock Button */}
                <div>
                  {!showUnlockConfirm ? (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={handleUnlockRequest}
                      className="text-slate-500 hover:text-red-400 text-xs"
                    >
                      <Unlock className="w-3 h-3 mr-1" />
                      Unlock
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowUnlockConfirm(false)}
                        className="text-slate-400 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={confirmUnlock}
                        className="text-xs"
                      >
                        End Session
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              {/* AI Suggestion (if any) */}
              {aiSuggestion && (
                <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                  <BrainCircuit className="w-3 h-3 text-teal-500 shrink-0" />
                  <span className="line-clamp-1">{aiSuggestion}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Also render the mini timer in corner for reference */}
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-teal-600/90 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            <span className="font-mono font-bold text-sm">{formatMiniTime(seconds)}</span>
          </div>
        </div>
      </>
    );
  }

  // 3. FULL VIEW (Expanded) - Mostly same as before, but with Minimize button
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200">
      <div className="bg-slate-950/95 border border-slate-800 p-5 rounded-2xl shadow-2xl w-72 backdrop-blur-md">
        
        {/* Header with Minimize */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
            <BrainCircuit className="text-teal-500 w-4 h-4" /> Focus Engine
          </div>
          <button 
            onClick={() => setIsExpanded(false)} 
            className="text-slate-500 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        {/* AI Suggestion (Inline) */}
        {aiSuggestion && !isActive && (
          <div className="bg-primary/10 border border-primary/20 p-3 rounded-lg mb-4 text-xs text-muted-foreground">
             <span className="font-bold text-teal-500 block mb-1">AI Suggestion:</span>
             {aiSuggestion}
          </div>
        )}

        {/* Mode Selector */}
        <div className="flex justify-between mb-6 bg-slate-900 p-1 rounded-lg">
          {(['pomodoro', 'flowtime', 'blitz', '52_17'] as FocusMode[]).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={cn(
                "p-2 rounded-md transition-all",
                mode === m ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
              )}
              title={m}
            >
              {m === 'pomodoro' && <Timer className="w-4 h-4" />}
              {m === 'flowtime' && <Infinity className="w-4 h-4" />}
              {m === 'blitz' && <Zap className="w-4 h-4" />}
              {m === '52_17' && <Coffee className="w-4 h-4" />}
            </button>
          ))}
        </div>

        {/* Timer Display */}
        <div className="text-center mb-6">
          <div className={cn(
            "text-6xl font-mono font-bold tracking-tighter",
            isActive ? 'text-white' : 'text-slate-600'
          )}>
            {formatTime(seconds)}
          </div>
          <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest font-semibold">{mode.replace('_', '/')}</p>
        </div>

        {/* Start/Stop Buttons */}
        <div className="space-y-2">
          <Button 
            onClick={() => {
              if (isActive) {
                finishSession(false);
              } else {
                setIsActive(true);
                setIsScreenLocked(true);
                toast.info('Focus mode activated with screen lock!');
              }
            }}
            className={cn(
              "w-full h-12 text-lg font-bold transition-all",
              isActive ? 'bg-slate-800 text-red-400 hover:bg-slate-700' : 'bg-primary hover:bg-primary/90'
            )}
          >
            {isActive ? (
              <>
                <Pause className="mr-2 w-4 h-4"/> Stop
              </>
            ) : (
              <>
                <Lock className="mr-2 w-4 h-4"/> Start with Lock
              </>
            )}
          </Button>
          
          {!isActive && (
            <Button 
              variant="ghost"
              onClick={() => setIsActive(true)}
              className="w-full text-slate-500 hover:text-slate-300 text-sm"
            >
              <Play className="mr-2 w-3 h-3"/> Start without lock
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}