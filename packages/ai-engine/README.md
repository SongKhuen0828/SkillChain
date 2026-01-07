# SkillChain AI Training Service

Python FastAPI 服务，使用 scikit-learn 进行真正的机器学习训练。

## 🚀 快速开始

### 1. 安装依赖

```bash
cd packages/ai-engine
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. 配置环境变量

创建 `.env` 文件:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. 启动服务

```bash
python main.py
# 或
uvicorn main:app --reload --port 8000
```

服务将在 http://localhost:8000 运行

## 📡 API 端点

### 训练模型

```bash
# 训练单个模型
POST /train
{
  "model_type": "scheduling",  # scheduling | recommendation | performance
  "user_id": null,  # 可选: 针对特定用户训练
  "force_retrain": false
}

# 训练所有模型
POST /train/all
```

### 预测

```bash
# 预测最佳学习时间和方法
POST /predict/schedule
{
  "user_id": "user-uuid",
  "hour": 14,  # 可选
  "day_of_week": 1  # 可选 (0=周一)
}

# 课程推荐
POST /predict/courses
{
  "user_id": "user-uuid",
  "limit": 5
}

# 性能预测
POST /predict/performance
{
  "user_id": "user-uuid",
  "course_id": "course-uuid"
}
```

### 状态和分析

```bash
# 模型状态
GET /models/status

# 训练数据统计
GET /analytics/training-data

# 用户行为分析
GET /analytics/user/{user_id}/behavior
```

## 🧠 模型说明

### Scheduling Model (学习调度)
- **算法**: Random Forest Classifier
- **输入**: 时间、学习方法、历史完成率
- **输出**: 推荐的学习方法、最佳时间段

### Recommendation Model (课程推荐)
- **算法**: 混合推荐 (协同过滤 + 内容)
- **输入**: 用户学习历史、课程特征
- **输出**: 推荐课程列表及原因

### Performance Model (性能预测)
- **算法**: Gradient Boosting Regressor
- **输入**: 学习行为特征
- **输出**: 预测完成率、测验分数、风险等级

## 📊 训练数据

从以下 Supabase 表获取:
- `study_sessions` - 学习会话记录
- `quiz_submissions` - 测验提交记录
- `user_progress` - 学习进度
- `ai_preferences` - 用户偏好
- `pause_reasons` - 暂停原因 (新)

## 🔧 与前端集成

在前端 AdminAI 页面调用:

```typescript
// 调用 Python AI 服务训练
const response = await fetch('http://localhost:8000/train', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ model_type: 'scheduling' })
});

const result = await response.json();
console.log(result.metrics); // { accuracy: 0.85, precision: 0.82, ... }
```

## 📁 项目结构

```
packages/ai-engine/
├── main.py                 # FastAPI 应用入口
├── requirements.txt        # Python 依赖
├── models/
│   ├── __init__.py
│   ├── scheduling_model.py   # 调度模型
│   ├── recommendation_model.py  # 推荐模型
│   └── performance_model.py  # 性能模型
├── services/
│   ├── __init__.py
│   ├── data_service.py      # 数据获取服务
│   └── training_service.py  # 训练编排服务
└── saved_models/           # 训练好的模型存储
```

## 🧪 测试

```bash
# 健康检查
curl http://localhost:8000/health

# 训练调度模型
curl -X POST http://localhost:8000/train \
  -H "Content-Type: application/json" \
  -d '{"model_type": "scheduling"}'
```
