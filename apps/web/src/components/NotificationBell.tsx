import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Bell, 
  CheckCircle2, 
  XCircle, 
  BookOpen, 
  Award, 
  UserPlus,
  Check,
  CheckCheck,
  Trash2,
  Clock,
  Building2,
  Loader2,
  GraduationCap,
  Trophy,
  BarChart3,
  PartyPopper,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [joiningOrg, setJoiningOrg] = useState<string | null>(null); // Track which notification is being processed

  const unreadCount = notifications.filter(n => !n.read).length;

  // Get navigation path based on notification type
  const getNotificationLink = (notification: Notification): string | null => {
    switch (notification.type) {
      case 'course_enrolled':
      case 'course_completed':
        return notification.data?.course_id ? `/course/${notification.data.course_id}` : '/courses';
      case 'certificate_earned':
        return '/certificates';
      case 'weekly_summary':
        return '/dashboard';
      case 'study_milestone':
        return '/dashboard';
      case 'new_student':
      case 'student_completed':
        return '/educator/analytics';
      default:
        return null;
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    await markAsRead(notification.id);
    
    // Navigate if there's a link
    const link = getNotificationLink(notification);
    if (link) {
      setOpen(false);
      navigate(link);
    }
  };

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to new notifications
    if (!user) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Handle accepting organization invitation
  const handleAcceptInvitation = async (notification: Notification) => {
    if (!notification.data?.invite_code) {
      toast.error('Invalid invitation');
      return;
    }

    setJoiningOrg(notification.id);
    
    try {
      const { data, error } = await supabase.rpc('join_organization_with_code', {
        p_code: notification.data.invite_code
      });

      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }

      console.log('Join org response:', data);

      if (data?.success) {
        toast.success(data.message || 'Successfully joined organization!');
        
        // Mark notification as read
        await markAsRead(notification.id);
        
        // Delete the invitation notification
        await deleteNotification(notification.id);
        
        // Refresh profile
        if (updateProfile) {
          await updateProfile();
        }
        
        // Close dropdown and reload page to show org content
        setOpen(false);
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        toast.error(data?.error || 'Failed to join organization');
      }
    } catch (error: any) {
      console.error('Error joining organization:', error);
      toast.error(error.message || 'Failed to join organization');
    } finally {
      setJoiningOrg(null);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'verification_approved':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'verification_rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'course_enrolled':
        return <BookOpen className="h-5 w-5 text-blue-500" />;
      case 'certificate_earned':
        return <Award className="h-5 w-5 text-amber-500" />;
      case 'new_student':
        return <UserPlus className="h-5 w-5 text-cyan-500" />;
      case 'org_invitation':
        return <Building2 className="h-5 w-5 text-purple-500" />;
      case 'course_completed':
        return <PartyPopper className="h-5 w-5 text-green-500" />;
      case 'student_completed':
        return <GraduationCap className="h-5 w-5 text-emerald-500" />;
      case 'weekly_summary':
        return <BarChart3 className="h-5 w-5 text-indigo-500" />;
      case 'study_milestone':
        return <Trophy className="h-5 w-5 text-amber-500" />;
      default:
        return <Bell className="h-5 w-5 text-slate-500" />;
    }
  };

  const getNotificationBg = (type: string, read: boolean) => {
    if (read) return 'bg-slate-50 dark:bg-slate-800/50';
    
    switch (type) {
      case 'verification_approved':
        return 'bg-green-50 dark:bg-green-900/20 border-l-4 border-l-green-500';
      case 'verification_rejected':
        return 'bg-red-50 dark:bg-red-900/20 border-l-4 border-l-red-500';
      case 'course_enrolled':
        return 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500';
      case 'certificate_earned':
        return 'bg-amber-50 dark:bg-amber-900/20 border-l-4 border-l-amber-500';
      case 'org_invitation':
        return 'bg-purple-50 dark:bg-purple-900/20 border-l-4 border-l-purple-500';
      case 'course_completed':
        return 'bg-green-50 dark:bg-green-900/20 border-l-4 border-l-green-500';
      case 'student_completed':
        return 'bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-l-emerald-500';
      case 'weekly_summary':
        return 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-l-indigo-500';
      case 'study_milestone':
        return 'bg-amber-50 dark:bg-amber-900/20 border-l-4 border-l-amber-500';
      default:
        return 'bg-slate-100 dark:bg-slate-800 border-l-4 border-l-slate-400';
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Bell className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
              <Badge className="relative h-5 w-5 rounded-full bg-red-500 p-0 text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-[380px] p-0 bg-white dark:bg-slate-900 border dark:border-slate-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white text-xs">{unreadCount} new</Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-blue-500 hover:text-blue-600"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Bell className="h-12 w-12 mb-3 opacity-30" />
              <p className="font-medium">No notifications yet</p>
              <p className="text-sm text-slate-400">We'll notify you when something happens</p>
            </div>
          ) : (
            <div className="divide-y dark:divide-slate-800">
              {notifications.map((notification) => {
                const hasLink = getNotificationLink(notification) !== null;
                return (
                <div
                  key={notification.id}
                  className={`p-4 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/70 ${getNotificationBg(notification.type, notification.read)} ${hasLink ? 'cursor-pointer' : ''}`}
                  onClick={() => {
                    if (hasLink && notification.type !== 'org_invitation') {
                      handleNotificationClick(notification);
                    }
                  }}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-medium text-sm ${notification.read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                          {notification.title}
                        </p>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              title="Mark as read"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-slate-400 hover:text-red-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className={`text-sm mt-1 ${notification.read ? 'text-slate-500' : 'text-slate-600 dark:text-slate-300'}`}>
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </div>
                      
                      {/* Action buttons for org_invitation */}
                      {notification.type === 'org_invitation' && !notification.read && (
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            size="sm"
                            className="h-7 bg-purple-600 hover:bg-purple-700 text-white text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcceptInvitation(notification);
                            }}
                            disabled={joiningOrg === notification.id}
                          >
                            {joiningOrg === notification.id ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Joining...
                              </>
                            ) : (
                              <>
                                <Check className="h-3 w-3 mr-1" />
                                Accept & Join
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-slate-300 dark:border-slate-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                              toast.info('Invitation declined');
                            }}
                            disabled={joiningOrg === notification.id}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Decline
                          </Button>
                        </div>
                      )}
                      
                      {/* Show "View" link for clickable notifications */}
                      {hasLink && notification.type !== 'org_invitation' && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-blue-500 hover:text-blue-600">
                          <ExternalLink className="h-3 w-3" />
                          <span>View details</span>
                        </div>
                      )}
                      
                      {/* Show learning summary details */}
                      {notification.type === 'weekly_summary' && notification.data && (
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-100 dark:bg-slate-800 rounded p-2">
                            <div className="text-slate-500">Lessons</div>
                            <div className="font-semibold text-slate-900 dark:text-white">{notification.data.lessons_completed || 0}</div>
                          </div>
                          <div className="bg-slate-100 dark:bg-slate-800 rounded p-2">
                            <div className="text-slate-500">Study Time</div>
                            <div className="font-semibold text-slate-900 dark:text-white">{notification.data.study_minutes || 0} min</div>
                          </div>
                          {notification.data.streak_days > 0 && (
                            <div className="bg-amber-100 dark:bg-amber-900/30 rounded p-2 col-span-2">
                              <div className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                🔥 {notification.data.streak_days} day streak!
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );})}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t dark:border-slate-800 text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-slate-500 hover:text-slate-700"
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

