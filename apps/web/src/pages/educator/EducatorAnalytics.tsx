import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { 
  BarChart2, 
  Users, 
  BookOpen, 
  Award, 
  TrendingUp,
  Star
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
  Legend
} from 'recharts'

interface CourseStats {
  id: string
  title: string
  shortTitle: string
  enrollments: number
  completions: number
  certificates: number
  avgProgress: number
}

interface AnalyticsData {
  totalStudents: number
  totalEnrollments: number
  totalCertificates: number
  totalCourses: number
  courseStats: CourseStats[]
}

const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#3b82f6']

export function EducatorAnalytics() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData>({
    totalStudents: 0,
    totalEnrollments: 0,
    totalCertificates: 0,
    totalCourses: 0,
    courseStats: []
  })

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        // 1. Get educator's courses
        const { data: courses, error: coursesError } = await supabase
          .from('courses')
          .select('id, title, is_published')
          .eq('educator_id', user.id)

        if (coursesError) throw coursesError

        const courseIds = courses?.map(c => c.id) || []
        const totalCourses = courses?.length || 0

        if (courseIds.length === 0) {
          setData({
            totalStudents: 0,
            totalEnrollments: 0,
            totalCertificates: 0,
            totalCourses: 0,
            courseStats: []
          })
          setLoading(false)
          return
        }

        // 2. Get enrollments count
        const { count: enrollmentsCount } = await supabase
          .from('enrollments')
          .select('id', { count: 'exact', head: true })
          .in('course_id', courseIds)

        // 3. Get unique students
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('user_id')
          .in('course_id', courseIds)

        const uniqueStudents = new Set(enrollments?.map(e => e.user_id) || []).size

        // 4. Get certificates issued
        const { count: certificatesCount } = await supabase
          .from('certificates')
          .select('id', { count: 'exact', head: true })
          .in('course_id', courseIds)

        // 5. Get per-course stats
        const courseStats: CourseStats[] = []
        
        for (const course of courses || []) {
          const { count: courseEnrollments } = await supabase
            .from('enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('course_id', course.id)

          const { count: courseCertificates } = await supabase
            .from('certificates')
            .select('id', { count: 'exact', head: true })
            .eq('course_id', course.id)

          // Get all lessons for this course through modules
          const { data: modulesData } = await supabase
            .from('modules')
            .select('id')
            .eq('course_id', course.id)
          
          const moduleIds = modulesData?.map(m => m.id) || []
          
          let totalLessons = 0
          let lessonIds: string[] = []
          
          if (moduleIds.length > 0) {
            const { data: lessonsData, count: lessonsCount } = await supabase
              .from('lessons')
              .select('id', { count: 'exact' })
              .in('module_id', moduleIds)
            
            totalLessons = lessonsCount || 0
            lessonIds = lessonsData?.map(l => l.id) || []
          }

          // Get enrolled users and their progress
          const { data: enrolledUsers } = await supabase
            .from('enrollments')
            .select('user_id')
            .eq('course_id', course.id)
          
          let avgProgress = 0
          let completions = 0
          
          if (enrolledUsers && enrolledUsers.length > 0 && totalLessons > 0 && lessonIds.length > 0) {
            const userIds = enrolledUsers.map(e => e.user_id)
            
            // Get completed lessons for enrolled users
            const { data: progressData } = await supabase
              .from('user_progress')
              .select('user_id, lesson_id')
              .in('user_id', userIds)
              .in('lesson_id', lessonIds)
            
            // Calculate progress per user
            const userProgressMap = new Map<string, number>()
            progressData?.forEach(p => {
              const current = userProgressMap.get(p.user_id) || 0
              userProgressMap.set(p.user_id, current + 1)
            })
            
            // Calculate average progress and completions
            let totalProgress = 0
            userProgressMap.forEach((completedCount) => {
              const progressPercent = (completedCount / totalLessons) * 100
              totalProgress += progressPercent
              if (progressPercent >= 100) completions++
            })
            
            avgProgress = userProgressMap.size > 0 
              ? Math.round(totalProgress / userProgressMap.size) 
              : 0
          }

          // Create short title for charts
          const shortTitle = course.title.length > 15 
            ? course.title.substring(0, 12) + '...' 
            : course.title

          courseStats.push({
            id: course.id,
            title: course.title,
            shortTitle,
            enrollments: courseEnrollments || 0,
            completions,
            certificates: courseCertificates || 0,
            avgProgress
          })
        }

        courseStats.sort((a, b) => b.enrollments - a.enrollments)

        setData({
          totalStudents: uniqueStudents,
          totalEnrollments: enrollmentsCount || 0,
          totalCertificates: certificatesCount || 0,
          totalCourses,
          courseStats
        })

      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [user])

  // Prepare chart data
  const enrollmentChartData = data.courseStats.map((course, idx) => ({
    name: course.shortTitle,
    enrollments: course.enrollments,
    completions: course.completions,
    fill: COLORS[idx % COLORS.length]
  }))

  const pieChartData = [
    { name: 'Completed', value: data.courseStats.reduce((sum, c) => sum + c.completions, 0), color: '#10b981' },
    { name: 'In Progress', value: data.totalEnrollments - data.courseStats.reduce((sum, c) => sum + c.completions, 0), color: '#f59e0b' },
  ].filter(d => d.value > 0)

  const progressChartData = data.courseStats.map((course, idx) => ({
    name: course.shortTitle,
    progress: course.avgProgress,
    fill: COLORS[idx % COLORS.length]
  }))

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Performance Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Track your course performance and student engagement
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Performance Analytics</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Track your course performance and student engagement
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-500/10 rounded-xl">
                <Users className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {data.totalStudents}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {data.totalEnrollments}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Enrollments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <Award className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {data.totalCertificates}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Certificates Issued</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {data.totalCourses}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Active Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollments Bar Chart */}
        <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white text-base">
              <BarChart2 className="w-5 h-5 text-cyan-500" />
              Enrollments by Course
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.courseStats.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-500">
                No course data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={enrollmentChartData} margin={{ top: 10, right: 10, left: -10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="enrollments" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completions" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Completion Pie Chart */}
        <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white text-base">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Student Progress Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieChartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-500">
                No enrollment data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={(props: any) => `${props.name || ''} ${((props.percent || 0) * 100).toFixed(0)}%`}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Average Progress Chart */}
      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white text-base">
            <Award className="w-5 h-5 text-purple-500" />
            Average Student Progress by Course
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.courseStats.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500">
              No course data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={progressChartData} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
                <defs>
                  <linearGradient id="colorProgress" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fill: '#94a3b8', fontSize: 11 }} 
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number | undefined) => [`${value || 0}%`, 'Progress']}
                />
                <Area 
                  type="monotone" 
                  dataKey="progress" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorProgress)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Course Performance Table */}
      <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <BarChart2 className="w-5 h-5 text-cyan-500" />
            Course Performance Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.courseStats.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No courses yet</p>
              <p className="text-sm">Create your first course to see analytics</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.courseStats.map((course, idx) => (
                <div 
                  key={course.id}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="text-lg font-semibold text-slate-900 dark:text-white">
                        {course.title}
                      </span>
                      {idx === 0 && course.enrollments > 0 && (
                        <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0">
                          <Star className="w-3 h-3 mr-1" />
                          Top Course
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Enrollments</p>
                      <p className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                        {course.enrollments}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Completions</p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        {course.completions}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Certificates</p>
                      <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                        {course.certificates}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Completion Rate</p>
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {course.enrollments > 0 
                          ? Math.round((course.completions / course.enrollments) * 100)
                          : 0}%
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Average Student Progress
                      </span>
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {course.avgProgress}%
                      </span>
                    </div>
                    <Progress value={course.avgProgress} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
