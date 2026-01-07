import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { CourseThumbnail } from '@/components/CourseThumbnail'
import { Plus, BookOpen, Search, Loader2, Trash2, LayoutGrid, List } from 'lucide-react'
import { toast } from 'sonner'

interface Course {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  is_published: boolean
  price: number
  created_at: string
  educator_id: string
  modules?: Array<{ id: string }>
}

export function EducatorCourses() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('courses')
          .select('*, modules(id)')
          .eq('educator_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        setCourses(data || [])
      } catch (error: any) {
        console.error('Error fetching courses:', error)
        toast.error('Failed to load courses')
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [user])

  // Filter courses based on search query
  const filteredCourses = courses.filter((course) =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Handle delete course (only for drafts)
  const handleDelete = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to delete this draft? This cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase.from('courses').delete().eq('id', courseId)

      if (error) throw error

      // Remove from local state immediately
      setCourses(courses.filter((course) => course.id !== courseId))
      toast.success('Course deleted')
    } catch (error: any) {
      console.error('Error deleting course:', error)
      toast.error(error.message || 'Failed to delete course')
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
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </div>
          <Skeleton className="h-11 w-48" />
        </div>

        {/* Search Skeleton */}
        <Skeleton className="h-11 w-full max-w-md" />

        {/* Courses Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden"
            >
              <Skeleton className="h-48 w-full" />
              <div className="p-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Courses</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Manage and organize your course content
          </p>
        </div>
        <Link to="/educator/courses/create">
          <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 shadow-lg shadow-cyan-500/20 px-6 py-3 rounded-xl">
            <Plus size={18} className="mr-2" />
            Create New Course
          </Button>
        </Link>
      </div>

      {/* Search & View Toggles */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-cyan-500 dark:focus:border-cyan-500"
          />
        </div>

        {/* View Toggles */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode('grid')}
            className={`h-9 w-9 ${viewMode === 'grid' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setViewMode('list')}
            className={`h-9 w-9 ${viewMode === 'list' ? 'bg-slate-800 text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Courses Grid/List */}
      {filteredCourses.length > 0 ? (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
          {filteredCourses.map((course) =>
            viewMode === 'grid' ? (
              // === GRID CARD ===
              <div
                key={course.id}
                className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/educator/courses/${course.id}/edit`)}
              >
                {/* Thumbnail */}
                <div className="aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <CourseThumbnail
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">
                      {course.title}
                    </h3>
                    {course.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                        {course.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      {getStatusBadge(course.is_published)}
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        Free
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {/* Edit Button (Always visible, full width unless draft) */}
                    <Button
                      variant="outline"
                      className="flex-1 border-cyan-500/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/educator/courses/${course.id}/edit`)
                      }}
                    >
                      Edit Course
                    </Button>

                    {/* Delete Button (Only for Drafts) */}
                    {!course.is_published && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="shrink-0 bg-red-950/30 text-red-400 hover:bg-red-900/50 border border-red-900/50"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(course.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // === LIST CARD ===
              <div
                key={course.id}
                className="flex flex-col md:flex-row gap-4 p-4 bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-xl hover:border-slate-700 dark:hover:border-slate-700 transition-all group"
              >
                {/* Thumbnail */}
                <div className="w-full md:w-48 h-32 shrink-0 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden relative">
                  <CourseThumbnail
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <div className="flex-1 flex flex-col justify-center space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{course.title}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${
                        course.is_published
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {course.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div className="text-emerald-400 font-bold">
                    Free
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span>{course.modules?.length || 0} Modules</span>
                    <span>{new Date(course.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 md:border-l border-slate-200 dark:border-slate-800 md:pl-4">
                  <Button
                    variant="outline"
                    className="border-cyan-500/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10"
                    onClick={() => navigate(`/educator/courses/${course.id}/edit`)}
                  >
                    Edit
                  </Button>
                  {!course.is_published && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="bg-red-950/30 text-red-400 hover:bg-red-900/50 border border-red-900/50"
                      onClick={() => handleDelete(course.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      ) : searchQuery ? (
        <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-12 rounded-2xl shadow-sm text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-cyan-500/10 rounded-full">
              <Search className="w-12 h-12 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                No courses found
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                No courses match "{searchQuery}". Try a different search term.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-12 rounded-2xl shadow-sm text-center">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="p-4 bg-cyan-500/10 rounded-full">
              <BookOpen className="w-12 h-12 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                No courses yet
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Get started by creating your first course
              </p>
              <Link to="/educator/courses/create">
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 shadow-lg shadow-cyan-500/20 px-6 py-3 rounded-xl">
                  <Plus size={18} className="mr-2" />
                  Create Your First Course
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
