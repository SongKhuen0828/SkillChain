import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CheckCircle2, ArrowLeft, UploadCloud, Loader2, X, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { CertificateRenderer } from '@/components/certificates/CertificateTemplates'

export function CreateCourse() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)
  
  // Detect if accessed from org routes
  const isOrgContext = location.pathname.startsWith('/org/')

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [certificateTheme, setCertificateTheme] = useState<'classic' | 'academic' | 'tech' | 'creative'>('classic')
  const [isUploading, setIsUploading] = useState(false)
  const [showCertificatePreview, setShowCertificatePreview] = useState(false)

  // Fetch verification status on mount
  useEffect(() => {
    const fetchVerificationStatus = async () => {
      if (!user) {
        setLoadingStatus(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('verification_status')
          .eq('id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching verification status:', error)
          return
        }

        setVerificationStatus(data?.verification_status || 'pending')
      } catch (error) {
        console.error('Error fetching verification status:', error)
      } finally {
        setLoadingStatus(false)
      }
    }

    fetchVerificationStatus()
  }, [user])

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setIsUploading(true)

    try {
      // Generate unique file path
      // const fileExt = file.name.split('.').pop() // Not used
      const fileName = `${Date.now()}_${file.name}`
      const filePath = `thumbnails/${user.id}/${fileName}`

      // Upload to Supabase Storage (direct upload - bucket check is handled by Supabase)
      const { error: uploadError } = await supabase.storage
        .from('course-thumbnails')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        // Handle specific error cases
        if (uploadError.message?.includes('Bucket not found')) {
          throw new Error('Storage bucket not found. Please ensure the bucket is set up correctly.')
        }
        throw uploadError
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('course-thumbnails').getPublicUrl(filePath)

      // Update form state
      setThumbnailUrl(publicUrl)
      toast.success('Thumbnail uploaded successfully!')
    } catch (error: any) {
      console.error('Error uploading thumbnail:', error)
      const errorMessage = error.message || 'Failed to upload thumbnail'
      toast.error(errorMessage)
      
      // Provide helpful error message for bucket issues
      if (errorMessage.includes('bucket') || errorMessage.includes('Bucket')) {
        toast.error('Storage bucket not configured. Please run the storage setup SQL script.')
      }
    } finally {
      setIsUploading(false)
      // Reset file input
      if (event.target) {
        event.target.value = ''
      }
    }
  }

  const handleRemoveThumbnail = () => {
    setThumbnailUrl('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      // Build course data
      const courseData: any = {
        title: title.trim(),
        description: description.trim() || null,
        thumbnail_url: thumbnailUrl.trim() || null,
        price: 0, // Always free
        is_published: false,
        educator_id: user.id,
        certificate_theme: certificateTheme,
      }
      
      // Add org_id if in organization context
      if (isOrgContext && profile?.org_id) {
        courseData.org_id = profile.org_id
        courseData.visibility = 'org_only' // Default to org-only for org courses
      }

      const { data, error } = await supabase
        .from('courses')
        .insert(courseData)
        .select()
        .single()

      if (error) throw error

      // Navigate to course builder page (different path based on context)
      toast.success('Course created! Now let\'s add content.')
      const editPath = isOrgContext 
        ? `/org/courses/${data.id}/edit`
        : `/educator/courses/${data.id}/edit`
      navigate(editPath)
    } catch (error: any) {
      console.error('Error creating course:', error)
      toast.error(error.message || 'Failed to create course')
    } finally {
      setLoading(false)
    }
  }

  const isVerified = verificationStatus === 'approved'

  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/educator/courses')}
            className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Create New Course</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Build and publish your course content
            </p>
          </div>
        </div>

        {/* Verified Badge */}
        {isVerified && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 border border-green-500/30 rounded-full">
            <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              Verified Educator
            </span>
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-8 rounded-2xl shadow-sm space-y-6">
          {/* Course Title */}
          <div className="space-y-2">
            <Label className="text-slate-900 dark:text-white text-sm font-semibold">
              Course Title <span className="text-red-500">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Advanced Solidity Patterns"
              required
              className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-sky-500 dark:focus:border-sky-500 focus:ring-sky-500/20 h-11"
            />
          </div>

          {/* Course Description */}
          <div className="space-y-2">
            <Label className="text-slate-900 dark:text-white text-sm font-semibold">
              Description
            </Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what students will learn in this course..."
              rows={6}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-md text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-sky-500 dark:focus:border-sky-500 focus:ring-1 focus:ring-sky-500/20 resize-none"
            />
          </div>

          {/* Course Thumbnail Upload */}
          <div className="space-y-2 max-w-2xl">
            <Label className="text-slate-900 dark:text-white text-sm font-semibold">
              Course Thumbnail
            </Label>

            {/* Hidden File Input */}
            <input
              type="file"
              id="thumbnail-upload"
              className="hidden"
              accept="image/*"
              onChange={handleThumbnailUpload}
              disabled={isUploading}
            />

            {/* Conditional Rendering based on state */}
            {isUploading ? (
              /* Loading State UI */
              <div className="h-48 w-full border-2 border-dashed border-slate-700 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50">
                <Loader2 className="w-8 h-8 text-cyan-500 dark:text-cyan-400 animate-spin mb-2" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Uploading...</span>
              </div>
            ) : thumbnailUrl ? (
              /* Image Preview State UI */
              <div className="relative h-48 w-full rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 group">
                <img
                  src={thumbnailUrl}
                  alt="Course thumbnail preview"
                  className="w-full h-full object-cover"
                />
                {/* Remove Button Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleRemoveThumbnail}
                    className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg"
                    aria-label="Remove thumbnail"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* Upload Trigger State UI */
              <label
                htmlFor="thumbnail-upload"
                className="h-48 w-full border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-500/50 dark:hover:border-cyan-500/50 rounded-lg flex flex-col items-center justify-center cursor-pointer bg-slate-50 dark:bg-slate-900/30 transition-colors"
              >
                <UploadCloud className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-2" />
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-1">
                  Click to upload thumbnail
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  PNG, JPG up to 5MB
                </span>
              </label>
            )}

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Optional: Upload a course thumbnail image (16:9 aspect ratio recommended)
            </p>
          </div>
        </div>

        {/* Certificate Theme Selection */}
        <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-8 rounded-2xl shadow-sm space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Certificate Theme</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Choose the visual style for completion certificates
                </p>
              </div>
              <Dialog open={showCertificatePreview} onOpenChange={setShowCertificatePreview}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl bg-slate-900 border-slate-800">
                  <DialogHeader>
                    <DialogTitle className="text-white">Certificate Preview</DialogTitle>
                  </DialogHeader>
                  <div className="p-8 overflow-auto bg-slate-800/50 flex justify-center">
                    <CertificateRenderer
                      theme={certificateTheme}
                      studentName="John Doe"
                      courseTitle={title || 'Sample Course Title'}
                      completionDate={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      educatorName="Instructor Name"
                      userId="sample-user-id"
                      courseId="sample-course-id"
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="space-y-2">
              <Label htmlFor="certificate_theme" className="text-slate-900 dark:text-white text-sm font-semibold">
                Theme Style
              </Label>
              <Select
                value={certificateTheme}
                onValueChange={(value: 'classic' | 'academic' | 'tech' | 'creative') =>
                  setCertificateTheme(value)
                }
              >
                <SelectTrigger id="certificate_theme" className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <SelectItem value="classic" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">
                    Classic
                  </SelectItem>
                  <SelectItem value="academic" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">
                    Academic
                  </SelectItem>
                  <SelectItem value="tech" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">
                    Tech
                  </SelectItem>
                  <SelectItem value="creative" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700">
                    Creative
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/educator/courses')}
            className="border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white border-0 shadow-lg shadow-sky-500/20 px-8"
          >
            {loading ? 'Creating...' : 'Create Course'}
          </Button>
        </div>
      </form>
    </div>
  )
}

