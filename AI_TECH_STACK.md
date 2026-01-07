# SkillChain AI 技术栈

## 概述

SkillChain 使用了多种 AI/ML 技术来实现个性化学习推荐、智能调度和性能预测。

---

## 🐍 后端 AI 引擎 (Python)

### 编程语言
- **Python 3.x**

### 机器学习框架和库

#### 1. **scikit-learn** (主要 ML 框架)
- **版本**: 1.4.0
- **用途**: 
  - 训练和部署机器学习模型
  - 特征工程和数据预处理
  - 模型评估和验证

#### 2. **NumPy**
- **版本**: 1.26.3
- **用途**: 
  - 数值计算和数组操作
  - 特征矩阵构建
  - 数学运算

#### 3. **Pandas**
- **版本**: 2.1.4
- **用途**: 
  - 数据处理和分析
  - 数据清洗和转换
  - 时间序列处理

#### 4. **Joblib**
- **版本**: 1.3.2
- **用途**: 
  - 模型序列化和保存
  - 模型加载和部署
  - 持久化训练好的模型

### AI 模型类型

#### 1. **调度模型 (Scheduling Model)**
- **算法**: `RandomForestClassifier` (随机森林分类器)
- **功能**: 预测最优学习方法和时间
- **特征**:
  - 小时 (0-23)
  - 星期几 (0-6)
  - 历史完成率
  - 平均会话时长
  - 标签切换频率
  - 方法成功率
- **输出**: 推荐的学习方法 (pomodoro, flowtime, blitz, 52_17)

#### 2. **推荐模型 (Recommendation Model)**
- **算法**: 
  - `Cosine Similarity` (余弦相似度)
  - `TfidfVectorizer` (TF-IDF 文本向量化)
- **功能**: 课程推荐系统
- **方法**: 
  - 协同过滤 (Collaborative Filtering)
  - 基于内容的过滤 (Content-based Filtering)
  - 学习风格匹配
- **特征**:
  - 用户完成的课程
  - 测验表现
  - 偏好学习方法
  - 学习目标
  - 课程类别和标签

#### 3. **性能预测模型 (Performance Model)**
- **算法**: `GradientBoostingRegressor` (梯度提升回归器)
- **功能**: 预测学习成果和表现
- **特征**:
  - 平均会话时长
  - 会话完成率
  - 标签切换频率
  - 学习一致性
  - 偏好学习方法
  - 测验尝试模式
- **输出**: 
  - 预测完成率
  - 预测测验分数
  - 风险等级
  - 个性化建议

### 大语言模型 (LLM)

#### **Google Gemini API**
- **模型**: `gemini-2.5-flash`
- **用途**: 
  - 分析用户学习习惯
  - 生成个性化学习建议
  - 自然语言处理学习日志
- **集成位置**: `backend/main.py`

### 后端框架

#### **FastAPI**
- **版本**: 0.109.0
- **用途**: 
  - RESTful API 服务
  - AI 模型推理端点
  - 训练服务接口

---

## 🌐 前端 AI (TypeScript/JavaScript)

### 编程语言
- **TypeScript**
- **JavaScript**

### 机器学习框架

#### **TensorFlow.js**
- **版本**: ^4.22.0
- **用途**: 
  - 客户端机器学习
  - 实时模型推理
  - 自适应调度引擎
- **位置**: `apps/web/src/lib/ai/AdaptiveSchedulingEngine.ts`

### 前端 AI 功能

1. **自适应调度引擎**
   - 使用 TensorFlow.js 在浏览器中运行轻量级模型
   - 实时调整学习计划
   - 客户端推理，减少服务器负载

---

## 📊 数据预处理工具

### 标准化和编码
- **StandardScaler**: 特征标准化
- **LabelEncoder**: 标签编码
- **TfidfVectorizer**: 文本特征提取

### 模型评估指标

#### 分类模型
- `accuracy_score` (准确率)
- `precision_score` (精确率)
- `recall_score` (召回率)
- `f1_score` (F1 分数)

#### 回归模型
- `mean_absolute_error` (平均绝对误差)
- `r2_score` (R² 决定系数)

---

## 🔄 训练流程

### 数据来源
- **Supabase PostgreSQL** 数据库
- 用户学习日志 (`study_logs`)
- 用户进度数据 (`user_progress`)
- 课程和测验数据

### 训练服务
- **位置**: `packages/ai-engine/services/training_service.py`
- **功能**: 
  - 批量训练模型
  - 模型版本管理
  - 性能监控

---

## 📁 项目结构

```
SkillChain/
├── packages/
│   └── ai-engine/              # Python AI 引擎
│       ├── models/             # ML 模型
│       │   ├── scheduling_model.py
│       │   ├── recommendation_model.py
│       │   └── performance_model.py
│       ├── services/           # 训练和数据服务
│       └── requirements.txt    # Python 依赖
├── backend/                    # FastAPI 后端
│   └── main.py                 # Gemini API 集成
└── apps/web/                   # 前端
    └── src/lib/ai/
        └── AdaptiveSchedulingEngine.ts  # TensorFlow.js
```

---

## 🚀 部署和运行

### Python 环境
```bash
cd packages/ai-engine
pip install -r requirements.txt
```

### 前端
```bash
cd apps/web
npm install  # 自动安装 @tensorflow/tfjs
```

---

## 📝 技术选择理由

1. **scikit-learn**: 
   - 成熟稳定，适合传统机器学习任务
   - 易于部署和维护
   - 良好的文档和社区支持

2. **TensorFlow.js**: 
   - 客户端推理，减少延迟
   - 保护用户隐私（数据不离开浏览器）
   - 降低服务器计算成本

3. **Google Gemini**: 
   - 强大的自然语言理解能力
   - 可以分析非结构化学习日志
   - 生成人性化的学习建议

4. **RandomForest & GradientBoosting**: 
   - 对特征工程要求较低
   - 处理混合数据类型
   - 良好的可解释性

---

## 🔮 未来可能的扩展

- **TensorFlow** (已注释，可选): 深度学习模型
- **PyTorch** (已注释，可选): 神经网络训练
- **更多 LLM 集成**: OpenAI GPT, Claude 等

---

## 📚 相关文档

- `CORE_CODE_SNIPPETS.md` - 核心代码片段和解释
- `packages/ai-engine/README.md` - AI 引擎详细文档

