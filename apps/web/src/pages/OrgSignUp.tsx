import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Mail, Lock, User, Loader2 } from 'lucide-react'

export function OrgSignUp() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  
  // Debug: Log when component mounts
  console.log('OrgSignUp component mounted')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    orgName: '',
    orgDescription: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validation
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match')
        setLoading(false)
        return
      }

      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters')
        setLoading(false)
        return
      }

      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) {
        throw new Error('Failed to create user')
      }

      const userId = authData.user.id

      // Step 2: Create organization
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.orgName,
          description: formData.orgDescription || null,
        })
        .select()
        .single()

      if (orgError) {
        // If organization creation fails, try to clean up the auth user
        console.error('Error creating organization:', orgError)
        throw new Error(`Failed to create organization: ${orgError.message}`)
      }

      const orgId = orgData.id

      // Step 3: Update profile with org_admin role and org_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          role: 'org_admin',
          org_id: orgId,
          ai_companion_enabled: true,
        })
        .eq('id', userId)

      if (profileError) {
        console.error('Error updating profile:', profileError)
        // Try to clean up organization
        await supabase.from('organizations').delete().eq('id', orgId)
        throw new Error(`Failed to create admin profile: ${profileError.message}`)
      }

      toast.success('Organization account created successfully!')
      toast.info('Please check your email to confirm your account')
      
      // Navigate to login or dashboard
      setTimeout(() => {
        navigate('/auth?type=login')
      }, 2000)

    } catch (error: any) {
      console.error('Error creating organization account:', error)
      toast.error(error.message || 'Failed to create organization account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-slate-900/90 backdrop-blur-md border-slate-800 shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-purple-400" />
          </div>
          <CardTitle className="text-3xl font-bold text-white">Create Organization</CardTitle>
          <CardDescription className="text-slate-400">
            Start your organization account on SkillChain
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Organization Information */}
            <div className="space-y-4 pb-4 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                Organization Details
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="orgName" className="text-slate-300">Organization Name *</Label>
                <Input
                  id="orgName"
                  type="text"
                  placeholder="Your Organization Name"
                  value={formData.orgName}
                  onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                  required
                  className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgDescription" className="text-slate-300">Description (Optional)</Label>
                <textarea
                  id="orgDescription"
                  placeholder="Brief description of your organization"
                  value={formData.orgDescription}
                  onChange={(e) => setFormData({ ...formData, orgDescription: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-md text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Admin Account Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-purple-400" />
                Admin Account
              </h3>

              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-slate-300">Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Your full name"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@yourorganization.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-300">Confirm Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    minLength={6}
                    className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-white h-12 text-lg font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creating Organization...
                  </>
                ) : (
                  'Create Organization Account'
                )}
              </Button>

              <div className="text-center text-sm text-slate-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/auth?type=login')}
                  className="text-purple-400 hover:text-purple-300 font-medium"
                >
                  Sign in
                </button>
              </div>

              <div className="text-center text-sm text-slate-500">
                Want to learn as an individual?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/auth?type=signup')}
                  className="text-purple-400 hover:text-purple-300 font-medium"
                >
                  Sign up as Learner
                </button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

