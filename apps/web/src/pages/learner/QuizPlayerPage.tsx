import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, XCircle, ArrowLeft, Trophy, AlertCircle } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { triggerRecalculationAfterQuiz } from '@/lib/ai/studyPlanner'

export default function QuizPlayerPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [quiz, setQuiz] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [result, setResult] = useState<{ score: number, passed: boolean, details?: any[], totalScore?: number, totalPoints?: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(60 * 60) // Countdown in seconds (default 60 mins)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isExamStarted, setIsExamStarted] = useState(false)

  useEffect(() => {
    const fetchQuiz = async () => {
      if (!quizId) return
      try {
        setLoading(true)
        // 🔥 这里的查询简单直接，不会报 400
        const { data, error } = await supabase
          .from('quizzes')
          .select(`*, quiz_questions(*)`)
          .eq('id', quizId)
          .single()
        
        if (error) {
          console.error('Error fetching quiz:', error)
          toast.error('Failed to load quiz')
          return
        }
        
        // 排序题目
        if (data.quiz_questions) {
          data.quiz_questions.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
        }
        setQuiz(data)
        // Initialize countdown timer when quiz loads
        const limitMinutes = (data.time_limit && data.time_limit > 0) ? data.time_limit : 60
        setTimeLeft(limitMinutes * 60)
      } catch (err) {
        console.error('Error:', err)
        toast.error('Failed to load quiz')
      } finally {
        setLoading(false)
      }
    }
    fetchQuiz()
  }, [quizId, user])

  // Countdown timer effect
  useEffect(() => {
    if (!quiz || result || submitting || !isExamStarted) return // Stop timer when quiz is submitted, submitting, or not started
    
    if (timeLeft <= 0) {
      // Auto-submit when time runs out
      if (!submitting && quiz) {
        handleSubmit()
      }
      return
    }
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          if (!submitting && quiz) {
            handleSubmit() // Auto-submit when time runs out
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [quiz, result, timeLeft, submitting, isExamStarted])

  // Handle starting the exam (enter fullscreen and start timer)
  const handleStartExam = async () => {
    try {
      await document.documentElement.requestFullscreen()
      setIsFullscreen(true)
      setIsExamStarted(true)
    } catch (error) {
      // If fullscreen fails, still allow starting the exam
      console.warn('Could not enter fullscreen mode:', error)
      setIsFullscreen(true) // Treat as fullscreen for the exam
      setIsExamStarted(true)
      toast.info('Fullscreen mode unavailable, but exam started')
    }
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Helper function to format time (HH:MM:SS or MM:SS)
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleSubmit = async () => {
    if (!quiz) return
    setSubmitting(true)
    let totalScore = 0
    let totalPoints = 0
    const results: any[] = []
    
    // Create an array of promises to handle async grading
    const gradingTasks = quiz.quiz_questions.map(async (q: any) => {
      totalPoints += q.points || 10
      
      // === A. Manual Grading (MCQ / TrueFalse) ===
      if (q.question_type !== 'text') {
        // Ensure strictly equal types (convert toString if needed)
        const isCorrect = String(answers[q.id]) === String(q.correct_index)
        const points = isCorrect ? (q.points || 10) : 0
        totalScore += points
        results.push({ 
          question_id: q.id, 
          score: points, 
          feedback: isCorrect ? 'Correct!' : 'Incorrect.' 
        })
      } 
      
      // === B. AI Grading (Essay) ===
      else {
        try {
          // Call Supabase Edge Function
          const { data, error } = await supabase.functions.invoke('grade-quiz', {
            body: {
              questionText: q.question_text,
              userAnswer: answers[q.id] || '',
              correctAnswer: q.options?.[0] || 'Grade based on relevance', // Using first option as "Model Answer" storage
              maxPoints: q.points || 10
            }
          })

          if (error || !data) throw error
          
          totalScore += data.score
          results.push({ 
             question_id: q.id, 
             score: data.score, 
             feedback: data.feedback 
          })
        } catch (err) {
          console.error("AI Grading Error:", err)
          results.push({ question_id: q.id, score: 0, feedback: 'AI Grading Unavailable' })
        }
      }
    })

    // Wait for all AI grading to finish
    await Promise.all(gradingTasks)

    // Finalize
    const percentage = Math.round((totalScore / totalPoints) * 100)
    const passed = percentage >= (quiz.passing_score || 80)

    // 🔥 STEP 2: SAVE SUBMISSION (Save EVERYTHING, even if failed)
    if (user?.id && quiz.id) {
      try {
        const { error: dbError } = await supabase
          .from('quiz_submissions')
          .insert({
            quiz_id: quiz.id,
            user_id: user.id,
            score: percentage,
            passed: passed,
            answers: answers, // Store all user answers
            feedback: JSON.stringify(results) // Store detailed feedback
          })

        if (dbError) {
          console.error("Failed to save submission:", dbError)
          toast.error("Result generated but failed to save to history.")
        }
      } catch (err) {
        console.error("Error saving submission:", err)
      }
    }

    // ✅ STEP 3: UPDATE PROGRESS + AWARD XP (Only if Passed >= 60%)
    // CRITICAL: Only mark as complete if score >= 60%
    if (passed && percentage >= 60 && user?.id && quiz.lesson_id) {
      try {
        // Check if progress already exists
        const { data: existingProgress } = await supabase
          .from('user_progress')
          .select('user_id')
          .eq('user_id', user.id)
          .eq('lesson_id', quiz.lesson_id)
          .maybeSingle()

        if (!existingProgress) {
          const { error: progressError } = await supabase
            .from('user_progress')
            .insert({
              user_id: user.id,
              lesson_id: quiz.lesson_id,
              completed_at: new Date().toISOString()
            })
            
          if (progressError) {
            console.error("Failed to update progress:", progressError)
          }
        }
        
        // Award XP for passing quiz
        const XP_FOR_QUIZ = 50 // More XP for quiz than regular lesson
        const BONUS_XP = Math.floor(percentage / 10) * 5 // Bonus XP based on score (e.g., 100% = +50 XP)
        const totalXP = XP_FOR_QUIZ + BONUS_XP
        
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('xp')
            .eq('id', user.id)
            .single()
          
          const currentXP = profileData?.xp || 0
          const newXP = currentXP + totalXP
          
          await supabase
            .from('profiles')
            .update({ xp: newXP })
            .eq('id', user.id)
          
          toast.success(`+${totalXP} XP earned! 🎉`)
        } catch (xpError) {
          console.error('Error awarding XP:', xpError)
        }
        
        // Note: Certificate minting is handled by CoursePlayer when course reaches 100%
      } catch (err) {
        console.error("Error updating progress:", err)
      }
    } else if (!passed || percentage < 60) {
      // 🔥 IF FAILED (< 60%): Trigger AI re-scheduling
      if (user?.id && quiz.lesson_id) {
        try {
          const { data: lessonData } = await supabase
            .from('lessons')
            .select('module_id, modules!inner(course_id)')
            .eq('id', quiz.lesson_id)
            .single()
          
          const modules = lessonData?.modules as any;
          const courseId = Array.isArray(modules) ? modules[0]?.course_id : modules?.course_id;
          if (courseId) {
            triggerRecalculationAfterQuiz(user.id, courseId).catch(err => {
              console.error('Failed to trigger schedule recalculation:', err)
            })
          }
        } catch (err) {
          console.error('Error fetching course_id for recalculation:', err)
        }
      }
    }

    // Update Local State to Show Results UI
    setResult({ score: percentage, passed, details: results, totalScore, totalPoints })
    setSubmitting(false)
    
    if (passed) {
      toast.success(`Quiz passed! Score: ${totalScore}/${totalPoints} (${percentage}%)`)
    } else {
      toast.error(`Quiz failed. Score: ${totalScore}/${totalPoints} (${percentage}%) - Required: ${quiz.passing_score || 80}%`)
    }
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-cyan-400" />
          <p className="text-slate-400">Loading Quiz...</p>
        </div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-4">
          <XCircle className="h-12 w-12 mx-auto text-red-400" />
          <p className="text-slate-400">Quiz not found</p>
          <Button onClick={() => navigate(-1)} variant="outline">Back</Button>
        </div>
      </div>
    )
  }

  if (result) {
     return (
        <div className="min-h-screen bg-slate-950 text-white py-12 px-4">
          <div className="mx-auto max-w-2xl space-y-6 text-center">
            <div className={`rounded-full p-4 inline-flex items-center justify-center ${result.passed ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
              {result.passed ? <Trophy className="h-12 w-12" /> : <AlertCircle className="h-12 w-12" />}
            </div>
            
            <h2 className="text-3xl font-bold text-white">
              {result.passed ? 'Quiz Passed!' : 'Keep Practicing'}
            </h2>
            <p className="text-xl text-slate-300">
              You scored <span className="font-bold text-white">{result.totalScore}/{result.totalPoints}</span>
              <span className="text-base text-slate-400 ml-2">({result.score}%)</span>
            </p>
            {!result.passed && (
              <p className="text-sm text-slate-500">
                Passing score: {quiz.passing_score || 80}%
              </p>
            )}

            <Button 
              onClick={() => navigate(-1)} 
              className="w-full bg-primary hover:bg-primary/90 text-white"
            >
              Back to Course
            </Button>

            {/* Detailed Feedback Section */}
            {result.details && result.details.length > 0 && (
              <div className="mt-8 space-y-4 text-left">
                <h3 className="text-lg font-semibold text-white">Detailed Feedback</h3>
                
                {result.details.map((item: any, idx: number) => {
                  // Find the original question to get the text
                  const question = quiz.quiz_questions.find((q: any) => q.id === item.question_id)
                  
                  return (
                    <div key={idx} className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                      <p className="mb-2 font-medium text-white">
                        Q{idx + 1}: {question?.question_text}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className={item.score > 0 ? 'text-green-400' : 'text-red-400'}>
                          Score: {item.score} / {question?.points || 10}
                        </span>
                      </div>

                      {/* Special UI for AI Feedback (Essay Questions) */}
                      {question?.question_type === 'text' && item.feedback && (
                        <div className="mt-3 rounded border-l-4 border-cyan-500 bg-slate-900/50 p-3">
                          <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
                            AI Feedback
                          </p>
                          <p className="text-sm text-slate-300 italic">
                            "{item.feedback}"
                          </p>
                        </div>
                      )}
                      
                      {/* Standard Feedback for MCQ/TrueFalse */}
                      {question?.question_type !== 'text' && (
                        <p className="mt-2 text-sm text-slate-400">
                          Result: {item.feedback}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
     )
  }

  // Calculate answered questions count
  const answeredCount = quiz?.quiz_questions?.filter((q: any) => answers[q.id] !== undefined && answers[q.id] !== '').length || 0
  const totalQuestions = quiz?.quiz_questions?.length || 0

  // Show start exam screen if not started
  if (!isExamStarted) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold">{quiz.title}</h1>
            <p className="text-slate-400 text-lg">Exam Mode</p>
          </div>
          
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 space-y-4">
            <h2 className="text-xl font-semibold">Instructions</h2>
            <ul className="text-left space-y-2 text-slate-300 list-disc list-inside">
              <li>This exam will be taken in fullscreen mode</li>
              <li>Exiting fullscreen will block the quiz content</li>
              <li>Time limit: {quiz.time_limit || 60} minutes</li>
              <li>Passing score: {quiz.passing_score || 80}%</li>
            </ul>
          </div>

          <Button
            onClick={handleStartExam}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg"
          >
            Start Exam
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Course
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 relative">
      {/* Blocking overlay if fullscreen is exited */}
      {!isFullscreen && (
        <div className="fixed inset-0 bg-red-950/95 z-50 flex items-center justify-center">
          <div className="text-center space-y-6 p-8 max-w-md">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto" />
            <h2 className="text-2xl font-bold text-white">Fullscreen Required</h2>
            <p className="text-slate-300">
              Please return to fullscreen mode to continue the exam.
            </p>
            <Button
              onClick={async () => {
                try {
                  await document.documentElement.requestFullscreen()
                } catch (error) {
                  toast.error('Could not enter fullscreen mode')
                }
              }}
              className="bg-primary hover:bg-primary/90"
            >
              Return to Fullscreen
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {isFullscreen && (
          <>
            <div className="flex items-center justify-between mb-6">
              <Button 
                variant="ghost" 
                onClick={() => navigate(-1)} 
                className="pl-0 hover:bg-transparent text-slate-400 hover:text-white"
                disabled={!isFullscreen}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Course
              </Button>
              
              {/* Timer Display */}
              <div className="text-lg font-mono font-bold text-cyan-400">
                Time: {formatTime(timeLeft)}
              </div>
            </div>
            
            {/* Header */}
            <div className="mb-8 border-b border-slate-800 pb-6">
              <h1 className="text-3xl font-bold mb-2 text-white">{quiz.title}</h1>
              <p className="text-slate-400">Answer all questions to continue.</p>
            </div>
          </>
        )}

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Questions List */}
          <div className="lg:col-span-9 space-y-8">
            {quiz.quiz_questions?.map((q: any, idx: number) => (
              <div 
                id={`question-${idx}`} 
                key={q.id} 
                className="bg-slate-800/50 p-6 rounded-xl border border-slate-700"
              >
                <div className="flex items-start gap-4 mb-4">
                  <span className="bg-slate-700 text-slate-300 font-mono px-2 py-1 rounded text-sm shrink-0">Q{idx + 1}</span>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium leading-relaxed text-white mb-1">{q.question_text}</h3>
                    <p className="text-xs text-slate-500">{q.points || 10} points</p>
                  </div>
                </div>

                {/* 选项渲染 */}
                {q.question_type === 'multiple_choice' && (
                  <RadioGroup 
                    value={answers[q.id]?.toString()} 
                    onValueChange={(val) => setAnswers({...answers, [q.id]: parseInt(val)})}
                  >
                    {(q.options || []).map((opt: string, i: number) => (
                      <div key={i} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer">
                        <RadioGroupItem value={i.toString()} id={`${q.id}-${i}`} className="border-slate-600 text-cyan-500" />
                        <Label htmlFor={`${q.id}-${i}`} className="flex-1 cursor-pointer text-slate-300">{opt}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
                {q.question_type === 'true_false' && (
                  <div className="flex gap-4">
                    {[0, 1].map((i) => (
                      <Button 
                        key={i}
                        variant={answers[q.id] === i ? 'default' : 'outline'}
                        onClick={() => setAnswers({...answers, [q.id]: i})}
                        className={answers[q.id] === i ? 'bg-primary hover:bg-primary/90' : 'border-slate-700 text-slate-300 hover:bg-slate-800'}
                      >
                        {i === 0 ? 'True' : 'False'}
                      </Button>
                    ))}
                  </div>
                )}
                {(q.question_type === 'essay' || q.question_type === 'text') && (
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                    placeholder="Type your answer here..."
                    className="w-full min-h-[120px] bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-300 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                )}
              </div>
            ))}

            {/* Submit Button at Bottom (for mobile) */}
            <Button 
              onClick={handleSubmit} 
              disabled={submitting}
              size="lg" 
              className="w-full lg:hidden bg-primary hover:bg-primary/90 font-bold h-14 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Grading...
                </>
              ) : (
                'Submit Quiz'
              )}
            </Button>
          </div>

          {/* RIGHT COLUMN: Sticky Sidebar */}
          <div className="lg:col-span-3">
            <div className="lg:sticky lg:top-24 space-y-6">
              
              {/* Timer Card */}
              <div className={`p-4 rounded-lg border text-center ${
                timeLeft < 300 ? 'bg-red-900/20 border-red-800' : 'bg-slate-800 border-slate-700'
              }`}>
                <span className={`text-sm ${timeLeft < 300 ? 'text-red-400' : 'text-slate-400'}`}>
                  Time Remaining
                </span>
                <div className={`text-3xl font-mono font-bold mt-1 ${
                  timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-cyan-400'
                }`}>
                  {formatTime(timeLeft)}
                </div>
              </div>

              {/* Question Map / Navigator */}
              <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
                <h3 className="text-sm font-medium mb-3 text-slate-300">Question Map</h3>
                <div className="grid grid-cols-5 gap-2">
                  {quiz.quiz_questions?.map((q: any, idx: number) => {
                    const isAnswered = answers[q.id] !== undefined && answers[q.id] !== ''
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          document.getElementById(`question-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }}
                        className={`h-8 w-8 rounded text-xs font-bold transition-colors ${
                          isAnswered 
                            ? 'bg-cyan-600 text-white hover:bg-cyan-500' 
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        }`}
                        title={`Question ${idx + 1}`}
                      >
                        {idx + 1}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="p-4 rounded-lg bg-slate-800 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-300">Progress</span>
                  <span className="text-sm text-slate-400">{answeredCount} / {totalQuestions}</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                onClick={handleSubmit} 
                disabled={submitting}
                size="lg" 
                className="w-full bg-primary hover:bg-primary/90 font-bold h-14 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Grading...
                  </>
                ) : (
                  'Submit Quiz'
                )}
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

