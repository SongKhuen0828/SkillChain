import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { checkCourseCompletion } from '@/lib/certificate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { CourseThumbnail } from '@/components/CourseThumbnail'
import { CertificateModal } from '@/components/CertificateModal'
import {
  LayoutGrid,
  List as ListIcon,
  Search,
  BookOpen,
  Signal,
  Layers,
  CheckCircle2,
  Loader2,
  CalendarDays,
  Star,
  StarHalf,
  Trophy,
  Award,
} from 'lucide-react'
import { toast } from 'sonner'
import { NotificationService } from '@/lib/notifications'

// Date formatting helper
const formatStartDate = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return `Starts ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export function LearnerCourses() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [courses, setCourses] = useState<any[]>([])
  // NEW: State to store all reviews
  const [allReviews, setAllReviews] = useState<any[]>([])
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set())
  const [courseProgress, setCourseProgress] = useState<Record<string, number>>({}) // courseId -> progress percentage
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'browse' | 'my-learning' | 'completed'>('browse')
  const [certificateModal, setCertificateModal] = useState<{ isOpen: boolean; courseTitle: string; courseId?: string; completionDate?: string }>({ isOpen: false, courseTitle: '' })
  const [enrollmentStatuses, setEnrollmentStatuses] = useState<Record<string, string>>({})

  // 1. Fetch Data
  const fetchData = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      // A. Fetch Published Courses (with modules and lessons for progress calculation)
      // RLS policies will automatically filter courses based on visibility and org membership
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*, modules(id, lessons(id))')
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (coursesError) throw coursesError

      // B. NEW: Fetch All Reviews
      const { data: reviewsData, error: reviewsError } = await supabase.from('reviews').select('course_id, rating')

      if (reviewsError) {
        console.warn('Error fetching reviews:', reviewsError)
        // Don't block page load if reviews fail
      } else {
        setAllReviews(reviewsData || [])
      }

      // C. Fetch User Enrollments with Status
      const { data: enrollData, error: enrollError } = await supabase
        .from('enrollments')
        .select('course_id, status')
        .eq('user_id', user.id)

      if (enrollError) throw enrollError
      const ids = new Set(enrollData?.map((e: any) => e.course_id) || [])
      const statusMap: Record<string, string> = {}
      enrollData?.forEach((e: any) => {
        statusMap[e.course_id] = e.status || 'active'
      })
      setEnrollmentStatuses(statusMap)
      setEnrolledIds(ids)

      // Default to 'browse' if no enrollments
      if (ids.size === 0) {
        setActiveTab('browse')
      }

      // D. Fetch User Progress (completed lessons)
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('lesson_id')
        .eq('user_id', user.id)

      // E. Calculate progress for enrolled courses
      const progressMap: Record<string, number> = {}
      
      if (ids.size > 0 && coursesData) {
        const completedLessonIds = new Set(progressData?.map((p: any) => p.lesson_id) || [])
        
        coursesData.forEach((course: any) => {
          if (!ids.has(course.id)) return // Skip non-enrolled courses
          
          // Count total lessons in this course
          let totalLessons = 0
          const allLessonIds: string[] = []
          
          course.modules?.forEach((module: any) => {
            if (module.lessons && Array.isArray(module.lessons)) {
              totalLessons += module.lessons.length
              module.lessons.forEach((lesson: any) => {
                if (lesson.id) allLessonIds.push(lesson.id)
              })
            }
          })
          
          if (totalLessons === 0) {
            progressMap[course.id] = 0
            return
          }
          
          // Count completed lessons
          const completedCount = allLessonIds.filter((lid) => completedLessonIds.has(lid)).length
          progressMap[course.id] = Math.round((completedCount / totalLessons) * 100)
        })
      }
      
      setCourseProgress(progressMap)
      setCourses(coursesData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load courses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user])

  // Helper to calculate ratings
  const getCourseRating = (courseId: string) => {
    const courseReviews = allReviews.filter((r) => r.course_id === courseId)
    const count = courseReviews.length
    if (count === 0) return { average: 0, count: 0 }

    const sum = courseReviews.reduce((acc, curr) => acc + curr.rating, 0)
    const average = sum / count
    return { average, count }
  }

  // Helper component for stars
  const RatingStars = ({ average }: { average: number }) => {
    const fullStars = Math.floor(average)
    const hasHalfStar = average % 1 >= 0.5
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

    return (
      <div className="flex items-center">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
        ))}
        {hasHalfStar && <StarHalf className="h-4 w-4 fill-yellow-500 text-yellow-500" />}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} className="h-4 w-4 text-slate-600" />
        ))}
      </div>
    )
  }

  const handleEnroll = async (courseId: string) => {
    if (!user) return
    try {
      const { error } = await supabase.from('enrollments').insert({
        user_id: user.id,
        course_id: courseId,
      })

      if (error) {
        if (error.code === '23505') toast.info('You are already enrolled!')
        else throw error
      } else {
        toast.success('Enrolled successfully! 🚀')
        setEnrolledIds((prev) => new Set(prev).add(courseId))

        // Find the course to get details for notifications
        const course = courses.find(c => c.id === courseId)
        if (course) {
          // Send notification to learner
          await NotificationService.courseEnrolled(user.id, course.title, courseId)
          
          // Send notification to educator (if educator_id exists)
          if (course.educator_id) {
            await NotificationService.newStudent(
              course.educator_id,
              profile?.full_name || 'A learner',
              course.title,
              courseId
            )
          }
        }
      }
    } catch (error) {
      toast.error('Enrollment failed. Please try again.')
    }
  }

  // Handle Continue Learning
  const handleContinue = (courseId: string) => {
    navigate(`/course/${courseId}/learn`)
  }

  const filteredCourses = courses.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
  const myCourses = filteredCourses.filter((c) => enrolledIds.has(c.id))
  const completedCourses = filteredCourses.filter((c) => enrolledIds.has(c.id) && courseProgress[c.id] === 100)
  const browseCourses = filteredCourses // Show all in browse

  const CourseItem = ({ course, isEnrolled, progress }: { course: any; isEnrolled: boolean; progress?: number }) => {
    const { average: ratingAvg, count: ratingCount } = getCourseRating(course.id)
    const moduleCount = course.modules && Array.isArray(course.modules) ? course.modules.length : 0
    const isLive = course.type === 'live'
    const startDate = course.start_date
    const isStartDateFuture = startDate ? new Date(startDate) > new Date() : false
    const isCompleted = progress === 100

    // Determine button text for live courses
    const getLiveButtonText = () => {
      if (isEnrolled) return 'Join Session'
      if (isStartDateFuture) return 'Register for Live Session'
      return 'View Details'
    }

    // GRID VIEW
    if (viewMode === 'grid') {
      return (
        // Updated: Added shadow-lg and hover effects for better proportions
        <Card className="h-full flex flex-col overflow-hidden bg-slate-900 border-slate-800 shadow-lg hover:shadow-xl hover:border-slate-700 transition-all group">
          {/* Thumbnail - kept 16:9 aspect ratio */}
          <div className="aspect-video w-full bg-slate-800 relative overflow-hidden">
            <CourseThumbnail
              src={course.thumbnail_url}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />

            {/* Badges on top right */}
            <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
              {isCompleted ? (
                <div className="bg-amber-500/90 text-amber-900 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm shadow-sm uppercase tracking-wider border border-amber-400/50">
                  <Trophy className="h-3 w-3" /> COMPLETED
                </div>
              ) : isEnrolled ? (
                <div className="bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm shadow-sm uppercase tracking-wider">
                  <CheckCircle2 className="h-3 w-3" /> Enrolled
                </div>
              ) : null}
              {isLive && (
                <span className="bg-primary/90 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm shadow-sm">
                  Live Cohort
                </span>
              )}
            </div>
          </div>

          {/* Content - Increased padding (p-6) and spacing (space-y-4) */}
          <CardContent className="flex-1 p-6 space-y-4 flex flex-col">
            <div className="flex justify-between items-start gap-3">
              {/* Title - Larger font (text-xl) */}
              <h3 className="font-bold text-xl text-white line-clamp-2 leading-tight" title={course.title}>
                {course.title}
              </h3>
              {!isLive && (
                <span className={`font-bold text-lg shrink-0 ${course.price > 0 ? 'text-cyan-400' : 'text-emerald-400'}`}>
                  {course.price > 0 ? `$${course.price.toFixed(2)}` : 'Free'}
                </span>
              )}
            </div>

            {/* NEW: Rating Section */}
            {ratingCount > 0 && (
              <div className="flex items-center gap-2 -mt-1">
                <RatingStars average={ratingAvg} />
                <span className="text-sm font-medium text-slate-300">{ratingAvg.toFixed(1)}</span>
                <span className="text-xs text-slate-500">({ratingCount})</span>
              </div>
            )}

            <p className="text-sm text-slate-400 line-clamp-3 flex-1">
              {course.description || 'No description provided for this course.'}
            </p>

            {/* Footer Info */}
            <div className="flex items-center gap-4 text-xs text-slate-500 font-medium pt-4 border-t border-slate-800/50 mt-auto">
              {isLive && startDate ? (
                <div className="flex items-center gap-1.5 text-primary bg-primary/10 px-2 py-1 rounded">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>{formatStartDate(startDate)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  <span>{moduleCount} Module{moduleCount !== 1 ? 's' : ''}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Signal className="h-3.5 w-3.5" />
                <span>{course.level || 'All Levels'}</span>
              </div>
            </div>

            {/* Progress Bar - Only show if enrolled (Grid View) */}
            {isEnrolled && typeof progress === 'number' && (
              <div className="mt-3 mb-2 w-full">
                <div className="flex justify-between text-[10px] uppercase tracking-wider mb-1">
                  <span className="text-slate-500">Progress</span>
                  <span className="text-teal-400 font-bold">{Math.round(progress)}%</span>
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="pt-4">
              {isCompleted ? (
                <Button
                  className="w-full font-semibold tracking-wide border-amber-500 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400"
                  variant="outline"
                  onClick={async () => {
                    // Check if enrollment status is 'completed' before allowing certificate
                    if (enrollmentStatuses[course.id] === 'completed') {
                      setCertificateModal({ 
                        isOpen: true, 
                        courseTitle: course.title, 
                        courseId: course.id,
                        completionDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                      })
                    } else {
                      // Double-check course completion
                      if (user?.id) {
                        const { isCompleted } = await checkCourseCompletion(user.id, course.id)
                        if (isCompleted) {
                          setCertificateModal({ 
                            isOpen: true, 
                            courseTitle: course.title, 
                            courseId: course.id,
                            completionDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                          })
                        } else {
                          toast.error('Please complete all lessons before generating a certificate')
                        }
                      }
                    }
                  }}
                >
                  <Award className="w-4 h-4 mr-2" />
                  View Certificate
                </Button>
              ) : (
                <Button
                  className={`w-full font-semibold tracking-wide ${
                    isEnrolled
                      ? ''
                      : isLive
                        ? 'bg-primary hover:bg-primary/90'
                        : 'bg-primary hover:bg-primary/90'
                  }`}
                  variant={isEnrolled ? 'outline' : 'default'}
                  onClick={() => (isEnrolled ? handleContinue(course.id) : handleEnroll(course.id))}
                >
                  {isLive ? getLiveButtonText() : isEnrolled ? 'Continue Learning' : 'Enroll Now'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )
    }

    // LIST VIEW (Also updated with ratings and better spacing)
    return (
      <div className="flex flex-col md:flex-row gap-5 p-5 border border-slate-800 bg-slate-900/80 rounded-xl hover:bg-slate-900 shadow-md transition-all group">
        <div className="w-full md:w-72 h-48 shrink-0 bg-slate-800 rounded-lg overflow-hidden relative">
          <CourseThumbnail
            src={course.thumbnail_url}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {isLive && (
            <span className="absolute top-3 left-3 bg-primary/90 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm shadow-sm">
              Live Cohort
            </span>
          )}
        </div>
        <div className="flex-1 flex flex-col justify-between py-1">
          <div className="space-y-2">
            <div className="flex justify-between items-start gap-4">
              <h3 className="text-2xl font-bold text-white">{course.title}</h3>
              {!isLive && (
                <span className={`font-bold text-lg shrink-0 ${course.price > 0 ? 'text-cyan-400' : 'text-emerald-400'}`}>
                  {course.price > 0 ? `$${course.price.toFixed(2)}` : 'Free'}
                </span>
              )}
            </div>

            {/* NEW: Rating Section in List View */}
            {ratingCount > 0 && (
              <div className="flex items-center gap-2">
                <RatingStars average={ratingAvg} />
                <span className="text-sm font-medium text-slate-300">{ratingAvg.toFixed(1)}</span>
                <span className="text-xs text-slate-500">({ratingCount} reviews)</span>
              </div>
            )}

            <p className="text-slate-400 line-clamp-2 text-sm max-w-3xl leading-relaxed">{course.description}</p>
          </div>

          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-5 text-xs text-slate-500 uppercase tracking-wider font-medium">
              {isLive && startDate ? (
                <span className="flex items-center gap-1.5 text-primary bg-primary/10 px-2 py-1 rounded">
                  <CalendarDays className="h-3.5 w-3.5" /> STARTS{' '}
                  {new Date(startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" /> {moduleCount} MODULES
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Signal className="h-3.5 w-3.5" /> {course.level || 'All Levels'}
              </span>
            </div>
            {isCompleted ? (
              <Button
                size="sm"
                variant="outline"
                className="font-semibold tracking-wide px-6 border-amber-500 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400"
                onClick={async () => {
                  // Check if enrollment status is 'completed' before allowing certificate
                  if (enrollmentStatuses[course.id] === 'completed') {
                    setCertificateModal({ 
                      isOpen: true, 
                      courseTitle: course.title, 
                      courseId: course.id,
                      completionDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                    })
                  } else {
                    // Double-check course completion
                    if (user?.id) {
                      const { isCompleted } = await checkCourseCompletion(user.id, course.id)
                      if (isCompleted) {
                        setCertificateModal({ 
                          isOpen: true, 
                          courseTitle: course.title, 
                          courseId: course.id,
                          completionDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                        })
                      } else {
                        toast.error('Please complete all lessons before generating a certificate')
                      }
                    }
                  }
                }}
              >
                <Award className="w-4 h-4 mr-2" />
                View Certificate
              </Button>
            ) : (
              <Button
                size="sm"
                variant={isEnrolled ? 'outline' : 'default'}
                className={`font-semibold tracking-wide px-6 ${
                  isEnrolled
                    ? 'border-slate-700 text-slate-300'
                    : isLive
                      ? 'bg-primary hover:bg-primary/90'
                      : 'bg-primary hover:bg-primary/90'
                }`}
                onClick={() => (isEnrolled ? handleContinue(course.id) : handleEnroll(course.id))}
              >
                {isLive ? getLiveButtonText() : isEnrolled ? 'Continue Learning' : 'Enroll Now'}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto p-6 md:p-8 space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Explore Courses</h1>
          <p className="text-slate-400 mt-1 text-lg">Discover new skills and continue your journey.</p>
        </div>
        {/* Toggle Buttons */}
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('grid')}
            className={`px-3 ${viewMode === 'grid' ? 'bg-slate-800 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <LayoutGrid className="h-4 w-4 mr-2" /> Grid
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('list')}
            className={`px-3 ${viewMode === 'list' ? 'bg-slate-800 text-cyan-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <ListIcon className="h-4 w-4 mr-2" /> List
          </Button>
        </div>
      </div>

      {/* Tabs & Content */}
      <Tabs defaultValue="browse" value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        {/* TabsList and Search */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <TabsList className="bg-slate-900/80 border border-slate-800 p-1 h-auto">
            <TabsTrigger value="browse" className="py-2 px-4">
              Browse Catalog
            </TabsTrigger>
            <TabsTrigger value="my-learning" className="py-2 px-4">
              My Learning
            </TabsTrigger>
            <TabsTrigger value="completed" className="py-2 px-4">
              Completed
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Search courses by title..."
              className="pl-10 py-2.5 bg-slate-900/80 border-slate-800 focus:border-cyan-500/50 transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* BROWSE TAB CONTENT */}
        <TabsContent value="browse" className="mt-0 focus-visible:outline-none">
          {loading ? (
            <div className="flex items-center justify-center py-32 text-slate-500 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
              <span className="text-lg font-medium">Loading courses...</span>
            </div>
          ) : browseCourses.length === 0 ? (
            <div className="text-center py-32 bg-slate-900/30 rounded-2xl border-2 border-slate-800/50 border-dashed">
              <BookOpen className="h-16 w-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No courses found</h3>
              <p className="text-slate-400 max-w-md mx-auto">Try adjusting your search or check back later for new content.</p>
            </div>
          ) : (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8 items-stretch'
                  : 'flex flex-col gap-6'
              }
            >
              {browseCourses.map((course) => (
                <CourseItem key={course.id} course={course} isEnrolled={enrolledIds.has(course.id)} progress={courseProgress[course.id]} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* MY LEARNING TAB CONTENT */}
        <TabsContent value="my-learning" className="mt-0 focus-visible:outline-none">
          {myCourses.length === 0 ? (
            <div className="text-center py-32 bg-slate-900/30 rounded-2xl border-2 border-slate-800/50 border-dashed">
              <CheckCircle2 className="h-16 w-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No enrollments yet</h3>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">You haven't joined any courses. Visit the catalog to get started!</p>
              <Button onClick={() => setActiveTab('browse')} className="px-8 font-semibold">
                Browse Catalog
              </Button>
            </div>
          ) : (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8 items-stretch'
                  : 'flex flex-col gap-6'
              }
            >
              {myCourses.map((course) => (
                <CourseItem key={course.id} course={course} isEnrolled={true} progress={courseProgress[course.id]} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* COMPLETED TAB CONTENT */}
        <TabsContent value="completed" className="mt-0 focus-visible:outline-none">
          {completedCourses.length === 0 ? (
            <div className="text-center py-32 bg-slate-900/30 rounded-2xl border-2 border-slate-800/50 border-dashed">
              <Trophy className="h-16 w-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No completed courses yet</h3>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">Complete courses to see them here and earn certificates!</p>
              <Button onClick={() => setActiveTab('my-learning')} className="px-8 font-semibold">
                View My Learning
              </Button>
            </div>
          ) : (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8 items-stretch'
                  : 'flex flex-col gap-6'
              }
            >
              {completedCourses.map((course) => (
                <CourseItem key={course.id} course={course} isEnrolled={true} progress={courseProgress[course.id]} />
              ))}
            </div>
          )}
      </TabsContent>
      </Tabs>

      {/* Certificate Modal */}
      {certificateModal.isOpen && (
        <CertificateModal
          isOpen={certificateModal.isOpen}
          onClose={() => setCertificateModal({ isOpen: false, courseTitle: '' })}
          studentName={profile?.full_name || user?.email?.split('@')[0] || 'Student'}
          courseTitle={certificateModal.courseTitle}
          completionDate={certificateModal.completionDate || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          userId={user?.id}
          courseId={certificateModal.courseId}
        />
      )}
    </div>
  )
}