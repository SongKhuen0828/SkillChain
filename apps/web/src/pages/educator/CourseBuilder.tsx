import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Video, PlayCircle, Trash2, ArrowLeft, Save, Loader2, UploadCloud, Rocket, Lock, FileText, X, CheckCircle2, ExternalLink, Pencil, HelpCircle, Check, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// TypeScript Interfaces
interface Lesson {
  id: string
  module_id: string
  type: 'video' | 'quiz'
  content_url: string | null
  resource_url: string | null
  duration: number | null
  title: string | null
  order_index: number
  created_at: string
  updated_at: string
}

// Quiz Builder Types
type QuestionType = 'multiple_choice' | 'true_false' | 'essay'

interface Question {
  id?: string // temporary id for UI list
  type: QuestionType
  text: string
  points: number
  // For MC/TF
  options?: string[] // ["Option A", "Option B", "Option C", "Option D"]
  correctAnswer?: number // Index 0-3 for MC, 0-1 for TF
  // For Essay (AI)
  aiCriteria?: string // Teacher's instructions for the AI
}

interface Quiz {
  title: string
  passingScore: number // default 80
  questions: Question[]
}

interface Module {
  id: string
  course_id: string
  title: string
  order_index: number
  created_at: string
  updated_at: string
  lessons?: Lesson[]
}

interface Course {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  is_published: boolean
  published_at?: string | null
  visibility?: 'private' | 'public' | 'org_only'
  org_id?: string | null
}

