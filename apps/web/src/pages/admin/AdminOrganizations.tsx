import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Building2, 
  Search,
  Users,
  BookOpen,
  Award,
  Plus,
  Globe,
  Mail,
  Loader2,
  Copy,
  CheckCircle2,
  User,
  Key,
  Send,
  Sparkles,
  // TrendingUp, // Not used
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  contact_email: string | null;
  created_at: string;
  educators_count: number;
  courses_count: number;
  certificates_count: number;
}

export function AdminOrganizations() {
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    orgName: string;
    emailSent: boolean;
    emailProvider?: string;
    emailError?: string | null;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Create form state
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDescription, setNewOrgDescription] = useState('');
  const [newOrgWebsite, setNewOrgWebsite] = useState('');
  const [newOrgEmail, setNewOrgEmail] = useState('');
  const [newContactName, setNewContactName] = useState('');

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get stats for each organization
      const orgsWithStats = await Promise.all(
        (orgs || []).map(async (org) => {
          // Get educators count
          const { count: educatorsCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', org.id)
            .eq('role', 'educator');

          // Get courses count
          const { count: coursesCount } = await supabase
            .from('courses')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', org.id);

          // Get courses for certificates count
          const { data: courses } = await supabase
            .from('courses')
            .select('id')
            .eq('org_id', org.id);

          let certificatesCount = 0;
          if (courses && courses.length > 0) {
            const courseIds = courses.map(c => c.id);
            const { count } = await supabase
              .from('certificates')
              .select('*', { count: 'exact', head: true })
              .in('course_id', courseIds);
            certificatesCount = count || 0;
          }

          return {
            ...org,
            educators_count: educatorsCount || 0,
            courses_count: coursesCount || 0,
            certificates_count: certificatesCount,
          };
        })
      );

      setOrganizations(orgsWithStats);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) {
      toast.error('Organization name is required');
      return;
    }
    if (!newOrgEmail.trim()) {
      toast.error('Admin email is required');
      return;
    }

    try {
      setCreating(true);
      
      // Call Edge Function to create org + admin user + send email
      const { data, error } = await supabase.functions.invoke('create-org-admin', {
        body: {
          orgName: newOrgName.trim(),
          orgDescription: newOrgDescription.trim() || null,
          orgWebsite: newOrgWebsite.trim() || null,
          contactEmail: newOrgEmail.trim().toLowerCase(),
          contactName: newContactName.trim() || null,
        },
      });

      console.log('Edge Function response:', { data, error });

      if (error) {
        console.error('Edge Function error:', error);
        // Try to extract error message from error object
        const errorMessage = error.message || error.toString() || 'Failed to create organization';
        throw new Error(errorMessage);
      }
      
      if (data?.error) {
        console.error('Edge Function returned error:', data);
        // Show detailed error if available
        const errorMsg = data.details 
          ? `${data.error}: ${typeof data.details === 'string' ? data.details : JSON.stringify(data.details)}`
          : data.error;
        throw new Error(errorMsg);
      }
      
      if (!data || !data.success) {
        throw new Error(data?.error || 'Unknown error occurred');
      }

      // Show success with credentials
      setCreatedCredentials({
        email: data.user.email,
        password: data.user.tempPassword,
        orgName: newOrgName,
        emailSent: data.emailSent,
        emailProvider: data.emailProvider || null,
        emailError: data.emailError || null,
      });
      
      setShowCreateDialog(false);
      setShowSuccessDialog(true);
      
      // Reset form
      setNewOrgName('');
      setNewOrgDescription('');
      setNewOrgWebsite('');
      setNewOrgEmail('');
      setNewContactName('');
      
      fetchOrganizations();
      
      if (data.emailSent) {
        const provider = data.emailProvider ? ` via ${data.emailProvider}` : '';
        toast.success(`Organization created and welcome email sent${provider}!`);
      } else {
        toast.success('Organization created! Please share credentials manually.');
      }
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast.error(error.message || 'Failed to create organization');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            Organizations
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2">
            <span>Manage all organizations on the platform</span>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
              {organizations.length} total
            </span>
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white shadow-lg shadow-cyan-500/30 border-0">
                <Sparkles className="h-4 w-4 mr-2" />
                Create Organization
              </Button>
            </motion.div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                Create New Organization
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400">
                Create an organization and automatically set up an admin account. 
                A welcome email with login credentials will be sent.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Organization Info */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
              >
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <div className="w-6 h-6 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-cyan-500" />
                  </div>
                  Organization Details
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="orgName" className="text-slate-700 dark:text-slate-300">Organization Name *</Label>
                  <Input
                    id="orgName"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="Enter organization name"
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus:border-cyan-500 focus:ring-cyan-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgDesc" className="text-slate-700 dark:text-slate-300">Description</Label>
                  <Textarea
                    id="orgDesc"
                    value={newOrgDescription}
                    onChange={(e) => setNewOrgDescription(e.target.value)}
                    placeholder="Brief description of the organization"
                    rows={2}
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus:border-cyan-500 focus:ring-cyan-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgWebsite" className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    Website
                  </Label>
                  <Input
                    id="orgWebsite"
                    type="url"
                    value={newOrgWebsite}
                    onChange={(e) => setNewOrgWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus:border-cyan-500 focus:ring-cyan-500/20"
                  />
                </div>
              </motion.div>
              
              {/* Admin Info */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
              >
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <User className="h-4 w-4 text-purple-500" />
                  </div>
                  Admin Account (will be created automatically)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="contactName" className="text-slate-700 dark:text-slate-300">Admin Name</Label>
                    <Input
                      id="contactName"
                      value={newContactName}
                      onChange={(e) => setNewContactName(e.target.value)}
                      placeholder="John Doe"
                      className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus:border-purple-500 focus:ring-purple-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orgEmail" className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Admin Email *
                    </Label>
                    <Input
                      id="orgEmail"
                      type="email"
                      value={newOrgEmail}
                      onChange={(e) => setNewOrgEmail(e.target.value)}
                      placeholder="admin@org.com"
                      className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus:border-purple-500 focus:ring-purple-500/20"
                    />
                  </div>
                </div>
                <Alert className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-cyan-500/30">
                  <Send className="h-4 w-4 text-cyan-500" />
                  <AlertDescription className="text-sm text-slate-700 dark:text-slate-300">
                    ✨ A welcome email with login credentials will be sent to this address.
                  </AlertDescription>
                </Alert>
              </motion.div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateOrg} 
                disabled={creating || !newOrgName.trim() || !newOrgEmail.trim()}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create & Send Email
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success Dialog with Credentials */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="sm:max-w-md bg-slate-50 dark:bg-slate-900">
            <DialogHeader>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30"
              >
                <CheckCircle2 className="h-8 w-8 text-white" />
              </motion.div>
              <DialogTitle className="flex items-center justify-center gap-2 text-2xl text-emerald-600 dark:text-emerald-400">
                Organization Created!
              </DialogTitle>
              <DialogDescription className="text-center text-slate-600 dark:text-slate-400">
                {createdCredentials?.emailSent 
                  ? `✨ A welcome email has been sent to ${createdCredentials?.email}${createdCredentials?.emailProvider ? ` via ${createdCredentials.emailProvider}` : ''}`
                  : 'Please share the login credentials with the admin manually.'
                }
              </DialogDescription>
            </DialogHeader>
            
            {createdCredentials && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4 py-4"
              >
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 rounded-xl p-5 space-y-4 border border-amber-200/50 dark:border-amber-800/50 shadow-lg">
                  <h4 className="font-semibold text-base flex items-center gap-2 text-slate-900 dark:text-white">
                    <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                      <Key className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    Login Credentials for {createdCredentials.orgName}
                  </h4>
                  
                  <div className="space-y-3">
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 shadow-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          Email
                        </p>
                        <p className="font-mono text-sm text-slate-900 dark:text-white truncate">{createdCredentials.email}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(createdCredentials.email, 'email')}
                        className="ml-2 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        {copiedField === 'email' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </motion.div>
                    
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700 shadow-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                          <Key className="h-3 w-3" />
                          Password
                        </p>
                        <p className="font-mono text-sm text-slate-900 dark:text-white truncate">{createdCredentials.password}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(createdCredentials.password, 'password')}
                        className="ml-2 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        {copiedField === 'password' ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </motion.div>
                  </div>
                </div>
                
                {!createdCredentials.emailSent && (
                  <Alert className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30">
                    <AlertDescription className="text-sm text-slate-700 dark:text-slate-300">
                      {createdCredentials.emailError ? (
                        <>
                          ⚠️ <strong>Email failed:</strong> {createdCredentials.emailError}
                          <br />
                          <span className="text-xs mt-1 block text-slate-600 dark:text-slate-400">
                            Please share these credentials manually.
                          </span>
                        </>
                      ) : (
                        <>
                          ⚠️ Email service not configured. Please share these credentials manually.
                          <br />
                          <span className="text-xs mt-2 block text-slate-600 dark:text-slate-400">
                            To enable email sending, configure one of these in Supabase Dashboard → Functions → create-org-admin → Secrets:
                            <br />
                            <strong className="text-cyan-400">Option 1 (SMTP):</strong>
                            <br />
                            <code className="bg-slate-700 dark:bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">SMTP_HOST</code>, <code className="bg-slate-700 dark:bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">SMTP_PORT</code>, <code className="bg-slate-700 dark:bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">SMTP_USER</code>, <code className="bg-slate-700 dark:bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">SMTP_PASSWORD</code>
                            <br />
                            <strong className="text-cyan-400">Option 2 (API):</strong>
                            <br />
                            <code className="bg-slate-700 dark:bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">SENDGRID_API_KEY</code> or <code className="bg-slate-700 dark:bg-slate-800 px-1.5 py-0.5 rounded text-amber-300">RESEND_API_KEY</code>
                            <br />
                            <span className="text-xs mt-1 block text-slate-500 dark:text-slate-500">
                              See <code className="bg-slate-700 dark:bg-slate-800 px-1 py-0.5 rounded">SMTP_SETUP.md</code> for SMTP configuration details
                            </span>
                          </span>
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </motion.div>
            )}
            
            <DialogFooter>
              <Button 
                onClick={() => {
                  setShowSuccessDialog(false);
                  setCreatedCredentials(null);
                }}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white border-0 w-full"
              >
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Search */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative w-full md:w-64"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
        <Input
          placeholder="Search organizations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:border-cyan-500 focus:ring-cyan-500/20 shadow-sm"
        />
      </motion.div>

      {/* Organizations Grid */}
      <AnimatePresence mode="wait">
        {filteredOrgs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700 shadow-lg">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mb-6">
                  <Building2 className="h-10 w-10 text-slate-400" />
                </div>
                <p className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">No organizations found</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-sm">
                  Create your first organization to get started
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrgs.map((org, index) => (
              <motion.div
                key={org.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4 }}
              >
                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-cyan-500/5 group-hover:via-purple-500/5 group-hover:to-pink-500/5 transition-all duration-300 pointer-events-none" />
                  <CardHeader className="relative z-10">
                    <div className="flex items-start gap-4">
                      <motion.div 
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg shadow-cyan-500/30"
                      >
                        {org.logo_url ? (
                          <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="h-8 w-8 text-white" />
                        )}
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                          {org.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2 mt-1 text-slate-600 dark:text-slate-400">
                          {org.description || 'No description'}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="text-center p-3 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-xl border border-blue-200/50 dark:border-blue-800/50"
                      >
                        <div className="flex items-center justify-center gap-1 text-sm text-blue-600 dark:text-blue-400 mb-1">
                          <Users className="h-4 w-4" />
                        </div>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">
                          {org.educators_count}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Educators</p>
                      </motion.div>
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="text-center p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl border border-purple-200/50 dark:border-purple-800/50"
                      >
                        <div className="flex items-center justify-center gap-1 text-sm text-purple-600 dark:text-purple-400 mb-1">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">
                          {org.courses_count}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Courses</p>
                      </motion.div>
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="text-center p-3 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 rounded-xl border border-amber-200/50 dark:border-amber-800/50"
                      >
                        <div className="flex items-center justify-center gap-1 text-sm text-amber-600 dark:text-amber-400 mb-1">
                          <Award className="h-4 w-4" />
                        </div>
                        <p className="text-xl font-bold text-slate-900 dark:text-white">
                          {org.certificates_count}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Certs</p>
                      </motion.div>
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-2 text-sm pt-3 border-t border-slate-200 dark:border-slate-700">
                      {org.website && (
                        <motion.a 
                          href={org.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          whileHover={{ x: 4 }}
                          className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors group"
                        >
                          <Globe className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                          <span className="truncate">{org.website.replace(/^https?:\/\//, '')}</span>
                        </motion.a>
                      )}
                      {org.contact_email && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{org.contact_email}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Created {formatDate(org.created_at)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

