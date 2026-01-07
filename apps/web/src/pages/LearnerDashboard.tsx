import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Flame, Trophy, Sparkles, BookOpen, GraduationCap, Calendar, TrendingUp, Brain, Clock, Target, Zap, Timer, CheckCircle, Eye } from 'lucide-react'
import { useLearnerData } from '@/hooks/useLearnerData'
import { useAuth } from '@/contexts/AuthContext'
import { Skeleton } from '@/components/ui/skeleton'
import { schedulingEngine } from '@/lib/ai/AdaptiveSchedulingEngine'
import { supabase } from '@/lib/supabase'

// Focus method configuration - Using consistent brand colors
const FOCUS_METHODS = {
  pomodoro: {
    name: 'Pomodoro Technique',
    description: 'Work in focused 25-minute sessions with 5-minute breaks. After 4 pomodoros, take a longer 15-30 minute break.',
    bestFor: 'Deep focus tasks',
    icon: Timer,
    color: 'primary',
    gradient: 'from-primary/10 to-primary/5',
    border: 'border-primary/20',
    iconBg: 'bg-primary/20',
    iconColor: 'text-primary',
  },
  flowtime: {
    name: 'Flowtime',
    description: 'Work until you naturally lose focus, then take a break proportional to your work time. Great for entering flow state.',
    bestFor: 'Creative work',
    icon: Zap,
    color: 'accent',
    gradient: 'from-cyan-500/10 to-cyan-500/5',
    border: 'border-cyan-500/20',
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-500',
  },
  blitz: {
    name: 'Blitz Mode',
    description: 'Short 15-minute intense bursts with 3-minute micro-breaks. Perfect for high-energy, quick learning sessions.',
    bestFor: 'Quick reviews',
    icon: Zap,
    color: 'amber',
    gradient: 'from-amber-500/10 to-amber-500/5',
    border: 'border-amber-500/20',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-500',
  },
  '52_17': {
    name: '52/17 Method',
    description: 'Work for 52 minutes of intense focus, followed by 17 minutes of complete rest. Based on productivity research.',
    bestFor: 'Extended study sessions',
    icon: Target,
    color: 'emerald',
    gradient: 'from-emerald-500/10 to-emerald-500/5',
    border: 'border-emerald-500/20',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-500',
  },
}

