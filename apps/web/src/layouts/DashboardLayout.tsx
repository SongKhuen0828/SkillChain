import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import CircuitBoardBackground from '@/components/CircuitBoardBackground'

export default function DashboardLayout() {
  return (
    // 1. ROOT CONTAINER: Force black bg to avoid white flash
    <div className="relative flex min-h-screen w-full bg-slate-950 text-white overflow-hidden font-sans">
      {/* 2. BACKGROUND LAYER */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Only load the new component. If this fails, the parent bg-slate-950 saves us. */}
        <CircuitBoardBackground />
      </div>

      {/* 3. SIDEBAR */}
      <Sidebar />

      {/* 4. MAIN CONTENT */}
      <main className="relative z-10 flex-1 overflow-y-auto h-screen md:ml-64">
        <div className="container mx-auto p-4 md:p-8 pb-32">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
