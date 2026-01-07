import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Medal, Award } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Skeleton } from '@/components/ui/skeleton'

export function Leaderboard() {
  const { user } = useAuth()
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        // Fetch top 10 profiles by XP (using xp column, not xp_points)
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, xp, streak')
          .order('xp', { ascending: false })
          .limit(10)

        if (error) throw error

        // Add rank and mark current user
        const ranked = (data || []).map((profile, index) => ({
          rank: index + 1,
          name: profile.full_name || 'Anonymous',
          xp: profile.xp || 0,
          streak: profile.streak || 0,
          avatar: profile.avatar_url,
          id: profile.id,
          isCurrentUser: user?.id === profile.id,
        }))

        setLeaderboard(ranked)
      } catch (error: any) {
        console.error('Error fetching leaderboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [user])

  const getLeaderboard = () => leaderboard
  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />
    if (rank === 3) return <Medal className="h-6 w-6 text-orange-600" />
    return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-4xl font-bold">Leaderboard</h1>
          <p className="text-muted-foreground mt-2">Top learners this month</p>
        </div>
      </motion.div>

      {/* Leaderboard Table */}
      <Card className="bg-card/50 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top Learners
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No leaderboard data available</p>
            </div>
          ) : (
            <div className="space-y-2">
              {getLeaderboard().map((learner, index) => (
              <motion.div
                key={learner.rank}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                  learner.isCurrentUser
                    ? 'bg-primary/10 border-primary/20'
                    : 'hover:bg-accent'
                }`}
              >
                <div className="flex items-center justify-center w-12">
                  {getRankIcon(learner.rank)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {learner.name}
                      {learner.isCurrentUser && (
                        <span className="ml-2 text-xs text-primary">(You)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span>{learner.xp.toLocaleString()} XP</span>
                    <span>•</span>
                    <span>{learner.streak} day streak</span>
                  </div>
                </div>
                {learner.rank <= 3 && (
                  <Award className="h-5 w-5 text-yellow-500" />
                )}
              </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