export default function CourseBuilder() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  
  // Detect if accessed from org routes
  const isOrgContext = location.pathname.startsWith('/org/')
  const coursesListPath = isOrgContext ? '/org/courses' : '/educator/courses'
  
  const [course, setCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [isEditCourseOpen, setIsEditCourseOpen] = useState(false)
  const [courseForm, setCourseForm] = useState({ title: '', description: '', thumbnailFile: null as File | null })
  const [courseVisibility, setCourseVisibility] = useState<'private' | 'public' | 'org_only'>('public')
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)

  // Module creation state
  const [showAddModuleDialog, setShowAddModuleDialog] = useState(false)
  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [creatingModule, setCreatingModule] = useState(false)

  // Lesson creation state
  const [showAddLessonDialog, setShowAddLessonDialog] = useState(false)
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null)
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonDescription, setLessonDescription] = useState('')
  const [lessonVideoFile, setLessonVideoFile] = useState<File | null>(null)
  const [lessonVideoUrl, setLessonVideoUrl] = useState<string | null>(null)
  const [lessonResourceFile, setLessonResourceFile] = useState<File | null>(null)
  const [lessonResourceUrl, setLessonResourceUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [creatingLesson, setCreatingLesson] = useState(false)
  const [editingLessonIndex, setEditingLessonIndex] = useState<{ moduleId: string; lessonId: string } | null>(null)
  
  // Video Chapters state
  const [lessonChapters, setLessonChapters] = useState<Array<{ time: string; title: string }>>([])
  const [newChapterTime, setNewChapterTime] = useState('')
  const [newChapterTitle, setNewChapterTitle] = useState('')

  // Quiz Builder state
  const [activeTab, setActiveTab] = useState<'video' | 'quiz'>('video')
  const [quizData, setQuizData] = useState<Quiz>({
    title: '',
    passingScore: 80,
    questions: [],
  })
  const [newQuestion, setNewQuestion] = useState<Question>({
    type: 'multiple_choice',
    text: '',
    points: 10,
    options: ['', '', '', ''],
    correctAnswer: undefined,
    aiCriteria: '',
  })
  const [isAddingQuestion, setIsAddingQuestion] = useState(false)
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null)

  // Helper: Extract filename from Supabase URL
  const getFileName = (url: string | null) => {
    if (!url) return ''
    const fullPath = url.split('/').pop() || ''
    // Try to remove timestamp prefix like "1735899999_" if present
    const parts = fullPath.split('_')
    // If starts with timestamp (numeric), skip first part
    if (parts.length > 1 && /^\d+$/.test(parts[0])) {
      return parts.slice(1).join('_')
    }
    return fullPath
  }

  // Fetch course and modules/lessons with deep query
  useEffect(() => {
    const fetchCourseData = async () => {
      if (!courseId) {
        setLoading(false)
        return
      }

      try {
        // Deep fetch: courses with nested modules and lessons
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select(`
            *,
            modules (
              *,
              lessons (*)
            )
          `)
          .eq('id', courseId)
          .single()

        if (courseError) throw courseError

        // Set course data (without nested modules)
        const courseInfo = {
          id: courseData.id,
          title: courseData.title,
          description: courseData.description,
          thumbnail_url: courseData.thumbnail_url,
          is_published: courseData.is_published,
          published_at: courseData.published_at || null,
          visibility: courseData.visibility || 'public',
          org_id: courseData.org_id || null,
        }
        setCourse(courseInfo)
        setCourseVisibility(courseData.visibility || 'public')
        
        // Sync course data to form
        setCourseForm({
          title: courseData.title || '',
          description: courseData.description || '',
          thumbnailFile: null,
        })

        // Process modules and lessons, sorting by order_index
        const processedModules: Module[] = ((courseData.modules as any[]) || [])
          .map((module: any) => ({
            id: module.id,
            course_id: module.course_id,
            title: module.title,
            order_index: module.order_index,
            created_at: module.created_at,
            updated_at: module.updated_at,
            lessons: (module.lessons || [])
              .sort((a: Lesson, b: Lesson) => a.order_index - b.order_index)
                  .map((lesson: any) => ({
                    id: lesson.id,
                    module_id: lesson.module_id,
                    type: lesson.type as 'video' | 'quiz',
                    content_url: lesson.content_url,
                    resource_url: lesson.resource_url,
                    duration: lesson.duration,
                    title: lesson.title,
                    order_index: lesson.order_index,
                    chapters: lesson.chapters || null,
                    created_at: lesson.created_at,
                    updated_at: lesson.updated_at,
                  })),
          }))
          .sort((a, b) => a.order_index - b.order_index)

        setModules(processedModules)
      } catch (error: any) {
        console.error('Error fetching course data:', error)
        toast.error('Failed to load course data')
      } finally {
        setLoading(false)
      }
    }

    fetchCourseData()
  }, [courseId])

  // Handle create module
  const handleCreateModule = async () => {
    if (!courseId || !newModuleTitle.trim()) {
      toast.error('Please enter a module title')
      return
    }

    setCreatingModule(true)
    try {
      // Get the highest order_index to append at the end
      const maxOrderIndex = modules.length > 0 
        ? Math.max(...modules.map(m => m.order_index), 0) 
        : 0

      const { data, error } = await supabase
        .from('modules')
        .insert({
          course_id: courseId,
          title: newModuleTitle.trim(),
          order_index: maxOrderIndex + 1,
        })
        .select()
        .single()

      if (error) throw error

      // Optimistically update UI
      setModules([...modules, { ...data, lessons: [] }])
      setNewModuleTitle('')
      setShowAddModuleDialog(false)
      toast.success('Module created successfully!')
    } catch (error: any) {
      console.error('Error creating module:', error)
      toast.error(error.message || 'Failed to create module')
    } finally {
      setCreatingModule(false)
    }
  }

  // Handle open add lesson dialog
  const handleOpenAddLessonDialog = (moduleId: string) => {
    setSelectedModuleId(moduleId)
    setEditingLessonIndex(null) // Reset edit mode
    setShowAddLessonDialog(true)
    // Reset form
    setLessonTitle('')
    setLessonDescription('')
    setLessonVideoFile(null)
    setLessonVideoUrl(null)
    setLessonResourceFile(null)
    setLessonResourceUrl(null)
    setLessonChapters([])
    setNewChapterTime('')
    setNewChapterTitle('')
    setUploadProgress(0)
  }

  // Handle edit lesson
  const handleEditLesson = async (moduleId: string, lessonId: string) => {
    const module = modules.find(m => m.id === moduleId)
    const lesson = module?.lessons?.find(l => l.id === lessonId)
    
    if (!lesson) return

    setSelectedModuleId(moduleId)
    setEditingLessonIndex({ moduleId, lessonId })
    
    // Load existing data into form
    const lessonAny = lesson as any
    setLessonTitle(lesson.title || '')
    setLessonDescription(lessonAny.description || '')
    setLessonVideoFile(null) // Don't load file object, just URL
    setLessonVideoUrl(lesson.content_url)
    setLessonResourceFile(null) // Don't load file object, just URL
    setLessonResourceUrl(lesson.resource_url)
    setLessonChapters(lessonAny.chapters || [])
    setNewChapterTime('')
    setNewChapterTitle('')
    setUploadProgress(0)

    // Handle Quiz Data if lesson type is 'quiz'
    if (lesson.type === 'quiz') {
      try {
        // A. Try to find quiz data (fetched or local)
        let quiz = lessonAny.quiz || (lessonAny.quizzes && lessonAny.quizzes[0])
        
        // B. If missing deep data (questions), fetch from DB
        if (!quiz || !quiz.quiz_questions) {
          const { data, error } = await supabase
            .from('quizzes')
            .select('*, quiz_questions(*)')
            .eq('lesson_id', lessonId)
            .maybeSingle()
          
          if (error) {
            console.error('Error fetching quiz:', error)
            toast.error('Failed to load quiz data')
            return
          }
          
          if (data) quiz = data
        }

        // C. Map DB Data to Form State
        if (quiz) {
          setQuizData({
            title: quiz.title || '',
            passingScore: quiz.passing_score || 80,
            questions: quiz.quiz_questions
              ? quiz.quiz_questions
                  .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
                  .map((q: any) => ({
                    id: q.id, // Keep ID to identify updates vs new
                    type: q.question_type === 'text' ? 'essay' : q.question_type, // Map 'text' back to 'essay' for UI
                    text: q.question_text,
                    points: q.points || 10,
                    options: q.options || [],
                    correctAnswer: q.correct_index !== null && q.correct_index !== undefined ? q.correct_index : undefined,
                    aiCriteria: q.ai_scoring_criteria || undefined,
                  }))
              : [],
          })
          
          // Switch to quiz tab
          setActiveTab('quiz')
        } else {
          // No quiz found, reset to defaults
          setQuizData({
            title: '',
            passingScore: 80,
            questions: [],
          })
          setActiveTab('quiz')
        }
      } catch (error) {
        console.error('Error loading quiz details:', error)
        toast.error('Failed to load quiz details')
        // Reset to defaults on error
        setQuizData({
          title: '',
          passingScore: 80,
          questions: [],
        })
        setActiveTab('quiz')
      }
    } else {
      // For video lessons, reset quiz data and set to video tab
      setQuizData({
        title: '',
        passingScore: 80,
        questions: [],
      })
      setActiveTab('video')
    }

    // Open dialog after data is loaded
    setShowAddLessonDialog(true)
  }

  // Handle add chapter
  const handleAddChapter = () => {
    if (!newChapterTime.trim() || !newChapterTitle.trim()) {
      toast.error('Please enter both time and title')
      return
    }
    
    // Validate time format (MM:SS)
    const timeRegex = /^(\d{1,2}):(\d{2})$/
    if (!timeRegex.test(newChapterTime)) {
      toast.error('Time format must be MM:SS (e.g., 02:30)')
      return
    }

    setLessonChapters([...lessonChapters, { time: newChapterTime, title: newChapterTitle }])
    setNewChapterTime('')
    setNewChapterTitle('')
  }

  // Handle remove chapter
  const handleRemoveChapter = (index: number) => {
    setLessonChapters(lessonChapters.filter((_, i) => i !== index))
  }

  // Handle update course details
  const handleUpdateDetails = async () => {
    if (!course || !courseId) return
    
    setUploadingThumbnail(true)
    try {
      let thumbnailUrl = course.thumbnail_url

      // 1. Upload Image if changed
      if (courseForm.thumbnailFile) {
        const file = courseForm.thumbnailFile
        // const fileExt = file.name.split('.').pop() // Not used
        const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const filePath = `thumbnails/${courseId}/${fileName}`
        
        const { error: uploadError } = await supabase.storage
          .from('course-thumbnails')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) throw uploadError

        const { data } = supabase.storage
          .from('course-thumbnails')
          .getPublicUrl(filePath)
          
        thumbnailUrl = data.publicUrl
      }

      // 2. Update Database
      const { error } = await supabase
        .from('courses')
        .update({
          title: courseForm.title.trim(),
          description: courseForm.description.trim() || null,
          thumbnail_url: thumbnailUrl
        })
        .eq('id', courseId)

      if (error) throw error

      // 3. Update Local State
      setCourse({ 
        ...course, 
        title: courseForm.title.trim(), 
        description: courseForm.description.trim() || null, 
        thumbnail_url: thumbnailUrl 
      })
      setIsEditCourseOpen(false)
      setCourseForm({ ...courseForm, thumbnailFile: null })
      toast.success('Course details updated!')
    } catch (error: any) {
      console.error(error)
      toast.error(error.message || 'Failed to update course')
    } finally {
      setUploadingThumbnail(false)
    }
  }

  // Quiz Builder Handlers
  const handleAddQuestion = () => {
    if (!newQuestion.text.trim()) {
      toast.error('Please enter a question text')
      return
    }

    if (newQuestion.type === 'multiple_choice') {
      if (!newQuestion.options || newQuestion.options.some(opt => !opt.trim())) {
        toast.error('Please fill in all 4 options')
        return
      }
      if (newQuestion.correctAnswer === undefined) {
        toast.error('Please select the correct answer')
        return
      }
    }

    if (newQuestion.type === 'true_false') {
      if (newQuestion.correctAnswer === undefined) {
        toast.error('Please select the correct answer (True/False)')
        return
      }
    }

    if (newQuestion.type === 'essay') {
      if (!newQuestion.aiCriteria?.trim()) {
        toast.error('Please provide AI scoring criteria')
        return
      }
    }

    const isEditing = editingQuestionIndex !== null
    const questionToAdd: Question = {
      id: isEditing ? quizData.questions[editingQuestionIndex].id : `temp-${Date.now()}-${Math.random()}`,
      type: newQuestion.type,
      text: newQuestion.text.trim(),
      points: newQuestion.points,
      options: newQuestion.type !== 'essay' ? [...(newQuestion.options || [])] : undefined,
      correctAnswer: newQuestion.type !== 'essay' ? newQuestion.correctAnswer : undefined,
      aiCriteria: newQuestion.type === 'essay' ? newQuestion.aiCriteria?.trim() : undefined,
    }

    if (isEditing) {
      // Update existing question
      const updatedQuestions = [...quizData.questions]
      updatedQuestions[editingQuestionIndex] = questionToAdd
      setQuizData({
        ...quizData,
        questions: updatedQuestions,
      })
      toast.success('Question updated!')
    } else {
      // Add new question
      setQuizData({
        ...quizData,
        questions: [...quizData.questions, questionToAdd],
      })
      toast.success('Question added!')
    }

    // Reset new question form
    setNewQuestion({
      type: 'multiple_choice',
      text: '',
      points: 10,
      options: ['', '', '', ''],
      correctAnswer: undefined,
      aiCriteria: '',
    })

    // Return to list view
    setIsAddingQuestion(false)
    setEditingQuestionIndex(null)
  }

  // Handle edit single question
  const handleEditSingleQuestion = (index: number) => {
    const question = quizData.questions[index]
    if (!question) return

    // Populate form with existing question data
    setNewQuestion({
      id: question.id,
      type: question.type,
      text: question.text,
      points: question.points,
      options: question.options && question.options.length > 0 
        ? [...question.options] 
        : ['', '', '', ''],
      correctAnswer: question.correctAnswer,
      aiCriteria: question.aiCriteria || '',
    })

    setEditingQuestionIndex(index)
    setIsAddingQuestion(true)
  }

  // Reset form when canceling
  const handleCancelQuestion = () => {
    setIsAddingQuestion(false)
    setEditingQuestionIndex(null)
    setNewQuestion({
      type: 'multiple_choice',
      text: '',
      points: 10,
      options: ['', '', '', ''],
      correctAnswer: undefined,
      aiCriteria: '',
    })
  }

  const handleRemoveQuestion = (questionId: string) => {
    setQuizData({
      ...quizData,
      questions: quizData.questions.filter(q => q.id !== questionId),
    })
  }

  const handleQuestionTypeChange = (type: QuestionType) => {
    setNewQuestion({
      type,
      text: newQuestion.text,
      points: newQuestion.points,
      options: type === 'essay' ? undefined : (newQuestion.options || ['', '', '', '']),
      correctAnswer: type === 'essay' ? undefined : newQuestion.correctAnswer,
      aiCriteria: type === 'essay' ? newQuestion.aiCriteria : undefined,
    })
  }

  // Upload video file to Supabase Storage with real progress tracking
  const uploadVideoFile = async (file: File): Promise<string> => {
    if (!courseId || !user) throw new Error('Course ID or User missing')

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        throw new Error('Invalid file type. Please upload a video file (MP4, WebM, etc.).')
      }

      // Use path: videos/${courseId}/${Date.now()}_${file.name}
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filePath = `videos/${courseId}/${fileName}`

      // Get the Supabase storage URL and auth token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error('Not authenticated')
      }

      // Upload using XMLHttpRequest for progress tracking
      const uploadUrl = `${supabaseUrl}/storage/v1/object/course-content/${filePath}`
      
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100)
            setUploadProgress(percentComplete)
          }
        })
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`))
          }
        })
        
        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed due to network error'))
        })
        
        xhr.addEventListener('abort', () => {
          reject(new Error('Upload was aborted'))
        })
        
        xhr.open('POST', uploadUrl)
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
        xhr.setRequestHeader('x-upsert', 'false')
        xhr.send(file)
      })

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('course-content').getPublicUrl(filePath)

      if (!publicUrl) {
        throw new Error('Failed to get public URL')
      }

      return publicUrl
    } catch (error: any) {
      console.error('Error uploading video:', error)
      throw error
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // Helper: Save Quiz to Supabase
  const saveQuizToSupabase = async (lessonId: string, quizData: Quiz) => {
    if (!quizData || quizData.questions.length === 0) return

    try {
      // 1. Upsert Quiz Info
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .upsert(
          {
            lesson_id: lessonId,
            title: quizData.title,
            passing_score: quizData.passingScore || 80,
          },
          { onConflict: 'lesson_id' } // Assuming 1 quiz per lesson
        )
        .select()
        .single()

      if (quizError) throw quizError
      if (!quiz) return

      // 2. Delete Old Questions (Simplest strategy for updates)
      // When editing, it's safer to clear old Qs and re-insert new ones to avoid ID conflicts
      const { error: deleteError } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('quiz_id', quiz.id)

      if (deleteError) throw deleteError

      // 3. Format & Insert New Questions
      const formattedQuestions = quizData.questions.map((q: Question, idx: number) => {
        // Map 'essay' type to 'text' for database schema
        const dbQuestionType = q.type === 'essay' ? 'text' : q.type
        
        // For text/essay questions, correct_index should be null
        // For multiple_choice and true_false, use the correctAnswer as a Number
        const correctIndex = dbQuestionType === 'text' 
          ? null 
          : (q.correctAnswer !== undefined ? Number(q.correctAnswer) : null)
        
        return {
          quiz_id: quiz.id,
          question_text: q.text,
          question_type: dbQuestionType,
          points: q.points || 10,
          options: q.options && q.options.length > 0 ? q.options : [], // JSONB array (empty array for text questions)
          correct_index: correctIndex,
          ai_scoring_criteria: q.type === 'essay' ? (q.aiCriteria || null) : null, // Only for essay questions
          order_index: idx,
        }
      })

      const { error: questionsError } = await supabase.from('quiz_questions').insert(formattedQuestions)

      if (questionsError) throw questionsError

      console.log('Quiz saved successfully for Lesson:', lessonId)
    } catch (error: any) {
      console.error('Error saving quiz:', error)
      toast.error('Failed to save quiz data')
      throw error // Re-throw to prevent lesson from being marked as saved
    }
  }

  // Upload resource file to Supabase Storage with real progress tracking
  const uploadResourceFile = async (file: File): Promise<string> => {
    if (!courseId || !user) throw new Error('Course ID or User missing')

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Validate file type
      const allowedExtensions = ['.pdf', '.pptx', '.docx', '.txt']
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!allowedExtensions.includes(fileExt)) {
        throw new Error('Invalid file type. Please upload PDF, PPTX, DOCX, or TXT files.')
      }

      // Use path: resources/${user.id}/${Date.now()}_${file.name}
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filePath = `resources/${user.id}/${fileName}`

      // Get the Supabase storage URL and auth token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error('Not authenticated')
      }

      // Upload using XMLHttpRequest for progress tracking
      const uploadUrl = `${supabaseUrl}/storage/v1/object/course-content/${filePath}`
      
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100)
            setUploadProgress(percentComplete)
          }
        })
        
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.responseText}`))
          }
        })
        
        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed due to network error'))
        })
        
        xhr.addEventListener('abort', () => {
          reject(new Error('Upload was aborted'))
        })
        
        xhr.open('POST', uploadUrl)
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
        xhr.setRequestHeader('x-upsert', 'false')
        xhr.send(file)
      })

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('course-content').getPublicUrl(filePath)

      if (!publicUrl) {
        throw new Error('Failed to get public URL')
      }

      return publicUrl
    } catch (error: any) {
      console.error('Error uploading resource:', error)
      throw error
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // Handle create/update lesson
  const handleCreateLesson = async () => {
    // Validation based on active tab
    if (activeTab === 'video') {
      if (!selectedModuleId || !lessonTitle.trim()) {
        toast.error('Please enter a lesson title')
        return
      }
    } else {
      if (!selectedModuleId || !quizData.title.trim()) {
        toast.error('Please enter a quiz title')
        return
      }
      if (quizData.questions.length === 0) {
        toast.error('Please add at least one question')
        return
      }
    }

    setCreatingLesson(true)

    try {
      const lessonType = activeTab === 'quiz' ? 'quiz' : 'video'
      const finalTitle = activeTab === 'quiz' ? quizData.title : lessonTitle.trim()

      if (editingLessonIndex) {
        // === UPDATE EXISTING LESSON ===
        const updateData: any = {
          type: lessonType,
          title: finalTitle,
          description: lessonDescription || null,
          updated_at: new Date().toISOString(),
        }

        // Only update video/resource if in video tab
        if (activeTab === 'video') {
          let finalVideoUrl = lessonVideoUrl
          let finalResourceUrl = lessonResourceUrl

          if (lessonVideoFile) {
            finalVideoUrl = await uploadVideoFile(lessonVideoFile)
            toast.success('Video uploaded successfully!')
          }
          if (lessonResourceFile) {
            finalResourceUrl = await uploadResourceFile(lessonResourceFile)
            toast.success('Resource file uploaded successfully!')
          }

          updateData.content_url = finalVideoUrl
          updateData.resource_url = finalResourceUrl
          updateData.chapters = lessonChapters.length > 0 ? lessonChapters : null
        }

        const { data: lessonData, error: lessonError } = await supabase
          .from('lessons')
          .update(updateData)
          .eq('id', editingLessonIndex.lessonId)
          .select()
          .single()

        if (lessonError) throw lessonError

        // Save quiz data if quiz type
        if (activeTab === 'quiz' && quizData.questions.length > 0) {
          await saveQuizToSupabase(editingLessonIndex.lessonId, quizData)
        }

        // Optimistically update UI
        setModules(
          modules.map(module =>
            module.id === editingLessonIndex.moduleId
              ? {
                  ...module,
                  lessons: (module.lessons || []).map(lesson =>
                    lesson.id === editingLessonIndex.lessonId
                      ? { ...lessonData, order_index: lesson.order_index }
                      : lesson
                  ).sort((a, b) => a.order_index - b.order_index),
                }
              : module
          )
        )

        toast.success('Lesson updated successfully!')
      } else {
        // === CREATE NEW LESSON ===
        // Get the highest order_index for lessons in this module
        const selectedModule = modules.find(m => m.id === selectedModuleId)
        const maxOrderIndex = selectedModule?.lessons 
          ? Math.max(...selectedModule.lessons.map(l => l.order_index), 0)
          : 0

        // Insert lesson
        const insertData: any = {
          module_id: selectedModuleId,
          type: lessonType,
          title: finalTitle,
          description: lessonDescription || null,
          order_index: maxOrderIndex + 1,
          duration: null,
        }

        if (activeTab === 'video') {
          let finalVideoUrl = lessonVideoUrl
          let finalResourceUrl = lessonResourceUrl

          if (lessonVideoFile) {
            finalVideoUrl = await uploadVideoFile(lessonVideoFile)
            toast.success('Video uploaded successfully!')
          }
          if (lessonResourceFile) {
            finalResourceUrl = await uploadResourceFile(lessonResourceFile)
            toast.success('Resource file uploaded successfully!')
          }

          insertData.content_url = finalVideoUrl
          insertData.resource_url = finalResourceUrl
          insertData.chapters = lessonChapters.length > 0 ? lessonChapters : null
        }

        const { data: lessonData, error: lessonError } = await supabase
          .from('lessons')
          .insert(insertData)
          .select()
          .single()

        if (lessonError) throw lessonError

        // Save quiz data if quiz type
        if (activeTab === 'quiz' && quizData.questions.length > 0) {
          await saveQuizToSupabase(lessonData.id, quizData)
        }

        // Optimistically update UI
        setModules(
          modules.map(module =>
            module.id === selectedModuleId
              ? {
                  ...module,
                  lessons: [...(module.lessons || []), lessonData].sort((a, b) => a.order_index - b.order_index),
                }
              : module
          )
        )

        toast.success('Lesson created successfully!')
      }

      // Reset form and close dialog
      setLessonTitle('')
      setLessonDescription('')
      setLessonVideoFile(null)
      setLessonVideoUrl(null)
      setLessonResourceFile(null)
      setLessonResourceUrl(null)
      setLessonChapters([])
      setNewChapterTime('')
      setNewChapterTitle('')
      setEditingLessonIndex(null)
      setShowAddLessonDialog(false)
    } catch (error: any) {
      console.error('Error saving lesson:', error)
      toast.error(error.message || 'Failed to save lesson')
    } finally {
      setCreatingLesson(false)
    }
  }

  // Handle delete lesson
  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return

    try {
      const { error } = await supabase.from('lessons').delete().eq('id', lessonId)

      if (error) throw error

      // Optimistically update UI
      setModules(
        modules.map(module =>
          module.id === moduleId
            ? {
                ...module,
                lessons: (module.lessons || []).filter(l => l.id !== lessonId),
              }
            : module
        )
      )

      toast.success('Lesson deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting lesson:', error)
      toast.error(error.message || 'Failed to delete lesson')
    }
  }

  // Handle delete module
  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Are you sure you want to delete this module? All lessons in this module will also be deleted.')) return

    try {
      const { error } = await supabase.from('modules').delete().eq('id', moduleId)

      if (error) throw error

      // Optimistically update UI
      setModules(modules.filter(m => m.id !== moduleId))

      toast.success('Module deleted successfully!')
    } catch (error: any) {
      console.error('Error deleting module:', error)
      toast.error(error.message || 'Failed to delete module')
    }
  }

  // Handle save draft
  const handleSave = async () => {
    if (!courseId || !course) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('courses')
        .update({
          is_published: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', courseId)

      if (error) throw error

      toast.success('Draft saved successfully!')
    } catch (error: any) {
      console.error('Error saving draft:', error)
      toast.error(error.message || 'Failed to save draft')
    } finally {
      setSaving(false)
    }
  }

  // Handle publish course
  const handlePublish = async () => {
    if (!courseId || !course) return

    setPublishing(true)
    try {
      const { error } = await supabase
        .from('courses')
        .update({
          is_published: true,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          visibility: courseVisibility,
        })
        .eq('id', courseId)

      if (error) throw error

      // Update local state
      setCourse({
        ...course,
        is_published: true,
        published_at: new Date().toISOString(),
        visibility: courseVisibility,
      })

      toast.success('Course published successfully!')
      setShowPublishDialog(false)
      
      // Redirect to courses list after a short delay
      setTimeout(() => {
        navigate(coursesListPath)
      }, 1500)
    } catch (error: any) {
      console.error('Error publishing course:', error)
      toast.error(error.message || 'Failed to publish course')
    } finally {
      setPublishing(false)
    }
  }

  // Calculate if course is locked (published < 3 days ago)
  const isLocked = course?.is_published && course.published_at
    ? Date.now() - new Date(course.published_at).getTime() < 3 * 24 * 60 * 60 * 1000
    : false

  // Check if course is published (for hiding add buttons)
  const isPublished = course?.is_published || false

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading course...</div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Course not found</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-6">
        <div className="space-y-1">
          <Button
            variant="ghost"
            className="text-slate-500 dark:text-slate-400 pl-0 hover:text-slate-900 dark:hover:text-white"
            onClick={() => navigate(coursesListPath)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Courses
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {course.title}
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditCourseOpen(true)}
              className="text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-400"
              title="Edit course details"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-slate-500 dark:text-slate-400">
            Manage modules and lessons for this course
          </p>
        </div>
        <div className="flex gap-3">
          {!isPublished && (
            <Button
              variant="outline"
              className="border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200"
              onClick={() => setShowAddModuleDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Module
            </Button>
          )}
          {!isPublished && (
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </>
              )}
            </Button>
          )}
          {!isPublished && (
            <Button
              onClick={() => {
                if (modules.length === 0) {
                  toast.error('Please add at least one module before publishing')
                  return
                }
                setShowPublishDialog(true)
              }}
              disabled={modules.length === 0}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Rocket className="mr-2 h-4 w-4" />
              Publish Course
            </Button>
          )}
          {isPublished && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 border border-green-500/30 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">Published</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        {modules.length === 0 ? (
          <div className="bg-white dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-12 text-center">
            <div className="mx-auto w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <Plus className="text-cyan-500" size={24} />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              No modules yet
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Start by adding your first section
            </p>
            {!isPublished && (
              <Button
                variant="outline"
                className="border-cyan-500/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10"
                onClick={() => setShowAddModuleDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Module
              </Button>
            )}
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-4">
            {modules.map((module) => (
              <AccordionItem
                key={module.id}
                value={module.id}
                className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl px-6"
              >
                <div className="flex items-center justify-between">
                  <AccordionTrigger className="flex-1 text-left hover:no-underline">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {module.title}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {module.lessons?.length || 0} lesson{(module.lessons?.length || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </AccordionTrigger>
                  <div className="flex items-center gap-2 ml-4">
                    {!isPublished && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenAddLessonDialog(module.id)
                        }}
                        className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Lesson
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteModule(module.id)
                      }}
                      disabled={isLocked}
                      className={cn(
                        'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300',
                        isLocked && 'opacity-50 cursor-not-allowed'
                      )}
                      title={isLocked ? 'Modification locked for 72 hours after publishing' : 'Delete module'}
                    >
                      {isLocked ? <Lock className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <AccordionContent>
                  <div className="pt-4 pb-2 space-y-2">
                    {module.lessons && module.lessons.length > 0 ? (
                      module.lessons.map((lesson, _lessonIndex) => (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-white/10"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex items-center gap-2 shrink-0">
                              {lesson.content_url ? (
                                <Video className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                              ) : null}
                              {lesson.resource_url ? (
                                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                              ) : null}
                              {!lesson.content_url && !lesson.resource_url && (
                                <PlayCircle className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                                  {lesson.title || 'Untitled Lesson'}
                                </h4>
                                {/* Content Indicators */}
                                <div className="flex items-center gap-1">
                                  {lesson.content_url && (
                                    <span className="bg-cyan-950/50 text-cyan-400 border border-cyan-900/50 p-1 rounded" title="Video attached">
                                      <Video className="h-3 w-3" />
                                    </span>
                                  )}
                                  {lesson.resource_url && (
                                    <span className="bg-purple-950/50 text-purple-400 border border-purple-900/50 p-1 rounded" title="Resource attached">
                                      <FileText className="h-3 w-3" />
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                {lesson.duration && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {lesson.duration} min
                                  </p>
                                )}
                                {lesson.content_url && (
                                  <span className="text-xs text-cyan-600 dark:text-cyan-400 truncate" title={getFileName(lesson.content_url)}>
                                    📹 {getFileName(lesson.content_url)}
                                  </span>
                                )}
                                {lesson.resource_url && (
                                  <span className="text-xs text-purple-600 dark:text-purple-400 truncate" title={getFileName(lesson.resource_url)}>
                                    📄 {getFileName(lesson.resource_url)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Edit Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-slate-400 hover:text-cyan-400"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditLesson(module.id, lesson.id)
                              }}
                              disabled={isLocked}
                              title={isLocked ? 'Modification locked for 72 hours after publishing' : 'Edit lesson'}
                            >
                              {isLocked ? <Lock className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                            </Button>
                            {/* Delete Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteLesson(module.id, lesson.id)
                              }}
                              disabled={isLocked}
                              title={isLocked ? 'Modification locked for 72 hours after publishing' : 'Delete lesson'}
                            >
                              {isLocked ? <Lock className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        <p className="text-sm">No lessons yet. Add your first lesson to get started.</p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>

      {/* Add Module Dialog */}
      <Dialog open={showAddModuleDialog} onOpenChange={setShowAddModuleDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Add New Module</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Create a new module for your course. Modules help organize your content into sections.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-900 dark:text-white">Module Title</Label>
              <Input
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                placeholder="e.g. Introduction, Advanced Topics, Final Project"
                className="bg-white dark:bg-slate-800 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-cyan-500 dark:focus:border-cyan-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateModule()
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddModuleDialog(false)
                  setNewModuleTitle('')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateModule}
                disabled={creatingModule || !newModuleTitle.trim()}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
              >
                {creatingModule ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Module
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Lesson Dialog */}
      <Dialog open={showAddLessonDialog} onOpenChange={setShowAddLessonDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-7xl w-[90vw]">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingLessonIndex ? 'Edit Lesson' : 'Add New Lesson'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingLessonIndex 
                ? 'Update lesson content and materials.'
                : 'Create a new lesson with video content and downloadable materials.'
              }
            </DialogDescription>
          </DialogHeader>

          {/* Tabs: Video / Quiz */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'video' | 'quiz')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-950 border border-slate-800">
              <TabsTrigger value="video" className="data-[state=active]:bg-cyan-950/50 data-[state=active]:text-cyan-400">
                Video Lesson
              </TabsTrigger>
              <TabsTrigger value="quiz" className="data-[state=active]:bg-purple-950/50 data-[state=active]:text-purple-400">
                Quiz Builder
              </TabsTrigger>
            </TabsList>

            {/* VIDEO TAB CONTENT */}
            <TabsContent value="video" className="space-y-6 py-4 mt-4">
              {/* 1. Title & Description (Clean Inputs) */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Lesson Details</Label>
                  <Input
                    placeholder="e.g. Introduction to Smart Contracts"
                    value={lessonTitle}
                    onChange={(e) => setLessonTitle(e.target.value)}
                    className="bg-slate-950 border-slate-800 focus:border-cyan-500 h-11 text-white placeholder:text-slate-600"
                  />
                </div>
                <Textarea
                  placeholder="Briefly describe what students will learn..."
                  value={lessonDescription}
                  onChange={(e) => setLessonDescription(e.target.value)}
                  className="bg-slate-950 border-slate-800 focus:border-cyan-500 min-h-[80px] resize-none text-white placeholder:text-slate-600"
                />
              </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 2. VIDEO UPLOAD ZONE (Cyan) */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Video Content</Label>

                {lessonVideoUrl || lessonVideoFile ? (
                  // SUCCESS STATE
                  <div className="relative group border border-cyan-900/50 bg-cyan-950/10 rounded-xl p-4 flex items-center gap-3 transition-all">
                    <div className="h-10 w-10 rounded-full bg-cyan-900/30 flex items-center justify-center shrink-0">
                      <Video className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate" title={lessonVideoFile?.name || getFileName(lessonVideoUrl || '')}>
                        {lessonVideoFile?.name || getFileName(lessonVideoUrl || '') || 'Video Attached'}
                      </p>
                      <p className="text-xs text-cyan-400/70">Ready to publish</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {lessonVideoUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-slate-400 hover:text-cyan-400"
                          onClick={() => window.open(lessonVideoUrl, '_blank')}
                                // title="Preview Video" // Not supported by Lucide icons
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-red-400 hover:bg-red-950/30"
                        onClick={() => {
                          setLessonVideoFile(null)
                          setLessonVideoUrl(null)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  // UPLOAD STATE
                  <div className="relative">
                    <label
                      htmlFor="video-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-800 rounded-xl cursor-pointer bg-slate-950/50 hover:bg-slate-900 hover:border-cyan-500/50 transition-all group"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-8 h-8 mb-3 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                        <p className="text-sm text-slate-400 group-hover:text-slate-300">
                          <span className="font-semibold text-cyan-400">Click to upload</span> video
                        </p>
                        <p className="text-xs text-slate-600 mt-1">MP4, WebM (Max 500MB)</p>
                      </div>
                      <input
                        id="video-upload"
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setLessonVideoFile(file)
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* 3. RESOURCE UPLOAD ZONE (Purple) */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-purple-400">Materials</Label>

                {lessonResourceUrl || lessonResourceFile ? (
                  // SUCCESS STATE
                  <div className="relative group border border-purple-900/50 bg-purple-950/10 rounded-xl p-3 flex items-center gap-3 transition-all">
                    <div className="h-10 w-10 rounded-full bg-purple-900/30 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate" title={lessonResourceFile?.name || getFileName(lessonResourceUrl || '')}>
                        {lessonResourceFile?.name || getFileName(lessonResourceUrl || '') || 'File Attached'}
                      </p>
                      <p className="text-xs text-purple-400/70">PDF, PPTX, DOCX</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {lessonResourceUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-slate-400 hover:text-purple-400"
                          onClick={() => window.open(lessonResourceUrl, '_blank')}
                          title="Preview Resource"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-red-400 hover:bg-red-950/30"
                        onClick={() => {
                          setLessonResourceFile(null)
                          setLessonResourceUrl(null)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  // UPLOAD STATE
                  <div className="relative">
                    <label
                      htmlFor="resource-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-800 rounded-xl cursor-pointer bg-slate-950/50 hover:bg-slate-900 hover:border-purple-500/50 transition-all group"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-8 h-8 mb-3 text-slate-500 group-hover:text-purple-400 transition-colors" />
                        <p className="text-sm text-slate-400 group-hover:text-slate-300">
                          <span className="font-semibold text-purple-400">Click to attach</span> file
                        </p>
                        <p className="text-xs text-slate-600 mt-1">PDF, Slides, Docs</p>
                      </div>
                      <input
                        id="resource-upload"
                        type="file"
                        accept=".pdf,.pptx,.docx,.txt"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setLessonResourceFile(file)
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Video Chapters Section */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Video Chapters
              </Label>

              {/* Add New Chapter Row */}
              <div className="flex gap-2">
                <Input
                  placeholder="00:00"
                  className="w-20 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
                  value={newChapterTime}
                  onChange={(e) => setNewChapterTime(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddChapter()
                    }
                  }}
                />
                <Input
                  placeholder="Chapter Title..."
                  className="flex-1 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddChapter()
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  className="bg-slate-800 hover:bg-slate-700"
                  onClick={handleAddChapter}
                  disabled={!newChapterTime.trim() || !newChapterTitle.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Chapter List */}
              {lessonChapters.length > 0 && (
                <div className="space-y-2">
                  {lessonChapters.map((chap, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-sm bg-slate-900/50 p-2 rounded border border-slate-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-cyan-400 bg-cyan-950/30 px-1.5 rounded">
                          {chap.time}
                        </span>
                        <span className="text-slate-300">{chap.title}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-slate-500 hover:text-red-400"
                        onClick={() => handleRemoveChapter(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </TabsContent>

            {/* QUIZ TAB CONTENT */}
            <TabsContent value="quiz" className="space-y-6 py-4 mt-4 h-[60vh] overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-slate-600">
              
              {/* MODE 1: LIST OVERVIEW (Show only if NOT adding/editing) */}
              {!isAddingQuestion && (
                <div className="space-y-6">
                  {/* 1. Global Settings */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                    <div className="col-span-2 space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quiz Title</Label>
                      <Input
                        placeholder="e.g. Blockchain Fundamentals Quiz"
                        value={quizData.title}
                        onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                        className="bg-slate-950 border-slate-800 focus:border-purple-500 h-11 text-white placeholder:text-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pass Score (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={quizData.passingScore ?? 80}
                        onChange={(e) => setQuizData({ ...quizData, passingScore: parseInt(e.target.value) || 80 })}
                        className="bg-slate-950 border-slate-800 focus:border-purple-500 h-11 text-white placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  {/* 2. Questions List (Full Width) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base text-slate-300 font-semibold">Questions ({quizData.questions.length})</Label>
                    </div>
                    
                    {quizData.questions.map((q, idx) => (
                      <div key={q.id} className="p-4 bg-slate-900 border border-slate-800 rounded-lg flex justify-between items-start group hover:border-slate-700 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/30 px-1.5 rounded">Q{idx + 1}</span>
                            <span className="text-xs text-slate-500 capitalize">{q.type.replace('_', ' ')}</span>
                            <span className="text-xs text-slate-600">{q.points}pts</span>
                          </div>
                          <p className="text-sm font-medium text-white mb-2">{q.text}</p>
                          
                          {/* PREVIEW ANSWERS */}
                          <div className="text-xs space-y-1 bg-slate-950/50 p-2 rounded">
                            {q.type === 'multiple_choice' && q.options?.map((opt, i) => (
                              <div key={i} className={`flex items-center gap-2 ${i === q.correctAnswer ? 'text-green-400 font-bold' : 'text-slate-500'}`}>
                                {i === q.correctAnswer && <CheckCircle2 className="h-3 w-3" />}
                                <span>{opt}</span>
                              </div>
                            ))}
                            {q.type === 'true_false' && (
                              <div className="text-green-400 flex items-center gap-2">
                                <CheckCircle2 className="h-3 w-3" /> 
                                Answer: {q.correctAnswer === 0 ? 'True' : 'False'}
                              </div>
                            )}
                            {q.type === 'essay' && (
                              <p className="text-slate-500 italic line-clamp-2">AI: {q.aiCriteria || 'No criteria set'}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-4">
                          <Button
                            onClick={() => handleEditSingleQuestion(idx)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-cyan-400"
                            title="Edit question"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleRemoveQuestion(q.id!)}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-red-400"
                            title="Delete question"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {quizData.questions.length === 0 && (
                      <div className="text-center text-slate-600 py-12 italic">No questions yet. Add your first question below.</div>
                    )}
                  </div>

                  {/* 3. Big Add Button */}
                  <Button 
                    variant="outline" 
                    className="w-full h-24 border-2 border-dashed border-slate-700 bg-slate-900/30 hover:bg-slate-900 hover:border-cyan-500 hover:text-cyan-400 flex flex-col gap-2 transition-all"
                    onClick={() => setIsAddingQuestion(true)}
                  >
                    <Plus className="h-8 w-8" />
                    <span className="text-lg font-medium">Add New Question</span>
                  </Button>
                </div>
              )}

              {/* MODE 2: EDITOR (Show only if adding/editing) */}
              {isAddingQuestion && (
                <div className="space-y-6 bg-slate-900/30 p-6 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <h3 className="text-xl font-semibold text-cyan-400">Design Question</h3>
                    <Button variant="ghost" size="sm" onClick={handleCancelQuestion}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>

                  {/* Row 1: Type & Points */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-400">Type</Label>
                      <Select
                        value={newQuestion.type}
                        onValueChange={(val: any) => handleQuestionTypeChange(val as QuestionType)}
                      >
                        <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                          <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                          <SelectItem value="true_false">True / False</SelectItem>
                          <SelectItem value="essay">Essay (AI Graded)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-slate-400">Points</Label>
                      <Input
                        type="number"
                        min="1"
                        value={newQuestion.points}
                        onChange={(e) => setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) || 10 })}
                        className="bg-slate-950 border-slate-800 focus:border-purple-500 h-11 text-white"
                      />
                    </div>
                  </div>

                  {/* Row 2: Text */}
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-400">Question Text</Label>
                    <Textarea
                      placeholder="Enter your question..."
                      value={newQuestion.text}
                      onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                      className="bg-slate-950 border-slate-800 focus:border-purple-500 min-h-[80px] resize-none text-white placeholder:text-slate-600"
                    />
                  </div>

                  {/* Row 3: Dynamic Options */}
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/50">
                    {newQuestion.type === 'multiple_choice' && (
                      <div className="grid grid-cols-2 gap-4">
                        {[0, 1, 2, 3].map((idx) => (
                          <div key={idx} className="space-y-1">
                            <Label className="text-[10px] text-slate-500">Option {String.fromCharCode(65 + idx)}</Label>
                            <div className="flex gap-2">
                              <Input
                                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                value={newQuestion.options?.[idx] || ''}
                                onChange={(e) => {
                                  const newOptions = [...(newQuestion.options || [])]
                                  newOptions[idx] = e.target.value
                                  setNewQuestion({ ...newQuestion, options: newOptions })
                                }}
                                className="bg-slate-900 border-slate-800 focus:border-purple-500 text-white placeholder:text-slate-600"
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant={newQuestion.correctAnswer === idx ? "default" : "outline"}
                                onClick={() => setNewQuestion({ ...newQuestion, correctAnswer: idx })}
                                className={cn(
                                  newQuestion.correctAnswer === idx
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "border-slate-700"
                                )}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {newQuestion.type === 'true_false' && (
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-400">Correct Answer</Label>
                        <div className="flex gap-4">
                          <Button
                            type="button"
                            variant={newQuestion.correctAnswer === 0 ? "default" : "outline"}
                            onClick={() => setNewQuestion({ ...newQuestion, correctAnswer: 0 })}
                            className={newQuestion.correctAnswer === 0 ? "bg-primary hover:bg-primary/90" : "border-slate-700"}
                          >
                            True
                          </Button>
                          <Button
                            type="button"
                            variant={newQuestion.correctAnswer === 1 ? "default" : "outline"}
                            onClick={() => setNewQuestion({ ...newQuestion, correctAnswer: 1 })}
                            className={newQuestion.correctAnswer === 1 ? "bg-primary hover:bg-primary/90" : "border-slate-700"}
                          >
                            False
                          </Button>
                        </div>
                      </div>
                    )}

                    {newQuestion.type === 'essay' && (
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-400 flex items-center gap-2">
                          AI Scoring Criteria
                          <HelpCircle className="h-3 w-3 text-slate-500" />
                        </Label>
                        <Textarea
                          placeholder="e.g. Keywords to look for: blockchain, decentralized, ledger. Student should explain consensus mechanisms..."
                          value={newQuestion.aiCriteria || ''}
                          onChange={(e) => setNewQuestion({ ...newQuestion, aiCriteria: e.target.value })}
                          className="bg-slate-900 border-slate-800 focus:border-purple-500 min-h-[100px] resize-none text-white placeholder:text-slate-600"
                        />
                        <p className="text-xs text-slate-500">The AI will use this to grade student answers.</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="pt-4 flex gap-3 border-t border-slate-800">
                    <Button variant="outline" className="flex-1" onClick={handleCancelQuestion}>
                      Cancel
                    </Button>
                    <Button 
                      className="flex-[2] bg-cyan-600 hover:bg-cyan-500 text-white" 
                      onClick={handleAddQuestion}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> {editingQuestionIndex !== null ? 'Update Question' : 'Add to List'}
                    </Button>
                  </div>
                </div>
              )}

            </TabsContent>
          </Tabs>

          {/* Footer Buttons (Outside Tabs) */}
          {isUploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-slate-500">Uploading... {uploadProgress}%</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddLessonDialog(false)
                  setLessonTitle('')
                  setLessonDescription('')
                  setLessonVideoFile(null)
                  setLessonVideoUrl(null)
                  setLessonResourceFile(null)
                  setLessonResourceUrl(null)
                  setLessonChapters([])
                  setNewChapterTime('')
                  setNewChapterTitle('')
                  setEditingLessonIndex(null)
                  setQuizData({ title: '', passingScore: 80, questions: [] })
                  setNewQuestion({ type: 'multiple_choice', text: '', points: 10, options: ['', '', '', ''], correctAnswer: undefined, aiCriteria: '' })
                  setIsAddingQuestion(false)
                  setEditingQuestionIndex(null)
                }}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateLesson}
                disabled={creatingLesson || isUploading || (activeTab === 'video' ? !lessonTitle.trim() : !quizData.title.trim() || quizData.questions.length === 0)}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
              >
                {creatingLesson || isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isUploading ? 'Uploading...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    {editingLessonIndex ? 'Update Lesson' : 'Create Lesson'}
                  </>
                )}
              </Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* Edit Course Details Dialog */}
      <Dialog open={isEditCourseOpen} onOpenChange={setIsEditCourseOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Edit Course Details</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Update the course title, description, and thumbnail image.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Title Input */}
            <div className="space-y-2">
              <Label htmlFor="edit-title" className="text-slate-700 dark:text-slate-300">Course Title</Label>
              <Input
                id="edit-title"
                value={courseForm.title}
                onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                placeholder="Enter course title"
                className="bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            {/* Description Textarea */}
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-slate-700 dark:text-slate-300">Description</Label>
              <Textarea
                id="edit-description"
                value={courseForm.description}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                placeholder="Enter course description"
                rows={4}
                className="bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white resize-none"
              />
            </div>

            {/* Thumbnail Upload */}
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Course Thumbnail</Label>
              
              {(() => {
                // Helper to show preview of selected file OR existing URL
                const getPreviewUrl = () => {
                  if (courseForm.thumbnailFile) {
                    return URL.createObjectURL(courseForm.thumbnailFile)
                  }
                  return course?.thumbnail_url || null
                }
                const previewUrl = getPreviewUrl()

                return (
                  <>
                    {/* Upload Zone */}
                    <div
                      onClick={() => document.getElementById('thumbnail-upload-input')?.click()}
                      className="group relative flex h-48 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-500 transition-all"
                    >
                      {previewUrl ? (
                        <>
                          {/* Image Preview */}
                          <img
                            src={previewUrl}
                            alt="Thumbnail preview"
                            className="h-full w-full object-cover transition-opacity group-hover:opacity-50"
                          />
                          {/* Overlay Icon */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/30">
                            <div className="flex flex-col items-center gap-2">
                              <UploadCloud className="h-10 w-10 text-white" />
                              <span className="text-sm font-medium text-white">Change image</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        /* Upload Placeholder State */
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <ImageIcon className="mb-2 h-10 w-10 text-slate-400 group-hover:text-slate-300" />
                          <p className="text-sm font-medium text-slate-400 dark:text-slate-300 group-hover:text-slate-600 dark:group-hover:text-white">
                            Click to upload thumbnail
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            PNG, JPG, GIF up to 5MB
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Hidden Actual Input */}
                    <Input
                      id="thumbnail-upload-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        if (file) {
                          if (!file.type.startsWith('image/')) {
                            toast.error('Please select an image file')
                            return
                          }
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error('Image size must be less than 5MB')
                            return
                          }
                          setCourseForm({ ...courseForm, thumbnailFile: file })
                        }
                      }}
                    />

                    {/* Remove button if preview exists */}
                    {previewUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setCourseForm({ ...courseForm, thumbnailFile: null })
                        }}
                        className="w-full border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remove Thumbnail
                      </Button>
                    )}
                  </>
                )
              })()}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-white/10">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditCourseOpen(false)
                // Reset form to current course data
                if (course) {
                  setCourseForm({
                    title: course.title || '',
                    description: course.description || '',
                    thumbnailFile: null,
                  })
                }
              }}
              className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateDetails}
              disabled={uploadingThumbnail || !courseForm.title.trim()}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
            >
              {uploadingThumbnail ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Update Course
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Publish Confirmation Dialog */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">Confirm Publication?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
              Once published, you <strong>CANNOT</strong> add new lessons. Modifying or deleting existing lessons will be <strong>LOCKED for 3 days</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {/* Visibility Selection */}
          <div className="space-y-3 py-2">
            <Label className="text-slate-900 dark:text-white text-sm font-semibold">
              Course Visibility
            </Label>
            <div className="space-y-2">
              <label 
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  courseVisibility === 'public' 
                    ? "border-green-500 bg-green-500/10" 
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                )}
              >
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={courseVisibility === 'public'}
                  onChange={() => setCourseVisibility('public')}
                  className="sr-only"
                />
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                  courseVisibility === 'public' ? "border-green-500" : "border-slate-400"
                )}>
                  {courseVisibility === 'public' && (
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-white">Public</p>
                  <p className="text-xs text-slate-500">Visible to everyone</p>
                </div>
              </label>
              
              {course?.org_id && (
                <label 
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    courseVisibility === 'org_only' 
                      ? "border-purple-500 bg-purple-500/10" 
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  )}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value="org_only"
                    checked={courseVisibility === 'org_only'}
                    onChange={() => setCourseVisibility('org_only')}
                    className="sr-only"
                  />
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                    courseVisibility === 'org_only' ? "border-purple-500" : "border-slate-400"
                  )}>
                    {courseVisibility === 'org_only' && (
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">Organization Only</p>
                    <p className="text-xs text-slate-500">Only organization members can access</p>
                  </div>
                </label>
              )}
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePublish}
              disabled={publishing}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
            >
              {publishing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Publish Course
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
