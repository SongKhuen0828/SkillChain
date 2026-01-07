import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { BookOpen, Play, ArrowLeft } from 'lucide-react'

export function CoursePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCourse() {
      if (!id) return

      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*')
          .eq('id', id)
          .single()

        if (error) throw error
        setCourse(data)
      } catch (error: any) {
        console.error('Error fetching course:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCourse()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">Course not found</h3>
              <p className="text-sm text-muted-foreground">
                The course you're looking for doesn't exist
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          {course.thumbnail_url && (
            <div className="relative h-64 w-full overflow-hidden rounded-t-lg">
              <img
                src={course.thumbnail_url}
                alt={course.title}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <CardHeader>
            <CardTitle className="text-3xl">{course.title}</CardTitle>
            {course.description && (
              <CardDescription className="text-base mt-2">
                {course.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate(`/course/${id}/learn`)}
              size="lg"
              className="w-full sm:w-auto"
            >
              <Play className="mr-2 h-4 w-4" />
              Start Learning
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

