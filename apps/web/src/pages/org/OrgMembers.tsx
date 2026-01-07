import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Users, 
  Search, 
  GraduationCap,
  Award,
  TrendingUp,
  UserMinus,
  BookOpen,
  Target,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface Member {
  id: string;
  user_id: string;
  joined_at: string;
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  // Computed stats
  coursesCompleted: number;
  certificatesEarned: number;
  totalStudyHours: number;
  avgFocusScore: number;
}

export function OrgMembers() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeThisWeek: 0,
    avgCompletion: 0,
    totalCertificates: 0,
  });
  
  // Remove member dialog
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [profile?.org_id]);

  const fetchMembers = async () => {
    if (!profile?.org_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch members from org_members table (no join - org_members references auth.users, not profiles)
      const { data: membersData, error } = await supabase
        .from('org_members')
        .select('id, user_id, joined_at')
        .eq('org_id', profile.org_id)
        .order('joined_at', { ascending: false });

      if (error) throw error;

      if (!membersData || membersData.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }

      // Fetch profiles separately
      const userIds = membersData.map((m: any) => m.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

      // Fetch stats for each member
      const membersWithStats = await Promise.all(
        membersData.map(async (member: any) => {
          const memberProfile = profilesMap.get(member.user_id);
          
          // Get completed courses count
          const { count: coursesCompleted } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', member.user_id)
            .eq('status', 'completed');

          // Get certificates count
          const { count: certificatesEarned } = await supabase
            .from('certificates')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', member.user_id);

          // Get study sessions stats
          const { data: sessions } = await supabase
            .from('study_sessions')
            .select('duration_seconds, tab_switch_count, completed')
            .eq('user_id', member.user_id);

          const totalStudySeconds = sessions?.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) || 0;
          const totalStudyHours = Math.round(totalStudySeconds / 3600 * 10) / 10;
          
          // Calculate focus score (100 - avg tab switches * 5, min 0)
          const avgTabSwitches = sessions?.length 
            ? sessions.reduce((sum, s) => sum + (s.tab_switch_count || 0), 0) / sessions.length
            : 0;
          const avgFocusScore = Math.max(0, Math.round(100 - avgTabSwitches * 5));

          return {
            id: member.id,
            user_id: member.user_id,
            joined_at: member.joined_at,
            profile: memberProfile ? {
              id: memberProfile.id,
              full_name: memberProfile.full_name,
              avatar_url: memberProfile.avatar_url,
            } : null,
            coursesCompleted: coursesCompleted || 0,
            certificatesEarned: certificatesEarned || 0,
            totalStudyHours,
            avgFocusScore,
          };
        })
      );

      setMembers(membersWithStats);

      // Calculate overall stats
      const totalCerts = membersWithStats.reduce((sum, m) => sum + m.certificatesEarned, 0);
      const avgCompletion = membersWithStats.length 
        ? Math.round(membersWithStats.reduce((sum, m) => sum + m.coursesCompleted, 0) / membersWithStats.length * 10) / 10
        : 0;

      // Count active this week (members with study sessions in last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { count: activeCount } = await supabase
        .from('study_sessions')
        .select('user_id', { count: 'exact', head: true })
        .in('user_id', membersWithStats.map(m => m.user_id))
        .gte('started_at', weekAgo.toISOString());

      setStats({
        totalMembers: membersWithStats.length,
        activeThisWeek: activeCount || 0,
        avgCompletion,
        totalCertificates: totalCerts,
      });

    } catch (error: any) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove || !profile?.org_id) return;

    setRemoving(true);
    try {
      const { error } = await supabase
        .from('org_members')
        .delete()
        .eq('id', memberToRemove.id);

      if (error) throw error;

      setMembers(prev => prev.filter(m => m.id !== memberToRemove.id));
      setStats(prev => ({ ...prev, totalMembers: prev.totalMembers - 1 }));
      toast.success('Member removed from organization');
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    } finally {
      setRemoving(false);
      setShowRemoveDialog(false);
      setMemberToRemove(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredMembers = members.filter(member =>
    member.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Users className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          Members
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Manage learners in your organization
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.totalMembers}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.activeThisWeek}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Active This Week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.avgCompletion}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Avg. Courses Done</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <Award className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.totalCertificates}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Certificates Issued</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members List */}
      <Card className="bg-card/50 backdrop-blur-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                All Members
              </CardTitle>
              <CardDescription>
                {filteredMembers.length} member{filteredMembers.length !== 1 ? 's' : ''} in your organization
              </CardDescription>
            </div>
            
            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No members in your organization yet</p>
              <p className="text-sm mt-1">Invite learners to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                >
                  {/* Member Info */}
                  <div className="flex items-center gap-4">
                    {member.profile?.avatar_url ? (
                      <img
                        src={member.profile.avatar_url}
                        alt={member.profile.full_name || 'Member'}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-lg">
                        {member.profile?.full_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {member.profile?.full_name || 'Anonymous'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Calendar className="h-3 w-3" />
                        Joined {formatDate(member.joined_at)}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {member.coursesCompleted}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Courses</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {member.certificatesEarned}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Certificates</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900 dark:text-white">
                        {member.totalStudyHours}h
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Study Time</p>
                    </div>
                    
                    <div className="text-center w-20">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Target className="h-3 w-3 text-purple-500" />
                        <span className="text-lg font-bold text-slate-900 dark:text-white">
                          {member.avgFocusScore}%
                        </span>
                      </div>
                      <Progress value={member.avgFocusScore} className="h-1.5" />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Focus</p>
                    </div>

                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      onClick={() => {
                        setMemberToRemove(member);
                        setShowRemoveDialog(true);
                      }}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove Member Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <strong>{memberToRemove?.profile?.full_name || 'this member'}</strong> from your organization?
              They will lose access to organization-only courses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={removing}
              className="bg-red-600 hover:bg-red-700"
            >
              {removing ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

