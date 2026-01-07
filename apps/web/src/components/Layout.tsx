import { useState, useRef, useEffect } from 'react'
import { Outlet, useNavigate, Link } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import HyperspeedBackground from './HyperspeedBackground'
import ClickSpark from './ClickSpark'
import { SafeAvatar } from './ui/SafeAvatar'
import { NotificationBell } from './NotificationBell'
import { ChevronDown, Search, User as UserIcon, LogOut, Settings, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

// Internal Header Component for the Profile
function TopHeader() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const displayName = profile?.full_name || profile?.email || 'User'
  const role = profile?.role === 'learner' ? 'Learner' : 'Educator'
  const getInitials = (name: string) => {
    if (!name) return 'U'
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
    <header className="h-20 w-full flex items-center justify-between px-4 md:px-8 z-50 pointer-events-none sticky top-0 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/30 backdrop-blur-sm">
      {/* Left Spacer */}
      <div className="flex-1" />

      {/* RIGHT: Interactive Area */}
      <div className="pointer-events-auto flex items-center gap-3 relative" ref={dropdownRef}>
        {/* Search (Desktop) */}
        <button className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-white/5 hidden md:block">
          <Search size={20} />
        </button>

        {/* Notification Bell - Separate from the pill to avoid nested buttons */}
        <NotificationBell />

        {/* === THE ADAPTIVE PILL (Trigger) === */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setIsOpen(!isOpen)
            }
          }}
          className={`flex items-center gap-1 
             backdrop-blur-xl border rounded-full p-1.5 pr-2 
             shadow-lg transition-all duration-200 cursor-pointer
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
                {role}
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
        </div>

        {/* === DROPDOWN MENU === */}
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-56 p-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl origin-top-right animate-in fade-in slide-in-from-top-2 z-[100]">
            {/* Menu Items */}
            <div className="space-y-1">
              <Link
                to="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors"
              >
                <UserIcon size={16} /> My Profile
              </Link>
              <Link
                to="/dashboard/settings"
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

export function Layout({ children }: { children?: React.ReactNode }) {
  const { profile } = useAuth()
  const isLearner = profile?.role === 'learner'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  return (
    <div className="dark relative flex h-screen w-full overflow-hidden text-white bg-slate-950">
      {/* 🛑 FIX: Force non-zero dimensions to stop WebGL crash */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 w-full h-full min-w-[1px] min-h-[1px] overflow-hidden">
          <HyperspeedBackground />
        </div>
      </div>

      {/* 2. SIDEBAR (Left, High Z-Index) - Only show for learners */}
      {isLearner && <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />}

      {/* 3. MAIN AREA (Right) */}
      <div
        className={`relative z-10 flex-1 flex flex-col h-full overflow-hidden pointer-events-auto transition-all duration-300 ease-in-out ${
          isLearner ? (isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64') : ''
        }`}
      >
        <div className="flex-1 flex flex-col h-full">
          <ClickSpark
            sparkColor="#06b6d4"
            sparkSize={12}
            sparkRadius={20}
            sparkCount={8}
            duration={400}
          >
            {/* Top Header (Profile) */}
            <TopHeader />

          {/* 🛑 FIX: Main Scrollable Area - scrolling happens here, bg-transparent shows background */}
          <main className="flex-1 h-full overflow-y-auto overflow-x-hidden scrollbar-hide bg-transparent">
            <div className="container mx-auto p-6 md:p-8 max-w-[1600px] pb-24">
              {children || <Outlet />}
            </div>
          </main>
          </ClickSpark>
        </div>
      </div>
    </div>
  )
}
