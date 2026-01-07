import { Outlet, Navigate, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { OrgSidebar } from '@/components/OrgSidebar';
import HyperspeedBackground from '@/components/HyperspeedBackground';
import { LoadingScreen } from '@/components/LoadingScreen';
import { NotificationBell } from '@/components/NotificationBell';
import { SafeAvatar } from '@/components/ui/SafeAvatar';
import { supabase } from '@/lib/supabase';
import { 
  ChevronDown, 
  User as UserIcon, 
  Settings, 
  LogOut, 
  Loader2 
} from 'lucide-react';

// Top Header Component for Org Portal
function OrgTopHeader() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayName = profile?.full_name || 'Org Admin';
  const getInitials = (name: string) => {
    if (!name) return 'O';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signOut();
      navigate('/');
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 w-full flex items-center justify-end px-6 bg-slate-900/50 backdrop-blur-md border-b border-purple-500/20">
      <div className="flex items-center gap-3 relative" ref={dropdownRef}>
        {/* Notification Bell */}
        <NotificationBell />
        
        {/* User Pill */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 backdrop-blur-xl border rounded-full p-1.5 pr-3 transition-all ${
            isOpen
              ? 'bg-primary/20 border-primary/50'
              : 'bg-slate-800/50 border-slate-700 hover:border-purple-500/50'
          }`}
        >
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 to-violet-600 p-0.5 overflow-hidden">
            <SafeAvatar
              src={profile?.avatar_url}
              alt={displayName}
              fallback={getInitials(displayName)}
              className="w-full h-full"
            />
          </div>
          <span className="text-sm font-medium text-white hidden md:block">{displayName}</span>
          <ChevronDown
            size={14}
            className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-48 p-2 rounded-xl border border-slate-700 bg-slate-900/95 backdrop-blur-xl shadow-2xl z-[100]">
            <Link
              to="/org/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg"
            >
              <Settings size={16} /> Settings
            </Link>
            <div className="h-px bg-slate-700 my-1" />
            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export function OrgLayout() {
  const { user, profile, loading } = useAuth();
  const [organization, setOrganization] = useState<{ name: string; logo_url: string | null } | null>(null);

  useEffect(() => {
    if (profile?.org_id) {
      fetchOrganization();
    }
  }, [profile?.org_id]);

  const fetchOrganization = async () => {
    if (!profile?.org_id) return;
    
    const { data } = await supabase
      .from('organizations')
      .select('name, logo_url')
      .eq('id', profile.org_id)
      .single();
    
    if (data) {
      setOrganization(data);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (profile?.role !== 'org_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen w-screen overflow-hidden bg-slate-950">
      <HyperspeedBackground />
      <div className="relative flex h-screen w-full">
        <OrgSidebar 
          orgName={organization?.name} 
          orgLogo={organization?.logo_url}
        />
        <div className="flex-1 flex flex-col md:ml-64">
          <OrgTopHeader />
          <main className="flex-1 overflow-y-auto">
            <div className="min-h-full p-6 md:p-8 lg:p-10">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}


