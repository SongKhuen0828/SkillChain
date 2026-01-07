import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Missing Supabase environment variables!')
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type UserRole = 'learner' | 'educator' | 'org_admin' | 'admin'

export interface UserProfile {
  id: string
  full_name?: string
  avatar_url?: string
  role: UserRole
  xp: number
  streak: number
  created_at: string
  updated_at: string
  email?: string // Optional email for display purposes
  wallet_address?: string // Ethereum wallet address for certificate NFTs
  org_id?: string // Organization ID for org_admin and org members
  profile_public?: boolean // Whether profile is discoverable by organizations
  verification_status?: 'pending' | 'approved' | 'rejected' // For educators
  ai_companion_enabled?: boolean // Whether AI companion is enabled
}

