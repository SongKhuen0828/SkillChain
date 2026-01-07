import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  Target,
  Clock,
  Zap,
  CheckCircle2,
  Sparkles,
  X,
  ArrowRight,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface AIOnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (prefs: any) => void
  initialData?: any
}

const steps = [
  {
    id: 'goal',
    title: 'What is your main goal?',
    subtitle: 'This helps AI tailor your curriculum depth.',
    options: [
      {
        id: 'career',
        label: 'Career Switch',
        desc: 'Job-ready skills & portfolio',
        icon: Target,
      },
      {
        id: 'cert',
        label: 'Get Certified',
        desc: 'Ace the exams',
        icon: CheckCircle2,
      },
      {
        id: 'project',
        label: 'Build DApps',
        desc: 'Hands-on practice',
        icon: Zap,
      },
      {
        id: 'explore',
        label: 'Just Exploring',
        desc: 'Casual learning',
        icon: Brain,
      },
    ],
  },
  {
    id: 'commitment',
    title: 'Weekly Commitment',
    subtitle: 'Be honest. AI will adjust your pace.',
    type: 'slider',
  },
  {
    id: 'time',
    title: 'When do you prefer to learn?',
    subtitle: 'AI will auto-schedule sessions for you.',
    options: [
      {
        id: 'routine',
        label: 'Fixed Routine',
        desc: 'Same time every day',
        icon: Clock,
      },
      {
        id: 'weekend',
        label: 'Weekend Warrior',
        desc: 'Heavy load on Sat/Sun',
        icon: Calendar,
      },
      {
        id: 'flexible',
        label: 'Flexible / Unsure',
        desc: 'Let AI discover my peak hours',
        icon: Sparkles,
      },
    ],
  },
  {
    id: 'struggle',
    title: 'What holds you back?',
    subtitle: 'AI will choose the best Time Management Method.',
    options: [
      {
        id: 'distraction',
        label: 'Easily Distracted',
        desc: 'Rec: Pomodoro (Strict)',
        icon: Zap,
      },
      {
        id: 'procrastination',
        label: 'Hard to Start',
        desc: 'Rec: 5-Min Rule',
        icon: Clock,
      },
      {
        id: 'fatigue',
        label: 'Get Tired Fast',
        desc: 'Rec: 52/17 Rule',
        icon: CheckCircle2,
      },
      {
        id: 'none',
        label: 'I can focus deep',
        desc: 'Rec: Flowtime',
        icon: Brain,
      },
    ],
  },
]

export default function AIOnboardingModal({
  isOpen,
  onClose,
  onComplete,
  initialData,
}: AIOnboardingModalProps) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [selections, setSelections] = useState<any>({
    goal: '',
    hours: [5],
    time: '',
    struggle: '',
  })
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Initialize selections with initialData if provided
  useEffect(() => {
    if (initialData && isOpen) {
      setSelections({
        goal: initialData.goal || '',
        hours: initialData.hours || [5],
        time: initialData.time || '',
        struggle: initialData.struggle || '',
      })
      setCurrentStep(0)
    } else if (isOpen && !initialData) {
      // Reset to defaults when opening without initial data
      setSelections({
        goal: '',
        hours: [5],
        time: '',
        struggle: '',
      })
      setCurrentStep(0)
    }
  }, [initialData, isOpen])

  if (!isOpen) return null

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((curr) => curr + 1)
    } else {
      setIsAnalyzing(true)

      try {
        // Save to ai_preferences table (not profiles.ai_preferences)
        if (user) {
          const { error } = await supabase
            .from('ai_preferences')
            .upsert({
              user_id: user.id,
              goal: selections.goal,
              struggle: selections.struggle,
              preferred_study_time: selections.time,
              hours: selections.hours,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id'
            })

          if (error) throw error
        }

        // Simulate analysis delay
        await new Promise((resolve) => setTimeout(resolve, 2500))

        setIsAnalyzing(false)
        onComplete(selections)
      } catch (error: any) {
        console.error('Error saving AI preferences:', error)
        setIsAnalyzing(false)
        toast.error(error.message || 'Failed to save preferences')
      }
    }
  }

  const handleSelect = (key: string, value: any) => {
    setSelections((prev: any) => ({ ...prev, [key]: value }))
  }

  const stepData = steps[currentStep]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-2xl bg-white dark:bg-[#1e1e2d] border border-slate-200 dark:border-violet-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col min-h-[550px]"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 dark:bg-primary/20 blur-[100px] pointer-events-none" />

        {isAnalyzing ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-8">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-violet-500/30 dark:border-violet-500/30 animate-spin border-t-violet-600 dark:border-t-violet-500" />
                <Brain className="absolute inset-0 m-auto text-violet-600 dark:text-violet-400 animate-pulse" size={40} />
              </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Analyzing Profile...</h2>
              <p className="text-violet-600 dark:text-violet-300">
                Matching cognitive patterns with optimal study methods.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-8 border-b border-slate-200 dark:border-white/5 flex justify-between items-center relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg text-primary">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">AI Setup Wizard</h2>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Step {currentStep + 1} of {steps.length}
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 p-8 relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  className="space-y-8"
                >
                  <div className="space-y-2">
                    <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{stepData.title}</h3>
                    <p className="text-lg text-slate-500 dark:text-slate-400">{stepData.subtitle}</p>
                  </div>
                  {stepData.type === 'slider' ? (
                    <div className="py-10 space-y-8">
                      <div className="text-violet-600 dark:text-violet-400 font-bold text-5xl">
                        {selections.hours[0]}{' '}
                        <span className="text-lg text-slate-500 dark:text-slate-400">hrs/week</span>
                      </div>
                      <Slider
                        value={selections.hours}
                        max={40}
                        min={1}
                        step={1}
                        onValueChange={(val) => handleSelect('hours', val)}
                        className="py-4"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {stepData.options?.map((opt) => {
                        const Icon = opt.icon
                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleSelect(stepData.id, opt.id)}
                            className={`p-4 rounded-xl border text-left flex items-start gap-4 transition-all ${
                              selections[stepData.id] === opt.id
                                ? 'bg-primary dark:bg-primary border-primary dark:border-primary shadow-lg text-white'
                                : 'bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                            }`}
                          >
                            <div
                              className={`p-2 rounded-lg ${
                                selections[stepData.id] === opt.id
                                  ? 'bg-white/20 dark:bg-white/20 text-white'
                                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              <Icon size={20} />
                            </div>
                            <div>
                              <div
                                className={`font-bold ${
                                  selections[stepData.id] === opt.id
                                    ? 'text-white'
                                    : 'text-slate-700 dark:text-slate-200'
                                }`}
                              >
                                {opt.label}
                              </div>
                              <div
                                className={`text-xs mt-1 ${
                                  selections[stepData.id] === opt.id
                                    ? 'text-violet-100 dark:text-violet-200'
                                    : 'text-slate-500 dark:text-slate-500'
                                }`}
                              >
                                {opt.desc}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="p-8 border-t border-slate-200 dark:border-white/5 flex justify-end relative z-10">
              <Button
                onClick={handleNext}
                disabled={!selections[stepData.id] && stepData.type !== 'slider'}
                className="bg-primary dark:bg-white text-white dark:text-slate-900 hover:bg-primary/90 dark:hover:bg-slate-200 px-8 h-12 rounded-xl font-bold"
              >
                {currentStep === steps.length - 1 ? 'Analyze & Create Plan' : 'Next Step'}{' '}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
