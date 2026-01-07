import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot, Bell, Lock, Video, ChevronDown, Sparkles, Edit2, Trash2, Loader2, LogOut, Wallet, CheckCircle2, ExternalLink, Copy, Building2, Globe, Users } from 'lucide-react'
import AIOnboardingModal from '@/components/ai/AIOnboardingModal'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { schedulingEngine } from '@/lib/ai/AdaptiveSchedulingEngine'

// Focus method labels matching the AI engine output
const FOCUS_METHOD_LABELS: Record<string, string> = {
  pomodoro: 'Pomodoro Technique',
  '52-17': '52/17 Rule',
  flowtime: 'Flowtime',
  '5-min-rule': '5-Min Rule',
}

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}

export function Settings() {
  const { user, signOut, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [aiEnabled, setAiEnabled] = useState(true) // Default to true for new users
  const [showAIModal, setShowAIModal] = useState(false)
  const [aiPreferences, setAiPreferences] = useState<any>(null)
  const [loadingPreferences, setLoadingPreferences] = useState(true)

  // New states for other settings
  const [autoplayNextLesson, setAutoplayNextLesson] = useState(true)
  const [videoQuality, setVideoQuality] = useState('auto')
  const [downloadWifiOnly, setDownloadWifiOnly] = useState(true)
  const [profilePublic, setProfilePublic] = useState(false)
  const [showCertificates, setShowCertificates] = useState(true)
  const [emailDigests, setEmailDigests] = useState(true)
  const [newCourseAlerts, setNewCourseAlerts] = useState(true)
  
  // Organization states
  const [currentOrg, setCurrentOrg] = useState<any>(null)
  const [inviteCode, setInviteCode] = useState('')
  const [joiningOrg, setJoiningOrg] = useState(false)
  const [savingProfilePublic, setSavingProfilePublic] = useState(false)

  // Wallet binding states
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [connectingWallet, setConnectingWallet] = useState(false)
  const [disconnectingWallet, setDisconnectingWallet] = useState(false)

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [showChangePasswordForm, setShowChangePasswordForm] = useState(false)

  // AI Recommended Focus Method state
  const [aiRecommendedMethod, setAiRecommendedMethod] = useState<string | null>(null)
  const [aiMethodLoading, setAiMethodLoading] = useState(true)

  // Fetch AI Companion enabled status from database
  useEffect(() => {
    if (!user) {
      setLoadingPreferences(false)
      return
    }

    const fetchAISettings = async () => {
      try {
        // Fetch profile to get ai_companion_enabled, wallet_address, profile_public
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('ai_companion_enabled, wallet_address, profile_public')
          .eq('id', user.id)
          .single()

        if (profileError) throw profileError

        // Set AI enabled status from database (default to true if not set)
        setAiEnabled(profile?.ai_companion_enabled !== false)

        // Load wallet address
        setWalletAddress(profile?.wallet_address || null)
        
        // Load profile public setting
        setProfilePublic(profile?.profile_public || false)
        
        // Check if user belongs to an organization
        const { data: membership } = await supabase
          .from('org_members')
          .select('org_id, organizations(id, name, logo_url)')
          .eq('user_id', user.id)
          .maybeSingle()
        
        if (membership?.organizations) {
          setCurrentOrg(membership.organizations)
        }

        // Fetch AI preferences
        const { data: preferences, error: prefsError } = await supabase
          .from('ai_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        if (prefsError && prefsError.code !== 'PGRST116') {
          throw prefsError
        }

        setAiPreferences(preferences)
      } catch (error: any) {
        console.error('Error fetching AI settings:', error)
        // Default to enabled if fetch fails
        setAiEnabled(true)
      } finally {
        setLoadingPreferences(false)
      }
    }

    fetchAISettings()
  }, [user])

  // Fetch AI recommended focus method (same as Dashboard)
  useEffect(() => {
    if (!user) {
      setAiMethodLoading(false)
      return
    }

    const getAIRecommendation = async () => {
      setAiMethodLoading(true)
      try {
        await schedulingEngine.init(user.id)
        const prediction = await schedulingEngine.predictBestMethod(user.id)
        setAiRecommendedMethod(prediction.method)
        console.log(`🧠 Settings AI Recommended: ${prediction.method} (${Math.round(prediction.confidence * 100)}% confidence)`)
      } catch (error) {
        console.error('Error getting AI recommendation:', error)
        setAiRecommendedMethod('pomodoro') // Default fallback
      } finally {
        setAiMethodLoading(false)
      }
    }

    getAIRecommendation()
  }, [user])

  const handleAIToggle = async (checked: boolean) => {
    if (!user) return

    // Optimistically update UI first
    setAiEnabled(checked)

    try {
      // Update database
      const { error } = await supabase
        .from('profiles')
        .update({ ai_companion_enabled: checked })
        .eq('id', user.id)

      if (error) {
        throw error
      }

      // Refresh profile in AuthContext so Dashboard can see the change immediately
      if (updateProfile) {
        await updateProfile()
      }

      // Update local state (already done optimistically, but ensure consistency)
      setAiEnabled(checked)

      if (checked && !aiPreferences) {
        // If enabling and no preferences exist, show onboarding modal
        setShowAIModal(true)
      } else if (!checked) {
        // If disabling, clear local preferences cache (but keep in DB for future)
        // Don't delete from DB, just disable the feature
        setAiPreferences(null)
      }

      toast.success(checked ? 'AI Companion enabled and saved!' : 'AI Companion disabled and saved!')
    } catch (error: any) {
      console.error('Error updating AI Companion setting:', error)
      toast.error(error.message || 'Failed to save setting')
      // Revert UI state on error
      setAiEnabled(!checked)
    }
  }

  const handleAISetupComplete = async (prefs: any) => {
    if (!user) return

    try {
      // Ensure AI Companion is enabled in database
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ ai_companion_enabled: true })
        .eq('id', user.id)

      if (profileError) throw profileError

      setAiPreferences(prefs)
      setAiEnabled(true)
      setShowAIModal(false)
      toast.success('AI Companion configured successfully!')
    } catch (error: any) {
      console.error('Error saving AI setup:', error)
      toast.error('Failed to save AI configuration')
    }
  }

  const handleDeletePreferences = async () => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ai_preferences: null })
        .eq('id', user.id)

      if (error) throw error

      setAiPreferences(null)
      localStorage.removeItem('aiPreferences')
      toast.success('Configuration reset - Your AI preferences have been cleared')
    } catch (error: any) {
      console.error('Error deleting AI preferences:', error)
      toast.error(error.message || 'Failed to reset preferences')
    }
  }

  const handleEditPreferences = () => {
    setShowAIModal(true)
  }

  const getGoalLabel = (goal: string) => {
    const labels: Record<string, string> = {
      career: 'Career Switch',
      cert: 'Get Certified',
      project: 'Build DApps',
      explore: 'Just Exploring',
    }
    return labels[goal] || goal
  }

  const getFocusModeLabel = (struggle: string) => {
    if (struggle === 'none') return 'Flowtime'
    if (struggle === 'distraction') return 'Pomodoro'
    if (struggle === 'procrastination') return '5-Min Rule'
    if (struggle === 'fatigue') return '52/17 Rule'
    return 'Pomodoro'
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast.error('Please fill in all password fields.')
      return
    }
    if (newPassword !== confirmNewPassword) {
      toast.error('New password and confirm password do not match.')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }

    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      toast.success('Password updated successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setShowChangePasswordForm(false)
    } catch (error: any) {
      console.error('Error changing password:', error)
      toast.error(error.message || 'Failed to change password.')
    } finally {
      setChangingPassword(false)
    }
  }

  // Wallet connection handlers
  const handleConnectWallet = async () => {
    if (!user) return

    setConnectingWallet(true)
    try {
      // Check if browser environment
      if (typeof window === 'undefined') {
        throw new Error('Wallet connection only available in browser')
      }

      // Check if MetaMask (or other injected wallet) is available
      if (!window.ethereum) {
        toast.error('No Web3 wallet detected. Please install MetaMask or another Web3 wallet extension.')
        return
      }

      // Use ethers.js to connect to MetaMask
      const { BrowserProvider } = await import('ethers')

      // Request account access
      const provider = new BrowserProvider(window.ethereum)

      // Request connection (this will prompt user to connect)
      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      if (!address) {
        throw new Error('Failed to get wallet address')
      }

      // Optionally check if user is on the correct network (Polygon Amoy)
      const network = await provider.getNetwork()
      const polygonAmoyChainId = 80002n // Polygon Amoy chain ID
      
      if (network.chainId !== polygonAmoyChainId) {
        toast.warning('Please switch to Polygon Amoy network in your wallet for certificate minting')
        // Continue anyway - we can still save the address
      }

      // Save wallet address to profile
      const { error } = await supabase
        .from('profiles')
        .update({ wallet_address: address })
        .eq('id', user.id)

      if (error) throw error

      setWalletAddress(address)
      if (updateProfile) {
        await updateProfile()
      }

      toast.success('Wallet connected successfully!')
    } catch (error: any) {
      console.error('Error connecting wallet:', error)
      
      // Provide helpful error messages
      if (error.code === 4001 || error.message?.includes('rejected') || error.message?.includes('denied')) {
        toast.error('Wallet connection cancelled by user')
      } else if (error.message?.includes('Please switch to')) {
        toast.error('Please switch to Polygon Amoy network in your wallet')
      } else {
        toast.error(error.message || 'Failed to connect wallet. Please make sure you have MetaMask installed and unlocked.')
      }
    } finally {
      setConnectingWallet(false)
    }
  }

  const handleDisconnectWallet = async () => {
    if (!user) return

    setDisconnectingWallet(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ wallet_address: null })
        .eq('id', user.id)

      if (error) throw error

      setWalletAddress(null)
      if (updateProfile) {
        await updateProfile()
      }

      toast.success('Wallet disconnected successfully')
    } catch (error: any) {
      console.error('Error disconnecting wallet:', error)
      toast.error(error.message || 'Failed to disconnect wallet')
    } finally {
      setDisconnectingWallet(false)
    }
  }

  const copyWalletAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
      toast.success('Wallet address copied to clipboard')
    }
  }

  const openExplorer = () => {
    if (walletAddress) {
      window.open(`https://amoy.polygonscan.com/address/${walletAddress}`, '_blank')
    }
  }

  // Main content - scrolling is handled by parent Layout
  return (
    <div className="w-full">
      {/* Container with bottom padding to prevent cut-off */}
      <div className="container mx-auto max-w-[96%] p-6 md:p-10 pb-40 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Platform Settings</h1>
          <p className="text-slate-400 mt-1">Customize your learning experience and privacy.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. AI Companion (Full Width) */}
          <Card className="col-span-1 md:col-span-2 bg-slate-900/60 backdrop-blur-md border-slate-800/50 shadow-2xl transition-all">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  <CardTitle className="text-white">AI Learning Companion</CardTitle>
                </div>
                {/* 🚀 FIX: Move Switch HERE so it never disappears */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">{aiEnabled ? 'Enabled' : 'Disabled'}</span>
                  <Switch
                    checked={aiEnabled}
                    onCheckedChange={handleAIToggle}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
              <CardDescription className="text-slate-400">Personalize your curriculum goals.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Conditional Rendering: Only show config when Active */}
              {aiEnabled ? (
                loadingPreferences ? (
                  <div className="py-8 text-center text-slate-500">Loading...</div>
                ) : aiPreferences ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-xs text-slate-500 uppercase font-bold">Goal</span>
                        <p className="text-lg font-medium text-white mt-1">{getGoalLabel(aiPreferences.goal)}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-xs text-slate-500 uppercase font-bold">Focus Mode</span>
                        <p className="text-lg font-medium text-white mt-1">
                          {aiMethodLoading ? 'Loading...' : (FOCUS_METHOD_LABELS[aiRecommendedMethod || 'pomodoro'] || aiRecommendedMethod)}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-xs text-slate-500 uppercase font-bold">Weekly Goal</span>
                        <p className="text-lg font-medium text-white mt-1">{aiPreferences.hours?.[0] || 5} Hours</p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={handleEditPreferences}
                        variant="outline"
                        className="border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <Edit2 size={16} className="mr-2" />
                        Edit Configuration
                      </Button>
                      <Button
                        onClick={handleDeletePreferences}
                        variant="outline"
                        className="border-slate-700 text-slate-300 hover:bg-slate-800"
                      >
                        <Trash2 size={16} className="mr-2" />
                        Reset / Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center animate-in fade-in slide-in-from-top-2 duration-300">
                    <p className="text-slate-400 mb-4">
                      Setup your AI Learning Companion to get personalized recommendations
                    </p>
                    <Button
                      onClick={() => setShowAIModal(true)}
                      className="px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
                    >
                      <Sparkles size={16} />
                      Setup AI Companion
                    </Button>
                  </div>
                )
              ) : (
                <div className="py-8 text-center text-slate-500 bg-slate-950/30 rounded-lg border border-slate-800/50 border-dashed">
                  <p>AI Assistant is currently disabled.</p>
                  <p className="text-sm opacity-70">Turn it on to get personalized recommendations.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. MIDDLE LEFT: Playback (Full Height) */}
          <Card className="col-span-1 bg-slate-900/60 backdrop-blur-md border-slate-800/50 shadow-2xl h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                <CardTitle className="text-white">Playback & Data</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 flex-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="autoplay-switch" className="text-white">Autoplay Next Lesson</Label>
                <Switch
                  id="autoplay-switch"
                  checked={autoplayNextLesson}
                  onCheckedChange={setAutoplayNextLesson}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              
              {/* 🛑 FIX CRASH: Custom Styled Native Select */}
              <div className="space-y-2">
                <Label htmlFor="video-quality-select" className="text-white">Video Quality</Label>
                <div className="relative">
                  <select
                    id="video-quality-select"
                    value={videoQuality}
                    onChange={(e) => setVideoQuality(e.target.value)}
                    className="w-full appearance-none bg-slate-950 border border-slate-700 hover:border-slate-600 rounded-md py-2 pl-3 pr-10 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer"
                  >
                    <option value="auto">Auto (Recommended)</option>
                    <option value="1080p">High Definition (1080p)</option>
                    <option value="720p">Standard (720p)</option>
                    <option value="480p">Data Saver (480p)</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-slate-500 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="download-wifi-switch" className="text-white">Download over Wi-Fi Only</Label>
                <Switch
                  id="download-wifi-switch"
                  checked={downloadWifiOnly}
                  onCheckedChange={setDownloadWifiOnly}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </CardContent>
          </Card>

          {/* 2. MIDDLE RIGHT: Notifications (Full Height) */}
          <Card className="col-span-1 bg-slate-900/60 backdrop-blur-md border-slate-800/50 shadow-2xl h-full flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-400" />
                <CardTitle className="text-white">Notifications</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 flex-1">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-digests-switch" className="text-white">Email Digests</Label>
                  <p className="text-xs text-slate-500">Weekly progress summaries</p>
                </div>
                <Switch
                  id="email-digests-switch"
                  checked={emailDigests}
                  onCheckedChange={setEmailDigests}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="new-course-alerts-switch" className="text-white">New Course Alerts</Label>
                  <p className="text-xs text-slate-500">When followed educators publish</p>
                </div>
                <Switch
                  id="new-course-alerts-switch"
                  checked={newCourseAlerts}
                  onCheckedChange={setNewCourseAlerts}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* 3. Wallet Connection (Full Width) */}
          <Card className="col-span-1 md:col-span-2 bg-slate-900/60 backdrop-blur-md border-slate-800/50 shadow-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-amber-400" />
                <CardTitle className="text-white">Wallet Connection</CardTitle>
              </div>
              <CardDescription className="text-slate-400">
                Connect your wallet to receive certificate NFTs directly to your address
              </CardDescription>
            </CardHeader>
            <CardContent>
              {walletAddress ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-slate-950/50 border border-slate-800 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">Wallet Connected</p>
                      <p className="text-sm text-slate-400 font-mono truncate">{walletAddress}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyWalletAddress}
                        className="text-slate-400 hover:text-white"
                        title="Copy address"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={openExplorer}
                        className="text-slate-400 hover:text-white"
                        title="View on Explorer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleDisconnectWallet}
                    disabled={disconnectingWallet}
                    className="border-red-700 text-red-400 hover:bg-red-950/20"
                  >
                    {disconnectingWallet ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      'Disconnect Wallet'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-950/20 border border-amber-800/50 rounded-lg">
                    <p className="text-sm text-amber-200 mb-2">
                      <strong>Why connect a wallet?</strong>
                    </p>
                    <p className="text-xs text-amber-300/80">
                      When you complete courses, your certificates will be minted as NFTs on the blockchain. 
                      Connect your wallet to receive these certificates directly to your address. 
                      Without a connected wallet, certificates are minted to a zero address (not recommended).
                    </p>
                  </div>
                  <Button
                    onClick={handleConnectWallet}
                    disabled={connectingWallet}
                    className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                  >
                    {connectingWallet ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Wallet className="mr-2 h-4 w-4" />
                        Connect Wallet
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-slate-500">
                    We support MetaMask and other Web3 wallets. Make sure you're on Polygon Amoy testnet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. Organization Membership (Full Width) */}
          <Card className="col-span-1 md:col-span-2 bg-slate-900/60 backdrop-blur-md border-slate-800/50 shadow-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-400" />
                <CardTitle className="text-white">Organization</CardTitle>
              </div>
              <CardDescription className="text-slate-400">
                Join an organization to access exclusive courses and resources
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentOrg ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-slate-950/50 border border-slate-800 rounded-lg">
                    {currentOrg.logo_url ? (
                      <img 
                        src={currentOrg.logo_url} 
                        alt={currentOrg.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-indigo-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-white">{currentOrg.name}</p>
                      <p className="text-sm text-slate-400 flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        Member
                      </p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <p className="text-xs text-slate-500">
                    You can only be a member of one organization. Contact support to leave your current organization.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between max-w-md">
                    <div className="space-y-0.5">
                      <Label htmlFor="profile-public-switch" className="text-white flex items-center gap-2">
                        <Globe className="h-4 w-4 text-indigo-400" />
                        Profile Discoverable
                      </Label>
                      <p className="text-xs text-slate-500">Allow organizations to find and invite you</p>
                    </div>
                    <Switch
                      id="profile-public-switch"
                      checked={profilePublic}
                      disabled={savingProfilePublic}
                      onCheckedChange={async (checked) => {
                        if (!user) return
                        setSavingProfilePublic(true)
                        try {
                          const { error } = await supabase
                            .from('profiles')
                            .update({ profile_public: checked })
                            .eq('id', user.id)
                          if (error) throw error
                          setProfilePublic(checked)
                          toast.success(checked ? 'Profile is now discoverable' : 'Profile is now private')
                        } catch (error: any) {
                          console.error('Error updating profile visibility:', error)
                          toast.error('Failed to update setting')
                        } finally {
                          setSavingProfilePublic(false)
                        }
                      }}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                  
                  <div className="border-t border-slate-800 pt-4">
                    <Label className="text-white text-sm mb-2 block">Have an invite code?</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter organization invite code"
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                        className="bg-slate-950 border-slate-700 text-white uppercase"
                        maxLength={8}
                      />
                      <Button
                        onClick={async () => {
                          if (!inviteCode.trim()) {
                            toast.error('Please enter an invite code')
                            return
                          }
                          setJoiningOrg(true)
                          try {
                            const { data, error } = await supabase.rpc('join_organization_with_code', {
                              p_code: inviteCode.trim().toUpperCase()
                            })
                            
                            if (error) {
                              console.error('RPC Error:', error)
                              throw error
                            }
                            
                            console.log('Join org response:', data)
                            
                            if (data?.success) {
                              toast.success(data.message || 'Successfully joined organization!')
                              setInviteCode('') // Clear the input
                              
                              // Wait a bit for the database to commit
                              await new Promise(resolve => setTimeout(resolve, 500))
                              
                              // Refresh profile and org details
                              if (updateProfile) {
                                await updateProfile()
                              }
                              
                              // Fetch updated org membership
                              const { data: membership, error: membershipError } = await supabase
                                .from('org_members')
                                .select('org_id, organizations(id, name, logo_url)')
                                .eq('user_id', user.id)
                                .maybeSingle()
                              
                              if (membershipError) {
                                console.error('Error fetching membership:', membershipError)
                              }
                              
                              if (membership?.organizations) {
                                setCurrentOrg(membership.organizations)
                                toast.success(`Welcome to ${membership.organizations.name}!`)
                              } else {
                                // If membership not found, try refreshing again
                                setTimeout(async () => {
                                  const { data: retryMembership } = await supabase
                                    .from('org_members')
                                    .select('org_id, organizations(id, name, logo_url)')
                                    .eq('user_id', user.id)
                                    .maybeSingle()
                                  if (retryMembership?.organizations) {
                                    setCurrentOrg(retryMembership.organizations)
                                  }
                                }, 1000)
                              }
                            } else {
                              toast.error(data?.error || 'Failed to join organization')
                            }
                          } catch (error: any) {
                            console.error('Error joining organization:', error)
                            toast.error(error.message || error.error || 'Failed to join organization')
                          } finally {
                            setJoiningOrg(false)
                          }
                        }}
                        disabled={joiningOrg || !inviteCode.trim()}
                        className="bg-primary hover:bg-primary/90"
                      >
                        {joiningOrg ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Join'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5. BOTTOM: Privacy & Security (Full Width) */}
          <Card className="col-span-1 md:col-span-2 bg-slate-900/60 backdrop-blur-md border-slate-800/50 shadow-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-emerald-400" />
                <CardTitle className="text-white">Privacy & Security</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 space-y-6">
                  <div className="flex items-center justify-between max-w-md">
                    <div className="space-y-0.5">
                      <Label htmlFor="show-certs-switch" className="text-white">Show Certificates</Label>
                      <p className="text-xs text-slate-500">Display earned credentials publicly</p>
                    </div>
                    <Switch
                      id="show-certs-switch"
                      checked={showCertificates}
                      onCheckedChange={setShowCertificates}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                  </div>
                  <div className="flex items-center justify-between max-w-md">
                    <div className="space-y-0.5">
                      <Label htmlFor="change-password-button" className="text-white">Password</Label>
                      <p className="text-xs text-slate-500">Update your account password</p>
                    </div>
                    <Button
                      id="change-password-button"
                      variant="outline"
                      size="sm"
                      className="border-slate-700 text-slate-300 hover:bg-slate-800"
                      onClick={() => setShowChangePasswordForm(!showChangePasswordForm)}
                    >
                      Change
                    </Button>
                  </div>
                  {showChangePasswordForm && (
                    <div className="max-w-md pt-4 border-t border-slate-800 space-y-4">
                      <Input
                        type="password"
                        placeholder="Current Password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="bg-slate-950 border-slate-700 text-white"
                      />
                      <Input
                        type="password"
                        placeholder="New Password (min 6 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="bg-slate-950 border-slate-700 text-white"
                      />
                      <Input
                        type="password"
                        placeholder="Confirm New Password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="bg-slate-950 border-slate-700 text-white"
                      />
                      <Button
                        onClick={handleChangePassword}
                        disabled={changingPassword}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {changingPassword ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          'Update Password'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="border-t md:border-t-0 md:border-l border-slate-800 pt-6 md:pt-0 md:pl-8 flex flex-col justify-center min-w-[200px]">
                  <Button
                    variant="destructive"
                    className="w-full flex items-center gap-2 bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-900/50"
                    onClick={async () => {
                      try {
                        await signOut()
                        navigate('/')
                      } catch (error) {
                        console.error('Logout failed:', error)
                      }
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                  <p className="text-xs text-center text-slate-600 mt-2">v1.2.0 • Build 2026</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AIOnboardingModal
        isOpen={showAIModal}
        initialData={aiPreferences}
        onClose={() => {
          setShowAIModal(false)
          if (!aiPreferences) setAiEnabled(false)
        }}
        onComplete={handleAISetupComplete}
      />
    </div>
  )
}
