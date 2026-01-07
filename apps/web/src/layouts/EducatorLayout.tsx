import { useState, useRef, useEffect } from 'react'
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import HyperspeedBackground from '@/components/HyperspeedBackground'
import { SafeAvatar } from '@/components/ui/SafeAvatar'
import {
  LayoutDashboard,
  BookOpen,
  BarChart2,
  Settings,
  PanelLeftClose,
  PanelRightOpen,
  Hexagon,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Search,
  Loader2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { NotificationBell } from '@/components/NotificationBell'
import { cn } from '@/lib/utils'

// Top Header Component for Educator Portal
function EducatorTopHeader() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const displayName = profile?.full_name || profile?.email || 'Educator'
  const getInitials = (name: string) => {
    if (!name) return 'E'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Handle Logout
  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await signOut()
      navigate('/')
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setIsLoading(false)
      setIsOpen(false)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="h-20 w-full flex items-center justify-between px-4 md:px-8 pointer-events-none">
      {/* Left Spacer */}
      <div className="flex-1" />

      {/* RIGHT: Interactive Area */}
      <div className="pointer-events-auto flex items-center gap-3 relative" ref={dropdownRef}>
        {/* Search (Desktop) */}
        <button className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-white/5 hidden md:block">
          <Search size={20} />
        </button>

        {/* Notification Bell - Moved outside the pill button to avoid nested buttons */}
        <NotificationBell />

        {/* === THE ADAPTIVE PILL (Trigger) === */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1 
             backdrop-blur-xl border rounded-full p-1.5 pr-2 
             shadow-lg transition-all duration-200
             ${
               isOpen
                 ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-white/20 scale-[1.02]'
                 : 'bg-white/70 dark:bg-slate-900/60 border-slate-200 dark:border-white/10 shadow-slate-200/50 dark:shadow-black/20 hover:scale-[1.01] hover:border-slate-300 dark:hover:border-white/20'
             }
          `}
        >

          {/* User Info */}
          <div className="flex items-center gap-3 pl-1 pr-1 text-left">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-bold text-slate-800 dark:text-white max-w-[100px] lg:max-w-[140px] truncate leading-tight">
                {displayName}
              </span>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded-sm mt-0.5">
                Educator
              </span>
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-md ring-2 ring-white dark:ring-slate-900 overflow-hidden">
              <SafeAvatar
                src={profile?.avatar_url}
                alt={displayName}
                fallback={getInitials(displayName)}
                className="w-full h-full"
              />
            </div>
            <ChevronDown
              size={14}
              className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 hidden md:block ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </button>

        {/* === DROPDOWN MENU === */}
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-56 p-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl origin-top-right animate-in fade-in slide-in-from-top-2 z-[100]">
            {/* Menu Items */}
            <div className="space-y-1">
              <Link
                to="/educator/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors"
              >
                <UserIcon size={16} /> My Profile
              </Link>
              <Link
                to="/educator/settings"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors"
              >
                <Settings size={16} /> Settings
              </Link>
            </div>

            <div className="h-px bg-slate-200 dark:bg-white/10 my-2" />

            <button
              onClick={handleLogout}
              disabled={isLoading}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors group"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <LogOut size={16} className="group-hover:translate-x-1 transition-transform" />
              )}
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

// Educator Sidebar Component (Cleaned - No User Profile)
function EducatorSidebar({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) {
  const location = useLocation()

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/educator/dashboard' },
    { icon: BookOpen, label: 'My Courses', href: '/educator/courses' },
    { icon: BarChart2, label: 'Analytics', href: '/educator/analytics' },
    // Settings removed - accessible via Top Nav dropdown
    // Schedule removed - not needed for educators
  ]

  return (
    <aside
      className={cn(
        'flex-none h-full flex flex-col transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-20' : 'w-64',
      )}
    >
      {/* Logo Section */}
      <div className="h-20 flex items-center justify-center border-b border-slate-200/50 dark:border-white/5 transition-all px-3">
        <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap w-full">
          <div className="min-w-[40px] h-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 flex-shrink-0">
            <Hexagon size={24} fill="currentColor" className="text-white" />
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
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => {
          const isActive =
            item.href === '/educator/dashboard'
              ? location.pathname === '/educator/dashboard'
              : location.pathname === item.href || location.pathname.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center rounded-xl transition-all duration-200 group relative',
                isCollapsed ? 'justify-center p-3' : 'px-4 py-3 gap-3',
                isActive
                  ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white',
              )}
            >
              <Icon
                size={22}
                className={cn(
                  'transition-colors flex-shrink-0',
                  isActive && 'text-cyan-600 dark:text-cyan-400',
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
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-500 rounded-r-full" />
              )}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Collapse Toggle Button Only */}
      <div className="p-4 border-t border-slate-200/50 dark:border-white/5 flex justify-end">
        <button
          onClick={onToggle}
          className={cn(
            'p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all',
            isCollapsed && 'mx-auto',
          )}
        >
          {isCollapsed ? <PanelRightOpen size={20} /> : <PanelLeftClose size={20} />}
        </button>
      </div>
    </aside>
  )
}

export function EducatorLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  return (
    // ROOT: Force dark mode and ensure proper dimensions
    <div className="dark relative flex h-screen w-screen overflow-hidden text-white bg-slate-950">
      {/* 🛑 FIX 1: Force non-zero dimensions to stop WebGL crash */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 w-full h-full min-w-[1px] min-h-[1px]">
          <HyperspeedBackground />
        </div>
      </div>

      {/* CONTENT LAYER (Z-10, Transparent) */}
      <div className="relative z-10 flex h-full w-full pointer-events-auto">
        {/* Sidebar: Glass Effect (Semi-transparent) */}
        <div
          className={cn(
            'pointer-events-auto flex-none h-full border-r border-slate-200/50 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md hidden md:block relative',
            isSidebarCollapsed ? 'w-20' : 'w-64',
          )}
        >
          <EducatorSidebar
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>

        {/* Main Column */}
        <div className="flex-1 flex flex-col h-full min-w-0">
          {/* Header: Glass Effect (Semi-transparent) - High Z-Index for dropdowns */}
          <div className="pointer-events-auto flex-none border-b border-slate-200/50 dark:border-white/10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md relative z-50">
            <EducatorTopHeader />
          </div>

          {/* Main Content Area: COMPLETELY TRANSPARENT - Lower Z-Index */}
          <main className="pointer-events-auto flex-1 overflow-y-auto scroll-smooth bg-transparent relative z-0">
            <div className="w-full max-w-[1600px] mx-auto p-6 md:p-8 pb-40">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
