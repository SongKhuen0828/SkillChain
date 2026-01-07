import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Bell, Mail, CreditCard } from 'lucide-react'
import { toast } from 'sonner'

export function EducatorSettings() {
  const [emailDigests, setEmailDigests] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)

  const handleEmailDigestsChange = (checked: boolean) => {
    setEmailDigests(checked)
    toast.success(checked ? 'Email digests enabled' : 'Email digests disabled')
  }

  const handlePushNotificationsChange = (checked: boolean) => {
    setPushNotifications(checked)
    toast.success(checked ? 'Push notifications enabled' : 'Push notifications disabled')
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Manage your application preferences and system settings
        </p>
      </div>

      {/* Section 1: Notifications */}
      <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-8 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <Bell className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          Notifications
        </h2>

        <div className="space-y-6">
          {/* Email Digests */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Mail size={16} />
                Email Digests
              </Label>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Receive weekly summaries of your course performance and student activity
              </p>
            </div>
            <Switch
              checked={emailDigests}
              onCheckedChange={handleEmailDigestsChange}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell size={16} />
                Push Notifications
              </Label>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Get real-time alerts for new enrollments, messages, and important updates
              </p>
            </div>
            <Switch
              checked={pushNotifications}
              onCheckedChange={handlePushNotificationsChange}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Payout Settings */}
      <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-8 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          Payout Settings
        </h2>

        <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-500/10 rounded-xl">
              <CreditCard className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                Payout Method
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Stripe (Connected)
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            Manage
          </Button>
        </div>
      </div>
    </div>
  )
}
