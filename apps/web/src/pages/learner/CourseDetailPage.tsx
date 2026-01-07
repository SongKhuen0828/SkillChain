import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Star, Check, PlayCircle, FileText, Globe, Award, ChevronDown, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { CourseThumbnail } from '@/components/CourseThumbnail';
import { SafeAvatar } from '@/components/ui/SafeAvatar';

export function CourseDetailPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [instructor, setInstructor] = useState<any>(null);

  useEffect(() => {
    if (!courseId) return;
    fetchCourseData();
  }, [courseId, user]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);

      // Fetch course with modules and lessons
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select(`
          *,
          modules (
            id,
            title,
            order_index,
            lessons (
              id,
              title,
              type,
              duration,
              order_index
            )
          )
        `)
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;

      // Sort modules and lessons by order_index
      if (courseData.modules) {
        courseData.modules.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
        courseData.modules.forEach((module: any) => {
          if (module.lessons) {
            module.lessons.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
          }
        });
      }

      setCourse(courseData);

      // Fetch instructor profile
      if (courseData.educator_id) {
        const { data: instructorData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio, professional_title')
          .eq('id', courseData.educator_id)
          .single();
        
        setInstructor(instructorData);
      }

      // Check if user is enrolled
      if (user) {
        const { data: enrollmentData } = await supabase
          .from('enrollments')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .maybeSingle();
        
        setIsEnrolled(!!enrollmentData);
      }

      // Fetch enrollment count
      const { count: enrollCount } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);

      setEnrollmentCount(enrollCount || 0);

      // Fetch average rating
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('rating')
        .eq('course_id', courseId);

      if (reviewsData && reviewsData.length > 0) {
        const sum = reviewsData.reduce((acc, r) => acc + r.rating, 0);
        setAverageRating(sum / reviewsData.length);
        setRatingCount(reviewsData.length);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      toast.error('Please sign in to enroll');
      navigate('/login');
      return;
    }

    try {
      const { error } = await supabase
        .from('enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
        });

      if (error) {
        if (error.code === '23505') {
          toast.info('You are already enrolled!');
        } else {
          throw error;
        }
      } else {
        toast.success('Enrolled successfully! 🚀');
        setIsEnrolled(true);
        setEnrollmentCount((prev) => prev + 1);
      }
    } catch (error: any) {
      toast.error(error.message || 'Enrollment failed');
    }
  };

  const handleGoToCourse = () => {
    if (courseId) {
      navigate(`/course/${courseId}/learn`);
    }
  };

  // Mock learning points (can be replaced with DB column later)
  const learningPoints = course?.what_will_learn
    ? JSON.parse(course.what_will_learn)
    : [
        'Master the core concepts and principles',
        'Build practical projects and applications',
        'Learn industry best practices',
        'Get hands-on experience with real-world examples',
      ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Course not found</h2>
          <Button onClick={() => navigate('/courses')} className="mt-4 bg-primary hover:bg-primary/90">
            Browse Courses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* 1. COURSERA HERO SECTION */}
      <div className="bg-slate-900 text-white py-12 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-slate-300 font-medium">
              <button onClick={() => navigate('/courses')} className="hover:text-white">
                Browse
              </button>
              <span>&gt;</span>
              <span>{course.level || 'All Levels'}</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold font-serif tracking-tight">
              {course.title}
            </h1>

            {/* Description Preview */}
            <p className="text-lg text-slate-300 max-w-2xl">
              {course.description?.slice(0, 150)}
              {course.description && course.description.length > 150 && '...'}
            </p>

            {/* Rating, Enrollment, Instructor */}
            <div className="flex items-center gap-4 pt-4 flex-wrap">
              {ratingCount > 0 && (
                <>
                  <div className="flex items-center bg-amber-500/20 px-3 py-1 rounded text-amber-400 gap-1 font-bold text-sm">
                    <Star className="w-4 h-4 fill-current" /> {averageRating.toFixed(1)}
                  </div>
                  <span className="text-slate-400 text-sm">({ratingCount} reviews)</span>
                </>
              )}
              <span className="text-slate-400 text-sm border-l border-slate-700 pl-4">
                {enrollmentCount.toLocaleString()} {enrollmentCount === 1 ? 'Student' : 'Students'} Enrolled
              </span>
              {instructor && (
                <span className="text-slate-400 text-sm border-l border-slate-700 pl-4">
                  Taught by <strong>{instructor.full_name || instructor.professional_title || 'Instructor'}</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT LAYOUT */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12 relative">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 space-y-12">
          {/* "What you'll learn" Box */}
          <div className="border border-slate-700 p-6 rounded-lg bg-slate-800/50">
            <h2 className="text-2xl font-bold mb-6 text-white">What you'll learn</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {learningPoints.map((point: string, i: number) => (
                <div key={i} className="flex gap-3 items-start">
                  <Check className="w-5 h-5 text-cyan-500 mt-1 flex-shrink-0" />
                  <span className="text-slate-300 text-sm">{point}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Syllabus Accordion */}
          <div>
            <h2 className="text-2xl font-bold mb-6 text-white">Syllabus - What you will learn from this course</h2>
            <div className="space-y-4">
              {course.modules?.map((module: any, idx: number) => (
                <div key={module.id} className="border border-slate-700 rounded-lg overflow-hidden bg-slate-800/30">
                  <details className="group">
                    <summary className="flex justify-between items-center cursor-pointer list-none py-4 px-6 hover:bg-slate-800/50 transition-colors">
                      <div className="flex-1">
                        <span className="text-sm font-bold text-cyan-500 uppercase tracking-wider">Module {idx + 1}</span>
                        <h3 className="text-lg font-bold text-white mt-1">{module.title}</h3>
                        {module.lessons && (
                          <p className="text-sm text-slate-400 mt-1">
                            {module.lessons.length} {module.lessons.length === 1 ? 'lesson' : 'lessons'}
                          </p>
                        )}
                      </div>
                      <ChevronDown className="w-6 h-6 text-slate-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-4" />
                    </summary>
                    <div className="mt-0 px-6 pb-4 space-y-3 bg-slate-800/50">
                      {module.lessons?.map((lesson: any) => (
                        <div key={lesson.id} className="flex items-center gap-3 py-2 text-slate-300">
                          {lesson.type === 'video' ? (
                            <PlayCircle className="w-5 h-5 text-cyan-500 flex-shrink-0" />
                          ) : lesson.type === 'quiz' ? (
                            <Trophy className="w-5 h-5 text-purple-500 flex-shrink-0" />
                          ) : (
                            <FileText className="w-5 h-5 text-slate-500 flex-shrink-0" />
                          )}
                          <span className="flex-1">{lesson.title}</span>
                          {lesson.duration && (
                            <span className="text-xs text-slate-500">{lesson.duration} min</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </div>

          {/* Instructor Bio */}
          {instructor && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-white">Instructor</h2>
              <div className="flex items-start gap-4 bg-slate-800/30 border border-slate-700 p-6 rounded-lg">
                <SafeAvatar
                  src={instructor.avatar_url}
                  alt={instructor.full_name || 'Instructor'}
                  className="w-24 h-24 flex-shrink-0"
                  fallback={instructor.full_name?.[0] || 'I'}
                />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-cyan-400">
                    {instructor.full_name || 'Instructor'}
                  </h3>
                  {instructor.professional_title && (
                    <p className="text-slate-400 text-sm mt-1">{instructor.professional_title}</p>
                  )}
                  {instructor.bio && (
                    <p className="text-slate-300 mt-4 text-sm leading-relaxed">{instructor.bio}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN - STICKY SIDEBAR */}
        <div className="hidden lg:block relative">
          <div className="sticky top-24 space-y-6">
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
              {/* Thumbnail */}
              <div className="relative aspect-video bg-slate-900">
                <CourseThumbnail
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors cursor-pointer" onClick={() => !isEnrolled && handleEnroll()}>
                  <PlayCircle className="w-16 h-16 text-white opacity-90 drop-shadow-lg" />
                </div>
              </div>

              <div className="px-6 py-6">
                {/* Free Badge */}
                <div className="flex items-end gap-2 mb-6">
                  <span className="text-3xl font-bold text-cyan-400">Free</span>
                </div>

                {/* Action Button */}
                {isEnrolled ? (
                  <Button
                    onClick={handleGoToCourse}
                    className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 mb-4"
                  >
                    Go to Course
                  </Button>
                ) : (
                  <Button
                    onClick={handleEnroll}
                    className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 mb-4"
                  >
                    Enroll Now
                  </Button>
                )}

                {/* Course Features */}
                <div className="space-y-4 pt-4 border-t border-slate-700">
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <Award className="w-5 h-5 text-cyan-500 flex-shrink-0" />
                    <span>Blockchain Certificate</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-300">
                    <Globe className="w-5 h-5 text-cyan-500 flex-shrink-0" />
                    <span>100% Online Course</span>
                  </div>
                  {course.modules && (
                    <div className="flex items-center gap-3 text-sm text-slate-300">
                      <PlayCircle className="w-5 h-5 text-cyan-500 flex-shrink-0" />
                      <span>{course.modules.length} {course.modules.length === 1 ? 'Module' : 'Modules'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

