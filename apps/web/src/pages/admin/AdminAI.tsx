import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  CheckCircle2,
  XCircle,
  RefreshCw,
  Zap,
  MessageSquare,
  Calendar,
  TrendingUp,
  Database,
  Cpu,
  BarChart3,
  Target,
  Activity,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Timer,
  BookOpen,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface ModelMetrics {
  model_type: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingSamples: number;
  trainedAt: string;
}

interface TrainingStatus {
  training: boolean;
  metrics?: ModelMetrics;
  progress?: number;
}

export function AdminAI() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalAIUsers: 0,
    activeCompanions: 0,
    studyPlansGenerated: 0,
    studySessions: 0,
  });
  const [config, setConfig] = useState({
    groqConfigured: false,
    edgeFunctionDeployed: false,
    trainingFunctionDeployed: false,
  });
  const [trainingStatus, setTrainingStatus] = useState<{
    scheduling: TrainingStatus;
    recommendation: TrainingStatus;
    performance: TrainingStatus;
  }>({
    scheduling: { training: false },
    recommendation: { training: false },
    performance: { training: false },
  });
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics[]>([]);

  useEffect(() => {
    fetchStats();
    fetchConfig();
    fetchModelMetrics();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch AI users count
      const { count: aiUsers } = await supabase
        .from('ai_preferences')
        .select('*', { count: 'exact', head: true });

      // Fetch study plans count
      const { count: plans } = await supabase
        .from('study_plans')
        .select('*', { count: 'exact', head: true });

      // Fetch study sessions count
      const { count: sessions } = await supabase
        .from('study_sessions')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalAIUsers: aiUsers || 0,
        activeCompanions: aiUsers || 0,
        studyPlansGenerated: plans || 0,
        studySessions: sessions || 0,
      });
    } catch (error) {
      console.error('Error fetching AI stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    // Check if Groq is configured
    const groqKey = import.meta.env.VITE_GROQ_API_KEY;
    setConfig(prev => ({
      ...prev,
      groqConfigured: !!groqKey && groqKey.length > 10,
    }));
    
    // Check edge functions
    checkEdgeFunction();
    checkTrainingFunction();
  };

  const checkEdgeFunction = async () => {
    try {
      const { error } = await supabase.functions.invoke('ai-companion', {
        body: { type: 'ping' },
      });
      setConfig(prev => ({ ...prev, edgeFunctionDeployed: !error }));
    } catch {
      setConfig(prev => ({ ...prev, edgeFunctionDeployed: false }));
    }
  };

  const checkTrainingFunction = async () => {
    try {
      const { error } = await supabase.functions.invoke('train-ai-models', {
        body: { modelType: 'ping' },
      });
      setConfig(prev => ({ ...prev, trainingFunctionDeployed: !error }));
    } catch {
      setConfig(prev => ({ ...prev, trainingFunctionDeployed: false }));
    }
  };

  const fetchModelMetrics = async () => {
    try {
      const { getModelMetrics } = await import('@/lib/ai/TrainingService');
      const metrics = await getModelMetrics();
      setModelMetrics(metrics);
    } catch (error) {
      console.error('Error fetching model metrics:', error);
    }
  };

  const handleRetrainModel = async (modelType: 'scheduling' | 'recommendation' | 'performance') => {
    try {
      setTrainingStatus(prev => ({ ...prev, [modelType]: { training: true, progress: 0 } }));
      toast.info(`Training ${modelType} model...`);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setTrainingStatus(prev => ({
          ...prev,
          [modelType]: {
            ...prev[modelType],
            progress: Math.min((prev[modelType].progress || 0) + 10, 90)
          }
        }));
      }, 500);

      const { trainModel } = await import('@/lib/ai/TrainingService');
      const result = await trainModel(modelType);

      clearInterval(progressInterval);

      if (result.success && result.metrics) {
        console.log(`🎯 Training result for ${modelType}:`, result.metrics);
        console.log(`📊 trainingSamples: ${result.metrics.trainingSamples}`);
        toast.success(`${modelType} model trained! Samples: ${result.metrics.trainingSamples}, Accuracy: ${(result.metrics.accuracy * 100).toFixed(1)}%`);
        setTrainingStatus(prev => ({ 
          ...prev, 
          [modelType]: { training: false, metrics: result.metrics, progress: 100 } 
        }));
        await fetchModelMetrics();
        await fetchStats();
      } else {
        toast.error(result.error || `Failed to train ${modelType} model`);
        setTrainingStatus(prev => ({ ...prev, [modelType]: { training: false, progress: 0 } }));
      }
    } catch (error: any) {
      console.error('Training error:', error);
      toast.error(error.message || 'Training failed');
      setTrainingStatus(prev => ({ ...prev, [modelType]: { training: false, progress: 0 } }));
    }
  };

  const handleTrainAllModels = async () => {
    try {
      toast.info('Training all AI models...');
      setTrainingStatus({
        scheduling: { training: true, progress: 0 },
        recommendation: { training: true, progress: 0 },
        performance: { training: true, progress: 0 },
      });

      const { trainAllModels } = await import('@/lib/ai/TrainingService');
      const results = await trainAllModels();

      let successCount = 0;
      let errorCount = 0;

      if (results.scheduling.success) successCount++;
      else errorCount++;

      if (results.recommendation.success) successCount++;
      else errorCount++;

      if (results.performance.success) successCount++;
      else errorCount++;

      setTrainingStatus({
        scheduling: { 
          training: false, 
          metrics: results.scheduling.metrics as ModelMetrics | undefined,
          progress: results.scheduling.success ? 100 : 0
        },
        recommendation: { 
          training: false, 
          metrics: results.recommendation.metrics as ModelMetrics | undefined,
          progress: results.recommendation.success ? 100 : 0
        },
        performance: { 
          training: false, 
          metrics: results.performance.metrics as ModelMetrics | undefined,
          progress: results.performance.success ? 100 : 0
        },
      });

      await fetchModelMetrics();
      await fetchStats();

      if (errorCount === 0) {
        toast.success(`All ${successCount} models trained successfully!`);
      } else {
        toast.warning(`${successCount} models trained, ${errorCount} failed`);
      }
    } catch (error: any) {
      console.error('Training all models error:', error);
      toast.error(error.message || 'Failed to train models');
      setTrainingStatus({
        scheduling: { training: false },
        recommendation: { training: false },
        performance: { training: false },
      });
    }
  };

  const getMetricForModel = (modelType: string) => {
    return modelMetrics.find(m => m.model_type === modelType);
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-32 bg-slate-800/50 animate-pulse rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-800/50 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Hero Header (subtle + won't block top-right dropdown) */}
      <div className="relative z-0 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 backdrop-blur-xl p-6 lg:p-8">
        {/* Soft gradient wash */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-accent/20" />
        {/* Grid texture */}
        <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDYiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/15 border border-primary/20 rounded-xl">
              <Brain className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white">AI Training Center</h1>
              <p className="text-slate-400">Machine Learning Model Management</p>
            </div>
          </div>
          <p className="text-slate-300/90 max-w-2xl mt-3 text-sm lg:text-base">
            Train and manage AI models that power personalized learning experiences. Models are trained on real user data to optimize study schedules, recommend courses, and predict learning outcomes.
          </p>
        </div>

        {/* Decorative sparkles (non-interactive + kept away from top-right UI) */}
        <div className="pointer-events-none absolute -top-6 -right-6 opacity-60">
          <Sparkles className="h-16 w-16 text-white/10" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-6 hover:border-emerald-500/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Training Sessions</p>
              <p className="text-3xl font-bold text-emerald-400">{stats.studySessions.toLocaleString()}</p>
            </div>
            <div className="p-2.5 bg-emerald-500/20 rounded-xl">
              <Database className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Data points for model training</p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 p-6 hover:border-blue-500/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Study Plans</p>
              <p className="text-3xl font-bold text-blue-400">{stats.studyPlansGenerated.toLocaleString()}</p>
            </div>
            <div className="p-2.5 bg-blue-500/20 rounded-xl">
              <Calendar className="h-5 w-5 text-blue-400" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">AI-generated schedules</p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 p-6 hover:border-violet-500/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">AI Users</p>
              <p className="text-3xl font-bold text-violet-400">{stats.totalAIUsers.toLocaleString()}</p>
            </div>
            <div className="p-2.5 bg-primary/20 rounded-xl">
              <GraduationCap className="h-5 w-5 text-violet-400" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Users with AI preferences</p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-6 hover:border-amber-500/40 transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Active Models</p>
              <p className="text-3xl font-bold text-amber-400">3</p>
            </div>
            <div className="p-2.5 bg-amber-500/20 rounded-xl">
              <Cpu className="h-5 w-5 text-amber-400" />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-2">Trained ML models</p>
        </div>
      </div>

      {/* AI Pipeline Visualization */}
      <Card className="overflow-hidden border-slate-700/50 bg-slate-900/50 backdrop-blur-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-400" />
            AI Training Pipeline
          </CardTitle>
          <CardDescription>How data flows through the AI system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-center gap-4 py-6">
            {/* Step 1: Data Collection */}
            <div className="flex flex-col items-center p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 min-w-[140px]">
              <div className="p-3 bg-blue-500/20 rounded-full mb-2">
                <Database className="h-6 w-6 text-blue-400" />
              </div>
              <p className="font-semibold text-white text-sm">Data Collection</p>
              <p className="text-xs text-slate-400 text-center mt-1">study_sessions<br/>quiz_submissions</p>
            </div>

            <ChevronRight className="h-6 w-6 text-slate-600 hidden sm:block" />

            {/* Step 2: Feature Engineering */}
            <div className="flex flex-col items-center p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 min-w-[140px]">
              <div className="p-3 bg-primary/20 rounded-full mb-2">
                <BarChart3 className="h-6 w-6 text-purple-400" />
              </div>
              <p className="font-semibold text-white text-sm">Feature Engineering</p>
              <p className="text-xs text-slate-400 text-center mt-1">Normalize & Extract<br/>Patterns</p>
            </div>

            <ChevronRight className="h-6 w-6 text-slate-600 hidden sm:block" />

            {/* Step 3: Model Training */}
            <div className="flex flex-col items-center p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 min-w-[140px]">
              <div className="p-3 bg-emerald-500/20 rounded-full mb-2">
                <Brain className="h-6 w-6 text-emerald-400" />
              </div>
              <p className="font-semibold text-white text-sm">Neural Network</p>
              <p className="text-xs text-slate-400 text-center mt-1">TensorFlow.js<br/>30 epochs</p>
            </div>

            <ChevronRight className="h-6 w-6 text-slate-600 hidden sm:block" />

            {/* Step 4: Prediction */}
            <div className="flex flex-col items-center p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 min-w-[140px]">
              <div className="p-3 bg-amber-500/20 rounded-full mb-2">
                <Target className="h-6 w-6 text-amber-400" />
              </div>
              <p className="font-semibold text-white text-sm">Prediction</p>
              <p className="text-xs text-slate-400 text-center mt-1">Best method<br/>& time</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-700/50 bg-slate-900/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" />
              Service Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { 
                name: 'Groq API (LLM)', 
                desc: 'Text generation for AI Companion',
                status: config.groqConfigured,
                icon: MessageSquare,
                color: 'violet'
              },
              { 
                name: 'AI Companion Edge Function', 
                desc: 'Serverless AI chat endpoint',
                status: config.edgeFunctionDeployed,
                icon: Sparkles,
                color: 'cyan'
              },
              { 
                name: 'Training Edge Function', 
                desc: 'Model training endpoint',
                status: config.trainingFunctionDeployed,
                icon: Cpu,
                color: 'emerald'
              },
              { 
                name: 'TensorFlow.js', 
                desc: 'Client-side ML runtime',
                status: true,
                icon: Brain,
                color: 'blue'
              },
            ].map((service) => (
              <div 
                key={service.name}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  service.status 
                    ? 'bg-slate-800/30 border-slate-700/50' 
                    : 'bg-red-950/20 border-red-500/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${service.color}-500/20`}>
                    <service.icon className={`h-5 w-5 text-${service.color}-400`} />
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">{service.name}</p>
                    <p className="text-xs text-slate-500">{service.desc}</p>
                  </div>
                </div>
                <Badge 
                  className={service.status 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                  }
                >
                  {service.status ? '● Active' : '○ Inactive'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-slate-700/50 bg-slate-900/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-400" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleTrainAllModels}
              disabled={
                trainingStatus.scheduling?.training ||
                trainingStatus.recommendation?.training ||
                trainingStatus.performance?.training
              }
              className="w-full h-14 text-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 border-0"
            >
              <Brain className="h-5 w-5 mr-2" />
              Train All Models
            </Button>

            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-cyan-400" />
                Training Data Requirements
              </h4>
              <ul className="text-sm text-slate-400 space-y-2">
                <li className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${stats.studySessions >= 50 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  Minimum 50 study sessions
                  <span className="ml-auto font-mono text-xs">{stats.studySessions}/50</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-slate-500" />
                  Active user data from FocusTimer
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-slate-500" />
                  Quiz completion records
                </li>
              </ul>
            </div>

            <div className="p-4 bg-gradient-to-r from-blue-950/50 to-indigo-950/50 rounded-xl border border-blue-500/20">
              <h4 className="font-semibold text-blue-300 mb-2">📌 How Training Works</h4>
              <p className="text-sm text-blue-200/70">
                Models are trained using TensorFlow.js neural networks on user study session data. 
                The scheduling model learns to predict the best study method (Pomodoro, Flowtime, etc.) 
                based on time of day and historical success rates.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Model Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scheduling Model */}
        <Card className="overflow-hidden border-violet-500/30 bg-gradient-to-b from-violet-950/50 to-slate-900/50 backdrop-blur-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-primary/20 rounded-xl">
                <Calendar className="h-6 w-6 text-violet-400" />
              </div>
              {trainingStatus.scheduling?.training && (
                <RefreshCw className="h-5 w-5 animate-spin text-violet-400" />
              )}
            </div>
            <CardTitle className="text-lg text-white mt-3">Adaptive Scheduling</CardTitle>
            <CardDescription className="text-slate-400">
              Predicts optimal study time & method based on user behavior patterns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {trainingStatus.scheduling?.training && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Training Progress</span>
                  <span className="text-violet-400">{trainingStatus.scheduling.progress || 0}%</span>
                </div>
                <Progress value={trainingStatus.scheduling.progress || 0} className="h-2 bg-slate-800" />
              </div>
            )}
            
            {(trainingStatus.scheduling?.metrics || getMetricForModel('scheduling')) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-xs text-slate-500">Accuracy</p>
                  <p className="text-xl font-bold text-violet-400">
                    {((trainingStatus.scheduling?.metrics?.accuracy || getMetricForModel('scheduling')?.accuracy || 0) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-xs text-slate-500">Samples</p>
                  <p className="text-xl font-bold text-white">
                    {trainingStatus.scheduling?.metrics?.trainingSamples || getMetricForModel('scheduling')?.trainingSamples || 0}
                  </p>
                </div>
              </div>
            )}

            <Button 
              onClick={() => handleRetrainModel('scheduling')}
              disabled={trainingStatus.scheduling?.training}
              className="w-full bg-primary hover:bg-primary/90 border-0"
            >
              {trainingStatus.scheduling?.training ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Training...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Train Model
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recommendation Model */}
        <Card className="overflow-hidden border-cyan-500/30 bg-gradient-to-b from-cyan-950/50 to-slate-900/50 backdrop-blur-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-cyan-500/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-cyan-400" />
              </div>
              {trainingStatus.recommendation?.training && (
                <RefreshCw className="h-5 w-5 animate-spin text-cyan-400" />
              )}
            </div>
            <CardTitle className="text-lg text-white mt-3">Course Recommendation</CardTitle>
            <CardDescription className="text-slate-400">
              Recommends courses based on learning patterns and goals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {trainingStatus.recommendation?.training && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Training Progress</span>
                  <span className="text-cyan-400">{trainingStatus.recommendation.progress || 0}%</span>
                </div>
                <Progress value={trainingStatus.recommendation.progress || 0} className="h-2 bg-slate-800" />
              </div>
            )}
            
            {(trainingStatus.recommendation?.metrics || getMetricForModel('recommendation')) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-xs text-slate-500">Accuracy</p>
                  <p className="text-xl font-bold text-cyan-400">
                    {((trainingStatus.recommendation?.metrics?.accuracy || getMetricForModel('recommendation')?.accuracy || 0) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-xs text-slate-500">Samples</p>
                  <p className="text-xl font-bold text-white">
                    {trainingStatus.recommendation?.metrics?.trainingSamples || getMetricForModel('recommendation')?.trainingSamples || 0}
                  </p>
                </div>
              </div>
            )}

            <Button 
              onClick={() => handleRetrainModel('recommendation')}
              disabled={trainingStatus.recommendation?.training}
              className="w-full bg-cyan-500 hover:bg-cyan-600 border-0"
            >
              {trainingStatus.recommendation?.training ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Training...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Train Model
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Performance Model */}
        <Card className="overflow-hidden border-emerald-500/30 bg-gradient-to-b from-emerald-950/50 to-slate-900/50 backdrop-blur-xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                <Target className="h-6 w-6 text-emerald-400" />
              </div>
              {trainingStatus.performance?.training && (
                <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
              )}
            </div>
            <CardTitle className="text-lg text-white mt-3">Performance Prediction</CardTitle>
            <CardDescription className="text-slate-400">
              Predicts learning outcomes based on study behavior patterns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {trainingStatus.performance?.training && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Training Progress</span>
                  <span className="text-emerald-400">{trainingStatus.performance.progress || 0}%</span>
                </div>
                <Progress value={trainingStatus.performance.progress || 0} className="h-2 bg-slate-800" />
              </div>
            )}
            
            {(trainingStatus.performance?.metrics || getMetricForModel('performance')) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-xs text-slate-500">F1 Score</p>
                  <p className="text-xl font-bold text-emerald-400">
                    {((trainingStatus.performance?.metrics?.f1Score || getMetricForModel('performance')?.f1Score || 0) * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-lg">
                  <p className="text-xs text-slate-500">Samples</p>
                  <p className="text-xl font-bold text-white">
                    {trainingStatus.performance?.metrics?.trainingSamples || getMetricForModel('performance')?.trainingSamples || 0}
                  </p>
                </div>
              </div>
            )}

            <Button 
              onClick={() => handleRetrainModel('performance')}
              disabled={trainingStatus.performance?.training}
              className="w-full bg-emerald-600 hover:bg-emerald-700 border-0"
            >
              {trainingStatus.performance?.training ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Training...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Train Model
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Architecture Info */}
      <Card className="border-slate-700/50 bg-slate-900/50 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Cpu className="h-5 w-5 text-blue-400" />
            AI Architecture Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-gradient-to-br from-violet-950/50 to-purple-950/30 rounded-xl border border-violet-500/20">
              <MessageSquare className="h-8 w-8 text-violet-400 mb-3" />
              <h4 className="font-semibold text-white mb-2">Groq LLM</h4>
              <p className="text-sm text-slate-400">
                llama-3.3-70b model for natural language generation. Used for AI Companion greetings, 
                encouragement, and explanations.
              </p>
              <p className="text-xs text-violet-400/70 mt-2">Not trainable - Pre-trained model</p>
            </div>

            <div className="p-5 bg-gradient-to-br from-blue-950/50 to-cyan-950/30 rounded-xl border border-blue-500/20">
              <Brain className="h-8 w-8 text-blue-400 mb-3" />
              <h4 className="font-semibold text-white mb-2">TensorFlow.js</h4>
              <p className="text-sm text-slate-400">
                Client-side neural network. Trains on study_sessions data to predict 
                optimal study methods and times.
              </p>
              <p className="text-xs text-blue-400/70 mt-2">Trainable - Runs in browser</p>
            </div>

            <div className="p-5 bg-gradient-to-br from-emerald-950/50 to-teal-950/30 rounded-xl border border-emerald-500/20">
              <Zap className="h-8 w-8 text-emerald-400 mb-3" />
              <h4 className="font-semibold text-white mb-2">Edge Functions</h4>
              <p className="text-sm text-slate-400">
                Supabase Deno functions. Handle AI companion requests and server-side 
                model training tasks.
              </p>
              <p className="text-xs text-emerald-400/70 mt-2">Serverless - Auto-scaling</p>
            </div>

            <div className="p-5 bg-gradient-to-br from-amber-950/50 to-orange-950/30 rounded-xl border border-amber-500/20">
              <Database className="h-8 w-8 text-amber-400 mb-3" />
              <h4 className="font-semibold text-white mb-2">Training Data</h4>
              <p className="text-sm text-slate-400">
                Data from study_sessions, quiz_submissions, and user_progress tables. 
                More data = better predictions.
              </p>
              <p className="text-xs text-amber-400/70 mt-2">Current: {stats.studySessions} sessions</p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
