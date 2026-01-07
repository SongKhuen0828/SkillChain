/**
 * AI Training Service
 * 
 * Handles training of various AI models using Supabase Edge Functions
 */

import { supabase } from '@/lib/supabase';

export type ModelType = 'scheduling' | 'recommendation' | 'performance';

export interface TrainingMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingSamples: number;
  trainedAt: string;
}

export interface TrainingResult {
  success: boolean;
  metrics?: TrainingMetrics;
  error?: string;
  message?: string;
}

/**
 * Train a specific AI model
 * 
 * @param modelType Type of model to train
 * @param userId Optional: train for specific user (personalized model)
 * @returns Training result with metrics
 */
export async function trainModel(
  modelType: ModelType,
  userId?: string
): Promise<TrainingResult> {
  try {
    console.log(`🚀 Starting training for ${modelType}...`);
    
    const { data, error } = await supabase.functions.invoke('train-ai-models', {
      body: { modelType, userId },
    });

    console.log(`📦 Training response for ${modelType}:`, { data, error });

    if (error) {
      console.error(`❌ Training error for ${modelType}:`, error);
      return {
        success: false,
        error: error.message || 'Training failed',
      };
    }

    if (data?.metrics) {
      console.log(`✅ Training success for ${modelType}:`, {
        accuracy: data.metrics.accuracy,
        trainingSamples: data.metrics.trainingSamples,
      });
    }

    return {
      success: data.success,
      metrics: data.metrics,
      error: data.error,
      message: data.message,
    };
  } catch (error: any) {
    console.error(`❌ Training exception for ${modelType}:`, error);
    return {
      success: false,
      error: error.message || 'Training failed',
    };
  }
}

/**
 * Train all AI models
 */
export async function trainAllModels(userId?: string): Promise<{
  scheduling: TrainingResult;
  recommendation: TrainingResult;
  performance: TrainingResult;
}> {
  const [scheduling, recommendation, performance] = await Promise.all([
    trainModel('scheduling', userId),
    trainModel('recommendation', userId),
    trainModel('performance', userId),
  ]);

  return {
    scheduling,
    recommendation,
    performance,
  };
}

/**
 * Get model metrics from database
 */
export async function getModelMetrics(modelType?: ModelType): Promise<Array<TrainingMetrics & { model_type: string }>> {
  try {
    let query = supabase
      .from('ai_model_metrics')
      .select('model_type, metrics, training_samples, trained_at')
      .order('trained_at', { ascending: false });

    if (modelType) {
      query = query.eq('model_type', modelType);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map((row: any) => ({
      model_type: row.model_type,
      ...row.metrics,
      trainingSamples: row.training_samples,
      trainedAt: row.trained_at,
    }));
  } catch (error: any) {
    console.error('Error fetching model metrics:', error);
    return [];
  }
}

/**
 * Check if training data is sufficient for a model
 */
export async function checkTrainingDataAvailability(
  _modelType: ModelType,
  userId?: string
): Promise<{ sufficient: boolean; count: number; required: number }> {
  try {
    let query = supabase
      .from('study_sessions')
      .select('*', { count: 'exact', head: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { count, error } = await query;
    if (error) throw error;

    const required = 50; // Minimum samples needed
    return {
      sufficient: (count || 0) >= required,
      count: count || 0,
      required,
    };
  } catch (error: any) {
    console.error('Error checking training data:', error);
    return { sufficient: false, count: 0, required: 50 };
  }
}

