import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

export interface Course {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  is_published: boolean
  created_at: string
}

export interface StudyPlan {
  id: string
  user_id: string
  lesson_id: string
  scheduled_at: string
  status: 'pending' | 'done' | 'missed'
  lessons?: {
    id: string
    title: string | null
    type: 'video' | 'quiz'
    duration: number | null
  }
}

export interface Certificate {
  id: string
  user_id: string
  course_id: string
  tx_hash: string | null
  ipfs_hash: string | null
  created_at: string
}

export function useLearnerData() {
  const { user, profile } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([])
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [userRank, setUserRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [generatingSchedule, setGeneratingSchedule] = useState(false)

  // Fetch courses
  useEffect(() => {
    async function fetchCourses() {
      if (!user) return

      try {
        // RLS policies will automatically filter courses based on visibility and org membership
        // Just fetch all published courses - RLS handles the rest
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false })

        if (error) throw error
        setCourses(data || [])
      } catch (error: any) {
        console.error('Error fetching courses:', error)
        toast.error('Failed to load courses')
      }
    }

    fetchCourses()
  }, [user])

  // Fetch today's study plans
  useEffect(() => {
    async function fetchTodayPlans() {
      if (!user) return

      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const { data, error } = await supabase
          .from('study_plans')
          .select(`
            *,
            lessons(id, title, type, duration)
          `)
          .eq('user_id', user.id)
          .gte('scheduled_at', today.toISOString())
          .lt('scheduled_at', tomorrow.toISOString())
          .eq('status', 'pending')
          .order('scheduled_at', { ascending: true })

        if (error) throw error
        setStudyPlans(data || [])
      } catch (error: any) {
        console.error('Error fetching study plans:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTodayPlans()
  }, [user])

  // Fetch certificates
  useEffect(() => {
    async function fetchCertificates() {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from('certificates')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        setCertificates(data || [])
      } catch (error: any) {
        console.error('Error fetching certificates:', error)
      }
    }

    fetchCertificates()
  }, [user])

  // Fetch user's leaderboard rank
  useEffect(() => {
    async function fetchUserRank() {
      if (!user) return

      try {
        // Get all profiles ordered by XP to calculate rank
        const { data, error } = await supabase
          .from('profiles')
          .select('id, xp')
          .order('xp', { ascending: false })

        if (error) throw error

        // Find current user's rank
        const rank = (data || []).findIndex(p => p.id === user.id) + 1
        setUserRank(rank > 0 ? rank : null)
      } catch (error: any) {
        console.error('Error fetching user rank:', error)
      }
    }

    fetchUserRank()
  }, [user])

  // Generate AI Schedule
  async function generateAISchedule() {
    if (!user || !profile) {
      toast.error('Please sign in to generate a schedule')
      return
    }

    setGeneratingSchedule(true)

    try {
      // Mock API call with 2s delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Get available lessons from published courses
      // First, get published course IDs
      const { data: publishedCourses, error: coursesError } = await supabase
        .from('courses')
        .select('id')
        .eq('is_published', true)

      if (coursesError) throw coursesError
      if (!publishedCourses || publishedCourses.length === 0) {
        toast.error('No published courses available')
        return
      }

      const courseIds = publishedCourses.map((c) => c.id)

      // Get modules for published courses
      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select('id')
        .in('course_id', courseIds)

      if (modulesError) throw modulesError
      if (!modules || modules.length === 0) {
        toast.error('No modules available')
        return
      }

      const moduleIds = modules.map((m) => m.id)

      // Get lessons from those modules
      const { data: availableLessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id, title, type, duration')
        .in('module_id', moduleIds)
        .order('order_index', { ascending: true })
        .limit(5)

      if (lessonsError) throw lessonsError

      if (!availableLessons || availableLessons.length === 0) {
        toast.error('No lessons available. Please contact an educator.')
        return
      }

      // Create study plans for today with time slots
      const now = new Date()
      const today = new Date(now)
      today.setHours(9, 0, 0, 0) // Start at 9 AM

      const plansToInsert = availableLessons.slice(0, 3).map((lesson, index) => {
        const scheduledTime = new Date(today)
        scheduledTime.setHours(9 + index * 3, 0, 0, 0) // 9 AM, 12 PM, 3 PM

        return {
          user_id: user.id,
          lesson_id: lesson.id,
          scheduled_at: scheduledTime.toISOString(),
          status: 'pending' as const,
        }
      })

      const { error: insertError } = await supabase
        .from('study_plans')
        .insert(plansToInsert)

      if (insertError) throw insertError

      // Refresh study plans
      const { data: newPlans, error: fetchError } = await supabase
        .from('study_plans')
        .select(`
          *,
          lessons(id, title, type, duration)
        `)
        .eq('user_id', user.id)
        .gte('scheduled_at', today.toISOString())
        .lt('scheduled_at', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString())
        .eq('status', 'pending')
        .order('scheduled_at', { ascending: true })

      if (fetchError) throw fetchError
      setStudyPlans(newPlans || [])

      toast.success('AI schedule generated successfully!')
    } catch (error: any) {
      console.error('Error generating schedule:', error)
      toast.error(error.message || 'Failed to generate schedule')
    } finally {
      setGeneratingSchedule(false)
    }
  }

  return {
    courses,
    studyPlans,
    certificates,
    userRank,
    loading,
    generatingSchedule,
    generateAISchedule,
    profile,
  }
}

