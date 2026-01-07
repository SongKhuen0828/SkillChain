import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Building2, 
  Mail, 
  User, 
  Phone, 
  Globe, 
  // Users, // Not used
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Search,
  Loader2,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

interface OrgRequest {
  id: string;
  org_name: string;
  org_description: string | null;
  org_website: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  reason: string | null;
  expected_members: number | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export function AdminOrgRequests() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<OrgRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog state
  const [selectedRequest, setSelectedRequest] = useState<OrgRequest | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('org_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load organization requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setProcessing(true);
    try {
      // Call the approve function
      const { data, error } = await supabase.rpc('approve_org_request', {
        p_request_id: selectedRequest.id
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Organization "${selectedRequest.org_name}" created successfully!`);
        toast.info(`Please create a user account for ${selectedRequest.contact_email} and send them the credentials.`);
        
        // Refresh the list
        fetchRequests();
        setShowApproveDialog(false);
        setSelectedRequest(null);
      } else {
        throw new Error(data?.error || 'Failed to approve request');
      }
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error(error.message || 'Failed to approve request');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('reject_org_request', {
        p_request_id: selectedRequest.id,
        p_reason: rejectionReason.trim()
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Request rejected');
        fetchRequests();
        setShowRejectDialog(false);
        setRejectionReason('');
        setSelectedRequest(null);
      } else {
        throw new Error(data?.error || 'Failed to reject request');
      }
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast.error(error.message || 'Failed to reject request');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesFilter = filter === 'all' || req.status === filter;
    const matchesSearch = 
      req.org_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.contact_email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
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
          <Building2 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          Organization Requests
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Review and approve organization registration requests
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-md cursor-pointer hover:bg-card/70 transition-colors" onClick={() => setFilter('all')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-500/10 rounded-lg">
                <FileText className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                <p className="text-xs text-slate-500">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`bg-card/50 backdrop-blur-md cursor-pointer hover:bg-card/70 transition-colors ${filter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`} onClick={() => setFilter('pending')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.pending}</p>
                <p className="text-xs text-slate-500">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`bg-card/50 backdrop-blur-md cursor-pointer hover:bg-card/70 transition-colors ${filter === 'approved' ? 'ring-2 ring-green-500' : ''}`} onClick={() => setFilter('approved')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.approved}</p>
                <p className="text-xs text-slate-500">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`bg-card/50 backdrop-blur-md cursor-pointer hover:bg-card/70 transition-colors ${filter === 'rejected' ? 'ring-2 ring-red-500' : ''}`} onClick={() => setFilter('rejected')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.rejected}</p>
                <p className="text-xs text-slate-500">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <Card className="bg-card/50 backdrop-blur-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Requests</CardTitle>
              <CardDescription>{filteredRequests.length} request(s)</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {request.org_name}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {request.contact_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {request.contact_email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(request.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {getStatusBadge(request.status)}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowDetailDialog(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    
                    {request.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowApproveDialog(true);
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowRejectDialog(true);
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-600" />
              {selectedRequest?.org_name}
            </DialogTitle>
            <DialogDescription>
              Application submitted on {selectedRequest && formatDate(selectedRequest.created_at)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedRequest.status)}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Contact Name</p>
                  <p className="font-medium">{selectedRequest.contact_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Contact Email</p>
                  <p className="font-medium">{selectedRequest.contact_email}</p>
                </div>
                {selectedRequest.contact_phone && (
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Phone</p>
                    <p className="font-medium">{selectedRequest.contact_phone}</p>
                  </div>
                )}
                {selectedRequest.org_website && (
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Website</p>
                    <a href={selectedRequest.org_website} target="_blank" rel="noopener noreferrer" className="font-medium text-purple-600 hover:underline">
                      {selectedRequest.org_website}
                    </a>
                  </div>
                )}
                {selectedRequest.expected_members && (
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Expected Members</p>
                    <p className="font-medium">{selectedRequest.expected_members}</p>
                  </div>
                )}
              </div>
              
              {selectedRequest.org_description && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Description</p>
                  <p className="text-sm bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">{selectedRequest.org_description}</p>
                </div>
              )}
              
              {selectedRequest.reason && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Reason for Joining</p>
                  <p className="text-sm bg-slate-100 dark:bg-slate-800 p-3 rounded-lg">{selectedRequest.reason}</p>
                </div>
              )}
              
              {selectedRequest.status === 'rejected' && selectedRequest.rejection_reason && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{selectedRequest.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Organization Request</DialogTitle>
            <DialogDescription>
              This will create a new organization "{selectedRequest?.org_name}". 
              You will need to manually create a user account for the contact person.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-300">
                <strong>Next steps after approval:</strong>
              </p>
              <ol className="list-decimal list-inside text-sm text-green-600 dark:text-green-400 mt-2 space-y-1">
                <li>Go to Supabase Authentication dashboard</li>
                <li>Create a new user with email: {selectedRequest?.contact_email}</li>
                <li>Set role to "org_admin" and link to the new organization</li>
                <li>Send login credentials to the contact person</li>
              </ol>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Approve & Create Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Organization Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting "{selectedRequest?.org_name}".
            </DialogDescription>
          </DialogHeader>
          
          <div>
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRejectDialog(false);
              setRejectionReason('');
            }} disabled={processing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing || !rejectionReason.trim()}>
              {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