export function LearnerDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { courses, certificates, loading, profile, userRank } = useLearnerData()
  
  // AI Recommended Focus Method
  const [aiRecommendedMethod, setAiRecommendedMethod] = useState<string | null>(null)
  const [aiConfidence, setAiConfidence] = useState<number>(0)
  const [aiLoading, setAiLoading] = useState(true)
  const [aiEnabled, setAiEnabled] = useState(true)
  
  // Check if AI Companion is enabled
  useEffect(() => {
    if (!user || !profile) return
    
    const checkAIEnabled = async () => {
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('ai_companion_enabled')
          .eq('id', user.id)
          .single()
        
        // Default to true if not set (null means enabled)
        setAiEnabled(profileData?.ai_companion_enabled !== false)
      } catch (error) {
        console.error('Error checking AI Companion status:', error)
        setAiEnabled(true) // Default to enabled on error
      }
    }
    
    checkAIEnabled()
  }, [user, profile])
  
  // Fetch AI recommendation on mount (only if AI Companion is enabled)
  useEffect(() => {
    if (!user || !aiEnabled) {
      setAiLoading(false)
      return
    }
    
    const getAIRecommendation = async () => {
      setAiLoading(true)
      try {
        await schedulingEngine.init(user.id)
        const prediction = await schedulingEngine.predictBestMethod(user.id)
        setAiRecommendedMethod(prediction.method)
        setAiConfidence(prediction.confidence)
        console.log(`🧠 Dashboard AI Recommended: ${prediction.method} (${Math.round(prediction.confidence * 100)}% confidence)`)
      } catch (error) {
        console.error('Error getting AI recommendation:', error)
        setAiRecommendedMethod('pomodoro') // Default fallback
        setAiConfidence(0.5)
      } finally {
        setAiLoading(false)
      }
    }
    
    getAIRecommendation()
  }, [user, aiEnabled])
  
  // Get enrolled courses count (courses user has started)
  const enrolledCount = courses.filter((c: any) => c.enrolled).length
  
  // Get the recommended method config
  const recommendedMethod = aiRecommendedMethod 
    ? FOCUS_METHODS[aiRecommendedMethod as keyof typeof FOCUS_METHODS] 
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto space-y-6"
      >
        {/* Header - The HUD */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">
              Welcome back, {profile?.full_name || 'Learner'}!
            </h1>
            <p className="text-muted-foreground mt-2">Continue your learning journey</p>
          </div>
        </div>

        {/* Top Section - 3 Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-2 border-amber-500/20 dark:border-amber-500/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                <Flame className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-3xl font-bold">{profile?.streak || 0}</div>
                    <p className="text-xs text-muted-foreground">days in a row</p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total XP</CardTitle>
                <Sparkles className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-3xl font-bold">{(profile?.xp || 0).toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">experience points</p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Certificates Won</CardTitle>
                <Trophy className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-3xl font-bold">{certificates.length}</div>
                    <p className="text-xs text-muted-foreground">blockchain certificates</p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50"
              onClick={() => navigate('/dashboard/courses')}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-3 rounded-xl bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{courses.length}</p>
                  <p className="text-sm text-muted-foreground">Available Courses</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50"
              onClick={() => navigate('/dashboard/courses')}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-3 rounded-xl bg-emerald-500/10">
                  <GraduationCap className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{enrolledCount}</p>
                  <p className="text-sm text-muted-foreground">Enrolled Courses</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50"
              onClick={() => navigate('/dashboard/schedule')}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-3 rounded-xl bg-cyan-500/10">
                  <Calendar className="h-6 w-6 text-cyan-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">Schedule</p>
                  <p className="text-sm text-muted-foreground">View AI Plan</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50"
              onClick={() => navigate('/dashboard/leaderboard')}
            >
              <CardContent className="flex items-center gap-4 p-6">
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <TrendingUp className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">#{userRank || '-'}</p>
                  <p className="text-sm text-muted-foreground">Leaderboard</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* AI Recommended Focus Method Section - Only show if AI Companion is enabled */}
        {aiEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Brain className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Your AI-Recommended Focus Method</h2>
              </div>
              <p className="text-muted-foreground">Based on your study patterns and preferences, our AI suggests this method for optimal learning today</p>
            </div>

            {aiLoading ? (
              <Card className="p-8">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-xl" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-72" />
                  </div>
                </div>
              </Card>
            ) : recommendedMethod ? (
              <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
                <Card className={`bg-gradient-to-br ${recommendedMethod.gradient} ${recommendedMethod.border} border-2 overflow-hidden`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-xl ${recommendedMethod.iconBg}`}>
                          <recommendedMethod.icon className={`h-10 w-10 ${recommendedMethod.iconColor}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-2xl">{recommendedMethod.name}</CardTitle>
                            <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-500 text-xs font-semibold flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              AI Recommended
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {Math.round(aiConfidence * 100)}% confidence based on your study patterns
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-base">
                      {recommendedMethod.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-2 text-sm ${recommendedMethod.iconColor} font-medium`}>
                        <Clock className="h-4 w-4" />
                        <span>Best for: {recommendedMethod.bestFor}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This method will automatically start when you enter a lesson
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <Card className="p-8 text-center">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Complete a few study sessions to get personalized recommendations!</p>
              </Card>
            )}
          </motion.div>
        )}

        {/* AI Features Info - Only show if AI Companion is enabled */}
        {aiEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border-cyan-500/20">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-cyan-500/20">
                    <Brain className="h-8 w-8 text-cyan-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">How SkillChain AI Helps You Learn</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
                      <div className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-cyan-500" />
                        <span className="text-sm">Focus tracking & analysis</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Timer className="h-5 w-5 text-green-500" />
                        <span className="text-sm">Adaptive timer suggestions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-purple-500" />
                        <span className="text-sm">Personalized study plans</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-orange-500" />
                        <span className="text-sm">Progress optimization</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">
                      Our AI analyzes your study patterns, pause reasons, and performance to recommend the optimal focus method and session duration for you. 
                      Complete lessons to earn XP and level up!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
