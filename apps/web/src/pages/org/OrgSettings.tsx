import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Settings,
  Building2,
  Upload,
  Save,
  Globe,
  Mail,
  Image as ImageIcon,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  contact_email: string | null;
}

export function OrgSettings() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  useEffect(() => {
    fetchOrganization();
  }, [profile?.org_id, profile?.id]);

  const fetchOrganization = async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Fetching organization for profile:', profile);
      
      let data = null;
      
      // Method 1: Try by org_id in profile
      if (profile.org_id) {
        const { data: orgData, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.org_id)
          .single();
        
        if (!error && orgData) {
          data = orgData;
        }
      }
      
      // Method 2: If user is org_admin but has no org_id, check if they created any org
      // This shouldn't normally happen, but handles edge cases
      if (!data && profile.role === 'org_admin') {
        // Fetch first organization (for existing org_admins without org_id)
        const { data: orgsData, error } = await supabase
          .from('organizations')
          .select('*')
          .limit(1)
          .single();
        
        if (!error && orgsData) {
          data = orgsData;
          // Update profile.org_id
          console.log('Linking org_admin to organization:', orgsData.id);
          await supabase
            .from('profiles')
            .update({ org_id: orgsData.id })
            .eq('id', profile.id);
        }
      }

      if (!data) {
        console.log('No organization found for this user');
        toast.error('No organization found. Please contact support.');
        setLoading(false);
        return;
      }

      console.log('Organization loaded:', data);
      setOrganization(data);
      setName(data.name || '');
      setDescription(data.description || '');
      setWebsite(data.website || '');
      setContactEmail(data.contact_email || '');
    } catch (error: any) {
      console.error('Error fetching organization:', error);
      toast.error('Failed to load organization settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organization) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('organizations')
        .update({
          name,
          description,
          website,
          contact_email: contactEmail,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organization.id);

      if (error) throw error;

      setOrganization({ ...organization, name, description, website, contact_email: contactEmail });
      toast.success('Settings saved successfully');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('=== handleLogoUpload CALLED ===');
    console.log('event.target.files:', event.target.files);
    
    const file = event.target.files?.[0];
    console.log('Selected file:', file);
    console.log('Organization:', organization);
    
    if (!file) {
      console.log('ERROR: No file selected');
      toast.error('Please select a file');
      return;
    }
    
    if (!organization) {
      console.log('ERROR: No organization');
      toast.error('Organization not loaded');
      return;
    }

    try {
      setUploadingLogo(true);
      toast.info('Starting upload...');

      // Simple file name without folder structure
      const fileExt = file.name.split('.').pop();
      const fileName = `logo_${organization.id}_${Date.now()}.${fileExt}`;

      console.log('Uploading to org-logos bucket:', fileName);
      console.log('File size:', file.size);
      console.log('File type:', file.type);

      // Try org-logos bucket first
      const { data, error: uploadError } = await supabase.storage
        .from('org-logos')
        .upload(fileName, file, { upsert: true });

      console.log('Upload result:', { data, error: uploadError });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        
        // Try organization-logos bucket as fallback
        const { data: data2, error: uploadError2 } = await supabase.storage
          .from('organization-logos')
          .upload(fileName, file, { upsert: true });
        
        console.log('Fallback upload result:', { data: data2, error: uploadError2 });
        
        if (uploadError2) {
          toast.error(`Upload failed: ${uploadError2.message}`);
          throw uploadError2;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('organization-logos')
          .getPublicUrl(fileName);
        
        await updateLogoUrl(publicUrl);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('org-logos')
          .getPublicUrl(fileName);
        
        await updateLogoUrl(publicUrl);
      }
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error(`Failed to upload: ${error.message || 'Unknown error'}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  const updateLogoUrl = async (publicUrl: string) => {
    if (!organization) return;

    const { error: updateError } = await supabase
      .from('organizations')
      .update({ logo_url: publicUrl })
      .eq('id', organization.id);

    if (updateError) throw updateError;

    setOrganization({ ...organization, logo_url: publicUrl });
    toast.success('Logo uploaded successfully');
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 pb-10">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[500px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Settings className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          Organization Settings
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Manage your organization's branding and information
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Organization Information
            </CardTitle>
            <CardDescription>
              Update your organization's public information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter organization name"
                className="bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your organization..."
                rows={4}
                className="bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Website
              </Label>
              <Input
                id="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Contact Email
              </Label>
              <Input
                id="contactEmail"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@example.com"
                className="bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <Button 
              onClick={handleSave}
              disabled={saving || !name}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {saving ? (
                <>
                  <Save className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Logo Settings */}
        <Card className="bg-card/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Organization Logo
            </CardTitle>
            <CardDescription>
              Upload your logo to display on certificates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Logo Preview */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800">
                {organization?.logo_url ? (
                  <img
                    src={organization.logo_url}
                    alt={organization.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Building2 className="h-12 w-12 text-slate-400" />
                )}
              </div>

              {organization?.logo_url && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Logo uploaded
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div className="w-full">
              <input
                type="file"
                id="logo-upload"
                accept="image/*"
                onChange={(e) => {
                  console.log('=== FILE INPUT onChange TRIGGERED ===');
                  handleLogoUpload(e);
                }}
                className="hidden"
                disabled={uploadingLogo}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={uploadingLogo}
                onClick={() => {
                  console.log('=== BUTTON CLICKED ===');
                  const input = document.getElementById('logo-upload') as HTMLInputElement;
                  console.log('File input element:', input);
                  if (input) {
                    input.click();
                  } else {
                    console.error('File input not found!');
                  }
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadingLogo ? 'Uploading...' : 'Upload New Logo'}
              </Button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              Recommended: 512x512px, PNG or JPG
            </p>

            {/* Certificate Preview */}
            <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 text-center">
                Certificate Preview
              </p>
              <div className="bg-white dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700 text-center">
                {organization?.logo_url ? (
                  <img
                    src={organization.logo_url}
                    alt={organization.name}
                    className="w-16 h-16 mx-auto mb-2 object-contain"
                  />
                ) : (
                  <div className="w-16 h-16 mx-auto mb-2 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-slate-400" />
                  </div>
                )}
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {name || 'Organization Name'}
                </p>
                <p className="text-xs text-slate-500">Certificate of Completion</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

