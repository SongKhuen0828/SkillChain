import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Copy, 
  Check, 
  UserPlus, 
  Link as LinkIcon,
  Trash2,
  RefreshCw,
  Calendar,
  Users,
  AlertCircle,
  Globe,
  Mail,
  Search,
  GraduationCap,
  Send
} from 'lucide-react';
import { toast } from 'sonner';

interface InviteCode {
  id: string;
  code: string;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  target_role: string;
}

interface PublicLearner {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export function OrgInvite() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // Public learners
  const [publicLearners, setPublicLearners] = useState<PublicLearner[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingLearners, setLoadingLearners] = useState(false);
  const [sendingInvite, setSendingInvite] = useState<string | null>(null);
  
  // Form state
  const [maxUses, setMaxUses] = useState<string>('10');
  const [expiresInDays, setExpiresInDays] = useState<string>('7');

  useEffect(() => {
    fetchInviteCodes();
    fetchPublicLearners();
  }, [profile?.org_id]);

  const fetchInviteCodes = async () => {
    if (!profile?.org_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('org_invite_codes')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInviteCodes(data || []);
    } catch (error: any) {
      console.error('Error fetching invite codes:', error);
      toast.error('Failed to load invite codes');
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicLearners = async () => {
    if (!profile?.org_id) return;

    try {
      setLoadingLearners(true);
      
      // Fetch learners who have public profiles and are not already in any organization
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, created_at')
        .eq('profile_public', true)
        .eq('role', 'learner')
        .is('org_id', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setPublicLearners(data || []);
    } catch (error: any) {
      console.error('Error fetching public learners:', error);
    } finally {
      setLoadingLearners(false);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateInvite = async () => {
    if (!profile?.org_id) return;

    try {
      setGenerating(true);
      
      const code = generateCode();
      const expiresAt = expiresInDays 
        ? new Date(Date.now() + parseInt(expiresInDays) * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { error } = await supabase
        .from('org_invite_codes')
        .insert({
          org_id: profile.org_id,
          code,
          max_uses: maxUses ? parseInt(maxUses) : null,
          current_uses: 0,
          expires_at: expiresAt,
          is_active: true,
          created_by: profile.id,
          target_role: 'learner', // Always target learners
        });

      if (error) throw error;

      toast.success('Invite code created successfully');
      fetchInviteCodes();
    } catch (error: any) {
      console.error('Error creating invite code:', error);
      toast.error('Failed to create invite code');
    } finally {
      setGenerating(false);
    }
  };

  const handleSendInvite = async (learnerId: string) => {
    if (!profile?.org_id) return;

    try {
      setSendingInvite(learnerId);
      
      // Generate a personal invite code
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Create the invite code
      const { error: codeError } = await supabase
        .from('org_invite_codes')
        .insert({
          org_id: profile.org_id,
          code,
          max_uses: 1,
          current_uses: 0,
          expires_at: expiresAt,
          is_active: true,
          created_by: profile.id,
          target_role: 'learner',
        });

      if (codeError) throw codeError;

      // Send notification to learner
      const { error: notifError } = await supabase.rpc('send_org_invitation', {
        p_org_id: profile.org_id,
        p_user_id: learnerId,
        p_invite_code: code,
      });

      if (notifError) {
        console.error('Notification error:', notifError);
        // Continue even if notification fails
      }

      toast.success('Invitation sent successfully! The learner will receive a notification.');
      
      // Remove from list (they'll have a pending invite)
      setPublicLearners(prev => prev.filter(l => l.id !== learnerId));
    } catch (error: any) {
      console.error('Error sending invite:', error);
      toast.error('Failed to send invitation');
    } finally {
      setSendingInvite(null);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('org_invite_codes')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast.success('Invite code deactivated');
      fetchInviteCodes();
    } catch (error: any) {
      console.error('Error deactivating invite code:', error);
      toast.error('Failed to deactivate invite code');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const filteredLearners = publicLearners.filter(learner => 
    learner.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <UserPlus className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          Invite Learners
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Invite learners to join your organization and access exclusive courses
        </p>
      </div>

      <Tabs defaultValue="discover" className="space-y-6">
        <TabsList className="bg-slate-100 dark:bg-slate-800">
          <TabsTrigger value="discover" className="gap-2">
            <Globe className="h-4 w-4" />
            Discover Learners
          </TabsTrigger>
          <TabsTrigger value="codes" className="gap-2">
            <LinkIcon className="h-4 w-4" />
            Invite Codes
          </TabsTrigger>
        </TabsList>

        {/* Discover Learners Tab */}
        <TabsContent value="discover" className="space-y-6">
          <Card className="bg-card/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Public Profile Learners
              </CardTitle>
              <CardDescription>
                Learners who have made their profiles discoverable. Send them an invitation to join your organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search learners by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              {loadingLearners ? (
                <div className="py-12 text-center text-slate-500">Loading...</div>
              ) : filteredLearners.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No public learners found</p>
                  <p className="text-sm mt-1">Learners can enable profile discovery in their settings</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {filteredLearners.map((learner) => (
                    <div
                      key={learner.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-center gap-3">
                        {learner.avatar_url ? (
                          <img 
                            src={learner.avatar_url} 
                            alt={learner.full_name || 'Learner'}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                            {learner.full_name?.charAt(0).toUpperCase() || '?'}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {learner.full_name || 'Anonymous Learner'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Joined {formatDate(learner.created_at)}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleSendInvite(learner.id)}
                        disabled={sendingInvite === learner.id}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {sendingInvite === learner.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-1" />
                            Invite
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invite Codes Tab */}
        <TabsContent value="codes" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create New Invite */}
            <Card className="bg-card/50 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Create Invite Code
                </CardTitle>
                <CardDescription>
                  Generate a shareable code for learners to join
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="maxUses">Maximum Uses</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800"
                  />
                  <p className="text-xs text-slate-500">Leave empty for unlimited uses</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiresIn">Expires In (Days)</Label>
                  <Input
                    id="expiresIn"
                    type="number"
                    min="1"
                    placeholder="Never"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800"
                  />
                  <p className="text-xs text-slate-500">Leave empty for no expiration</p>
                </div>

                <Button 
                  onClick={handleCreateInvite}
                  disabled={generating}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Generate Invite Code
                    </>
                  )}
                </Button>

                {/* How it works */}
                <div className="mt-6 p-4 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20 dark:border-primary/30">
                  <h4 className="font-semibold text-foreground mb-2">
                    How it works
                  </h4>
                  <ol className="text-sm text-purple-800 dark:text-purple-200 space-y-1 list-decimal list-inside">
                    <li>Generate an invite code</li>
                    <li>Share the code with learners</li>
                    <li>They enter the code in their Settings</li>
                    <li>They join your organization and access your courses</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Active Invite Codes */}
            <Card className="bg-card/50 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Active Invite Codes
                </CardTitle>
                <CardDescription>
                  {inviteCodes.filter(c => c.is_active && !isExpired(c.expires_at)).length} active codes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {inviteCodes.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No invite codes yet</p>
                    <p className="text-sm">Create your first invite code to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {inviteCodes.map((code) => {
                      const expired = isExpired(code.expires_at);
                      const inactive = !code.is_active || expired;
                      
                      return (
                        <div
                          key={code.id}
                          className={`p-4 rounded-lg border ${
                            inactive 
                              ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60' 
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <code className="text-lg font-mono font-bold text-purple-600 dark:text-purple-400">
                                {code.code}
                              </code>
                              {inactive && (
                                <Badge variant="destructive" className="text-xs">
                                  {expired ? 'Expired' : 'Inactive'}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {!inactive && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleCopyCode(code.code)}
                                    className="h-8"
                                  >
                                    {copiedCode === code.code ? (
                                      <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeactivate(code.id)}
                                    className="h-8 text-red-500 hover:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {code.current_uses}/{code.max_uses || '∞'} uses
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Expires: {formatDate(code.expires_at)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
