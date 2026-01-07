import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  User,
  Mail,
  Calendar,
  Shield,
  // Key, // Not used
  Camera,
  Award,
  Zap,
  Flame,
  Save,
  Loader2,
  Edit2,
  Settings,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

type TabValue = 'account' | 'preferences' | 'security'

export function ProfilePage() {
  const { profile, user, updateProfile } = useAuth()
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [certificateCount, setCertificateCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabValue>('account')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Email and Password state
  const [newEmail, setNewEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [updatingEmail, setUpdatingEmail] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)

  // Update local state when profile changes
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setAvatarUrl(profile.avatar_url || '')
      setNewEmail(user?.email || '')
    }
  }, [profile, user])

  // Fetch certificate count
  useEffect(() => {
    async function fetchCertificates() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const { count, error } = await supabase
          .from('certificates')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)

        if (error) throw error
        setCertificateCount(count || 0)
      } catch (error) {
        console.error('Error fetching certificates:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCertificates()
  }, [user])

  const handleSaveProfile = async () => {
    if (!profile) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName || null,
          avatar_url: avatarUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (error) throw error

      if (updateProfile) {
        await updateProfile()
      }

      toast.success('Profile updated successfully!')
      setIsEditingProfile(false)
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setUploading(true)

    try {
      // 1. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `public/${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Allow overwriting existing avatars
        })

      if (uploadError) {
        throw uploadError
      }

      // 2. Get Public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath)

      // 3. 💾 CRITICAL: Save to Auth User Metadata
      const { error: authUpdateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      })

      if (authUpdateError) {
        console.error('Error updating auth metadata:', authUpdateError)
        throw authUpdateError
      }

      // 4. Update Profiles Table
      if (profile) {
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({
            avatar_url: publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', profile.id)

        if (profileUpdateError) {
          console.error('Error updating profile:', profileUpdateError)
          // Don't throw - auth update succeeded, profile update is secondary
        }
      }

      // 5. Update Local State & Refresh Context
      setAvatarUrl(publicUrl)
      
      // Refresh the profile context to update the header immediately
      if (updateProfile) {
        await updateProfile()
      }

      toast.success('Profile picture updated!')
    } catch (error: any) {
      console.error('Error uploading image:', error)
      toast.error(error.message || 'Failed to update profile picture')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleUpdateEmail = async () => {
    if (!newEmail || newEmail === user?.email) {
      toast.error('Please enter a new email address')
      return
    }

    setUpdatingEmail(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) throw error
      toast.success('Email update link sent! Please check your new email inbox.')
      setNewEmail('')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update email')
    } finally {
      setUpdatingEmail(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('Please fill in all password fields')
      return
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long')
      return
    }

    setUpdatingPassword(true)
    try {
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: currentPassword,
      })

      if (signInError) {
        throw new Error('Current password is incorrect')
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) throw updateError

      toast.success('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password')
    } finally {
      setUpdatingPassword(false)
    }
  }

  const getInitials = (name: string) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  // Calculate level from XP (simple formula: level = floor(xp / 100) + 1)
  const getLevel = () => {
    const xp = profile?.xp || 0
    return Math.floor(xp / 100) + 1
  }

  if (loading || !profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const level = getLevel()
  const xp = profile.xp || 0
  const streak = profile.streak || 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Profile</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      {/* === SECTION 1: UNIFIED HEADER CARD === */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm"
      >
        {/* Identity Block */}
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="relative group cursor-pointer">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div
              className="w-24 h-24 rounded-full bg-gradient-to-tr from-purple-500 to-violet-600 p-1 border-4 border-purple-500/20"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-full h-full rounded-full bg-slate-900 dark:bg-slate-800 flex items-center justify-center text-3xl text-white font-bold overflow-hidden">
                {uploading ? (
                  <Loader2 className="w-10 h-10 animate-spin text-white" />
                ) : avatarUrl || profile.avatar_url ? (
                  <img
                    src={avatarUrl || profile.avatar_url}
                    alt={profile.full_name || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(profile.full_name || 'User')
                )}
              </div>
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <Camera className="text-white w-6 h-6" />
            </div>
          </div>

          {/* Name and Badges */}
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              {profile.full_name || 'User'}
            </h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary border-0 capitalize">
                Learner
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium border border-primary/50 text-primary bg-primary/10">
                Lvl {level} Explorer
              </span>
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Mail size={14} />
                <span>{user?.email || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} />
                <span>Joined {format(new Date(profile.created_at), 'MMM yyyy')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1 hidden md:block" />

        {/* Stats Block */}
        <div className="flex items-center gap-10">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              {xp.toLocaleString()}
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
              Total XP
            </div>
          </div>

          <div className="w-px h-12 bg-slate-200 dark:bg-white/10" />

          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
              <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
              {streak} Days
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
              Streak
            </div>
          </div>

          <div className="w-px h-12 bg-slate-200 dark:bg-white/10" />

          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
              <Award className="w-5 h-5 text-purple-500 fill-purple-500" />
              {certificateCount}
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
              Certificates
            </div>
          </div>
        </div>
      </motion.div>

      {/* === SECTION 2: TABS & FORM AREA === */}
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm"
        >
          {/* Tab Headers */}
          <div className="flex border-b border-slate-200/50 dark:border-white/10">
            {[
              { id: 'account' as TabValue, label: 'Account', icon: User },
              { id: 'preferences' as TabValue, label: 'Preferences', icon: Settings },
              { id: 'security' as TabValue, label: 'Security', icon: Shield },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex-1 px-6 py-4 text-sm font-medium transition-all border-b-2',
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400 bg-white/30 dark:bg-white/5'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/10 dark:hover:bg-white/5'
                  )}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Icon size={16} />
                    <span>{tab.label}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {/* Account Tab */}
            {activeTab === 'account' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    Account Information
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Manage your public profile information
                  </p>
                </div>

                <div className="space-y-4">
                  {isEditingProfile ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-slate-900 dark:text-white">Full Name</Label>
                        <Input
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Your full name"
                          className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-purple-500 focus:ring-purple-500/20"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setFullName(profile.full_name || '')
                            setIsEditingProfile(false)
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="flex-1 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white border-0"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-slate-900 dark:text-white">Full Name</Label>
                        <div className="bg-white/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-md px-3 py-2 text-slate-900 dark:text-white">
                          {profile.full_name || 'Not set'}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditingProfile(true)}
                        className="w-full"
                      >
                        <Edit2 size={16} className="mr-2" />
                        Edit Public Info
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    Preferences
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Customize your learning experience
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-800/30 rounded-lg p-4 border border-slate-200 dark:border-white/10">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      AI preferences and other settings can be managed from the{' '}
                      <a
                        href="/dashboard/settings"
                        className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
                      >
                        Settings page
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                    Account Security
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Manage your account security settings
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Email Update */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div className="space-y-2">
                      <Label className="text-slate-900 dark:text-white">Email Address</Label>
                      <Input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder={user?.email || 'your@email.com'}
                        className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-purple-500 focus:ring-purple-500/20"
                      />
                    </div>
                    <Button
                      variant="secondary"
                      onClick={handleUpdateEmail}
                      disabled={updatingEmail || !newEmail || newEmail === user?.email}
                      className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                    >
                      {updatingEmail ? 'Updating...' : 'Update Email'}
                    </Button>
                  </div>

                  <div className="h-px bg-slate-200 dark:bg-white/10 my-4" />

                  {/* Password Update */}
                  <div className="space-y-4">
                    <Label className="text-slate-900 dark:text-white">Change Password</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        type="password"
                        placeholder="Current Password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-purple-500 focus:ring-purple-500/20"
                      />
                      <Input
                        type="password"
                        placeholder="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-purple-500 focus:ring-purple-500/20"
                      />
                    </div>
                    <div className="flex justify-end mt-2">
                      <Button
                        className="gap-2 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white border-0 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                        onClick={handleUpdatePassword}
                        disabled={updatingPassword || !currentPassword || !newPassword}
                      >
                        <Save size={16} />
                        {updatingPassword ? 'Updating...' : 'Save New Password'}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
