import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
// import { Button } from '@/components/ui/button' // Not used;
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Search,
  // Shield, // Not used
  UserCheck,
  Building2,
  GraduationCap,
  BookOpen,
  Crown
  // ChevronDown // Not used
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: string;
  full_name: string | null;
  role: string;
  org_id: string | null;
  organization_name: string | null;
  verification_status: string | null;
  created_at: string;
  avatar_url: string | null;
}

const ROLES = [
  { value: 'learner', label: 'Learner', icon: GraduationCap, color: 'bg-blue-500', textColor: 'text-blue-500' },
  { value: 'educator', label: 'Educator', icon: BookOpen, color: 'bg-cyan-500', textColor: 'text-cyan-500' },
  { value: 'org_admin', label: 'Org Admin', icon: Building2, color: 'bg-primary', textColor: 'text-primary' },
  { value: 'admin', label: 'Admin', icon: Crown, color: 'bg-amber-500', textColor: 'text-amber-500' },
];

export function AdminUsers() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          role,
          org_id,
          verification_status,
          created_at,
          avatar_url,
          organizations (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const usersWithOrg = (data || []).map((user: any) => ({
        ...user,
        organization_name: user.organizations?.name || null,
      }));

      setUsers(usersWithOrg);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      // Optimistic update
      setUsers(prev => 
        prev.map(u => u.id === userId ? { ...u, role: newRole } : u)
      );

      const { data, error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)
        .select();

      if (error) {
        fetchUsers();
        throw error;
      }

      if (!data || data.length === 0) {
        toast.error('Update failed. Check database permissions.');
        fetchUsers();
        return;
      }

      toast.success(`Role updated to ${newRole}`);
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error(`Failed to update role: ${error.message || 'Unknown error'}`);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (roleFilter === 'all') return matchesSearch;
    return matchesSearch && user.role === roleFilter;
  });

  const getRoleInfo = (role: string) => {
    return ROLES.find(r => r.value === role) || ROLES[0];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Users className="h-8 w-8 text-red-500" />
          User Management
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          View and manage all platform users
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', count: users.length, color: 'bg-slate-500', icon: Users },
          { label: 'Learners', count: users.filter(u => u.role === 'learner').length, color: 'bg-blue-500', icon: GraduationCap },
          { label: 'Educators', count: users.filter(u => u.role === 'educator').length, color: 'bg-cyan-500', icon: BookOpen },
          { label: 'Org Admins', count: users.filter(u => u.role === 'org_admin').length, color: 'bg-primary', icon: Building2 },
          { label: 'Admins', count: users.filter(u => u.role === 'admin').length, color: 'bg-amber-500', icon: Crown },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="bg-card/50 backdrop-blur-md border-slate-700/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.color}/20`}>
                    <Icon className={`h-5 w-5 ${stat.color.replace('bg-', 'text-')}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.count}</p>
                    <p className="text-xs text-slate-500">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Users Table */}
      <Card className="bg-card/50 backdrop-blur-md border-slate-700/50">
        <CardHeader className="border-b border-slate-700/50">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>{filteredUsers.length} users</CardDescription>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px] bg-slate-800/50 border-slate-700">
                  <SelectValue placeholder="Filter role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="learner">Learner</SelectItem>
                  <SelectItem value="educator">Educator</SelectItem>
                  <SelectItem value="org_admin">Org Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-800/50 border-slate-700"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-800/30 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700/50">
            <div className="col-span-4">User</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Organization</div>
            <div className="col-span-2">Joined</div>
          </div>

          {/* Table Body */}
          <div className="max-h-[550px] overflow-y-auto divide-y divide-slate-700/30">
            {filteredUsers.map((user) => {
              const roleInfo = getRoleInfo(user.role);
              const RoleIcon = roleInfo.icon;

              return (
                <div
                  key={user.id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-800/30 transition-colors"
                >
                  {/* User Info */}
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden ${roleInfo.color}/20 ring-2 ring-offset-2 ring-offset-slate-900 ${roleInfo.color.replace('bg-', 'ring-')}/50`}>
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name || ''} className="w-10 h-10 object-cover" />
                      ) : (
                        <span className={`text-lg font-bold ${roleInfo.textColor}`}>
                          {user.full_name?.charAt(0) || 'U'}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">
                        {user.full_name || 'Unnamed User'}
                      </p>
                      <p className="text-xs text-slate-500 font-mono truncate">
                        {user.id.substring(0, 8)}...
                      </p>
                    </div>
                  </div>

                  {/* Role Selector */}
                  <div className="col-span-2">
                    <Select
                      value={user.role}
                      onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                    >
                      <SelectTrigger className={`w-full h-9 ${roleInfo.color}/10 border-0 hover:${roleInfo.color}/20 transition-colors`}>
                        <div className="flex items-center gap-2">
                          <RoleIcon className={`h-4 w-4 ${roleInfo.textColor}`} />
                          <span className={`text-sm font-medium ${roleInfo.textColor}`}>
                            {roleInfo.label}
                          </span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => {
                          const Icon = role.icon;
                          return (
                            <SelectItem key={role.value} value={role.value}>
                              <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${role.textColor}`} />
                                <span>{role.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    {user.role === 'educator' ? (
                      user.verification_status === 'verified' ? (
                        <Badge className="bg-green-500/20 text-green-400 border-0 gap-1">
                          <UserCheck className="h-3 w-3" />
                          Verified
                        </Badge>
                      ) : user.verification_status === 'rejected' ? (
                        <Badge className="bg-red-500/20 text-red-400 border-0">
                          Rejected
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/20 text-amber-400 border-0">
                          Pending
                        </Badge>
                      )
                    ) : (
                      <span className="text-sm text-slate-500">—</span>
                    )}
                  </div>

                  {/* Organization */}
                  <div className="col-span-2">
                    {user.organization_name ? (
                      <div className="flex items-center gap-1.5 text-sm text-slate-300">
                        <Building2 className="h-3.5 w-3.5 text-purple-400" />
                        <span className="truncate">{user.organization_name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500">—</span>
                    )}
                  </div>

                  {/* Joined Date */}
                  <div className="col-span-2 text-sm text-slate-400">
                    {formatDate(user.created_at)}
                  </div>
                </div>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="py-12 text-center text-slate-500">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No users found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
