import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SafeAvatar } from '@/components/ui/SafeAvatar'
import { QuizHistory } from '@/components/QuizHistory'
import { FocusTimer } from '@/components/FocusTimer'
import { schedulingEngine } from '@/lib/ai/AdaptiveSchedulingEngine'
import { 
  PlayCircle, FileText, CheckCircle, 
  Download, Trophy, ArrowRight, Lock, 
  MessageSquare, Star, Send 
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function CoursePlayer() {
  const { id: courseId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Data States
  const [course, setCourse] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])
  const [userProgress, setUserProgress] = useState<Set<string>>(new Set())
  
  // UI States
  const [loading, setLoading] = useState(true)
  const [submittingReview, setSubmittingReview] = useState(false)
  
  // New Review Form State
  const [newRating, setNewRating] = useState(5)
  const [newComment, setNewComment] = useState('')
  
  // Video pause tracking state
  const videoRef = useRef<HTMLVideoElement>(null)
  const [showPauseReasonDialog, setShowPauseReasonDialog] = useState(false)
  const [showExitReasonDialog, setShowExitReasonDialog] = useState(false)
  const [pauseReason, setPauseReason] = useState('')
  const [exitReason, setExitReason] = useState('')
  const [pauseCount, setPauseCount] = useState(0)
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
  const [isExiting, setIsExiting] = useState(false)
  
  // AI recommendation for Focus Timer
  const [aiRecommendedMethod, setAiRecommendedMethod] = useState<string | null>(null)
  
  // Focus Timer lock state - when locked, navigation is disabled
  const [isFocusLocked, setIsFocusLocked] = useState(false)

  // Helper function to flatten lessons from modules
  const getAllLessons = useMemo(() => {
    if (!course?.modules) return []
    const lessons: any[] = []
    course.modules.forEach((module: any) => {
      if (module.lessons && Array.isArray(module.lessons)) {
        lessons.push(...module.lessons)
      }
    })
    return lessons
  }, [course])

  // Get active lesson ID from URL
  const activeLessonId = searchParams.get('lessonId')

  // Derived state: find the lesson object based on URL param, or default to first lesson
  const currentLesson = useMemo(() => {
    if (!getAllLessons.length) return null
    if (activeLessonId) {
      return getAllLessons.find((l: any) => l.id === activeLessonId) || getAllLessons[0]
    }
    return getAllLessons[0]
  }, [getAllLessons, activeLessonId])

  // Handler to update URL when lesson is selected
  const handleLessonSelect = (lesson: any) => {
    setSearchParams({ lessonId: lesson.id })
    // Reset tracking when switching lessons
    setPauseCount(0)
    setSessionStartTime(new Date())
    setPauseReason('')
    // The useMemo above will automatically update 'currentLesson'
  }
  
  // Get AI recommended method for Focus Timer
  useEffect(() => {
    if (!user || !courseId) return
    
    const getAIRecommendation = async () => {
      try {
        await schedulingEngine.init(user.id)
        const prediction = await schedulingEngine.predictBestMethod(user.id)
        setAiRecommendedMethod(prediction.method)
        console.log(`🧠 AI Recommended Focus Method: ${prediction.method}`)
      } catch (error) {
        console.error('Error getting AI recommendation:', error)
      }
    }
    
    getAIRecommendation()
  }, [user, courseId])
  
  // Track video session start time
  useEffect(() => {
    if (currentLesson?.type === 'video' && currentLesson.content_url) {
      setSessionStartTime(new Date())
      setPauseCount(0)
    }
  }, [currentLesson?.id])
  
  // Handle video pause event
  const handleVideoPause = () => {
    if (!videoRef.current || !currentLesson) return
    setPauseCount(prev => prev + 1)
    setShowPauseReasonDialog(true)
  }
  
  // Save pause reason
  const handleSavePauseReason = async () => {
    if (!user || !courseId || !currentLesson || !sessionStartTime) return
    
    try {
      // Save pause reason to study_sessions (using metadata or a separate field)
      // For now, we'll log it for AI analysis
      console.log('📝 Video Paused:', {
        reason: pauseReason,
        pauseCount,
        lessonId: currentLesson.id,
        courseId,
        timestamp: new Date().toISOString()
      })
      
      // TODO: Save pause_reason to study_sessions table when session ends
      // This will be saved when the lesson is marked as complete
      
      setShowPauseReasonDialog(false)
      setPauseReason('')
      toast.success('Pause reason recorded and will be used for AI analysis')
    } catch (error) {
      console.error('Error saving pause reason:', error)
      toast.error('Failed to save pause reason')
    }
  }

  // Handle page unload - warn user (Note: beforeunload can only show browser's native confirmation, not custom dialogs)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentLesson && sessionStartTime && !isExiting) {
        // Modern browsers ignore custom messages, but this will show a generic confirmation
        e.preventDefault();
        e.returnValue = '';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentLesson, sessionStartTime, isExiting]);

  // 1. Fetch Course, Progress, and Reviews (Real DB Data)
  useEffect(() => {
    const initData = async () => {
      if (!courseId || !user) return
      try {
        setLoading(true)
        
        // A. Fetch Course Structure
        // First try with modules structure
        let { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select(`
            id, title, description,
            modules (
              id, title, order_index,
              lessons (
                id, title, description, duration, type, 
                content_url, resource_url, order_index,
                quizzes ( id, title, passing_score )
              )
            )
          `)
          .eq('id', courseId)
          .single()

        // If modules query fails or returns no modules, try direct lessons
        if (courseError || !courseData?.modules || courseData.modules.length === 0) {
          const { data: directCourseData, error: directError } = await supabase
            .from('courses')
            .select(`
              id, title, description,
              lessons (
                id, title, description, duration, type, 
                content_url, resource_url, order_index,
                quizzes ( id, title, passing_score )
              )
            `)
            .eq('id', courseId)
            .single()

          if (directError) throw directError

          // Transform to modules structure for compatibility
          if (directCourseData?.lessons && directCourseData.lessons.length > 0) {
            courseData = {
              ...directCourseData,
              modules: [{
                id: 'default-module',
                title: 'Course Content',
                order_index: 0,
                lessons: directCourseData.lessons
              }]
            } as any
          } else {
            courseData = directCourseData as any
          }
        }

        if (!courseData) throw new Error('Course not found')

        // Sort structure locally and extract quiz data
        if (courseData.modules) {
          courseData.modules.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
          courseData.modules.forEach((m: any) => {
            m.lessons?.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
            m.lessons?.forEach((l: any) => {
              // Extract quiz data from array (one-to-many relationship returns array)
              if (l.quizzes && Array.isArray(l.quizzes) && l.quizzes.length > 0) {
                l.quiz = l.quizzes[0]
              }
            })
          })
        }
        setCourse(courseData)

        // B. Fetch Real User Progress (only for this course's lessons)
        // First, get all lesson IDs for this course
        const courseLessonIds: string[] = []
        if (courseData?.modules) {
          courseData.modules.forEach((m: any) => {
            if (m.lessons) {
              m.lessons.forEach((l: any) => {
                courseLessonIds.push(l.id)
              })
            }
          })
        }
        
        // Then fetch progress only for these lessons
        if (courseLessonIds.length > 0) {
          const { data: progressData } = await supabase
            .from('user_progress')
            .select('lesson_id')
            .eq('user_id', user.id)
            .in('lesson_id', courseLessonIds)
          
          if (progressData) {
            const completedSet = new Set(progressData.map(p => p.lesson_id))
            setUserProgress(completedSet)
          }
        }

        // C. Fetch Real Reviews with User Profiles
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('*, profiles:user_id ( full_name, avatar_url )')
          .eq('course_id', courseId)
          .order('created_at', { ascending: false })
        
        setReviews(reviewsData || [])

      } catch (err) {
        console.error(err)
        toast.error('Failed to load course data')
      } finally {
        setLoading(false)
      }
    }
    initData()
  }, [courseId, user])

  // 2. Set initial lessonId in URL if not present
  useEffect(() => {
    if (!course || !getAllLessons.length) return
    if (!activeLessonId && getAllLessons[0]) {
      setSearchParams({ lessonId: getAllLessons[0].id }, { replace: true })
    }
  }, [course, getAllLessons, activeLessonId, setSearchParams])

  // 3. Fetch Full Lesson Data (with Quiz) when currentLesson ID changes
  useEffect(() => {
    const fetchLessonData = async () => {
      const lessonId = currentLesson?.id
      if (!lessonId || !course) return
      
      // Check if quiz data is already loaded (to avoid unnecessary fetches)
      if (currentLesson?.quiz) return
      
      try {
        // Fetch the lesson with full quiz data
        const { data: lessonData, error: lessonError } = await supabase
          .from('lessons')
          .select(`
            *,
            quizzes (
              *,
              quiz_questions (*)
            )
          `)
          .eq('id', lessonId)
          .single()

        if (lessonError) {
          console.error('Error fetching lesson data:', lessonError)
          return
        }

        if (lessonData) {
          // Handle both Array and Object structures for quizzes
          if (lessonData.quizzes) {
            // 1. Handle both Array and Object structures
            // If it's an array, take the first item. If it's an object, take it directly.
            const rawQuiz = Array.isArray(lessonData.quizzes) ? lessonData.quizzes[0] : lessonData.quizzes

            if (rawQuiz) {
              console.log("🔴 Raw Quiz Data:", rawQuiz)

              // 2. Force Map 'quiz_questions' -> 'questions'
              const cleanQuiz = {
                ...rawQuiz,
                questions: rawQuiz.questions || rawQuiz.quiz_questions || []
              }

              // 3. Sort questions
              if (cleanQuiz.questions.length > 0) {
                cleanQuiz.questions.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
              }

              console.log("🟢 Final UI Quiz Data:", cleanQuiz)
              // Attach quiz data to lesson
              lessonData.quiz = cleanQuiz
            } else {
              lessonData.quiz = null
            }
          } else {
            // No quizzes property - this is normal for lessons without quizzes
            lessonData.quiz = null
          }
          
          // Update the lesson in the course structure
          const updatedModules = course.modules.map((module: any) => {
            if (module.lessons) {
              const updatedLessons = module.lessons.map((l: any) => {
                if (l.id === lessonId) {
                  return { ...l, ...lessonData }
                }
                return l
              })
              return { ...module, lessons: updatedLessons }
            }
            return module
          })
          
          setCourse({ ...course, modules: updatedModules })
        }
      } catch (err) {
        console.error('Error in fetchLessonData:', err)
      }
    }

    fetchLessonData()
  }, [currentLesson?.id, course]) // Only refetch if the lesson ID changes

  // Handle video exit (when video ends or user navigates away)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleVideoExit = () => {
    if (!currentLesson || !sessionStartTime) return
    setIsExiting(true)
    setShowExitReasonDialog(true)
  }
  
  // Save exit reason and mark as complete
  const handleSaveExitReason = async () => {
    if (!user || !courseId || !currentLesson) return
    
    try {
      // Log exit reason for AI analysis
      console.log('📝 Video Exit:', {
        reason: exitReason,
        pauseCount,
        lessonId: currentLesson.id,
        courseId,
        timestamp: new Date().toISOString()
      })
      
      // Mark lesson as complete
      await markAsCompleteInternal(currentLesson.id)
      
      setShowExitReasonDialog(false)
      setExitReason('')
      setIsExiting(false)
    } catch (error) {
      console.error('Error saving exit reason:', error)
      toast.error('Failed to save exit reason')
    }
  }
  
  // Internal function to mark lesson as complete (separated for reuse)
  const markAsCompleteInternal = async (lessonId: string) => {
    if (!user || !courseId) return
    try {
      // Optimistic Update
      const newSet = new Set(userProgress)
      newSet.add(lessonId)
      setUserProgress(newSet)

      // DB Update - check if already exists, then insert if not
      const { data: existing } = await supabase
        .from('user_progress')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle()

      let error = null
      if (!existing) {
        const { error: insertError } = await supabase
          .from('user_progress')
          .insert({ 
            user_id: user.id, 
            lesson_id: lessonId,
            completed_at: new Date().toISOString()
          })
        error = insertError
      }

      if (error) throw error
      
      // Award XP for completing a lesson
      const XP_PER_LESSON = 25 // Base XP for completing a lesson
      try {
        // Get current XP
        const { data: profileData } = await supabase
          .from('profiles')
          .select('xp')
          .eq('id', user.id)
          .single()
        
        const currentXP = profileData?.xp || 0
        const newXP = currentXP + XP_PER_LESSON
        
        // Update XP
        await supabase
          .from('profiles')
          .update({ xp: newXP })
          .eq('id', user.id)
        
        toast.success(`+${XP_PER_LESSON} XP earned! 🎉`)
      } catch (xpError) {
        console.error('Error awarding XP:', xpError)
      }
      
      // Save study session with pause data for AI analysis
      if (sessionStartTime && currentLesson?.type === 'video') {
        const sessionDuration = Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000)
        const sessionData = {
          user_id: user.id,
          course_id: courseId,
          method_used: 'video',
          duration_seconds: sessionDuration,
          completed: true,
          started_at: sessionStartTime.toISOString(),
          tab_switch_count: 0,
        }
        
        try {
          await supabase.from('study_sessions').insert(sessionData)
          console.log('📊 Session saved with pause/exit data:', { pauseCount, pauseReason, exitReason })
        } catch (sessionError) {
          console.error('Error saving session data:', sessionError)
        }
      }
      
      toast.success('Lesson marked as complete')
    } catch (err) {
      console.error(err)
      toast.error('Failed to save progress')
      throw err // Re-throw to allow caller to handle
    }
  }
  
  // 3. Mark Lesson as Complete (Write to DB) - Public wrapper
  const markAsComplete = async (lessonId: string) => {
    try {
      await markAsCompleteInternal(lessonId)
    } catch (err) {
      // Error already handled in markAsCompleteInternal
    }
  }

  // 3. Submit Review (Write to DB)
  const handleSubmitReview = async () => {
    if (!newComment.trim()) {
      toast.error('Please write a comment')
      return
    }
    if (!user || !courseId) return
    setSubmittingReview(true)
    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          course_id: courseId,
          rating: newRating,
          comment: newComment
        })
        .select()
        .single()

      if (error) throw error

      setReviews([data, ...reviews])
      setNewComment('')
      setNewRating(5)
      toast.success('Review posted successfully!')
    } catch (err: any) {
      console.error(err)
      if (err.code === '23505') {
        toast.error('You have already reviewed this course')
      } else {
        toast.error('Failed to post review')
      }
    } finally {
      setSubmittingReview(false)
    }
  }

  // Calculate Real Progress %
  const totalLessons = course?.modules.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0) || 0
  const progressPercent = totalLessons > 0 ? Math.round((userProgress.size / totalLessons) * 100) : 0

  // Check if a lesson is accessible (all previous lessons must be completed)
  const isLessonAccessible = (lessonId: string): boolean => {
    if (!course?.modules) return true
    
    for (const module of course.modules) {
      for (const lesson of module.lessons || []) {
        if (lesson.id === lessonId) {
          return true // All previous lessons were completed
        }
        // If previous lesson is not completed, subsequent lessons are locked
        if (!userProgress.has(lesson.id)) {
          return false
        }
      }
    }
    return true
  }

  // Handle lesson click with accessibility check
  const handleLessonClickWithCheck = (lesson: any) => {
    // Check if focus timer is locked
    if (isFocusLocked) {
      toast.error('Navigation locked! Complete the focus timer first.')
      return
    }
    if (!isLessonAccessible(lesson.id)) {
      toast.error('Please complete the previous lesson first')
      return
    }
    handleLessonSelect(lesson)
  }

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-400 bg-slate-950">Loading Course...</div>
  if (!course) return <div className="h-screen flex items-center justify-center text-slate-400 bg-slate-950">Course not found</div>

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* Sidebar: Modules & Lessons */}
      <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-900/50 shrink-0">
        <div className="p-4 border-b border-slate-800">
          <Button variant="ghost" className="mb-2 pl-0 hover:bg-transparent text-slate-400 hover:text-white" onClick={() => navigate('/dashboard/courses')}>
             ← Back
          </Button>
          <h2 className="font-bold text-lg line-clamp-2 leading-tight text-white">{course.title}</h2>
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>{progressPercent}% Completed</span>
              <span>{userProgress.size}/{totalLessons} Steps</span>
            </div>
            <Progress value={progressPercent} className="h-1.5 bg-slate-800" />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {/* Focus Lock Indicator */}
          {isFocusLocked && (
            <div className="mx-3 mt-3 p-2 bg-teal-500/10 border border-teal-500/30 rounded-lg flex items-center gap-2 text-xs text-teal-400">
              <Lock className="h-3 w-3" />
              <span>Navigation locked during focus</span>
            </div>
          )}
          <div className="p-3 space-y-6">
            {course.modules.map((module: any) => (
              <div key={module.id} className="space-y-1">
                <h3 className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{module.title}</h3>
                <div className="space-y-0.5">
                  {module.lessons.map((lesson: any) => {
                    const isActive = currentLesson?.id === lesson.id
                    const isCompleted = userProgress.has(lesson.id)
                    const isQuiz = lesson.type === 'quiz'
                    const isAccessible = isLessonAccessible(lesson.id)
                    const isDisabled = !isAccessible || (isFocusLocked && !isActive)
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => handleLessonClickWithCheck(lesson)}
                        disabled={isDisabled}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all text-left group",
                          isActive ? "bg-cyan-950/40 text-cyan-400" : 
                          isDisabled ? "opacity-50 cursor-not-allowed text-slate-500" : 
                          "hover:bg-slate-800/50 text-slate-300"
                        )}
                      >
                        {isCompleted ? (
                           <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                        ) : !isAccessible ? (
                          <Lock className="h-4 w-4 shrink-0 text-slate-600" />
                        ) : isQuiz ? (
                          <Trophy className={cn("h-4 w-4 shrink-0", isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-400")} />
                        ) : (
                          <PlayCircle className={cn("h-4 w-4 shrink-0", isActive ? "text-cyan-400" : "text-slate-500 group-hover:text-slate-400")} />
                        )}
                        <span className="line-clamp-1 flex-1">{lesson.title}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        <div className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/20 backdrop-blur-sm">
           <h1 className="text-lg font-medium text-white truncate">{currentLesson?.title || 'Select a lesson'}</h1>
           {currentLesson && !userProgress.has(currentLesson.id) && currentLesson?.type !== 'quiz' && (
              <Button size="sm" variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10" onClick={() => markAsComplete(currentLesson.id)}>
                 Mark as Complete
              </Button>
           )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-slate-600">
          {currentLesson ? (
            <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
              
              {/* Viewer (Video or Quiz Card) */}
              <div className="aspect-video bg-slate-900 rounded-xl border border-slate-800 overflow-hidden relative shadow-2xl ring-1 ring-white/5">
                {currentLesson?.type === 'video' && currentLesson.content_url ? (
                   <video 
                      ref={videoRef}
                      src={currentLesson.content_url} 
                      controls 
                      className="w-full h-full object-contain bg-black"
                      onEnded={() => markAsComplete(currentLesson.id)}
                      onPause={handleVideoPause}
                   />
                ) : currentLesson?.type === 'quiz' ? (
                   <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950">
                      <Trophy className="h-16 w-16 text-purple-500 mb-4 opacity-80" />
                      <h2 className="text-2xl font-bold text-white mb-2">{currentLesson.quiz?.title || 'Quiz'}</h2>
                      <p className="text-slate-400 mb-6">
                        Pass Score: {currentLesson.quiz?.passing_score ?? 80}%
                      </p>
                      {(() => {
                        const hasQuestions = currentLesson.quiz?.questions && currentLesson.quiz.questions.length > 0
                        const hasQuizId = currentLesson.quiz?.id
                        const isReady = hasQuizId && hasQuestions
                        
                        return (
                          <>
                            <Button 
                              onClick={() => {
                                if (isReady) {
                                  navigate(`/learn/quiz/${currentLesson.quiz.id}`)
                                } else {
                                  toast.error('Quiz data not available')
                                }
                              }} 
                              className="bg-primary hover:bg-primary/90 text-white px-8" 
                              disabled={!isReady}
                            >
                               Start Quiz
                            </Button>
                            {!isReady && (
                              <p className="text-xs text-red-400 mt-2">
                                {!hasQuizId ? 'Quiz data not loaded. Please refresh the page.' : 'Quiz questions not available.'}
                              </p>
                            )}
                          </>
                        )
                      })()}
                      {/* Quiz History Component - Only shown before starting */}
                      {user && currentLesson.quiz?.id && (
                        <QuizHistory userId={user.id} quizId={currentLesson.quiz.id} />
                      )}
                   </div>
                ) : (
                   <div className="flex items-center justify-center h-full text-slate-500">No content available</div>
                )}
              </div>

              {/* Tabs */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="bg-slate-900/50 border border-slate-800 h-10 p-1 w-full justify-start">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">Overview</TabsTrigger>
                  <TabsTrigger value="resources" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">Materials</TabsTrigger>
                  <TabsTrigger value="reviews" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400">Reviews ({reviews.length})</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="mt-6">
                   <p className="text-slate-400 leading-relaxed">{currentLesson?.description || "No description provided."}</p>
                </TabsContent>

                <TabsContent value="resources" className="mt-6">
                   {currentLesson?.resource_url ? (
                      <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-lg max-w-2xl">
                         <div className="flex items-center gap-3">
                            <FileText className="h-8 w-8 text-cyan-400" />
                            <div>
                               <p className="font-medium text-slate-200">Lesson Files</p>
                               <p className="text-xs text-slate-500">Download attached materials</p>
                            </div>
                         </div>
                         <Button variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white" onClick={() => window.open(currentLesson.resource_url, '_blank')}>
                            <Download className="mr-2 h-4 w-4" /> Download
                         </Button>
                      </div>
                   ) : (
                      <div className="text-slate-500 italic">No materials attached.</div>
                   )}
                </TabsContent>

                {/* 🔥 REAL REVIEWS SYSTEM */}
                <TabsContent value="reviews" className="mt-6">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      
                      {/* Left: Review List */}
                      <div className="md:col-span-2 space-y-4">
                         {reviews.length === 0 ? (
                            <div className="text-slate-500 italic py-8">No reviews yet. Be the first to review!</div>
                         ) : (
                            reviews.map((review: any) => {
                              const profile = review.profiles || {}
                              const userName = profile.full_name || `User ${review.user_id.slice(0, 4)}`
                              const userInitials = profile.full_name 
                                ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                                : 'U'
                              
                              return (
                                <div key={review.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-800/50">
                                   <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                         <SafeAvatar 
                                            src={profile.avatar_url} 
                                            alt={userName}
                                            fallback={userInitials}
                                            className="h-8 w-8"
                                         />
                                         <div>
                                            <p className="text-sm font-semibold text-slate-300">{userName}</p>
                                            <div className="flex text-yellow-500">
                                               {[...Array(5)].map((_, i) => (
                                                  <Star key={i} className={cn("h-3 w-3", i < review.rating ? "fill-current" : "text-slate-700")} />
                                               ))}
                                            </div>
                                         </div>
                                      </div>
                                      <span className="text-xs text-slate-500">{new Date(review.created_at).toLocaleDateString()}</span>
                                   </div>
                                   <p className="text-slate-400 text-sm mt-2">{review.comment}</p>
                                </div>
                              )
                            })
                         )}
                      </div>

                      {/* Right: Write Review */}
                      <div className="md:col-span-1">
                         <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sticky top-6">
                            <h3 className="font-semibold text-white mb-4">Write a Review</h3>
                            
                            <div className="flex gap-1 mb-4">
                               {[1, 2, 3, 4, 5].map((star) => (
                                  <button key={star} onClick={() => setNewRating(star)} className="focus:outline-none transition-transform hover:scale-110">
                                     <Star className={cn("h-6 w-6", star <= newRating ? "text-yellow-500 fill-current" : "text-slate-600")} />
                                  </button>
                               ))}
                            </div>

                            <Textarea 
                               placeholder="Share your thoughts..." 
                               value={newComment}
                               onChange={(e) => setNewComment(e.target.value)}
                               className="bg-slate-950 border-slate-800 min-h-[100px] mb-4 text-white placeholder:text-slate-600"
                            />

                            <Button onClick={handleSubmitReview} disabled={submittingReview || !newComment.trim()} className="w-full bg-primary hover:bg-primary/90">
                               {submittingReview ? <span className="animate-pulse">Posting...</span> : <><Send className="mr-2 h-4 w-4" /> Post Review</>}
                            </Button>
                         </div>
                      </div>
                   </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              Select a lesson from the sidebar to get started
            </div>
          )}
        </div>
      </div>
      
      {/* Pause Reason Dialog */}
      <Dialog open={showPauseReasonDialog} onOpenChange={setShowPauseReasonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Video Paused</DialogTitle>
            <DialogDescription>
              Please let us know why you paused the video. This helps AI better analyze your learning patterns.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Quick selection options */}
            <div className="grid grid-cols-2 gap-2">
              {[
                'Need to take notes',
                'Difficulty understanding',
                'External interruption',
                'Need a break',
                'Review previous content',
                'Technical issue'
              ].map((option) => (
                <Button
                  key={option}
                  variant={pauseReason === option ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPauseReason(option)}
                  className="text-xs"
                >
                  {option}
                </Button>
              ))}
            </div>
            
            {/* Custom reason input */}
            <Textarea
              placeholder="Or describe your own reason..."
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Pause count: {pauseCount} {pauseCount === 1 ? 'time' : 'times'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPauseReasonDialog(false)
              setPauseReason('')
            }}>
              Skip
            </Button>
            <Button onClick={handleSavePauseReason} disabled={!pauseReason.trim()}>
              Save Reason
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exit Reason Dialog */}
      <Dialog open={showExitReasonDialog} onOpenChange={(open) => {
        if (!open && isExiting) {
          // If trying to close while exiting, still mark as complete
          handleSaveExitReason()
        }
        setShowExitReasonDialog(open)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Video Session Ended</DialogTitle>
            <DialogDescription>
              Please let us know why you're leaving. This helps AI better understand your learning patterns.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Quick selection options */}
            <div className="grid grid-cols-2 gap-2">
              {[
                'Completed the lesson',
                'Need to review content',
                'Time constraint',
                'Difficulty understanding',
                'External interruption',
                'Technical issue'
              ].map((option) => (
                <Button
                  key={option}
                  variant={exitReason === option ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExitReason(option)}
                  className="text-xs"
                >
                  {option}
                </Button>
              ))}
            </div>
            
            {/* Custom reason input */}
            <Textarea
              placeholder="Or describe your own reason..."
              value={exitReason}
              onChange={(e) => setExitReason(e.target.value)}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Total pauses: {pauseCount} {pauseCount === 1 ? 'time' : 'times'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={async () => {
              setExitReason('')
              await markAsCompleteInternal(currentLesson?.id || '')
              setShowExitReasonDialog(false)
              setIsExiting(false)
            }}>
              Skip & Complete
            </Button>
            <Button onClick={handleSaveExitReason} disabled={!exitReason.trim()}>
              Save & Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 🔥 悬浮在右下角的专注助手 (只有视频课程才自动开启) */}
      {user && courseId && (
        <FocusTimer 
          userId={user.id} 
          courseId={courseId}
          lessonId={currentLesson?.id}
          lessonType={currentLesson?.type}
          recommendedMethod={aiRecommendedMethod || undefined}
          autoStart={!!aiRecommendedMethod && currentLesson?.type === 'video'}
          onLockStateChange={setIsFocusLocked}
        />
      )}
    </div>
  )
}
