import { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/lib/supabase'
import { toast } from 'sonner'

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (
    email: string,
    password: string,
    role: 'learner' | 'educator',
    fullName?: string,
    educatorInfo?: { professional_title: string; portfolio_url: string; org_id?: string | null },
  ) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // If profile doesn't exist yet, that's okay - it will be created by trigger
        if (error.code === 'PGRST116') {
          console.log('Profile not found, will be created by trigger')
          setLoading(false)
          return
        }
        throw error
      }
      setProfile(data as UserProfile)
    } catch (error) {
      console.error('Error fetching profile:', error)
      // Don't block the app if profile fetch fails
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      toast.success('Signed in successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in')
      throw error
    }
  }

  async function signUp(
    email: string,
    password: string,
    role: 'learner' | 'educator',
    fullName?: string,
    educatorInfo?: { professional_title: string; portfolio_url: string; org_id?: string | null },
  ) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || '',
            role: role,
          },
        },
      })
      if (error) throw error

      // Profile is automatically created by trigger, but we need to update it
      // The metadata is now passed to auth, but we still update the profile table
      // to ensure consistency (in case the trigger doesn't use metadata)
      if (data.user) {
        const updateData: any = {}
        if (role === 'educator') {
          updateData.role = 'educator'
          updateData.verification_status = 'pending'
          if (educatorInfo) {
            updateData.professional_title = educatorInfo.professional_title
            updateData.portfolio_url = educatorInfo.portfolio_url
            // Add org_id if educator joined via invite
            if (educatorInfo.org_id) {
              updateData.org_id = educatorInfo.org_id
            }
          }
        }
        if (fullName) {
          updateData.full_name = fullName
        }

        if (Object.keys(updateData).length > 0) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', data.user.id)

          if (profileError) throw profileError
        }
      }

      toast.success('Account created successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign up')
      throw error
    }
  }

  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast.success('Signed out successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out')
      throw error
    }
  }

  async function updateProfile() {
    if (!user) return
    await fetchProfile(user.id)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

