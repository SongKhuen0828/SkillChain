import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SafeAvatar } from '@/components/ui/SafeAvatar'
import {
  User,
  Mail,
  Calendar,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Key,
  Camera,
  // Users, // Not used
  // BookOpen, // Not used
  Save,
  Loader2,
  RefreshCw,
  // Edit2, // Not used
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

type TabValue = 'account' | 'professional' | 'security'

export function EducatorProfile() {
  const { user, profile, updateProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [uploading, setUploading] = useState(false)
  // const [isEditingProfile, setIsEditingProfile] = useState(false) // Not used
  const [activeTab, setActiveTab] = useState<TabValue>('account')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Profile state
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [email, setEmail] = useState('')
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null)
  const [verificationDate, setVerificationDate] = useState<string | null>(null) // Keep for setVerificationDate usage

  // Professional info state
  const [professionalTitle, setProfessionalTitle] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [bio, setBio] = useState('')

  // Security state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Stats state
  const [totalStudents, setTotalStudents] = useState(0)
  const [coursesCreated, setCoursesCreated] = useState(0)

  // Fetch educator profile data
  useEffect(() => {
    const fetchEducatorProfile = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        // Fetch profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, verification_status, professional_title, portfolio_url, bio, created_at, updated_at')
          .eq('id', user.id)
          .single()

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching educator profile:', profileError)
          toast.error('Failed to load profile data')
          return
        }

        if (profileData) {
          setFullName(profileData.full_name || '')
          setAvatarUrl(profileData.avatar_url || '')
          setVerificationStatus(profileData.verification_status || 'pending')
          setProfessionalTitle(profileData.professional_title || '')
          setPortfolioUrl(profileData.portfolio_url || '')
          setBio(profileData.bio || '')
          // Use updated_at if available, otherwise created_at
          setVerificationDate(profileData.updated_at || profileData.created_at || null)
        }

        setEmail(user.email || '')

        // Fetch stats
        // First get all course IDs for this educator
        const { data: coursesData } = await supabase
          .from('courses')
          .select('id')
          .eq('educator_id', user.id)

        const courseIds = coursesData?.map(c => c.id) || []
        setCoursesCreated(courseIds.length)

        // Total students (count enrollments for this educator's courses)
        if (courseIds.length > 0) {
          const { count: studentsCount } = await supabase
            .from('enrollments')
            .select('*', { count: 'exact', head: true })
            .in('course_id', courseIds)

          setTotalStudents(studentsCount || 0)
        } else {
          setTotalStudents(0)
        }
      } catch (error: any) {
        console.error('Error fetching educator profile:', error)
        toast.error('Failed to load profile data')
      } finally {
        setLoading(false)
      }
    }

    fetchEducatorProfile()
  }, [user])

  const handleSaveProfile = async () => {
    if (!user) return

    setSaving(true)
    try {
      const updateData: any = {
        full_name: fullName.trim() || null,
        avatar_url: avatarUrl || null,
        professional_title: professionalTitle.trim() || null,
        portfolio_url: portfolioUrl.trim() || null,
        bio: bio.trim() || null,
        updated_at: new Date().toISOString(),
      }

      // If status is rejected, re-apply by setting status back to pending
      if (verificationStatus === 'rejected') {
        updateData.verification_status = 'pending'
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)

      if (error) throw error

      if (updateProfile) {
        await updateProfile()
      }

      // Update local state if status was changed
      if (verificationStatus === 'rejected') {
        setVerificationStatus('pending')
        toast.success('Profile updated and verification re-submitted!')
      } else {
        toast.success('Profile updated successfully!')
      }

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
      // Use simple path: public/${userId}.png (overwrite to save space)
      const fileExt = file.name.split('.').pop() || 'png'
      const filePath = `public/${user.id}.${fileExt}`

      // Upload with upsert to overwrite existing file
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Allow overwriting
        })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath)

      if (!publicUrl) {
        throw new Error('Failed to get public URL')
      }

      // Update local state
      setAvatarUrl(publicUrl)

      // Update database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating profile:', updateError)
        // Don't throw - the upload succeeded, just DB update failed
      }

      // Refresh profile context
      if (updateProfile) {
        await updateProfile()
      }

      toast.success('Image uploaded successfully!')
    } catch (error: any) {
      console.error('Error uploading image:', error)
      toast.error(error.message || 'Failed to upload image')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleChangePassword = async () => {
    if (!user) return

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      toast.success('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      console.error('Error changing password:', error)
      toast.error(error.message || 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  const getInitials = (name: string) => {
    if (!name) return 'E'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const getVerificationStatusConfig = () => {
    if (verificationStatus === 'approved') {
      return {
        icon: ShieldCheck,
        text: 'Verified Instructor',
        borderColor: 'border-cyan-500/50',
        bgColor: 'bg-cyan-500/10',
        textColor: 'text-cyan-600 dark:text-cyan-400',
        iconColor: 'text-cyan-600 dark:text-cyan-400',
      }
    } else if (verificationStatus === 'rejected') {
      return {
        icon: ShieldAlert,
        text: 'Verification Rejected',
        borderColor: 'border-red-500/50',
        bgColor: 'bg-red-500/10',
        textColor: 'text-red-600 dark:text-red-400',
        iconColor: 'text-red-600 dark:text-red-400',
      }
    } else {
      return {
        icon: ShieldAlert,
        text: 'Verification Pending',
        borderColor: 'border-amber-500/50',
        bgColor: 'bg-amber-500/10',
        textColor: 'text-amber-600 dark:text-amber-400',
        iconColor: 'text-amber-600 dark:text-amber-400',
      }
    }
  }

  if (loading || !profile) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="relative z-10 max-w-[1600px] mx-auto p-6">
          <div className="h-64 w-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  const verificationConfig = getVerificationStatusConfig()
  const VerificationIcon = verificationConfig.icon

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-50 dark:bg-[#0B1120]">
      {/* Background Ambient Blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <div className="relative z-10 max-w-[1600px] mx-auto p-6 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Instructor Profile</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Manage your professional identity and account settings
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
                className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 p-1 border-4 border-white/10 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-full h-full rounded-full bg-slate-900 dark:bg-slate-800 overflow-hidden">
                  {uploading ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <Loader2 className="w-10 h-10 animate-spin text-white" />
                    </div>
                  ) : (
                    <SafeAvatar
                      src={avatarUrl || profile?.avatar_url}
                      alt={fullName || 'Educator'}
                      fallback={getInitials(fullName || 'Educator')}
                      className="w-full h-full text-3xl"
                    />
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
                {fullName || 'Educator'}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-0 capitalize">
                  Educator
                </span>
                <button
                  onClick={() => {
                    if (verificationStatus === 'pending' || verificationStatus === 'rejected') {
                      setActiveTab('professional')
                    }
                  }}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 transition-all',
                    verificationConfig.borderColor,
                    verificationConfig.bgColor,
                    verificationConfig.textColor,
                    (verificationStatus === 'pending' || verificationStatus === 'rejected') &&
                      'cursor-pointer hover:opacity-80'
                  )}
                >
                  <VerificationIcon size={12} />
                  <span>{verificationConfig.text}</span>
                </button>
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <Mail size={14} />
                  <span>{email || 'N/A'}</span>
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
          <div className="flex items-center gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {totalStudents.toLocaleString()}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Students</div>
            </div>
            <div className="w-px h-12 bg-slate-200 dark:bg-white/10" />
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {coursesCreated}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Courses</div>
            </div>
            <div className="w-px h-12 bg-slate-200 dark:bg-white/10" />
            <div
              className={cn(
                'text-center cursor-pointer transition-all',
                (verificationStatus === 'pending' || verificationStatus === 'rejected') &&
                  'hover:opacity-80'
              )}
              onClick={() => {
                if (verificationStatus === 'pending' || verificationStatus === 'rejected') {
                  setActiveTab('professional')
                }
              }}
            >
              <div className={cn('text-2xl font-bold', verificationConfig.textColor)}>
                <VerificationIcon className="w-8 h-8 mx-auto mb-1" />
              </div>
              <div className={cn('text-xs font-medium mt-1', verificationConfig.textColor)}>
                {verificationConfig.text}
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
                { id: 'professional' as TabValue, label: 'Professional & Verify', icon: Shield },
                { id: 'security' as TabValue, label: 'Security', icon: Key },
              ].map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'flex-1 px-6 py-4 text-sm font-medium transition-all border-b-2',
                      activeTab === tab.id
                        ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-white/30 dark:bg-white/5'
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
                    <div className="space-y-2">
                      <Label className="text-slate-900 dark:text-white">Full Name</Label>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Your full name"
                        className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-900 dark:text-white">Email Address</Label>
                      <Input
                        type="email"
                        value={email}
                        disabled
                        className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Email cannot be changed. Contact support if needed.
                      </p>
                    </div>

                    <div className="pt-4">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                      >
                        {saving ? (
                          <>
                            <Loader2 size={16} className="mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save size={16} className="mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Professional & Verify Tab */}
              {activeTab === 'professional' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                      Verification Details
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Update your professional information to complete or re-submit verification
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-slate-900 dark:text-white">Professional Title</Label>
                      <Input
                        value={professionalTitle}
                        onChange={(e) => setProfessionalTitle(e.target.value)}
                        placeholder="e.g. Senior Blockchain Developer, Web3 Security Expert"
                        className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-900 dark:text-white">
                        Portfolio / LinkedIn URL
                      </Label>
                      <Input
                        type="url"
                        value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                        placeholder="https://linkedin.com/in/yourprofile or https://yourportfolio.com"
                        className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-900 dark:text-white">Bio / About Me</Label>
                      <Textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell students about your expertise, experience, and what you teach..."
                        rows={6}
                        className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20 resize-none"
                      />
                    </div>

                    <div className="pt-4">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                      >
                        {saving ? (
                          <>
                            <Loader2 size={16} className="mr-2 animate-spin" />
                            {verificationStatus === 'rejected' ? 'Re-submitting...' : 'Saving...'}
                          </>
                        ) : verificationStatus === 'rejected' ? (
                          <>
                            <RefreshCw size={16} className="mr-2" />
                            Re-submit Application
                          </>
                        ) : (
                          <>
                            <Save size={16} className="mr-2" />
                            Update Verification Info
                          </>
                        )}
                      </Button>
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
                      Change Password
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Update your password to keep your account secure
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-slate-900 dark:text-white">Current Password</Label>
                      <Input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-900 dark:text-white">New Password</Label>
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min. 6 characters)"
                        className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-900 dark:text-white">Confirm New Password</Label>
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-cyan-500 focus:ring-cyan-500/20"
                      />
                    </div>

                    <div className="pt-4">
                      <Button
                        onClick={handleChangePassword}
                        disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white border-0 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                      >
                        {changingPassword ? (
                          <>
                            <Loader2 size={16} className="mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Save size={16} className="mr-2" />
                            Save New Password
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
