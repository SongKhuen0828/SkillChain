# AI 训练数据流和存储

## 📊 训练后返回的数据结构

### 1. 训练 API 返回数据 (`TrainResponse`)

当调用 `/train` 端点后，返回的数据结构：

```json
{
  "success": true,
  "model_type": "scheduling" | "recommendation" | "performance",
  "metrics": {
    // 根据模型类型不同，metrics 内容不同（见下方）
  },
  "training_samples": 1250,
  "trained_at": "2024-01-15T10:30:00.000Z",
  "message": "Model trained successfully"
}
```

---

## 📈 各模型的 Metrics 详细内容

### 1. **调度模型 (Scheduling Model)**

**返回的 Metrics:**
```json
{
  "accuracy": 0.85,
  "precision": 0.82,
  "recall": 0.88,
  "f1_score": 0.85,
  "training_samples": 1250,
  "test_samples": 250
}
```

**说明:**
- `accuracy`: 整体准确率 (0-1)
- `precision`: 精确率 (预测为正例中真正为正例的比例)
- `recall`: 召回率 (真正例中被正确预测的比例)
- `f1_score`: F1 分数 (精确率和召回率的调和平均)
- `training_samples`: 训练样本数
- `test_samples`: 测试样本数

**代码位置:** `packages/ai-engine/models/scheduling_model.py` (train 方法)

---

### 2. **推荐模型 (Recommendation Model)**

**返回的 Metrics:**
```json
{
  "accuracy": 0.78,
  "precision": 0.75,
  "recall": 0.80,
  "f1_score": 0.77,
  "user_profiles_count": 150,
  "course_profiles_count": 45,
  "training_samples": 850
}
```

**说明:**
- `accuracy`: 推荐准确率
- `precision`: 推荐精确率
- `recall`: 推荐召回率
- `f1_score`: F1 分数
- `user_profiles_count`: 用户画像数量
- `course_profiles_count`: 课程画像数量
- `training_samples`: 训练样本数

**代码位置:** `packages/ai-engine/models/recommendation_model.py` (train 方法)

---

### 3. **性能预测模型 (Performance Model)**

**返回的 Metrics:**
```json
{
  "completion_mae": 0.12,
  "completion_r2": 0.85,
  "score_mae": 8.5,
  "score_r2": 0.78,
  "training_samples": 1100,
  "test_samples": 220
}
```

**说明:**
- `completion_mae`: 完成率预测的平均绝对误差 (0-1)
- `completion_r2`: 完成率预测的 R² 决定系数 (越接近1越好)
- `score_mae`: 测验分数预测的平均绝对误差 (0-100)
- `score_r2`: 测验分数预测的 R² 决定系数
- `training_samples`: 训练样本数
- `test_samples`: 测试样本数

**代码位置:** `packages/ai-engine/models/performance_model.py` (train 方法)

---

## 💾 数据存储位置

### 1. **数据库表存储**

#### **`ai_model_metrics` 表**

存储每次训练的指标数据：

```sql
CREATE TABLE ai_model_metrics (
  model_type TEXT PRIMARY KEY,  -- 'scheduling' | 'recommendation' | 'performance'
  metrics JSONB,                -- 训练指标 (见上方各模型的 metrics)
  training_samples INTEGER,     -- 训练样本数
  trained_at TIMESTAMPTZ,       -- 训练时间
  updated_at TIMESTAMPTZ        -- 更新时间
);
```

**存储的数据示例:**
```json
{
  "model_type": "scheduling",
  "metrics": {
    "accuracy": 0.85,
    "precision": 0.82,
    "recall": 0.88,
    "f1_score": 0.85
  },
  "training_samples": 1250,
  "trained_at": "2024-01-15T10:30:00.000Z",
  "updated_at": "2024-01-15T10:30:00.000Z"
}
```

**存储代码位置:**
- `packages/ai-engine/services/data_service.py` → `save_model_metrics()` 方法
- `packages/ai-engine/main.py` → 训练后通过 `background_tasks` 异步保存

---

#### **`ai_trained_models` 表** (可选，用于存储模型权重)

如果启用，可以存储模型权重和版本信息：

