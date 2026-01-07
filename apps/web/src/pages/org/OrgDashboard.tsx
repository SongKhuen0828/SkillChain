import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  BookOpen, 
  Award, 
  TrendingUp, 
  Building2,
  Upload,
  UserPlus,
  Settings,
  ArrowRight,
  Target,
  Clock,
  Calendar,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

interface OrgStats {
  totalMembers: number;
  activeThisWeek: number;
  totalCourses: number;
  totalCertificates: number;
  averageCompletionRate: number;
  totalStudyHours: number;
}

interface RecentMember {
  id: string;
  user_id: string;
  joined_at: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface TopCourse {
  id: string;
  title: string;
  enrollments_count: number;
  completion_rate: number;
}

export function OrgDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OrgStats>({
    totalMembers: 0,
    activeThisWeek: 0,
    totalCourses: 0,
    totalCertificates: 0,
    averageCompletionRate: 0,
    totalStudyHours: 0,
  });
  const [recentMembers, setRecentMembers] = useState<RecentMember[]>([]);
  const [topCourses, setTopCourses] = useState<TopCourse[]>([]);
  const [organization, setOrganization] = useState<any>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (!user || profile?.role !== 'org_admin') {
      navigate('/dashboard');
      return;
    }

    fetchDashboardData();
  }, [user, profile]);

  const fetchDashboardData = async () => {
    if (!user || !profile?.org_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Fetch organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.org_id)
        .single();

      if (orgError) throw orgError;
      setOrganization(orgData);

      // 2. Fetch org members
      const { data: membersData, count: membersCount } = await supabase
        .from('org_members')
        .select('id, user_id, joined_at', { count: 'exact' })
        .eq('org_id', profile.org_id)
        .order('joined_at', { ascending: false })
        .limit(5);

      // Fetch profiles for members separately (org_members references auth.users, not profiles)
      let recentMembersTransformed: RecentMember[] = [];
      if (membersData && membersData.length > 0) {
        const userIds = membersData.map((m: any) => m.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));
        
        recentMembersTransformed = membersData.map((m: any) => {
          const profile = profilesMap.get(m.user_id);
          return {
            id: m.id,
            user_id: m.user_id,
            joined_at: m.joined_at,
            full_name: profile?.full_name || null,
            avatar_url: profile?.avatar_url || null,
          };
        });
      }
      setRecentMembers(recentMembersTransformed);

      // 3. Fetch courses
      const { data: coursesData, count: coursesCount } = await supabase
        .from('courses')
        .select('id, title', { count: 'exact' })
        .eq('org_id', profile.org_id);

      const courseIds = coursesData?.map(c => c.id) || [];

      // 4. Calculate stats
      let totalCertificates = 0;
      let activeThisWeek = 0;
      let totalStudySeconds = 0;
      let avgCompletionRate = 0;
      const topCoursesData: TopCourse[] = [];

      if (courseIds.length > 0) {
        // Certificates count
        const { count: certsCount } = await supabase
          .from('certificates')
          .select('*', { count: 'exact', head: true })
          .in('course_id', courseIds);
        totalCertificates = certsCount || 0;

        // Enrollments for completion rate
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('course_id, status')
          .in('course_id', courseIds);

        const totalEnrollments = enrollments?.length || 0;
        const completedEnrollments = enrollments?.filter(e => e.status === 'completed').length || 0;
        avgCompletionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;

        // Course stats for top courses
        for (const course of coursesData || []) {
          const courseEnrollments = enrollments?.filter(e => e.course_id === course.id) || [];
          const courseTotal = courseEnrollments.length;
          const courseCompleted = courseEnrollments.filter(e => e.status === 'completed').length;
          const courseCompletionRate = courseTotal > 0 ? (courseCompleted / courseTotal) * 100 : 0;

          topCoursesData.push({
            id: course.id,
            title: course.title,
            enrollments_count: courseTotal,
            completion_rate: courseCompletionRate,
          });
        }

        // Sort by enrollments
        topCoursesData.sort((a, b) => b.enrollments_count - a.enrollments_count);
        setTopCourses(topCoursesData.slice(0, 5));
      }

      // Active members this week (from org_members)
      if (membersData && membersData.length > 0) {
        const memberUserIds = membersData.map((m: any) => m.user_id);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const { data: activeSessionsData } = await supabase
          .from('study_sessions')
          .select('user_id, duration_seconds')
          .in('user_id', memberUserIds)
          .gte('started_at', weekAgo.toISOString());

        // Count unique active users
        const uniqueActiveUsers = new Set(activeSessionsData?.map(s => s.user_id) || []);
        activeThisWeek = uniqueActiveUsers.size;

        // Total study hours
        totalStudySeconds = activeSessionsData?.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) || 0;
      }

      setStats({
        totalMembers: membersCount || 0,
        activeThisWeek,
        totalCourses: coursesCount || 0,
        totalCertificates,
        averageCompletionRate: avgCompletionRate,
        totalStudyHours: Math.round(totalStudySeconds / 3600),
      });

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.org_id) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.org_id}/logo.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('organization-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('organization-logos')
        .getPublicUrl(fileName);

      // Update organization
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ logo_url: urlData.publicUrl })
        .eq('id', profile.org_id);

      if (updateError) throw updateError;

      setOrganization({ ...organization, logo_url: urlData.publicUrl });
      toast.success('Logo uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {/* Organization Logo */}
          <div className="relative group">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center overflow-hidden border-2 border-white dark:border-slate-800 shadow-lg">
              {organization?.logo_url ? (
                <img src={organization.logo_url} alt={organization.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="h-8 w-8 text-white" />
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
              <Upload className="h-5 w-5 text-white" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
              />
            </label>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {organization?.name || 'Organization'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Dashboard Overview
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/org/invite')}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite
          </Button>
          <Button
            onClick={() => navigate('/org/courses/create')}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Course
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-card/50 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.totalMembers}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.activeThisWeek}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.totalCourses}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.totalCertificates}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Certs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg">
                <Target className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.averageCompletionRate.toFixed(0)}%
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Completion</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.totalStudyHours}h
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Study</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Members */}
        <Card className="bg-card/50 backdrop-blur-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Recent Members
              </CardTitle>
              <Link 
                to="/org/members"
                className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentMembers.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No members yet</p>
                <Button
                  variant="link"
                  onClick={() => navigate('/org/invite')}
                  className="text-purple-600"
                >
                  Invite your first member
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-3">
                      {member.avatar_url ? (
                        <img
                          src={member.avatar_url}
                          alt={member.full_name || 'Member'}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                          {member.full_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {member.full_name || 'Anonymous'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Joined {formatDate(member.joined_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Courses */}
        <Card className="bg-card/50 backdrop-blur-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Top Courses
              </CardTitle>
              <Link 
                to="/org/courses"
                className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {topCourses.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No courses yet</p>
                <Button
                  variant="link"
                  onClick={() => navigate('/org/courses/create')}
                  className="text-purple-600"
                >
                  Create your first course
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {topCourses.map((course, index) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                        #{index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white truncate">
                          {course.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {course.enrollments_count} students
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {course.completion_rate.toFixed(0)}%
                      </p>
                      <Progress value={course.completion_rate} className="h-1 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card className="bg-card/50 backdrop-blur-md">
        <CardHeader className="pb-3">
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-primary/5 dark:hover:bg-primary/10 hover:border-primary/30"
              onClick={() => navigate('/org/members')}
            >
              <Users className="h-6 w-6 text-purple-600" />
              <span>Manage Members</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300"
              onClick={() => navigate('/org/courses')}
            >
              <BookOpen className="h-6 w-6 text-blue-600" />
              <span>View Courses</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300"
              onClick={() => navigate('/org/invite')}
            >
              <UserPlus className="h-6 w-6 text-green-600" />
              <span>Invite Members</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300"
              onClick={() => navigate('/org/settings')}
            >
              <Settings className="h-6 w-6 text-slate-600" />
              <span>Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
