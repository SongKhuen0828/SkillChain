-- AI Model Metrics Table
-- Stores training metrics for different AI models

CREATE TABLE IF NOT EXISTS ai_model_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type TEXT NOT NULL UNIQUE,
  metrics JSONB NOT NULL,
  training_samples INTEGER NOT NULL,
  trained_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_ai_model_metrics_type ON ai_model_metrics(model_type);
CREATE INDEX IF NOT EXISTS idx_ai_model_metrics_trained_at ON ai_model_metrics(trained_at DESC);

-- RLS Policies
ALTER TABLE ai_model_metrics ENABLE ROW LEVEL SECURITY;

-- Admins can read all metrics
CREATE POLICY "Admins can read all AI model metrics"
  ON ai_model_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Service role can insert/update (for Edge Functions)
-- Note: Service role bypasses RLS by default

COMMENT ON TABLE ai_model_metrics IS 'Stores training metrics and performance data for AI models';
COMMENT ON COLUMN ai_model_metrics.model_type IS 'Type of model: scheduling, recommendation, performance';
COMMENT ON COLUMN ai_model_metrics.metrics IS 'JSON object containing accuracy, precision, recall, f1Score';

