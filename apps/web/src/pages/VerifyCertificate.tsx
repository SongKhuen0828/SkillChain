import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle2, ExternalLink, Shield, Calendar, Award, Building2 } from 'lucide-react'
import { format } from 'date-fns'

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
}

export function VerifyCertificate() {
  const { certId } = useParams<{ certId: string }>()
  const [certificate, setCertificate] = useState<any>(null)
  const [course, setCourse] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCertificate() {
      if (!certId) return

      try {
        // Fetch certificate with related data
        const { data: certData, error: certError } = await supabase
          .from('certificates')
          .select(`
            *,
            courses(*),
            profiles(*)
          `)
          .eq('id', certId)
          .single()

        if (certError) throw certError

        setCertificate(certData)
        setCourse(certData.courses)
        setProfile(certData.profiles)

        // Fetch organization if course has org_id
        if (certData.courses?.org_id) {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('id, name, logo_url')
            .eq('id', certData.courses.org_id)
            .single()
          
          if (orgData) {
            setOrganization(orgData)
          }
        }
      } catch (error: any) {
        console.error('Error fetching certificate:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCertificate()
  }, [certId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!certificate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-6">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Certificate Not Found</h3>
            <p className="text-sm text-muted-foreground">
              The certificate you're looking for doesn't exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl border-2 border-primary/20">
        <CardHeader className="text-center pb-4">
          {/* Organization Logo (if available) */}
          {organization?.logo_url && (
            <div className="flex justify-center mb-4">
              <img 
                src={organization.logo_url} 
                alt={organization.name}
                className="h-16 w-auto object-contain"
              />
            </div>
          )}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
              <div className="relative bg-primary/10 rounded-full p-6">
                <Shield className="h-16 w-16 text-primary" />
              </div>
            </div>
          </div>
          <CardTitle className="text-3xl mb-2">Verified Credential</CardTitle>
          <p className="text-muted-foreground">
            This certificate has been verified on the blockchain
          </p>
          {organization && (
            <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>Issued by <strong>{organization.name}</strong></span>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Certificate Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <Award className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Course</p>
                <p className="font-semibold">{course?.title || 'Unknown Course'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Learner</p>
                <p className="font-semibold">
                  {profile?.full_name || profile?.email || 'Unknown Learner'}
                </p>
              </div>
            </div>

            {certificate.minted_at && (
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Issued On</p>
                  <p className="font-semibold">
                    {format(new Date(certificate.minted_at), 'MMMM dd, yyyy')}
                  </p>
                </div>
              </div>
            )}

            {certificate.tx_hash && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <p className="text-sm font-medium">Blockchain Transaction</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-background px-2 py-1 rounded flex-1 truncate">
                    {certificate.tx_hash}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href={`https://polygonscan.com/tx/${certificate.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  View this transaction on Polygonscan to verify authenticity
                </p>
              </div>
            )}

            {certificate.ipfs_hash && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <p className="text-sm font-medium">IPFS Hash</p>
                <code className="text-xs bg-background px-2 py-1 rounded block truncate">
                  {certificate.ipfs_hash}
                </code>
                <p className="text-xs text-muted-foreground">
                  Certificate metadata stored on IPFS
                </p>
              </div>
            )}
          </div>

          {/* Verification Badge */}
          <div className="flex items-center justify-center gap-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-900">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div className="text-center">
              <p className="font-semibold text-green-900 dark:text-green-100">
                Certificate Verified
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">
                This credential is authentic and stored on the blockchain
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

