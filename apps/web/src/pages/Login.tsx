import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import FloatingLines from '@/components/FloatingLines'
import ClickSpark from '@/components/ClickSpark'
import {
  GraduationCap,
  BookOpen,
  Trophy,
  Sparkles,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard')
    } catch (error) {
      // Error handled by toast in context
    } finally {
      setLoading(false)
    }
  }

  const learnerFeatures = [
    { icon: Sparkles, text: 'AI-Powered Study Scheduling' },
    { icon: Trophy, text: 'Gamified Learning Experience' },
    { icon: GraduationCap, text: 'Blockchain Certificates' },
    { icon: BookOpen, text: 'Track Your Progress' },
  ]

  return (
    <ClickSpark sparkColor="#06b6d4" sparkSize={12} sparkRadius={20} sparkCount={8} duration={400}>
      <div className="min-h-screen w-full flex items-center justify-center p-4 relative bg-black overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <FloatingLines
          linesGradient={['#06b6d4', '#3b82f6', '#8b5cf6']} // Cyan -> Blue -> Purple
          enabledWaves={['top', 'middle', 'bottom']}
          lineCount={[10, 15, 20]}
          lineDistance={[8, 6, 4]}
          bendRadius={5.0}
          bendStrength={-0.5}
          interactive={true}
          parallax={true}
          parallaxStrength={0.5}
        />
      </div>

      {/* Main Split Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-h-[500px]"
      >
        {/* LEFT COLUMN: Brand Info */}
        <div className="p-10 flex flex-col justify-center border-r border-white/10 bg-white/5 relative hidden md:flex">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 pointer-events-none" />

          <div className="relative z-10">
            <h1 className="text-4xl font-bold bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent mb-2">
              SkillChain
            </h1>
            <p className="text-slate-400 mb-8">The future of blockchain education.</p>

            {/* Feature Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {learnerFeatures.map((feature, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-slate-950/50 border border-white/10 text-xs text-slate-300 flex items-center gap-2"
                >
                  <feature.icon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span className="font-medium">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* Checkmarks */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>Secure blockchain certificates</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>AI-powered study optimization</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>Gamified learning experience</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Login Form */}
        <div className="p-8 md:p-10 lg:p-12 flex flex-col justify-center bg-slate-950/30">
          <div className="space-y-1 mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-sm md:text-base text-slate-400">Sign in to continue your learning journey</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-white">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-white/10 rounded-md bg-slate-950/50 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-white">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 pr-10 border border-white/10 rounded-md bg-slate-950/50 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400/50"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-slate-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              size="lg"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Sign In'}
            </Button>

            <div className="text-center text-sm">
              <span className="text-slate-400">Don't have an account? </span>
              <Link to="/signup" className="text-cyan-400 hover:text-cyan-300 font-medium hover:underline">
                Sign up
              </Link>
            </div>

            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-center text-slate-400">
                Forgot your password?{' '}
                <a href="#" className="text-cyan-400 hover:text-cyan-300 hover:underline">
                  Reset it here
                </a>
              </p>
            </div>
          </form>

          {/* Mobile Features (shown below form on mobile) */}
          <div className="md:hidden mt-8 space-y-4 pt-8 border-t border-white/10">
            <h3 className="text-lg font-semibold text-center text-white">Why Choose SkillChain</h3>
            <div className="grid grid-cols-2 gap-3">
              {learnerFeatures.map((feature, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10 text-center"
                >
                  <feature.icon className="h-6 w-6 text-cyan-400" />
                  <span className="text-xs font-medium text-white">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
    </ClickSpark>
  )
}
