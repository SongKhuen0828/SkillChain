import * as tf from '@tensorflow/tfjs';
import { supabase } from '@/lib/supabase';

// 映射表：把文字模式转为数字，因为神经网络只吃数字
const METHOD_MAP: Record<string, number> = {
  'pomodoro': 0,
  'flowtime': 1,
  'blitz': 2,
  '52_17': 3
};
const REVERSE_MAP = ['pomodoro', 'flowtime', 'blitz', '52_17'];

// Model version key for cache invalidation
const MODEL_VERSION_KEY = 'adaptive-scheduler-model-version';
const MODEL_CACHE_KEY = 'localstorage://adaptive-scheduler-model';

// Feature flag: Disable global model loading if ai_trained_models table doesn't exist
// Set to true once the migration has been run in Supabase
const ENABLE_GLOBAL_MODEL = false;

export class AdaptiveSchedulingEngine {
  private model: tf.Sequential | null = null;
  private isTraining = false;
  private globalModelVersion: number = 0;
  private isUsingGlobalModel: boolean = false;

  private baselinePreferences: {
    preferred_study_time?: string;
    focus_span?: string;
    struggle?: string;
  } | null = null;

  /**
   * Load baseline preferences from user's onboarding quiz
   */
  async loadBaselinePreferences(userId: string) {
    try {
      const { data: preferences, error } = await supabase
        .from('ai_preferences')
        .select('preferred_study_time, focus_span, struggle')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        // PGRST116 = not found, which is okay
        console.warn("Error loading ai_preferences (using Night Owl baseline):", error);
      }
      
      if (preferences) {
        this.baselinePreferences = preferences;
        console.log("📊 Baseline preferences loaded:", this.baselinePreferences);
      } else {
        // Use Night Owl baseline as default
        this.baselinePreferences = {
          preferred_study_time: 'evening',
          focus_span: '25',
          struggle: 'distractions'
        };
        console.log("📊 Using Night Owl baseline (no preferences found)");
      }
    } catch (error: any) {
      console.warn("Error loading baseline preferences (using Night Owl baseline):", error?.message || error);
      // Use Night Owl baseline as default
      this.baselinePreferences = {
        preferred_study_time: 'evening',
        focus_span: '25',
        struggle: 'distractions'
      };
    }
  }

  /**
   * Apply baseline adjustments to prediction scores
   */
  private applyBaselineAdjustment(method: string, hour: number, baseScore: number): number {
    if (!this.baselinePreferences) return baseScore;

    let adjustment = 0;

    // Adjust based on preferred study time
    // Note: onboarding uses 'routine', 'weekend', 'flexible' - we'll map them
    const studyTime = this.baselinePreferences.preferred_study_time;
    if (studyTime === 'routine' && hour >= 6 && hour <= 11) {
      // Routine learners often prefer morning
      adjustment += 0.2;
    } else if (studyTime === 'weekend' && (hour >= 9 && hour <= 17)) {
      // Weekend warriors prefer daytime hours
      adjustment += 0.2;
    } else if (studyTime === 'flexible') {
      // Flexible learners get a small boost for any hour (let TF.js handle it)
      adjustment += 0.1;
    }

    // Adjust based on focus span preference
    if (this.baselinePreferences.focus_span === 'short' && (method === 'pomodoro' || method === 'blitz')) {
      adjustment += 0.15; // +15% for short focus spans with short methods
    } else if (this.baselinePreferences.focus_span === 'long' && (method === 'flowtime' || method === '52_17')) {
      adjustment += 0.15; // +15% for long focus spans with long methods
    }

    // Adjust based on struggle type
    if (this.baselinePreferences.struggle === 'distraction' && method === 'pomodoro') {
      adjustment += 0.1; // +10% for distraction struggles with Pomodoro
    } else if (this.baselinePreferences.struggle === 'fatigue' && method === '52_17') {
      adjustment += 0.1; // +10% for fatigue struggles with 52/17
    }

    return Math.min(1.0, baseScore + adjustment); // Cap at 1.0
  }

  /**
   * 1. 初始化引擎
   * 优先从数据库加载全局训练好的模型，如果没有则使用本地缓存或创建基线模型
   */
  async init(userId?: string) {
    try {
      // Load baseline preferences if userId provided
      if (userId) {
        await this.loadBaselinePreferences(userId);
      }

      // 🌐 优先尝试加载全局训练好的模型 (Admin 训练的)
      // Only attempt if feature flag is enabled
      if (ENABLE_GLOBAL_MODEL) {
        const globalModelLoaded = await this.loadGlobalModel();
        
        if (globalModelLoaded) {
          console.log("🌐 Adaptive Engine: Using globally trained model (v" + this.globalModelVersion + ")");
          this.isUsingGlobalModel = true;
          return;
        }
      }

      // 📦 如果没有全局模型，尝试加载本地缓存
      try {
        this.model = await tf.loadLayersModel(MODEL_CACHE_KEY) as tf.Sequential;
        console.log("🧠 Adaptive Engine: Loaded local cached model.");
        this.isUsingGlobalModel = false;
      } catch (e) {
        console.log("🆕 Adaptive Engine: No model found. Starting cold-start training...");
        try {
          await this.trainModel();
        } catch (trainingError) {
          console.warn("⚠️ Training failed, using fallback baseline model:", trainingError);
          await this.createBaselineModel();
        }
      }
    } catch (error) {
      console.error("❌ Init error:", error);
      await this.createBaselineModel();
    }
  }

  /**
   * 从数据库加载全局训练好的模型
   * Admin 训练后保存的模型，所有用户共享
   */
  async loadGlobalModel(): Promise<boolean> {
    try {
      // 查询最新的 active scheduling model
      const { data: globalModel, error } = await supabase
        .from('ai_trained_models')
        .select('*')
        .eq('model_type', 'scheduling')
        .eq('is_active', true)
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid 404 when no record exists

      if (error) {
        // If table doesn't exist (PGRST205) or no record found (PGRST116), that's okay - just log and return false
        // PGRST205: Table not found in schema cache
        // PGRST116: No rows returned (for .single())
        const ignorableCodes = ['PGRST205', 'PGRST116', '42P01'];
        if (ignorableCodes.includes(error.code) || 
            error.message?.includes('404') || 
            error.message?.includes('relation') || 
            error.message?.includes('does not exist') ||
            error.message?.includes('schema cache')) {
          console.log("📭 ai_trained_models table not found or no global model exists (this is normal if table hasn't been created yet)");
          return false;
        }
        console.error("❌ Error loading global model:", error);
        return false;
      }

      if (!globalModel) {
        console.log("📭 No global trained model found in database");
        return false;
      }

      // 检查本地缓存的版本是否最新
      const cachedVersion = parseInt(localStorage.getItem(MODEL_VERSION_KEY) || '0');
      
      if (cachedVersion >= globalModel.model_version && this.model) {
        console.log("✅ Local model is up-to-date (v" + cachedVersion + ")");
        this.globalModelVersion = cachedVersion;
        return true;
      }

      // 从数据库加载模型权重
      console.log("⬇️ Loading global model v" + globalModel.model_version + " from database...");
      
      const weights = globalModel.weights;
      const architecture = globalModel.architecture;

      if (!weights || !architecture) {
        console.warn("⚠️ Global model missing weights or architecture");
        return false;
      }

      // 重建模型架构
      const model = tf.sequential();
      
      // 使用保存的架构配置
      if (architecture.layers) {
        for (const layerConfig of architecture.layers) {
          if (layerConfig.type === 'dense') {
            model.add(tf.layers.dense({
              units: layerConfig.units,
              inputShape: layerConfig.inputShape,
              activation: layerConfig.activation as any,
            }));
          }
        }
      } else {
        // 默认架构
        model.add(tf.layers.dense({ units: 8, inputShape: [2], activation: 'relu' }));
        model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
      }

      model.compile({
        optimizer: tf.train.adam(0.01),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });

      // 加载权重
      if (weights.length > 0) {
        const weightTensors = weights.map((w: any) => tf.tensor(w.data, w.shape));
        model.setWeights(weightTensors);
        // 清理临时张量
        weightTensors.forEach((t: tf.Tensor) => t.dispose());
      }

      // 保存到本地缓存
      await model.save(MODEL_CACHE_KEY);
      localStorage.setItem(MODEL_VERSION_KEY, globalModel.model_version.toString());

      this.model = model;
      this.globalModelVersion = globalModel.model_version;
      
      console.log("✅ Global model loaded successfully (v" + globalModel.model_version + 
                  ", accuracy: " + (globalModel.accuracy * 100).toFixed(1) + "%)");
      
      return true;
    } catch (error) {
      console.error("❌ Error loading global model:", error);
      return false;
    }
  }

  /**
   * 检查是否有新的全局模型可用
   */
  async checkForModelUpdate(): Promise<boolean> {
    // Skip if global model feature is disabled
    if (!ENABLE_GLOBAL_MODEL) return false;
    
    try {
      const { data: globalModel, error } = await supabase
        .from('ai_trained_models')
        .select('model_version')
        .eq('model_type', 'scheduling')
        .eq('is_active', true)
        .maybeSingle(); // Use maybeSingle() to avoid 404 when no record exists

      if (error || !globalModel) return false;

      const cachedVersion = parseInt(localStorage.getItem(MODEL_VERSION_KEY) || '0');
      return globalModel.model_version > cachedVersion;
    } catch {
      return false;
    }
  }

  /**
   * Create a baseline model when there's insufficient data
   * Uses baseline preferences to create a simple predictive model
   */
  private async createBaselineModel() {
    try {
      const model = tf.sequential();
      model.add(tf.layers.dense({ units: 4, inputShape: [2], activation: 'relu' }));
      model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
      
      model.compile({
        optimizer: tf.train.adam(0.01),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy']
      });

      // Create simple training data based on baseline preferences
      const inputs: number[][] = [];
      const labels: number[] = [];
      
      // Generate baseline data points (24 hours x 4 methods = 96 data points)
      for (let hour = 0; hour < 24; hour++) {
        for (let method = 0; method < 4; method++) {
          const normalizedHour = hour / 24;
          inputs.push([normalizedHour, method]);
          
          // Base completion rate
          let completionRate = 0.6; // 60% baseline
          
          // Apply baseline adjustments if available
          if (this.baselinePreferences) {
            const methodName = REVERSE_MAP[method];
            completionRate = this.applyBaselineAdjustment(methodName, hour, completionRate);
          }
          
          labels.push(completionRate);
        }
      }

      const xs = tf.tensor2d(inputs);
      const ys = tf.tensor2d(labels, [labels.length, 1]);

      await model.fit(xs, ys, {
        epochs: 10,
        shuffle: true,
        verbose: 0
      });

      await model.save('localstorage://adaptive-scheduler-model');
      this.model = model;
      
      xs.dispose();
      ys.dispose();
      console.log("✅ Adaptive Engine: Baseline model created successfully.");
    } catch (error) {
      console.error("❌ Failed to create baseline model:", error);
      // If even baseline fails, create a minimal model
      const model = tf.sequential();
      model.add(tf.layers.dense({ units: 2, inputShape: [2], activation: 'relu' }));
      model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
      model.compile({ optimizer: tf.train.adam(0.01), loss: 'binaryCrossentropy' });
      this.model = model;
    }
  }

  /**
   * 2. 核心训练逻辑 (The "Adaptive" Part)
   * 从数据库拉取用户行为数据，实时微调模型
   */
  async trainModel() {
    if (this.isTraining) return;
    this.isTraining = true;

    try {
      // A. 获取训练数据 (只取最近 500 条，保证时效性)
      const { data: sessions, error } = await supabase
        .from('study_sessions')
        .select('started_at, method_used, completed')
        .order('started_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error("Error fetching sessions for training:", error);
        this.isTraining = false;
        // Fall back to baseline model
        await this.createBaselineModel();
        return;
      }

      if (!sessions || sessions.length < 10) {
        console.warn("⚠️ Not enough data to train (" + (sessions?.length || 0) + " sessions). Using baseline model.");
        this.isTraining = false;
        // Use baseline model instead
        await this.createBaselineModel();
        return;
      }

    // B. 数据预处理 (Feature Engineering)
    const inputs: number[][] = [];
    const labels: number[] = [];

    sessions.forEach(s => {
      const date = new Date(s.started_at);
      const hour = date.getHours(); 
      const methodCode = METHOD_MAP[s.method_used] ?? 0; 
      
      // 特征 1: 时间 (归一化到 0-1)
      const normalizedHour = hour / 24; 
      // 特征 2: 模式 ID
      
      inputs.push([normalizedHour, methodCode]);
      labels.push(s.completed ? 1 : 0); // 目标: 预测成功率 (1=成功, 0=失败)
    });

    // 转为 Tensor 张量
    const xs = tf.tensor2d(inputs);
    const ys = tf.tensor2d(labels, [labels.length, 1]);

    // C. 构建神经网络 (Neural Network Architecture)
    const model = tf.sequential();
    
    // 输入层: 2个特征 (时间, 模式) -> 隐藏层 8个神经元
    model.add(tf.layers.dense({ units: 8, inputShape: [2], activation: 'relu' }));
    // 输出层: 1个神经元 (概率 0~1)
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

    // 编译模型
    model.compile({
      optimizer: tf.train.adam(0.01), // Adam 优化器
      loss: 'binaryCrossentropy',     // 二分类损失函数
      metrics: ['accuracy']
    });

      // D. 训练 (Training)
      console.log("💪 Adaptive Engine: Training started...");
      await model.fit(xs, ys, {
        epochs: 30, // 训练 30 轮
        shuffle: true
      });

      // E. 保存模型
      await model.save('localstorage://adaptive-scheduler-model');
      this.model = model;
      this.isTraining = false;
      
      // 内存回收
      xs.dispose();
      ys.dispose();
      console.log("✅ Adaptive Engine: Training complete & Model saved.");
    } catch (error) {
      console.error("❌ Training error:", error);
      this.isTraining = false;
      // Fall back to baseline model on error
      await this.createBaselineModel();
    }
  }

  /**
   * 3. 预测最佳策略 (Prediction)
   * 给定当前时间，评估每种模式的成功率，返回最高的那个
   * 如果数据不足（<50 sessions），使用baseline preferences进行加权
   */
  async predictBestMethod(userId?: string): Promise<{ method: string, confidence: number, allScores: any }> {
    try {
      if (!this.model) {
        await this.init(userId);
      }
      
      // If still no model after init, create a baseline one
      if (!this.model) {
        console.warn("⚠️ No model available, creating baseline model...");
        await this.createBaselineModel();
      }
      
      if (!this.model) {
        // Last resort: return default
        return { method: 'pomodoro', confidence: 0.5, allScores: { pomodoro: 0.5, flowtime: 0.5, blitz: 0.5, '52_17': 0.5 } };
      }

      // Check if we have enough data
      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('id')
        .limit(50);
      
      const hasEnoughData = (sessions?.length || 0) >= 50;
    
    // Load baseline if we don't have enough data and userId is provided
    if (!hasEnoughData && userId && !this.baselinePreferences) {
      await this.loadBaselinePreferences(userId);
    }

    const currentHour = new Date().getHours();
    const currentHourNormalized = currentHour / 24;
    
    let bestMethod = 'pomodoro';
    let maxScore = -1;
    const allScores: Record<string, number> = {};

    // 遍历 4 种模式，让 AI 给每一个打分
    for (let i = 0; i < 4; i++) {
      const input = tf.tensor2d([[currentHourNormalized, i]]);
      const prediction = this.model.predict(input) as tf.Tensor;
      let score = (await prediction.data())[0]; // 获取成功率 (0.0 - 1.0)
      
      const methodName = REVERSE_MAP[i];
      
      // Apply baseline adjustments if we don't have enough data
      if (!hasEnoughData && this.baselinePreferences) {
        score = this.applyBaselineAdjustment(methodName, currentHour, score);
      }
      
      allScores[methodName] = score;

      if (score > maxScore) {
        maxScore = score;
        bestMethod = methodName;
      }
      
      input.dispose();
      prediction.dispose();
    }

    return { method: bestMethod, confidence: maxScore, allScores };
    } catch (error) {
      console.error("❌ Prediction error:", error);
      // Return safe defaults on error
      return { 
        method: 'pomodoro', 
        confidence: 0.5, 
        allScores: { pomodoro: 0.5, flowtime: 0.5, blitz: 0.5, '52_17': 0.5 } 
      };
    }
  }
  /**
   * Retrain model with latest data
   * Can be triggered manually or automatically when data threshold is met
   */
  async retrainModel(userId?: string): Promise<{ success: boolean; metrics?: any; error?: string }> {
    try {
      console.log('🔄 Retraining Adaptive Scheduling Model...');
      
      // Load baseline preferences if userId provided
      if (userId) {
        await this.loadBaselinePreferences(userId);
      }

      // Trigger training
      await this.trainModel();
      
      console.log('✅ Model retraining completed');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Model retraining failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get model statistics and performance metrics
   */
  async getModelStats(): Promise<{
    isLoaded: boolean;
    isTraining: boolean;
    trainingDataCount: number;
    isUsingGlobalModel: boolean;
    globalModelVersion: number;
    lastTrained?: string;
  }> {
    try {
      // Count training data
      const { count } = await supabase
        .from('study_sessions')
        .select('*', { count: 'exact', head: true });

      // Get global model info (only if feature is enabled)
      let globalModel = null;
      if (ENABLE_GLOBAL_MODEL) {
        const { data } = await supabase
          .from('ai_trained_models')
          .select('model_version, trained_at, accuracy')
          .eq('model_type', 'scheduling')
          .eq('is_active', true)
          .maybeSingle(); // Use maybeSingle() to avoid 404 when no record exists
        globalModel = data;
      }

      return {
        isLoaded: this.model !== null,
        isTraining: this.isTraining,
        trainingDataCount: count || 0,
        isUsingGlobalModel: this.isUsingGlobalModel,
        globalModelVersion: globalModel?.model_version || 0,
        lastTrained: globalModel?.trained_at,
      };
    } catch (error) {
      console.error('Error getting model stats:', error);
      return {
        isLoaded: this.model !== null,
        isTraining: this.isTraining,
        trainingDataCount: 0,
        isUsingGlobalModel: this.isUsingGlobalModel,
        globalModelVersion: this.globalModelVersion,
      };
    }
  }

  /**
   * Export current model weights (for Admin to save to database)
   */
  async exportModelWeights(): Promise<{
    weights: any[];
    architecture: any;
  } | null> {
    if (!this.model) return null;

    try {
      const weights = this.model.getWeights().map(w => ({
        data: Array.from(w.dataSync()),
        shape: w.shape,
      }));

      const architecture = {
        layers: this.model.layers.map(layer => ({
          type: 'dense',
          units: (layer as any).units,
          inputShape: layer.inputSpec?.[0]?.shape?.slice(1),
          activation: (layer as any).activation?.getClassName?.() || 'linear',
        })),
      };

      return { weights, architecture };
    } catch (error) {
      console.error('Error exporting model weights:', error);
      return null;
    }
  }
}

// 导出单例 (Singleton)
export const schedulingEngine = new AdaptiveSchedulingEngine();
