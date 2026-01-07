import { Calendar } from 'lucide-react'

export function EducatorSchedule() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Live Session Schedule</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Manage your live teaching sessions and availability
        </p>
      </div>

      {/* Placeholder Content */}
      <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-12 rounded-2xl shadow-sm text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-red-500/10 rounded-full">
            <Calendar className="w-12 h-12 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Calendar view coming soon...
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Schedule and manage your live sessions from here
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

