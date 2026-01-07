import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Link as LinkIcon, 
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  RefreshCw,
  Wallet,
  FileCode,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export function AdminBlockchain() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCertificates: 0,
    mintedCertificates: 0,
    pendingMints: 0,
  });
  
  // Environment variables (read-only display)
  const [config, _setConfig] = useState({
    contractAddress: import.meta.env.VITE_CERTIFICATE_CONTRACT_ADDRESS || '',
    networkName: import.meta.env.VITE_NETWORK_NAME || 'Polygon Mainnet',
    rpcUrl: import.meta.env.VITE_POLYGON_RPC_URL || '',
    explorerUrl: import.meta.env.VITE_EXPLORER_URL || 'https://polygonscan.com',
    pinataConfigured: !!(import.meta.env.VITE_PINATA_API_KEY),
  });

  useEffect(() => {
    fetchBlockchainStats();
  }, []);

  const fetchBlockchainStats = async () => {
    try {
      setLoading(true);
      
      const [
        { count: totalCerts },
        { count: mintedCerts },
      ] = await Promise.all([
        supabase.from('certificates').select('*', { count: 'exact', head: true }),
        supabase.from('certificates').select('*', { count: 'exact', head: true }).not('tx_hash', 'is', null),
      ]);

      setStats({
        totalCertificates: totalCerts || 0,
        mintedCertificates: mintedCerts || 0,
        pendingMints: (totalCerts || 0) - (mintedCerts || 0),
      });
    } catch (error) {
      console.error('Error fetching blockchain stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <LinkIcon className="h-8 w-8 text-red-500" />
            Blockchain Settings
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Manage blockchain configuration and certificate minting
          </p>
        </div>
        <Button onClick={fetchBlockchainStats} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <FileCode className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {stats.totalCertificates}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Certificates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {stats.mintedCertificates}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Minted on Chain</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-xl">
                <Wallet className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {stats.pendingMints}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Pending Mints</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCode className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Smart Contract
            </CardTitle>
            <CardDescription>
              NFT Certificate smart contract configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Contract Address</Label>
              <div className="flex gap-2">
                <Input
                  value={config.contractAddress || 'Not configured'}
                  readOnly
                  className="font-mono text-sm bg-slate-50 dark:bg-slate-800"
                />
                {config.contractAddress && (
                  <>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(config.contractAddress)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      asChild
                    >
                      <a
                        href={`${config.explorerUrl}/address/${config.contractAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Network</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={config.networkName}
                  readOnly
                  className="bg-slate-50 dark:bg-slate-800"
                />
                <Badge className={config.contractAddress ? 'bg-green-500' : 'bg-amber-500'}>
                  {config.contractAddress ? 'Connected' : 'Not Deployed'}
                </Badge>
              </div>
            </div>

            <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Deployment Status</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {config.contractAddress ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span>Contract Deployed</span>
                </div>
                <div className="flex items-center gap-2">
                  {config.rpcUrl ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span>RPC Configured</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              IPFS / Pinata
            </CardTitle>
            <CardDescription>
              Decentralized storage for certificate metadata
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
              {config.pinataConfigured ? (
                <>
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Pinata Connected</p>
                    <p className="text-sm text-slate-500">Certificate metadata will be stored on IPFS</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-8 w-8 text-amber-500" />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Pinata Not Configured</p>
                    <p className="text-sm text-slate-500">Set VITE_PINATA_API_KEY in environment</p>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Environment Variables
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 font-mono">
                <li>VITE_CERTIFICATE_CONTRACT_ADDRESS</li>
                <li>VITE_ADMIN_PRIVATE_KEY</li>
                <li>VITE_POLYGON_RPC_URL</li>
                <li>VITE_PINATA_API_KEY</li>
                <li>VITE_PINATA_SECRET_KEY</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

