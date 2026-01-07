import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Shield, 
  GraduationCap,
  Building2
} from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CertificateData {
  id: string;
  tx_hash: string;
  minted_at: string;
  created_at: string;
  profiles: {
    full_name: string;
  } | null;
  courses: {
    title: string;
    description: string | null;
    org_id: string | null;
    educator_id: string | null;
  } | null;
  organization?: {
    name: string;
    logo_url: string | null;
  } | null;
  educator?: {
    full_name: string;
  } | null;
}

export function Verify() {
  const { tx_hash } = useParams<{ tx_hash: string }>();
  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState<CertificateData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCertificate = async () => {
      if (!tx_hash) {
        setError('Transaction hash is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('certificates')
          .select(`
            id,
            tx_hash,
            minted_at,
            created_at,
            profiles:user_id (
              full_name
            ),
            courses:course_id (
              title,
              description,
              org_id,
              educator_id
            )
          `)
          .eq('tx_hash', tx_hash)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            setError('Certificate not found. This transaction hash does not exist in our system.');
          } else {
            throw fetchError;
          }
          return;
        }

        // Handle array responses from Supabase
        const courseData = Array.isArray(data.courses) ? data.courses[0] : data.courses;
        const profileData = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;

        // Fetch organization if course has org_id
        let orgData = null;
        if (courseData?.org_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('name, logo_url')
            .eq('id', courseData.org_id)
            .single();
          orgData = org;
        }

        // Fetch educator if course has educator_id
        let educatorData = null;
        if (courseData?.educator_id) {
          const { data: educator } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', courseData.educator_id)
            .single();
          educatorData = educator;
        }

        // Transform the data to match our interface
        const transformedData: CertificateData = {
          id: data.id,
          tx_hash: data.tx_hash,
          minted_at: data.minted_at,
          created_at: data.created_at,
          profiles: profileData ? { full_name: profileData.full_name } : null,
          courses: courseData ? {
            title: courseData.title,
            description: courseData.description,
            org_id: courseData.org_id,
            educator_id: courseData.educator_id,
          } : null,
          organization: orgData,
          educator: educatorData,
        };

        setCertificate(transformedData);
      } catch (err: any) {
        console.error('Error fetching certificate:', err);
        setError(err.message || 'Failed to verify certificate');
      } finally {
        setLoading(false);
      }
    };

    fetchCertificate();
  }, [tx_hash]);

  const handleViewBlockchain = () => {
    if (!certificate?.tx_hash) return;
    window.open(`https://polygonscan.com/tx/${certificate.tx_hash}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <Skeleton className="h-8 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <XCircle className="h-6 w-6" />
              Verification Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                {error || 'Certificate not found. Please verify the transaction hash is correct.'}
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                If you believe this is an error, please contact support with the transaction hash.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Verification Status Banner */}
        <Card className="border-2 border-green-500 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500 rounded-full">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-green-700 dark:text-green-400">
                  Authenticity Verified on Polygon Blockchain
                </h1>
                <p className="text-green-600 dark:text-green-500 mt-1">
                  This certificate has been verified and minted on the Polygon Mainnet
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Certificate Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Student Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                Certificate Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Student Name</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {certificate.profiles?.full_name || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Course Name</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {certificate.courses?.title || 'Unknown Course'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Completion Date</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {certificate.minted_at 
                    ? format(new Date(certificate.minted_at), 'MMMM dd, yyyy')
                    : format(new Date(certificate.created_at), 'MMMM dd, yyyy')
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Issuing Authority */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Issuing Authority
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {certificate.organization && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Organization</p>
                  <div className="flex items-center gap-3">
                    {certificate.organization.logo_url && (
                      <img 
                        src={certificate.organization.logo_url} 
                        alt={certificate.organization.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    )}
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">
                      {certificate.organization.name}
                    </p>
                  </div>
                </div>
              )}
              {certificate.educator && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Instructor</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">
                    {certificate.educator.full_name || 'Unknown Instructor'}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Platform</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  SkillChain
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Blockchain Proof */}
        <Card className="border-2 border-cyan-500/50 bg-cyan-50/50 dark:bg-cyan-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              Blockchain Verification
            </CardTitle>
            <CardDescription>
              Verify this certificate on the Polygon blockchain
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Transaction Hash</p>
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <code className="text-sm font-mono break-all text-slate-900 dark:text-slate-100">
                  {certificate.tx_hash}
                </code>
              </div>
            </div>
            <Button
              onClick={handleViewBlockchain}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
              size="lg"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View on PolygonScan
            </Button>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              Click to verify this transaction on the Polygon Mainnet blockchain explorer
            </p>
          </CardContent>
        </Card>

        {/* Course Description (if available) */}
        {certificate.courses?.description && (
          <Card>
            <CardHeader>
              <CardTitle>Course Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700 dark:text-slate-300">
                {certificate.courses.description}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