```sql
CREATE TABLE ai_trained_models (
  id UUID PRIMARY KEY,
  model_type TEXT NOT NULL,
  model_version INTEGER,
  weights JSONB,              -- 模型权重 (序列化)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**注意:** 当前实现主要使用文件系统存储模型，数据库表用于元数据。

---

#### **`ai_training_logs` 表** (训练日志)

存储训练过程的详细日志：

```sql
CREATE TABLE ai_training_logs (
  id UUID PRIMARY KEY,
  model_type TEXT NOT NULL,
  status TEXT,               -- 'pending' | 'training' | 'completed' | 'failed'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  metrics JSONB,
  training_samples INTEGER
);
```

**存储代码位置:**
- `supabase/functions/train-ai-models/index.ts` → Edge Function

---

### 2. **文件系统存储**

#### **模型文件位置**

训练好的模型保存在本地文件系统：

```
packages/ai-engine/
└── saved_models/
    ├── scheduling_model.joblib          # 调度模型
    ├── scheduling_scaler.joblib         # 特征标准化器
    ├── scheduling_encoder.joblib        # 标签编码器
    ├── recommendation_model.joblib      # 推荐模型
    ├── performance_model.joblib        # 性能预测模型
    └── performance_scaler.joblib        # 性能模型标准化器
```

**保存代码位置:**
- `packages/ai-engine/models/scheduling_model.py` → `save()` 方法
- `packages/ai-engine/models/recommendation_model.py` → `save()` 方法
- `packages/ai-engine/models/performance_model.py` → `save()` 方法

**文件格式:** Joblib (Python 序列化格式，用于保存 scikit-learn 模型)

---

## 🔄 完整数据流

### 训练流程

```
1. 调用训练 API
   POST /train
   ↓
2. 获取训练数据
   DataService.fetch_training_data()
   ↓
3. 训练模型
   Model.train(data)
   ↓
4. 返回 Metrics
   {
     model_type: "scheduling",
     metrics: { accuracy: 0.85, ... },
     trained_at: "2024-01-15T10:30:00Z",
     samples: 1250
   }
   ↓
5. 保存模型到文件系统
   Model.save() → saved_models/*.joblib
   ↓
6. 异步保存 Metrics 到数据库
   DataService.save_model_metrics()
   → ai_model_metrics 表
   ↓
7. 更新训练日志
   ai_training_logs 表
```

---

## 📍 代码位置总结

### 训练返回数据
- **API 响应定义:** `packages/ai-engine/main.py` → `TrainResponse` (第55-61行)
- **训练服务:** `packages/ai-engine/services/training_service.py` → `train()` 方法 (第28-58行)
- **各模型 Metrics:** 
  - Scheduling: `packages/ai-engine/models/scheduling_model.py` → `train()` 方法
  - Recommendation: `packages/ai-engine/models/recommendation_model.py` → `train()` 方法
  - Performance: `packages/ai-engine/models/performance_model.py` → `train()` 方法

### 数据库存储
- **保存 Metrics:** `packages/ai-engine/services/data_service.py` → `save_model_metrics()` (第205-228行)
- **获取 Metrics:** `packages/ai-engine/services/data_service.py` → `get_model_metrics()` (第230-243行)
- **Edge Function:** `supabase/functions/train-ai-models/index.ts` → 训练日志和模型元数据

### 文件系统存储
- **模型保存:** 各模型的 `save()` 方法
- **模型加载:** 各模型的 `load()` 方法

---

## 🔍 如何查看训练结果

### 1. 通过 API 查看

```bash
# 获取所有模型的 Metrics
GET /models/status

# 获取特定模型的 Metrics
GET /models/{model_type}/metrics
```

### 2. 通过数据库查询

```sql
-- 查看所有模型的 Metrics
SELECT * FROM ai_model_metrics ORDER BY updated_at DESC;

-- 查看特定模型的 Metrics
SELECT * FROM ai_model_metrics WHERE model_type = 'scheduling';

-- 查看训练日志
SELECT * FROM ai_training_logs ORDER BY started_at DESC;
```

### 3. 查看文件系统

```bash
cd packages/ai-engine/saved_models
ls -lh *.joblib
```

---

## 📝 注意事项

1. **Metrics 存储时机:** Metrics 通过 `background_tasks` 异步保存，可能略有延迟
2. **模型文件:** 模型文件保存在服务器本地，需要定期备份
3. **数据库表:** 确保 `ai_model_metrics` 表已创建（通过 Supabase Migration）
4. **版本控制:** 当前实现会覆盖旧模型，如需版本管理，需要扩展 `ai_trained_models` 表

