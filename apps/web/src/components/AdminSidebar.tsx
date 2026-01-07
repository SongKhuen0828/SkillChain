import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelRightOpen,
  Shield,
  UserCheck,
  Link as LinkIcon,
  Brain,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
  { icon: Users, label: 'Users', href: '/admin/users' },
  { icon: Building2, label: 'Organizations', href: '/admin/organizations' },
  { icon: FileText, label: 'Org Requests', href: '/admin/org-requests' },
  { icon: UserCheck, label: 'Verifications', href: '/admin/verifications' },
  { icon: LinkIcon, label: 'Blockchain', href: '/admin/blockchain' },
  { icon: Brain, label: 'AI Settings', href: '/admin/ai' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
]

interface AdminSidebarProps {
  className?: string
  isCollapsed?: boolean
  onToggle?: () => void
}

export function AdminSidebar({ className, isCollapsed: externalIsCollapsed, onToggle }: AdminSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false)
  
  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : internalIsCollapsed
  const handleToggle = () => {
    if (onToggle) {
      onToggle()
    } else {
      setInternalIsCollapsed(!internalIsCollapsed)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Logged out successfully')
      navigate('/')
    } catch (error) {
      toast.error('Failed to logout')
    }
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen flex flex-col border-r border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl transition-all duration-300 ease-in-out -translate-x-full md:translate-x-0',
        isCollapsed ? 'w-20' : 'w-64',
        className,
      )}
    >
      {/* Logo Section */}
      <div className="h-20 flex items-center justify-center border-b border-slate-200/50 dark:border-white/5 transition-all px-3">
        <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap w-full">
          <div className="min-w-[40px] h-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-red-500 to-orange-600 text-white shadow-lg shadow-red-500/20 flex-shrink-0">
            <Shield size={24} className="text-white" />
          </div>
          <div
            className={cn(
              'transition-all duration-300 origin-left overflow-hidden',
              isCollapsed ? 'w-0 opacity-0 scale-0' : 'w-auto opacity-100 scale-100',
            )}
          >
            <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent whitespace-nowrap">
              SkillChain
            </h1>
            <p className="text-xs text-red-500 dark:text-red-400 font-medium">System Admin</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin/dashboard'
              ? location.pathname === '/admin/dashboard' || location.pathname === '/admin'
              : location.pathname === item.href ||
                location.pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center rounded-xl transition-all duration-200 group relative',
                isCollapsed ? 'justify-center p-3' : 'px-4 py-3 gap-3',
                isActive
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white',
              )}
            >
              <Icon
                size={22}
                className={cn(
                  'transition-colors flex-shrink-0',
                  isActive && 'text-red-600 dark:text-red-400',
                )}
              />
              <span
                className={cn(
                  'font-medium whitespace-nowrap transition-all duration-300',
                  isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 block',
                )}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-red-500 rounded-r-full" />
              )}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 dark:bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-lg">
                  {item.label}
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout & Toggle */}
      <div className="p-4 border-t border-slate-200 dark:border-white/5 space-y-2">
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center rounded-xl transition-all duration-200 w-full text-red-500 hover:bg-red-500/10',
            isCollapsed ? 'justify-center p-3' : 'px-4 py-3 gap-3',
          )}
        >
          <LogOut size={22} />
          <span
            className={cn(
              'font-medium whitespace-nowrap transition-all duration-300',
              isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 block',
            )}
          >
            Logout
          </span>
        </button>
        <button
          onClick={handleToggle}
          className="flex items-center justify-center w-full p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
        >
          {isCollapsed ? <PanelRightOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>
    </aside>
  )
}

