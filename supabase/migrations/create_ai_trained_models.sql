-- ========================================
-- AI Trained Models Table
-- Stores globally trained AI model weights for all users to share
-- ========================================

-- Create the ai_trained_models table
CREATE TABLE IF NOT EXISTS ai_trained_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type TEXT NOT NULL,
  model_version INTEGER NOT NULL DEFAULT 1,
  
  -- Model weights stored as JSON (TensorFlow.js format)
  weights JSONB NOT NULL,
  
  -- Model architecture/config
  architecture JSONB,
  
  -- Training metadata
  training_samples INTEGER NOT NULL DEFAULT 0,
  accuracy FLOAT,
  loss FLOAT,
  
  -- Timestamps
  trained_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trained_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure only one active model per type
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Unique constraint: only one active model per type
  UNIQUE(model_type, is_active) WHERE is_active = TRUE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_trained_models_type ON ai_trained_models(model_type);
CREATE INDEX IF NOT EXISTS idx_ai_trained_models_active ON ai_trained_models(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_ai_trained_models_version ON ai_trained_models(model_type, model_version DESC);

-- Enable RLS
ALTER TABLE ai_trained_models ENABLE ROW LEVEL SECURITY;

-- Everyone can read active models (needed for frontend to load)
CREATE POLICY "Anyone can read active trained models"
  ON ai_trained_models
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- Only admins can insert/update models
CREATE POLICY "Admins can insert trained models"
  ON ai_trained_models
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update trained models"
  ON ai_trained_models
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Comments
COMMENT ON TABLE ai_trained_models IS 'Stores globally trained AI model weights that all users share';
COMMENT ON COLUMN ai_trained_models.model_type IS 'Type of model: scheduling, recommendation, performance';
COMMENT ON COLUMN ai_trained_models.weights IS 'TensorFlow.js model weights in JSON format';
COMMENT ON COLUMN ai_trained_models.architecture IS 'Model architecture configuration';
COMMENT ON COLUMN ai_trained_models.is_active IS 'Whether this is the currently active model for this type';

-- ========================================
-- AI Training Logs Table
-- Tracks all training runs for audit and debugging
-- ========================================

CREATE TABLE IF NOT EXISTS ai_training_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type TEXT NOT NULL,
  
  -- Training details
  training_samples INTEGER NOT NULL,
  epochs INTEGER,
  batch_size INTEGER,
  learning_rate FLOAT,
  
  -- Results
  final_accuracy FLOAT,
  final_loss FLOAT,
  training_duration_ms INTEGER,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed
  error_message TEXT,
  
  -- Metadata
  triggered_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_training_logs_type ON ai_training_logs(model_type);
CREATE INDEX IF NOT EXISTS idx_ai_training_logs_status ON ai_training_logs(status);
CREATE INDEX IF NOT EXISTS idx_ai_training_logs_created ON ai_training_logs(created_at DESC);

-- Enable RLS
ALTER TABLE ai_training_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write training logs
CREATE POLICY "Admins can read training logs"
  ON ai_training_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert training logs"
  ON ai_training_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update training logs"
  ON ai_training_logs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

COMMENT ON TABLE ai_training_logs IS 'Audit log of all AI model training runs';

SELECT 'AI trained models tables created successfully!' as status;

