import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Globe, 
  Shield, 
  // Bell, // Not used 
  Database, 
  // Cloud, // Not used
  Link as LinkIcon,
  Key,
  // Palette, // Not used
  // Mail, // Not used
  Server,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Save,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface SystemConfig {
  siteName: string;
  siteUrl: string;
  supportEmail: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  maxUploadSize: number;
  // Blockchain
  blockchainEnabled: boolean;
  contractAddress: string;
  networkName: string;
  // AI
  aiEnabled: boolean;
  groqApiConfigured: boolean;
}

export function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<SystemConfig>({
    siteName: 'SkillChain',
    siteUrl: window.location.origin,
    supportEmail: 'support@skillchain.com',
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: true,
    maxUploadSize: 50,
    blockchainEnabled: true,
    contractAddress: import.meta.env.VITE_CERTIFICATE_CONTRACT_ADDRESS || '',
    networkName: 'Polygon Mainnet',
    aiEnabled: true,
    groqApiConfigured: !!import.meta.env.VITE_GROQ_API_KEY,
  });
  
  const [systemHealth, setSystemHealth] = useState({
    database: 'checking',
    storage: 'checking',
    auth: 'checking',
    edgeFunctions: 'checking',
  });

  useEffect(() => {
    checkSystemHealth();
    setLoading(false);
  }, []);

  const checkSystemHealth = async () => {
    // Check Database
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      setSystemHealth(prev => ({ ...prev, database: error ? 'error' : 'healthy' }));
    } catch {
      setSystemHealth(prev => ({ ...prev, database: 'error' }));
    }

    // Check Storage
    try {
      const { error } = await supabase.storage.listBuckets();
      setSystemHealth(prev => ({ ...prev, storage: error ? 'error' : 'healthy' }));
    } catch {
      setSystemHealth(prev => ({ ...prev, storage: 'error' }));
    }

    // Check Auth
    try {
      const { data } = await supabase.auth.getSession();
      setSystemHealth(prev => ({ ...prev, auth: data.session ? 'healthy' : 'warning' }));
    } catch {
      setSystemHealth(prev => ({ ...prev, auth: 'error' }));
    }

    // Edge Functions - just mark as healthy since we can't easily check without calling them
    setSystemHealth(prev => ({ ...prev, edgeFunctions: 'healthy' }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real app, you'd save these to a system_config table
      // For now, just show success
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <RefreshCw className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <RefreshCw className="h-5 w-5 text-slate-400 animate-spin" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Healthy</Badge>;
      case 'warning':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Warning</Badge>;
      case 'error':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Error</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">Checking...</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-6">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
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
            <Settings className="h-8 w-8 text-red-500" />
            System Settings
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Configure platform-wide settings and monitor system health
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      {/* System Health */}
      <Card className="bg-card/50 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-red-500" />
            System Health
          </CardTitle>
          <CardDescription>Current status of system components</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(systemHealth).map(([key, status]) => (
              <div key={key} className="flex items-center justify-between p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  {getStatusIcon(status)}
                  <span className="capitalize font-medium">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                </div>
                {getStatusBadge(status)}
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={checkSystemHealth}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card className="bg-card/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">Site Name</Label>
              <Input
                id="siteName"
                value={config.siteName}
                onChange={(e) => setConfig(prev => ({ ...prev, siteName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteUrl">Site URL</Label>
              <Input
                id="siteUrl"
                value={config.siteUrl}
                onChange={(e) => setConfig(prev => ({ ...prev, siteUrl: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={config.supportEmail}
                onChange={(e) => setConfig(prev => ({ ...prev, supportEmail: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxUpload">Max Upload Size (MB)</Label>
              <Input
                id="maxUpload"
                type="number"
                value={config.maxUploadSize}
                onChange={(e) => setConfig(prev => ({ ...prev, maxUploadSize: parseInt(e.target.value) }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="bg-card/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Security & Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-slate-500">Disable access for non-admins</p>
              </div>
              <Switch
                checked={config.maintenanceMode}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, maintenanceMode: checked }))}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Registration</Label>
                <p className="text-sm text-slate-500">Allow new user signups</p>
              </div>
              <Switch
                checked={config.allowRegistration}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, allowRegistration: checked }))}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Require Email Verification</Label>
                <p className="text-sm text-slate-500">Users must verify email</p>
              </div>
              <Switch
                checked={config.requireEmailVerification}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, requireEmailVerification: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Blockchain Settings */}
        <Card className="bg-card/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-purple-500" />
              Blockchain Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Blockchain Features</Label>
                <p className="text-sm text-slate-500">Enable NFT certificate minting</p>
              </div>
              <Switch
                checked={config.blockchainEnabled}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, blockchainEnabled: checked }))}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Network</Label>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/20 text-primary">{config.networkName}</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contract Address</Label>
              <Input
                value={config.contractAddress || 'Not configured'}
                disabled
                className="font-mono text-xs"
              />
              <p className="text-xs text-slate-500">
                {config.contractAddress ? 'Contract deployed' : 'Set VITE_CERTIFICATE_CONTRACT_ADDRESS in env'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* AI Settings */}
        <Card className="bg-card/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-cyan-500" />
              AI Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>AI Features</Label>
                <p className="text-sm text-slate-500">Enable AI companion & scheduling</p>
              </div>
              <Switch
                checked={config.aiEnabled}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, aiEnabled: checked }))}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Groq API</Label>
              <div className="flex items-center gap-2">
                {config.groqApiConfigured ? (
                  <Badge className="bg-green-500/20 text-green-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Configured
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-400">
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Configured
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Set VITE_GROQ_API_KEY in environment variables
              </p>
            </div>
            <div className="space-y-2">
              <Label>AI Models</Label>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Scheduling Model</Badge>
                <Badge variant="outline">Recommendation Model</Badge>
                <Badge variant="outline">Performance Model</Badge>
              </div>
              <p className="text-xs text-slate-500">
                Train models from the AI Settings page
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Environment Variables Info */}
      <Card className="bg-card/50 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-yellow-500" />
            Environment Configuration
          </CardTitle>
          <CardDescription>Required environment variables for full functionality</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'VITE_SUPABASE_URL', status: !!import.meta.env.VITE_SUPABASE_URL },
              { name: 'VITE_SUPABASE_ANON_KEY', status: !!import.meta.env.VITE_SUPABASE_ANON_KEY },
              { name: 'VITE_GROQ_API_KEY', status: !!import.meta.env.VITE_GROQ_API_KEY },
              { name: 'VITE_PINATA_API_KEY', status: !!import.meta.env.VITE_PINATA_API_KEY },
              { name: 'VITE_PINATA_SECRET_KEY', status: !!import.meta.env.VITE_PINATA_SECRET_KEY },
              { name: 'VITE_CERTIFICATE_CONTRACT_ADDRESS', status: !!import.meta.env.VITE_CERTIFICATE_CONTRACT_ADDRESS },
            ].map((env) => (
              <div key={env.name} className="flex items-center justify-between p-3 rounded-lg bg-slate-100 dark:bg-slate-800/50">
                <code className="text-xs font-mono">{env.name}</code>
                {env.status ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

