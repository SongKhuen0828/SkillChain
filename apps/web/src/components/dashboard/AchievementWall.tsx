import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Flame, 
  Brain, 
  Trophy,
  Sparkles,
  Award
} from 'lucide-react';

interface AchievementWallProps {
  totalXP: number;
  certificateCount: number;
  streakDays: number;
  totalStudyHours: number;
}

export function AchievementWall({
  totalXP,
  certificateCount,
  streakDays,
  totalStudyHours,
}: AchievementWallProps) {
  // Calculate XP progress (levels every 1000 XP)
  const currentLevel = Math.floor(totalXP / 1000) + 1;
  const xpInCurrentLevel = totalXP % 1000;
  const xpForNextLevel = 1000;
  const xpProgress = (xpInCurrentLevel / xpForNextLevel) * 100;

  // Badge definitions
  const badges = useMemo(() => {
    const badgeList = [
      {
        id: 'blockchain-pioneer',
        name: 'Blockchain Pioneer',
        icon: Shield,
        unlocked: certificateCount > 0,
        description: 'Earned your first blockchain certificate',
        color: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50',
      },
      {
        id: 'streak-master',
        name: '7-Day Streak',
        icon: Flame,
        unlocked: streakDays >= 7,
        description: 'Maintained a 7-day learning streak',
        color: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50',
      },
      {
        id: 'focus-master',
        name: 'Focus Master',
        icon: Brain,
        unlocked: totalStudyHours >= 10,
        description: 'Completed 10+ hours of focused study',
        color: 'bg-primary/20 text-primary border-primary/50',
      },
    ];

    return badgeList;
  }, [certificateCount, streakDays, totalStudyHours]);

  const unlockedCount = badges.filter(b => b.unlocked).length;

  return (
    <Card className="bg-card/50 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          Achievements & Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* XP Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              <span className="text-sm font-medium">Level {currentLevel}</span>
            </div>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {xpInCurrentLevel.toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
            </span>
          </div>
          <Progress value={xpProgress} className="h-3" />
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Total XP: {totalXP.toLocaleString()}</span>
            <span>{xpForNextLevel - xpInCurrentLevel} XP to next level</span>
          </div>
        </div>

        {/* Badges Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Badges
            </h3>
            <Badge variant="outline" className="text-xs">
              {unlockedCount} / {badges.length} Unlocked
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {badges.map((badge) => {
              const Icon = badge.icon;
              return (
                <div
                  key={badge.id}
                  className={`
                    relative p-4 rounded-lg border-2 transition-all
                    ${badge.unlocked 
                      ? `${badge.color} border-opacity-100 shadow-lg` 
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 opacity-60'
                    }
                  `}
                >
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className={`
                      p-3 rounded-full
                      ${badge.unlocked 
                        ? 'bg-white dark:bg-slate-900' 
                        : 'bg-slate-200 dark:bg-slate-700'
                      }
                    `}>
                      <Icon 
                        className={`
                          h-6 w-6
                          ${badge.unlocked 
                            ? 'text-current' 
                            : 'text-slate-400 dark:text-slate-500'
                          }
                        `} 
                      />
                    </div>
                    <div className="space-y-1">
                      <p className={`
                        text-xs font-semibold
                        ${badge.unlocked 
                          ? '' 
                          : 'text-slate-400 dark:text-slate-500'
                        }
                      `}>
                        {badge.name}
                      </p>
                      {!badge.unlocked && (
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          Locked
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Locked overlay */}
                  {!badge.unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20 rounded-lg">
                      <Award className="h-4 w-4 text-slate-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Badge descriptions */}
          <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
            {badges.map((badge) => (
              <div key={badge.id} className="flex items-start gap-2">
                <span className="font-medium">{badge.name}:</span>
                <span>{badge.description}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

