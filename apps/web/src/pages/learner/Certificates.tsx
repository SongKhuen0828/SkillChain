import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Award,
  ExternalLink,
  Trophy,
  CheckCircle2,
  Loader2,
  Sparkles,
  GraduationCap,
  Share2,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'

interface Certificate {
  id: string
  course_id: string
  tx_hash: string | null
  ipfs_hash: string | null
  minted_at: string | null
  created_at: string
  courses?: {
    title: string
  }
}

interface CompletedCourse {
  id: string
  title: string
  completed_at: string
  hasCertificate: boolean
}

export function Certificates() {
  const { user } = useAuth()
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [completedCourses, setCompletedCourses] = useState<CompletedCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [minting, setMinting] = useState<string | null>(null)

  const fetchData = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Fetch existing certificates
      const { data: certData, error: certError } = await supabase
        .from('certificates')
        .select(`
          id,
          course_id,
          tx_hash,
          ipfs_hash,
          minted_at,
          created_at,
          courses (
            title
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (certError) throw certError
      // Transform data to match Certificate interface
      const transformedCerts: Certificate[] = (certData || []).map((c: any) => ({
        id: c.id,
        course_id: c.course_id,
        tx_hash: c.tx_hash,
        ipfs_hash: c.ipfs_hash,
        minted_at: c.minted_at,
        created_at: c.created_at,
        courses: Array.isArray(c.courses) ? c.courses[0] : c.courses,
      }));
      setCertificates(transformedCerts)

      // Find courses that are 100% complete but don't have certificates
      const certCourseIds = new Set((certData || []).map(c => c.course_id))
      
      // Get all enrollments for this user
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('user_id', user.id)

      if (enrollError) {
        console.error('Error fetching enrollments:', enrollError)
        setCompletedCourses([])
      } else if (enrollments && enrollments.length > 0) {
        const enrolledCourseIds = enrollments.map(e => e.course_id)
        
        // Fetch courses with their modules and lessons
        const { data: coursesData } = await supabase
          .from('courses')
          .select(`
            id,
            title,
            modules (
              id,
              lessons (id)
            )
          `)
          .in('id', enrolledCourseIds)

        // Fetch user's completed lessons
        const { data: progressData } = await supabase
          .from('user_progress')
          .select('lesson_id')
          .eq('user_id', user.id)

        const completedLessonIds = new Set(progressData?.map(p => p.lesson_id) || [])

        // Calculate progress for each course and find 100% completed ones
        const completedCoursesList: CompletedCourse[] = []

        for (const course of coursesData || []) {
          // Skip if already has certificate
          if (certCourseIds.has(course.id)) continue

          // Count total lessons
          let totalLessons = 0
          const allLessonIds: string[] = []
          
          course.modules?.forEach((module: any) => {
            if (module.lessons && Array.isArray(module.lessons)) {
              totalLessons += module.lessons.length
              module.lessons.forEach((lesson: any) => {
                if (lesson.id) allLessonIds.push(lesson.id)
              })
            }
          })

          if (totalLessons === 0) continue

          // Count completed lessons
          const completedCount = allLessonIds.filter(lid => completedLessonIds.has(lid)).length
          const progress = Math.round((completedCount / totalLessons) * 100)

          // If 100% complete, add to list
          if (progress === 100) {
            completedCoursesList.push({
              id: course.id,
              title: course.title,
              completed_at: new Date().toISOString(),
              hasCertificate: false,
            })
          }
        }

        setCompletedCourses(completedCoursesList)
      } else {
        setCompletedCourses([])
      }
    } catch (error: any) {
      console.error('Error fetching certificates:', error)
      toast.error('Failed to load certificates')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user])

  // Handle manual minting
  const handleMintCertificate = async (courseId: string, _courseTitle: string) => {
    if (!user || minting) return

    setMinting(courseId)
    try {
      toast.info('Starting certificate minting...')
      
      const { updateEnrollmentStatus } = await import('@/lib/certificate')
      const success = await updateEnrollmentStatus(user.id, courseId, {
        autoMintCertificate: true,
      })

      if (success) {
        toast.success('Certificate minted successfully!')
        // Refresh data
        await fetchData()
      } else {
        toast.error('Failed to mint certificate. Make sure you completed the course.')
      }
    } catch (error: any) {
      console.error('Minting error:', error)
      toast.error(error.message || 'Failed to mint certificate')
    } finally {
      setMinting(null)
    }
  }

  const handleViewBlockchain = (txHash: string) => {
    window.open(`https://polygonscan.com/tx/${txHash}`, '_blank')
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Award className="h-6 w-6 text-white" />
            </div>
            My Certificates
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Your blockchain-verified learning achievements
          </p>
        </div>
      </motion.div>

      {/* Certificates List */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card/50 backdrop-blur-md overflow-hidden">
              <CardHeader>
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full mb-4" />
                <Skeleton className="h-8 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (() => {
        // Separate certificates into minted (with tx_hash) and pending (without tx_hash)
        const mintedCertificates = certificates.filter(c => c.tx_hash)
        const pendingCertificates = certificates.filter(c => !c.tx_hash)
        // Combine pending certificates with completed courses for "Ready to Mint" section
        const allPending = [
          ...pendingCertificates.map(c => ({
            id: c.course_id,
            title: c.courses?.title || 'Unknown Course',
            completed_at: c.created_at,
            certificateId: c.id,
          })),
          ...completedCourses.map(c => ({
            id: c.id,
            title: c.title,
            completed_at: c.completed_at,
            certificateId: null,
          })),
        ]

        if (mintedCertificates.length === 0 && allPending.length === 0) {
          return (
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700 shadow-lg">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mb-6">
                  <Award className="h-12 w-12 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">No certificates yet</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 text-center max-w-sm">
                  Complete courses to earn blockchain certificates
                </p>
              </CardContent>
            </Card>
          )
        }

        return (
          <>
            {/* Pending Mint Section */}
            {allPending.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30">
                    <GraduationCap className="h-5 w-5 text-white" />
                  </div>
                  Ready to Mint ({allPending.length})
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 -mt-2">
                  These courses are completed but not yet minted on blockchain
                </p>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {allPending.map((course, index) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.05 * index }}
                      whileHover={{ y: -4 }}
                    >
                      <Card className="bg-gradient-to-br from-cyan-50 to-purple-50 dark:from-cyan-950/30 dark:to-purple-950/30 border-cyan-500/30 dark:border-cyan-800/50 backdrop-blur-md shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-purple-500/0 to-cyan-500/0 group-hover:from-cyan-500/5 group-hover:via-purple-500/5 group-hover:to-cyan-500/5 transition-all duration-300 pointer-events-none" />
                        <CardHeader className="relative z-10">
                          <div className="flex items-center gap-3">
                            <motion.div 
                              whileHover={{ scale: 1.1, rotate: 5 }}
                              className="rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 p-3 shadow-lg shadow-cyan-500/30"
                            >
                              <Trophy className="h-6 w-6 text-white" />
                            </motion.div>
                            <div>
                              <CardTitle className="text-lg text-slate-900 dark:text-white">{course.title}</CardTitle>
                              <CardDescription className="text-slate-600 dark:text-slate-400">
                                Course Completed ✓
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                          <Button
                            onClick={() => handleMintCertificate(course.id, course.title)}
                            disabled={minting === course.id}
                            className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white shadow-lg shadow-cyan-500/30 border-0"
                          >
                            {minting === course.id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Minting to Blockchain...
                              </>
                            ) : (
                              <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Mint Certificate
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Minted on Blockchain Section */}
            {mintedCertificates.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <Award className="h-5 w-5 text-white" />
                  </div>
                  Minted on Blockchain ({mintedCertificates.length})
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 -mt-2">
                  Verified and permanently stored on Polygon blockchain
                </p>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {mintedCertificates.map((certificate, index) => (
                    <motion.div
                      key={certificate.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 * index }}
                      whileHover={{ y: -4 }}
                    >
                      <Card className="bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-950/30 dark:to-cyan-950/30 border-emerald-500/30 dark:border-emerald-800/50 backdrop-blur-md shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-cyan-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:via-cyan-500/5 group-hover:to-emerald-500/5 transition-all duration-300 pointer-events-none" />
                        <CardHeader className="relative z-10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <motion.div 
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 p-3 shadow-lg shadow-emerald-500/30"
                              >
                                <Award className="h-6 w-6 text-white" />
                              </motion.div>
                              <div>
                                <CardTitle className="text-lg text-slate-900 dark:text-white">{certificate.courses?.title || 'Course Certificate'}</CardTitle>
                                <CardDescription className="text-slate-600 dark:text-slate-400">
                                  Minted on {format(new Date(certificate.minted_at || certificate.created_at), 'MMMM dd, yyyy')}
                                </CardDescription>
                              </div>
                            </div>
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.2 + index * 0.1 }}
                            >
                              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                            </motion.div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4 relative z-10">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                              <div className="w-5 h-5 bg-primary/20 rounded-lg flex items-center justify-center">
                                <Trophy className="h-3 w-3 text-primary" />
                              </div>
                              <span className="font-medium">Transaction Hash</span>
                            </div>
                            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono break-all text-slate-900 dark:text-white">
                              {certificate.tx_hash}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              className="border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
                              onClick={() => handleViewBlockchain(certificate.tx_hash!)}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              PolygonScan
                            </Button>
                            <Button
                              variant="outline"
                              className="border-accent/30 hover:bg-accent/10 hover:border-accent/50 text-accent"
                              onClick={() => {
                                const shareUrl = `${window.location.origin}/verify/${certificate.id}`
                                navigator.clipboard.writeText(shareUrl)
                                toast.success('Share link copied to clipboard!')
                              }}
                            >
                              <Share2 className="h-4 w-4 mr-2" />
                              Share
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </>
        )
      })()}
    </div>
  )
}

