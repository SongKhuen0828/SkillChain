import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  UserCheck, 
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Link as LinkIcon,
  Briefcase,
  Calendar,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { NotificationService } from '@/lib/notifications';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';

interface PendingEducator {
  id: string;
  full_name: string | null;
  professional_title: string | null;
  portfolio_url: string | null;
  verification_status: string | null;
  created_at: string;
  avatar_url: string | null;
}

export function AdminVerifications() {
  const [loading, setLoading] = useState(true);
  const [educators, setEducators] = useState<PendingEducator[]>([]);
  const [selectedEducator, setSelectedEducator] = useState<PendingEducator | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchEducators();
  }, []);

  const fetchEducators = async () => {
    try {
      setLoading(true);
      
      // Only fetch educators (not learners)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, professional_title, portfolio_url, verification_status, created_at, avatar_url')
        .eq('role', 'educator')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEducators(data || []);
    } catch (error) {
      console.error('Error fetching educators:', error);
      toast.error('Failed to load verification requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedEducator) return;

    try {
      setProcessing(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({ verification_status: 'verified' })
        .eq('id', selectedEducator.id);

      if (error) throw error;

      // Update local state immediately
      setEducators(prev => 
        prev.map(e => 
          e.id === selectedEducator.id 
            ? { ...e, verification_status: 'verified' } 
            : e
        )
      );

      // Send notification to educator
      await NotificationService.educatorApproved(
        selectedEducator.id,
        selectedEducator.full_name || 'Educator'
      );

      toast.success(`${selectedEducator.full_name || 'Educator'} has been verified`);
      setShowApproveDialog(false);
      setSelectedEducator(null);
    } catch (error) {
      console.error('Error approving educator:', error);
      toast.error('Failed to approve educator');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedEducator) return;

    try {
      setProcessing(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({ verification_status: 'rejected' })
        .eq('id', selectedEducator.id);

      if (error) throw error;

      // Update local state immediately
      setEducators(prev => 
        prev.map(e => 
          e.id === selectedEducator.id 
            ? { ...e, verification_status: 'rejected' } 
            : e
        )
      );

      // Send notification to educator
      await NotificationService.educatorRejected(
        selectedEducator.id,
        selectedEducator.full_name || 'Educator',
        rejectReason || undefined
      );

      toast.success(`${selectedEducator.full_name || 'Educator'} has been rejected`);
      setShowRejectDialog(false);
      setSelectedEducator(null);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting educator:', error);
      toast.error('Failed to reject educator');
    } finally {
      setProcessing(false);
    }
  };

  const pendingEducators = educators.filter(e => e.verification_status === 'pending' || !e.verification_status);
  const verifiedEducators = educators.filter(e => e.verification_status === 'verified');
  const rejectedEducators = educators.filter(e => e.verification_status === 'rejected');

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
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
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
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <UserCheck className="h-8 w-8 text-red-500" />
          Educator Verifications
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Review educator applications and verify their credentials
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-amber-500/20 rounded-xl">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{pendingEducators.length}</p>
              <p className="text-sm text-slate-500">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-500/20 rounded-xl">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{verifiedEducators.length}</p>
              <p className="text-sm text-slate-500">Verified</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/20 to-red-600/10 border-red-500/30">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-red-500/20 rounded-xl">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{rejectedEducators.length}</p>
              <p className="text-sm text-slate-500">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Verifications */}
      <Card className="bg-card/50 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Pending Applications
          </CardTitle>
          <CardDescription>
            {pendingEducators.length} educator{pendingEducators.length !== 1 ? 's' : ''} awaiting review
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingEducators.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm">No pending applications to review</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingEducators.map((educator) => (
                <div
                  key={educator.id}
                  className="p-5 bg-gradient-to-r from-amber-500/5 to-transparent rounded-xl border border-amber-500/20 hover:border-amber-500/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {educator.avatar_url ? (
                          <img src={educator.avatar_url} alt="" className="w-14 h-14 object-cover" />
                        ) : (
                          <span className="text-xl font-bold text-white">
                            {educator.full_name?.charAt(0) || 'E'}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                            {educator.full_name || 'Unnamed Educator'}
                          </h3>
                          <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        </div>
                        
                        {/* Professional Title */}
                        {educator.professional_title && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <Briefcase className="h-4 w-4 text-slate-400" />
                            <span className="font-medium">{educator.professional_title}</span>
                          </div>
                        )}

                        {/* Portfolio URL */}
                        {educator.portfolio_url && (
                          <a
                            href={educator.portfolio_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-cyan-500 hover:text-cyan-400 transition-colors"
                          >
                            <LinkIcon className="h-4 w-4" />
                            <span className="underline">{educator.portfolio_url.replace(/^https?:\/\//, '').substring(0, 40)}...</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}

                        {/* Registration Date */}
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Calendar className="h-3 w-3" />
                          Applied {formatDate(educator.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {educator.portfolio_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a
                            href={educator.portfolio_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Portfolio
                          </a>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 border-red-500/50 hover:bg-red-500/10"
                        onClick={() => {
                          setSelectedEducator(educator);
                          setShowRejectDialog(true);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 text-white"
                        onClick={() => {
                          setSelectedEducator(educator);
                          setShowApproveDialog(true);
                        }}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verified Educators */}
      {verifiedEducators.length > 0 && (
        <Card className="bg-card/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Verified Educators
            </CardTitle>
            <CardDescription>
              {verifiedEducators.length} approved educator{verifiedEducators.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {verifiedEducators.map((educator) => (
                <div
                  key={educator.id}
                  className="p-4 bg-green-500/5 rounded-lg border border-green-500/20 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {educator.avatar_url ? (
                      <img src={educator.avatar_url} alt="" className="w-10 h-10 object-cover" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">
                      {educator.full_name || 'Unnamed'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {educator.professional_title || 'Educator'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejected Educators */}
      {rejectedEducators.length > 0 && (
        <Card className="bg-card/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Rejected Applications
            </CardTitle>
            <CardDescription>
              {rejectedEducators.length} rejected application{rejectedEducators.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {rejectedEducators.map((educator) => (
                <div
                  key={educator.id}
                  className="p-4 bg-red-500/5 rounded-lg border border-red-500/20 flex items-center gap-3 opacity-60"
                >
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {educator.avatar_url ? (
                      <img src={educator.avatar_url} alt="" className="w-10 h-10 object-cover" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">
                      {educator.full_name || 'Unnamed'}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {educator.professional_title || 'Educator'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approve Dialog */}
      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Approve Educator
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>You are about to verify <strong>{selectedEducator?.full_name}</strong>.</p>
                {selectedEducator?.professional_title && (
                  <p className="text-sm">
                    <span className="text-slate-500">Title:</span>{' '}
                    <span className="font-medium">{selectedEducator.professional_title}</span>
                  </p>
                )}
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  This will allow them to create and publish courses on the platform.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={processing}
              className="bg-green-500 hover:bg-green-600"
            >
              {processing ? 'Approving...' : 'Approve Educator'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Reject Application
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to reject <strong>{selectedEducator?.full_name}</strong>'s application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Reason for rejection (optional - will be sent to applicant)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="bg-slate-50 dark:bg-slate-800"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={processing}
              className="bg-red-500 hover:bg-red-600"
            >
              {processing ? 'Rejecting...' : 'Reject Application'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
