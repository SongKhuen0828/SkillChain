import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  BookOpen, 
  Award, 
  Building2,
  TrendingUp,
  Shield,
  UserCheck,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface PlatformStats {
  totalUsers: number;
  totalLearners: number;
  totalEducators: number;
  totalOrgAdmins: number;
  totalOrganizations: number;
  totalCourses: number;
  totalCertificates: number;
  pendingVerifications: number;
}

interface RecentActivity {
  type: 'user' | 'course' | 'certificate' | 'org';
  message: string;
  timestamp: string;
}

export function AdminDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    totalLearners: 0,
    totalEducators: 0,
    totalOrgAdmins: 0,
    totalOrganizations: 0,
    totalCourses: 0,
    totalCertificates: 0,
    pendingVerifications: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all counts in parallel
      const [
        { count: usersCount },
        { count: learnersCount },
        { count: educatorsCount },
        { count: orgAdminsCount },
        { count: orgsCount },
        { count: coursesCount },
        { count: certsCount },
        { count: pendingCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'learner'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'educator'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'org_admin'),
        supabase.from('organizations').select('*', { count: 'exact', head: true }),
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase.from('certificates').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .eq('role', 'educator')
          .eq('verification_status', 'pending'),
      ]);

      setStats({
        totalUsers: usersCount || 0,
        totalLearners: learnersCount || 0,
        totalEducators: educatorsCount || 0,
        totalOrgAdmins: orgAdminsCount || 0,
        totalOrganizations: orgsCount || 0,
        totalCourses: coursesCount || 0,
        totalCertificates: certsCount || 0,
        pendingVerifications: pendingCount || 0,
      });
    } catch (error) {
      console.error('Error fetching admin dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Shield className="h-8 w-8 text-red-500" />
            System Admin Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Platform-wide overview and management
          </p>
        </div>
      </div>

      {/* Pending Actions Alert */}
      {stats.pendingVerifications > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <span className="text-amber-600 dark:text-amber-400">
              <strong>{stats.pendingVerifications}</strong> educator verification{stats.pendingVerifications !== 1 ? 's' : ''} pending review
            </span>
          </div>
          <Link to="/admin/verifications">
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600">
              Review Now
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {stats.totalUsers.toLocaleString()}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {stats.totalOrganizations.toLocaleString()}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Organizations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-500/10 rounded-xl">
                <BookOpen className="h-6 w-6 text-cyan-500" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {stats.totalCourses.toLocaleString()}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Courses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <Award className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {stats.totalCertificates.toLocaleString()}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Certificates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              User Breakdown
            </CardTitle>
            <CardDescription>
              Distribution of users by role
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Learners</span>
                <span className="font-semibold text-slate-900 dark:text-white">{stats.totalLearners}</span>
              </div>
              <Progress 
                value={stats.totalUsers > 0 ? (stats.totalLearners / stats.totalUsers) * 100 : 0} 
                className="h-2" 
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Educators</span>
                <span className="font-semibold text-slate-900 dark:text-white">{stats.totalEducators}</span>
              </div>
              <Progress 
                value={stats.totalUsers > 0 ? (stats.totalEducators / stats.totalUsers) * 100 : 0} 
                className="h-2" 
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">Org Admins</span>
                <span className="font-semibold text-slate-900 dark:text-white">{stats.totalOrgAdmins}</span>
              </div>
              <Progress 
                value={stats.totalUsers > 0 ? (stats.totalOrgAdmins / stats.totalUsers) * 100 : 0} 
                className="h-2" 
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-card/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              Quick Actions
            </CardTitle>
            <CardDescription>
              Common administrative tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/admin/users" className="block">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-500" />
                  <span className="font-medium text-slate-900 dark:text-white">Manage Users</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            <Link to="/admin/organizations" className="block">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-purple-500" />
                  <span className="font-medium text-slate-900 dark:text-white">Manage Organizations</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            <Link to="/admin/verifications" className="block">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-5 w-5 text-amber-500" />
                  <span className="font-medium text-slate-900 dark:text-white">Review Verifications</span>
                  {stats.pendingVerifications > 0 && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500 text-white">
                      {stats.pendingVerifications}
                    </span>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            <Link to="/admin/blockchain" className="block">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <Award className="h-5 w-5 text-purple-500" />
                  <span className="font-medium text-slate-900 dark:text-white">Blockchain Settings</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            <Link to="/admin/ai" className="block">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-cyan-500" />
                  <span className="font-medium text-slate-900 dark:text-white">AI Settings</span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

