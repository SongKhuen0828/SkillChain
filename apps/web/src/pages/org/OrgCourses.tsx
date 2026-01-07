import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Search,
  Users,
  Award,
  Eye,
  Clock,
  Plus,
  Pencil,
  Globe,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  status: string;
  visibility: string;
  is_published: boolean;
  created_at: string;
  educator_id: string;
  enrollments_count: number;
  certificates_count: number;
  completion_rate: number;
}

export function OrgCourses() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

  useEffect(() => {
    fetchCourses();
  }, [profile?.org_id]);

  const fetchCourses = async () => {
    if (!profile?.org_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch all courses from organization
      const { data: coursesData, error } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          description,
          thumbnail_url,
          is_published,
          visibility,
          created_at,
          educator_id
        `)
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!coursesData || coursesData.length === 0) {
        setCourses([]);
        setLoading(false);
        return;
      }

      // Get stats for each course
      const coursesWithStats = await Promise.all(
        coursesData.map(async (course: any) => {
          // Get enrollments
          const { data: enrollments } = await supabase
            .from('enrollments')
            .select('status')
            .eq('course_id', course.id);

          const enrollmentsCount = enrollments?.length || 0;
          const completedCount = enrollments?.filter(e => e.status === 'completed').length || 0;
          const completionRate = enrollmentsCount > 0 ? (completedCount / enrollmentsCount) * 100 : 0;

          // Get certificates count
          const { count: certificatesCount } = await supabase
            .from('certificates')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', course.id);

          return {
            id: course.id,
            title: course.title,
            description: course.description,
            thumbnail_url: course.thumbnail_url,
            status: course.is_published ? 'published' : 'draft',
            visibility: course.visibility || 'public',
            is_published: course.is_published,
            created_at: course.created_at,
            educator_id: course.educator_id,
            enrollments_count: enrollmentsCount,
            certificates_count: certificatesCount || 0,
            completion_rate: completionRate,
          };
        })
      );

      setCourses(coursesWithStats);
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = 
      course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.educator_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filter === 'all') return matchesSearch;
    return matchesSearch && course.status === filter;
  });

  const totalStats = {
    courses: courses.length,
    published: courses.filter(c => c.status === 'published').length,
    enrollments: courses.reduce((sum, c) => sum + c.enrollments_count, 0),
    certificates: courses.reduce((sum, c) => sum + c.certificates_count, 0),
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            Organization Courses
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Create and manage courses for your organization
          </p>
        </div>
        <Button
          onClick={() => navigate('/org/courses/create')}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Course
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {totalStats.courses}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Eye className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {totalStats.published}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <Users className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {totalStats.enrollments}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Enrollments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Award className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {totalStats.certificates}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Certificates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Courses List */}
      <Card className="bg-card/50 backdrop-blur-md">
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle>All Courses</CardTitle>
              <CardDescription>
                {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
              {/* Filter */}
              <div className="flex gap-2">
                {(['all', 'published', 'draft'] as const).map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={filter === f ? 'default' : 'outline'}
                    onClick={() => setFilter(f)}
                    className={filter === f ? 'bg-primary hover:bg-primary/90' : ''}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Button>
                ))}
              </div>
              {/* Search */}
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCourses.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              {courses.length === 0 ? (
                <>
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No courses in your organization yet</p>
                  <p className="text-sm mt-1">Create your first course to get started</p>
                  <Button
                    onClick={() => navigate('/org/courses/create')}
                    className="mt-4 bg-primary hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Course
                  </Button>
                </>
              ) : (
                <p>No courses found matching your search</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredCourses.map((course) => (
                <div
                  key={course.id}
                  className="bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-slate-200 dark:bg-slate-700 relative">
                    {course.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="h-12 w-12 text-slate-400" />
                      </div>
                    )}
                    <Badge
                      className={`absolute top-2 right-2 ${
                        course.status === 'published'
                          ? 'bg-green-500'
                          : 'bg-slate-500'
                      }`}
                    >
                      {course.status}
                    </Badge>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2 mb-2">
                      {course.title}
                    </h3>

                    {/* Visibility Badge */}
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-3">
                      {course.visibility === 'org_only' ? (
                        <>
                          <Lock className="h-4 w-4 text-purple-500" />
                          <span className="text-purple-600 dark:text-purple-400">Organization Only</span>
                        </>
                      ) : (
                        <>
                          <Globe className="h-4 w-4 text-green-500" />
                          <span className="text-green-600 dark:text-green-400">Public</span>
                        </>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center mb-3">
                      <div>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {course.enrollments_count}
                        </p>
                        <p className="text-xs text-slate-500">Students</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {course.certificates_count}
                        </p>
                        <p className="text-xs text-slate-500">Certs</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-900 dark:text-white">
                          {course.completion_rate.toFixed(0)}%
                        </p>
                        <p className="text-xs text-slate-500">Rate</p>
                      </div>
                    </div>

                    {/* Progress */}
                    <Progress value={course.completion_rate} className="h-1 mb-3" />

                    {/* Footer: Date & Edit Button */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <Clock className="h-3 w-3" />
                        {formatDate(course.created_at)}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/org/courses/${course.id}/edit`)}
                        className="text-primary border-primary/30 hover:bg-primary/5 dark:hover:bg-primary/10"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

