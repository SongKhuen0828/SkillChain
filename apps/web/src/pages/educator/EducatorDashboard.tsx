import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, Award, Plus, Library, Brain, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { schedulingEngine } from '@/lib/ai/AdaptiveSchedulingEngine'

interface Course {
  id: string
  title: string
  is_published: boolean
  created_at: string
  educator_id: string
}

export function EducatorDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [totalStudents, setTotalStudents] = useState(0)
  const [coursesCreated, setCoursesCreated] = useState(0)
  const [certificatesIssued, setCertificatesIssued] = useState(0)
  const [recentCourses, setRecentCourses] = useState<Course[]>([])
  const [retraining, setRetraining] = useState(false)

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        // Fetch courses count for current educator
        const { count: coursesCount, error: coursesError } = await supabase
          .from('courses')
          .select('id', { count: 'exact', head: true })
          .eq('educator_id', user.id)

        if (coursesError) throw coursesError
        setCoursesCreated(coursesCount || 0)

        // Fetch latest 5 courses
        const { data: coursesData, error: recentCoursesError } = await supabase
          .from('courses')
          .select('id, title, is_published, created_at, educator_id')
          .eq('educator_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (recentCoursesError) throw recentCoursesError
        setRecentCourses(coursesData || [])

        // Fetch total students count (enrollments for courses created by this educator)
        try {
          // Get all course IDs for this educator
          const { data: educatorCourses, error: educatorCoursesError } = await supabase
            .from('courses')
            .select('id')
            .eq('educator_id', user.id)

          if (educatorCoursesError) throw educatorCoursesError

          if (educatorCourses && educatorCourses.length > 0) {
            const courseIds = educatorCourses.map((c) => c.id)

            // Count unique students enrolled in these courses
            const { count: studentsCount, error: enrollmentsError } = await supabase
              .from('enrollments')
              .select('user_id', { count: 'exact', head: true })
              .in('course_id', courseIds)

            if (enrollmentsError) {
              // If enrollments table doesn't exist or has issues, just set to 0
              console.warn('Error fetching enrollments:', enrollmentsError)
              setTotalStudents(0)
            } else {
              setTotalStudents(studentsCount || 0)
            }

            // Count certificates issued for educator's courses
            const { count: certsCount, error: certsError } = await supabase
              .from('certificates')
              .select('id', { count: 'exact', head: true })
              .in('course_id', courseIds)

            if (certsError) {
              console.warn('Error fetching certificates:', certsError)
              setCertificatesIssued(0)
            } else {
              setCertificatesIssued(certsCount || 0)
            }
          } else {
            setTotalStudents(0)
            setCertificatesIssued(0)
          }
        } catch (error) {
          // Gracefully handle if enrollments table is not ready
          console.warn('Error fetching student count:', error)
          setTotalStudents(0)
          setCertificatesIssued(0)
        }
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error)
        toast.error('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  const handleRetrainModel = async () => {
    if (!user) return
    
    setRetraining(true)
    try {
      // Trigger model retraining by initializing the scheduling engine
      // This will retrain the model with latest data
      await schedulingEngine.init(user.id)
      toast.success('AI Model retrained successfully with latest data!')
    } catch (error: any) {
      console.error('Error retraining model:', error)
      toast.error('Failed to retrain model')
    } finally {
      setRetraining(false)
    }
  }

  const getStatusBadge = (isPublished: boolean) => {
    if (isPublished) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
          Published
        </span>
      )
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
        Draft
      </span>
    )
  }

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header Skeleton */}
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 rounded-2xl shadow-sm"
            >
              <Skeleton className="h-12 w-12 mb-4 rounded-xl" />
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>

        {/* Recent Courses Skeleton */}
        <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 rounded-2xl shadow-sm">
          <Skeleton className="h-7 w-40 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Instructor Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Manage your courses, students, and live sessions
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Students */}
        <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-cyan-500/10 rounded-xl">
              <Users className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            {totalStudents.toLocaleString()}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Total Students</div>
        </div>

        {/* Certificates Issued */}
        <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <Award className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            {certificatesIssued.toLocaleString()}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Certificates Issued
          </div>
        </div>

        {/* Courses Created */}
        <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 rounded-2xl shadow-sm hover:scale-[1.02] transition-transform">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-cyan-500/10 rounded-xl">
              <Library className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            {coursesCreated.toLocaleString()}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">Courses Created</div>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 rounded-2xl shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Button
            onClick={handleRetrainModel}
            variant="outline"
            disabled={retraining}
            className="border-primary text-primary hover:bg-primary/10"
          >
            {retraining ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Retraining...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Retrain AI Model
              </>
            )}
          </Button>
          <Button
            onClick={() => navigate('/educator/courses/create')}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 shadow-lg shadow-cyan-500/20 px-6 py-3 rounded-xl"
          >
            <Plus size={18} className="mr-2" />
            Create New Course
          </Button>
        </div>
      </div>

      {/* Recent Courses Section */}
      <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-6 rounded-2xl shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Recent Courses</h2>
        {recentCourses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  <th className="text-left p-4 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="text-left p-4 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left p-4 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="text-left p-4 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentCourses.map((course) => (
                  <tr
                    key={course.id}
                    className="border-b border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4 font-medium text-slate-900 dark:text-white">{course.title}</td>
                    <td className="p-4">{getStatusBadge(course.is_published)}</td>
                    <td className="p-4 text-slate-700 dark:text-slate-300">
                      {new Date(course.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/educator/courses/${course.id}/edit`)}
                        className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300"
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <p>No courses yet. Create your first course to get started!</p>
          </div>
        )}
      </div>
    </div>
  )
}

