import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye,
  EyeOff,
  CheckCircle2,
  User,
  GraduationCap,
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  Sparkles,
  Building2,
  Ticket,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import FloatingLines from '@/components/FloatingLines'
import ClickSpark from '@/components/ClickSpark'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface InviteInfo {
  code: string;
  org_id: string;
  org_name: string;
}

export default function SignUp() {
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(1) // 1 = Role/Name, 2 = Email/Pass
  const [role, setRole] = useState<'learner' | 'educator'>('learner')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  // Educator-specific fields
  const [professionalTitle, setProfessionalTitle] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  // Invite code state
  const [inviteCode, setInviteCode] = useState('')
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)
  const [validatingInvite, setValidatingInvite] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  // Check for invite code in URL
  useEffect(() => {
    const inviteFromUrl = searchParams.get('invite')
    if (inviteFromUrl) {
      setInviteCode(inviteFromUrl)
      setRole('educator') // Auto-select educator for invite links
      validateInviteCode(inviteFromUrl)
    }
  }, [searchParams])

  const validateInviteCode = async (code: string) => {
    if (!code.trim()) {
      setInviteInfo(null)
      return
    }

    try {
      setValidatingInvite(true)
      
      // Fetch the invite code
      const { data, error } = await supabase
        .from('org_invite_codes')
        .select(`
          code,
          org_id,
          max_uses,
          current_uses,
          expires_at,
          is_active,
          organizations (name)
        `)
        .eq('code', code.trim().toUpperCase())
        .eq('is_active', true)
        .single()

      if (error || !data) {
        setInviteInfo(null)
        toast.error('Invalid or expired invite code')
        return
      }

      // Check if expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setInviteInfo(null)
        toast.error('This invite code has expired')
        return
      }

      // Check if max uses reached
      if (data.max_uses && data.current_uses >= data.max_uses) {
        setInviteInfo(null)
        toast.error('This invite code has reached its maximum uses')
        return
      }

      setInviteInfo({
        code: data.code,
        org_id: data.org_id,
        org_name: (data.organizations as any)?.name || 'Organization',
      })
      toast.success(`Valid invite for ${(data.organizations as any)?.name || 'Organization'}`)
    } catch (error) {
      console.error('Error validating invite:', error)
      setInviteInfo(null)
    } finally {
      setValidatingInvite(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptTerms) {
      return
    }
    // Validate educator fields if educator is selected
    if (role === 'educator' && (!professionalTitle.trim() || !portfolioUrl.trim())) {
      return
    }
    setLoading(true)
    try {
      // Sign up with org_id if invite code is valid
      await signUp(
        email,
        password,
        role,
        fullName || undefined,
        role === 'educator'
          ? {
              professional_title: professionalTitle.trim(),
              portfolio_url: portfolioUrl.trim(),
              org_id: inviteInfo?.org_id || null,
            }
          : undefined,
      )

      // If joined with invite code, increment the use count
      if (inviteInfo) {
        await supabase.rpc('use_invite_code', {
          invite_code: inviteInfo.code,
          user_id: (await supabase.auth.getUser()).data.user?.id,
        }).catch(err => console.warn('Could not update invite code:', err))
      }

      navigate('/dashboard')
    } catch (error) {
      // Error handled by toast in context
    } finally {
      setLoading(false)
    }
  }

  // Animation settings for smooth sliding
  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 20 : -20, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? 20 : -20, opacity: 0 }),
  }

  return (
    <ClickSpark sparkColor="#06b6d4" sparkSize={12} sparkRadius={20} sparkCount={8} duration={400}>
      <div className="min-h-screen w-full flex items-center justify-center p-4 relative bg-slate-950 overflow-hidden font-sans">
      {/* Background (Same as Login) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <FloatingLines
          linesGradient={['#06b6d4', '#3b82f6', '#8b5cf6']}
          enabledWaves={['top', 'middle', 'bottom']}
          lineCount={[10, 15, 20]}
          interactive={true}
        />
      </div>

      {/* Main Split Glass Card (Matches Login Height) */}
      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-h-[550px]">
        {/* === LEFT COLUMN: BRAND INFO (Identical to Login) === */}
        <div className="p-10 hidden md:flex flex-col justify-center border-r border-white/10 bg-white/5 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 pointer-events-none" />

          <div className="mb-2 flex items-center gap-2">
            <div className="p-2 bg-primary rounded-lg">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">SkillChain</h1>
          </div>
          <p className="text-slate-400 mb-8 text-lg leading-relaxed">
            Join the decentralized education revolution. Earn verifiable certificates and level up your career.
          </p>

          {/* Feature List (Decorative) */}
          <div className="grid grid-cols-1 gap-4 mb-auto">
            <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/20 text-cyan-400">
                <GraduationCap size={20} />
              </div>
              <div>
                <div className="text-slate-200 font-medium">For Learners</div>
                <div className="text-slate-500 text-xs">Learn & Earn XP</div>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/20 text-cyan-400">
                <User size={20} />
              </div>
              <div>
                <div className="text-slate-200 font-medium">For Educators</div>
                <div className="text-slate-500 text-xs">Create & Share</div>
              </div>
            </div>
          </div>

          {/* Footer Checks */}
          <div className="mt-8 space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> Free to get started
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> No credit card required
            </div>
          </div>
        </div>

        {/* === RIGHT COLUMN: STEPPER FORM === */}
        <div className="p-8 md:p-12 flex flex-col justify-center bg-slate-950/30 relative">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Create Account</h2>
            {/* Progress Indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  step >= 1
                    ? role === 'educator'
                      ? 'bg-primary'
                      : 'bg-blue-700'
                    : 'bg-slate-800'
                }`}
              />
              <div
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  step >= 2
                    ? role === 'educator'
                      ? 'bg-primary'
                      : 'bg-blue-700'
                    : 'bg-slate-800'
                }`}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 text-right">Step {step} of 2</p>
          </div>

          {/* Form Content */}
          <form
            onSubmit={
              step === 2
                ? handleSubmit
                : (e) => {
                    e.preventDefault()
                    // Validate educator fields if educator is selected
                    if (role === 'educator' && (!professionalTitle.trim() || !portfolioUrl.trim())) {
                      return
                    }
                    setStep(2)
                  }
            }
          >
            <AnimatePresence mode="wait" custom={step}>
              {/* STEP 1: ROLE & NAME */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  custom={1}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Role Toggle */}
                  <div className="grid grid-cols-2 gap-3 p-1 bg-slate-900/50 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => setRole('learner')}
                      className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                        role === 'learner'
                          ? 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-lg shadow-blue-900/20'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Learner
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('educator')}
                      className={`py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                        role === 'educator'
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Educator
                    </button>
                  </div>

                  {/* Name Input */}
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-xs uppercase tracking-wider font-semibold">
                      Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <Input
                        placeholder="e.g. Jac Mah"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={`pl-10 bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 h-11 ${
                          role === 'educator'
                            ? 'focus:border-cyan-500/50 focus:ring-cyan-500/20'
                            : 'focus:border-blue-700/50 focus:ring-blue-700/20'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Educator-specific fields */}
                  {role === 'educator' && (
                    <>
                      {/* Invite Code (Optional) */}
                      <div className="space-y-2">
                        <Label className="text-slate-300 text-xs uppercase tracking-wider font-semibold flex items-center gap-2">
                          <Ticket className="h-3 w-3" />
                          Organization Invite Code (Optional)
                        </Label>
                        <div className="relative">
                          <Input
                            placeholder="e.g. ABCD1234"
                            value={inviteCode}
                            onChange={(e) => {
                              const code = e.target.value.toUpperCase()
                              setInviteCode(code)
                              if (code.length === 8) {
                                validateInviteCode(code)
                              } else {
                                setInviteInfo(null)
                              }
                            }}
                            maxLength={8}
                            className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:ring-cyan-500/20 h-11 font-mono uppercase"
                          />
                          {validatingInvite && (
                            <div className="absolute right-3 top-3">
                              <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                        {inviteInfo && (
                          <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <Building2 className="h-4 w-4 text-green-400" />
                            <span className="text-sm text-green-400">
                              You'll join: <strong>{inviteInfo.org_name}</strong>
                            </span>
                            <CheckCircle2 className="h-4 w-4 text-green-400 ml-auto" />
                          </div>
                        )}
                        <p className="text-xs text-slate-400">
                          If you have an invite code from an organization, enter it here
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-300 text-xs uppercase tracking-wider font-semibold">
                          Professional Title
                        </Label>
                        <Input
                          placeholder="e.g. Senior Blockchain Developer"
                          value={professionalTitle}
                          onChange={(e) => setProfessionalTitle(e.target.value)}
                          required
                          className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:ring-cyan-500/20 h-11"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-300 text-xs uppercase tracking-wider font-semibold">
                          LinkedIn / Portfolio URL
                        </Label>
                        <Input
                          type="url"
                          placeholder="https://linkedin.com/in/yourname or https://github.com/yourname"
                          value={portfolioUrl}
                          onChange={(e) => setPortfolioUrl(e.target.value)}
                          required
                          className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 focus:border-cyan-500/50 focus:ring-cyan-500/20 h-11"
                        />
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Required for account verification and credibility.
                        </p>
                      </div>
                    </>
                  )}

                  <Button
                    type="submit"
                    className={`w-full text-white border-0 h-11 ${
                      role === 'educator'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-white shadow-lg shadow-cyan-500/30'
                        : 'bg-blue-700 hover:bg-blue-800 text-white shadow-lg shadow-blue-900/20'
                    }`}
                    disabled={role === 'educator' && (!professionalTitle.trim() || !portfolioUrl.trim())}
                  >
                    Continue <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </motion.div>
              )}

              {/* STEP 2: EMAIL & PASSWORD */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  custom={2}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-xs uppercase tracking-wider font-semibold">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                        <Input
                          type="email"
                          placeholder="name@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className={`pl-10 bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 h-11 ${
                            role === 'educator'
                              ? 'focus:border-cyan-500/50 focus:ring-cyan-500/20'
                              : 'focus:border-blue-700/50 focus:ring-blue-700/20'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300 text-xs uppercase tracking-wider font-semibold">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          className={`pl-10 bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 h-11 ${
                            role === 'educator'
                              ? 'focus:border-cyan-500/50 focus:ring-cyan-500/20'
                              : 'focus:border-blue-700/50 focus:ring-blue-700/20'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <p className="text-xs text-slate-400">Must be at least 6 characters long</p>
                    </div>
                  </div>

                  {/* Terms Checkbox */}
                  <div className="flex items-start gap-2 pt-2">
                    <div className="flex h-5 items-center">
                      <input
                        id="terms"
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        required
                        className={`h-4 w-4 rounded border-white/10 bg-white/5 focus:ring-20 ${
                          role === 'educator'
                            ? 'text-cyan-500 focus:ring-cyan-500/20 accent-cyan-500'
                            : 'text-blue-700 focus:ring-blue-700/20 accent-blue-700'
                        }`}
                      />
                    </div>
                    <label htmlFor="terms" className="text-xs text-slate-400 leading-tight cursor-pointer">
                      I agree to the{' '}
                      <a
                        href="#"
                        className={`hover:underline ${
                          role === 'educator' ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-500'
                        }`}
                      >
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a
                        href="#"
                        className={`hover:underline ${
                          role === 'educator' ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-500'
                        }`}
                      >
                        Privacy Policy
                      </a>
                      .
                    </label>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setStep(1)}
                      className="text-slate-400 hover:text-white hover:bg-white/5 h-11 px-4"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      type="submit"
                      className={`flex-1 text-white border-0 h-11 ${
                        role === 'educator'
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 text-white shadow-lg shadow-cyan-500/30'
                          : 'bg-blue-700 hover:bg-blue-800 text-white shadow-lg shadow-blue-900/20'
                      }`}
                      disabled={loading || !acceptTerms || (role === 'educator' && (!professionalTitle.trim() || !portfolioUrl.trim()))}
                    >
                      {loading ? 'Creating...' : 'Create Account'}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          <div className="mt-auto pt-6 text-center text-sm border-t border-white/5">
            <span className="text-slate-400">Already have an account? </span>
            <Link
              to="/login"
              className={`font-medium hover:underline ${
                role === 'educator' ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-500'
              }`}
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
    </ClickSpark>
  )
}
