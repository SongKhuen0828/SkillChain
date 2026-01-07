import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  GraduationCap, 
  Users, 
  Building2, 
  Shield, 
  Sparkles, 
  Award,
  ArrowRight,
  CheckCircle2,
  Search,
  BookOpen,
  Zap,
  Brain
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import FloatingLines from '@/components/FloatingLines';
import { motion } from 'framer-motion';

export function LandingPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [totalCourses, setTotalCourses] = useState(0);
  const [totalCertifiedStudents, setTotalCertifiedStudents] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);
  const [verifyTxHash, setVerifyTxHash] = useState('');

  // Fetch landing page statistics
  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch total published courses
        const { count: coursesCount } = await supabase
          .from('courses')
          .select('*', { count: 'exact', head: true })
          .eq('is_published', true);

        setTotalCourses(coursesCount || 0);

        // Fetch total unique certified students
        const { count: certCount } = await supabase
          .from('certificates')
          .select('user_id', { count: 'exact', head: true });

        setTotalCertifiedStudents(certCount || 0);
      } catch (error) {
        console.error('Error fetching landing page stats:', error);
      } finally {
        setStatsLoading(false);
      }
    }

    fetchStats();
  }, []);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyTxHash.trim()) {
      navigate(`/verify/tx/${verifyTxHash.trim()}`);
    }
  };

  if (authLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-black overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        <FloatingLines
          linesGradient={['#06b6d4', '#3b82f6', '#8b5cf6']}
          enabledWaves={['top', 'middle', 'bottom']}
          lineCount={[12, 18, 24]}
          lineDistance={[8, 6, 4]}
          bendRadius={5.0}
          bendStrength={-0.5}
          interactive={true}
          parallax={true}
          parallaxStrength={0.5}
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/80"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Navigation Header */}
        <header className="border-b border-white/10 bg-black/40 backdrop-blur-sm sticky top-0 z-50">
          <div className="w-full px-6 sm:px-10 lg:px-16">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                  <GraduationCap className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  SkillChain
                </span>
              </div>
              
              <nav className="flex items-center gap-4">
                {user ? (
                  <Button 
                    onClick={() => navigate('/dashboard')}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    Go to Dashboard
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => navigate('/login')}
                      className="text-white/80 hover:text-white hover:bg-white/10"
                    >
                      Login
                    </Button>
                    <Button
                      onClick={() => navigate('/signup')}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    >
                      Sign Up
                    </Button>
                  </>
                )}
              </nav>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="w-full px-8 sm:px-12 lg:px-20 py-16 lg:py-24">
          <div className="text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
            >
              <span className="text-white">Empowering the Future of Education</span>
              <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mt-2">
                with AI & Web3
              </span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto"
            >
              Learn smarter, certify on blockchain, and build your future with AI-powered personalized learning paths
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-10"
            >
              <Button
                onClick={() => navigate(user ? '/dashboard' : '/signup')}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 text-lg shadow-lg shadow-blue-500/50"
              >
                Start Learning
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Link to="/register-organization">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white/30 text-white hover:bg-white/10 px-8 py-6 text-lg backdrop-blur-sm"
                >
                  For Organizations
                  <Building2 className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="flex flex-wrap justify-center gap-12 mb-10"
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">{totalCourses}+</div>
                <div className="text-sm text-slate-400">Courses Available</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">{totalCertifiedStudents}+</div>
                <div className="text-sm text-slate-400">Certified Students</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">100%</div>
                <div className="text-sm text-slate-400">Blockchain Verified</div>
              </div>
            </motion.div>

            {/* Verification Search */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="max-w-xl mx-auto"
            >
              <Card className="bg-white/10 dark:bg-slate-900/40 backdrop-blur-md border-white/20 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="h-6 w-6 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">
                      Have a certificate? Verify it instantly on the blockchain
                    </h3>
                  </div>
                  <form onSubmit={handleVerify} className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter transaction hash (tx_hash)"
                      value={verifyTxHash}
                      onChange={(e) => setVerifyTxHash(e.target.value)}
                      className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400"
                    />
                    <Button 
                      type="submit" 
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Verify
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full px-8 sm:px-12 lg:px-20 py-16">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Why Choose SkillChain
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Experience the future of learning with cutting-edge technology
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Learner Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="bg-white/10 dark:bg-slate-900/40 backdrop-blur-md border-white/20 hover:border-blue-400/50 transition-all duration-300 h-full">
                <CardContent className="p-8">
                  <div className="p-4 bg-blue-500/20 rounded-xl w-fit mb-6">
                    <Sparkles className="h-8 w-8 text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    For Learners
                  </h3>
                  <ul className="space-y-3 text-slate-300 mb-6">
                    <li className="flex items-start gap-3">
                      <Brain className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-white">AI-Powered Scheduling:</strong> Personalized study plans that adapt to your learning style</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Award className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-white">Gamification:</strong> Earn XP, badges, and climb the leaderboard</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-white">Blockchain Certificates:</strong> Immutable, verifiable credentials on the blockchain</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <BookOpen className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-white">Track Progress:</strong> Monitor your learning journey with detailed analytics</span>
                    </li>
                  </ul>
                  <Button
                    onClick={() => navigate(user ? '/dashboard' : '/signup')}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    Start Learning
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Educator Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="bg-white/10 dark:bg-slate-900/40 backdrop-blur-md border-white/20 hover:border-purple-400/50 transition-all duration-300 h-full">
                <CardContent className="p-8">
                  <div className="p-4 bg-primary/20 rounded-xl w-fit mb-6">
                    <GraduationCap className="h-8 w-8 text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    For Educators
                  </h3>
                  <ul className="space-y-3 text-slate-300 mb-6">
                    <li className="flex items-start gap-3">
                      <Zap className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-white">Course Builder:</strong> Create engaging courses with videos, quizzes, and modules</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Brain className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-white">Analytics Dashboard:</strong> Track student progress and engagement metrics</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Award className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-white">Certificate Issuance:</strong> Mint blockchain certificates for your students</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <BookOpen className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-white">Student Management:</strong> Monitor and support your learners effectively</span>
                    </li>
                  </ul>
                  <Button
                    onClick={() => navigate(user ? '/dashboard' : '/signup')}
                    variant="outline"
                    className="w-full border-2 border-primary text-primary hover:bg-primary/10"
                  >
                    Become an Educator
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Organization Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Card className="bg-white/10 dark:bg-slate-900/40 backdrop-blur-md border-white/20 hover:border-green-400/50 transition-all duration-300 h-full">
                <CardContent className="p-8">
                  <div className="p-4 bg-green-500/20 rounded-xl w-fit mb-6">
                    <Building2 className="h-8 w-8 text-green-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    For Organizations
                  </h3>
                  <ul className="space-y-3 text-slate-300 mb-6">
                    <li className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-white">Team Management:</strong> Manage educators and track organization-wide metrics</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-white">Branded Certificates:</strong> Issue certificates with your organization logo</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Brain className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-white">AI Insights:</strong> Get organization-wide learning analytics and insights</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Award className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span><strong className="text-white">Scalable Platform:</strong> Support hundreds of learners with enterprise features</span>
                    </li>
                  </ul>
                  <Link to="/register-organization" className="block w-full">
                    <Button
                      variant="outline"
                      className="w-full border-2 border-green-400 text-green-400 hover:bg-green-400/10"
                    >
                      Register Organization
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-black/40 backdrop-blur-sm border-t border-white/10 py-12 mt-20">
          <div className="w-full px-8 sm:px-12 lg:px-20">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                    <GraduationCap className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xl font-bold text-white">SkillChain</span>
                </div>
                <p className="text-slate-400 mb-4">
                  Empowering the future of education with AI and Web3 technology.
                </p>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Platform</h4>
                <ul className="space-y-2 text-slate-400">
                  <li>
                    <button onClick={() => navigate('/')} className="hover:text-white transition-colors">
                      Home
                    </button>
                  </li>
                  <li>
                    <button onClick={() => navigate('/login')} className="hover:text-white transition-colors">
                      Login
                    </button>
                  </li>
                  <li>
                    <button onClick={() => navigate('/signup')} className="hover:text-white transition-colors">
                      Sign Up
                    </button>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-semibold mb-4">Resources</h4>
                <ul className="space-y-2 text-slate-400">
                  <li>
                    <button onClick={() => navigate('/verify')} className="hover:text-white transition-colors">
                      Verify Certificate
                    </button>
                  </li>
                  <li>
                    <Link 
                      to="/register-organization"
                      className="hover:text-white transition-colors"
                    >
                      For Organizations
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="border-t border-white/10 mt-8 pt-8 text-center text-slate-400 text-sm">
              <p>© 2024 SkillChain. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
