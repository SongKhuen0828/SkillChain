# SkillChain 系统总结

## 📋 系统概述

**SkillChain** 是一个基于区块链和 AI 的个性化技能学习平台，结合了机器学习、区块链技术和现代化 Web 开发，为学习者、教育者和组织提供完整的在线教育解决方案。

---

## 🎯 核心价值主张

1. **AI 驱动的个性化学习** - 智能调度、推荐和性能预测
2. **区块链证书验证** - 不可篡改、可验证的学习证书
3. **组织化管理** - 支持教育机构和企业培训
4. **实时学习分析** - 详细的学习进度和表现追踪

---

## 👥 用户角色

### 1. **学习者 (Learner)**
- 浏览和注册课程
- 完成课程内容和测验
- 获得区块链证书
- 使用 AI 学习调度
- 查看学习分析和进度

### 2. **教育者 (Educator)**
- 创建和管理课程
- 上传课程内容（视频、文档、测验）
- 查看学生学习进度
- 获得教育者认证

### 3. **组织管理员 (Org Admin)**
- 管理组织成员
- 创建组织专属课程
- 邀请学习者和教育者
- 查看组织学习分析
- 批量颁发证书

### 4. **系统管理员 (Admin)**
- 管理所有用户和组织
- 审批组织注册请求
- 创建新组织和管理员账户
- 监控 AI 模型训练
- 管理区块链配置

### 5. **证书验证者 (Verifier)**
- 通过 QR 码或证书 ID 验证证书
- 查看证书元数据
- 验证证书真实性

---

## 🏗️ 技术架构

### 前端 (Frontend)
- **框架**: React 19.2 + TypeScript
- **构建工具**: Vite 7.2
- **UI 库**: 
  - Radix UI (组件库)
  - Tailwind CSS (样式)
  - Framer Motion (动画)
- **状态管理**: React Context API
- **路由**: React Router v6
- **AI 推理**: TensorFlow.js 4.22 (客户端 ML)
- **区块链**: Ethers.js 6.16 + Thirdweb SDK 5.116

### 后端 (Backend)

#### Supabase (BaaS)
- **数据库**: PostgreSQL (通过 Supabase)
- **认证**: Supabase Auth
- **存储**: Supabase Storage
- **Edge Functions**: Deno (TypeScript)

#### AI 引擎 (Python)
- **框架**: FastAPI 0.109
- **ML 库**: 
  - scikit-learn 1.4.0
  - NumPy 1.26.3
  - Pandas 2.1.4
  - Joblib 1.3.2
- **LLM**: Google Gemini API (gemini-2.5-flash)

#### 区块链
- **网络**: Polygon Mainnet
- **智能合约**: ERC-721 NFT (证书)
- **存储**: IPFS/Pinata (证书元数据)
- **钱包**: Thirdweb SDK

---

## 🧠 AI 功能模块

### 1. **调度模型 (Scheduling Model)**
- **算法**: RandomForestClassifier
- **功能**: 预测最优学习方法和时间
- **输出**: 推荐学习方法 (pomodoro, flowtime, blitz, 52_17)
- **指标**: accuracy, precision, recall, f1_score

### 2. **推荐模型 (Recommendation Model)**
- **算法**: Cosine Similarity + TF-IDF
- **功能**: 课程推荐系统
- **方法**: 协同过滤 + 基于内容的过滤
- **输出**: 个性化课程推荐列表

### 3. **性能预测模型 (Performance Model)**
- **算法**: GradientBoostingRegressor
- **功能**: 预测学习成果和表现
- **输出**: 完成率、测验分数、风险等级、建议

### 4. **LLM 分析 (Gemini)**
- **功能**: 分析学习日志，生成个性化建议
- **输入**: 用户学习历史数据
- **输出**: 自然语言学习建议

---

## 🔗 区块链功能

### 证书 NFT
- **标准**: ERC-721 (Non-Fungible Token)
- **网络**: Polygon Mainnet
- **存储**: 
  - 证书元数据 → IPFS
  - 证书图片 → IPFS
  - 链上记录 → 智能合约
- **验证**: QR 码 + 证书 ID
- **特性**: 
  - 不可篡改
  - 永久存储
  - 公开验证

### 智能合约
- **位置**: `contracts/SkillChainCertificate.sol`
- **功能**: 
  - 铸造证书 NFT
  - 查询证书信息
  - 验证证书所有权

---

## 📊 核心功能模块

### 学习管理
- ✅ 课程浏览和搜索
- ✅ 课程注册
- ✅ 视频/文档学习
- ✅ 交互式测验
- ✅ 学习进度追踪
- ✅ 学习计划生成

### 课程管理
- ✅ 课程创建和编辑
- ✅ 模块和课时管理
- ✅ 内容上传 (视频、文档、链接)
- ✅ 测验创建和自动评分
- ✅ 课程发布和可见性控制

### 组织管理
- ✅ 组织注册和审批
- ✅ 成员邀请和管理
- ✅ 组织专属课程
- ✅ 组织学习分析
- ✅ 批量操作

### 证书系统
- ✅ 自动证书生成
- ✅ 区块链证书铸造
- ✅ 证书预览和下载
- ✅ QR 码验证
- ✅ 公开验证页面

### AI 功能
- ✅ 自适应学习调度
- ✅ 个性化课程推荐
- ✅ 学习表现预测
- ✅ AI 学习伙伴 (AI Companion)
- ✅ 学习习惯分析

### 分析报告
- ✅ 学习者进度报告
- ✅ 教育者课程分析
- ✅ 组织整体统计
- ✅ 系统级分析

---

## 🗄️ 数据库架构

### 核心表
- `profiles` - 用户档案
- `courses` - 课程信息
- `lessons` - 课时
- `quizzes` - 测验
- `enrollments` - 课程注册
- `user_progress` - 学习进度
- `certificates` - 证书记录
- `organizations` - 组织信息
- `org_members` - 组织成员
- `notifications` - 通知

### AI 相关表
- `ai_preferences` - AI 偏好设置
- `ai_model_metrics` - 模型训练指标
- `ai_trained_models` - 训练好的模型
- `ai_training_logs` - 训练日志
- `study_sessions` - 学习会话记录

---

## 🔐 安全特性

- **认证**: Supabase Auth (JWT)
- **授权**: Row Level Security (RLS) 策略
- **数据加密**: 数据库级别加密
- **API 安全**: CORS 配置、服务角色密钥
- **区块链安全**: 智能合约审计、私钥管理

---

## 📦 项目结构

```
SkillChain/
├── apps/
│   └── web/                    # React 前端应用
│       ├── src/
│       │   ├── pages/          # 页面组件
│       │   ├── components/     # UI 组件
│       │   ├── lib/            # 工具库
│       │   │   ├── ai/         # AI 相关
│       │   │   ├── blockchain/ # 区块链相关
│       │   │   └── supabase/   # 数据库客户端
│       │   └── contexts/       # React Context
│       └── package.json
│
├── packages/
│   ├── ai-engine/              # Python AI 服务
│   │   ├── models/            # ML 模型
│   │   ├── services/          # 训练和数据服务
│   │   └── main.py            # FastAPI 入口
│   └── contracts/             # 智能合约
│
├── supabase/
│   ├── functions/              # Edge Functions
│   │   ├── train-ai-models/   # AI 训练
│   │   ├── create-org-admin/  # 组织创建
│   │   ├── grade-quiz/        # 测验评分
│   │   └── ai-companion/      # AI 伙伴
│   └── migrations/            # 数据库迁移
│
├── contracts/                 # Solidity 智能合约
├── scripts/                   # 工具脚本
└── backend/                   # Gemini API 集成
```

---

## 🚀 部署架构

### 前端
- **平台**: Vercel
- **构建**: Vite
- **CDN**: Vercel Edge Network
- **环境变量**: Vercel Dashboard

### 后端
- **数据库**: Supabase PostgreSQL
- **API**: Supabase Edge Functions (Deno)
- **存储**: Supabase Storage
- **AI 服务**: Python FastAPI (可部署到 Railway/Render)

### 区块链
- **网络**: Polygon Mainnet
- **合约地址**: 环境变量配置
- **IPFS**: Pinata

---

## 📈 数据流

### 学习流程
```
用户注册 → 完成课程 → 通过测验 → 
  自动生成证书 → 上传到 IPFS → 
  铸造 NFT → 存储到数据库 → 
  显示在证书页面
```

### AI 训练流程
```
收集学习数据 → 训练模型 → 
  保存模型文件 (.joblib) → 
  保存指标到数据库 → 
  更新模型版本 → 
  前端加载新模型
```

### 证书验证流程
```
扫描 QR 码 → 查询证书 ID → 
  从数据库获取证书信息 → 
  从区块链验证所有权 → 
  从 IPFS 获取元数据 → 
  显示验证结果
```

---

## 🛠️ 开发工具

- **版本控制**: Git + GitHub
- **包管理**: npm (前端), pip (后端)
- **类型检查**: TypeScript
- **代码格式化**: ESLint
- **测试**: (可扩展)

---

## 📚 文档

- `CORE_CODE_SNIPPETS.md` - 核心代码片段和解释
- `AI_TECH_STACK.md` - AI 技术栈详情
- `AI_TRAINING_DATA_FLOW.md` - AI 训练数据流
- `ORGANIZATION_CREATION.md` - 组织创建流程
- `VERCEL_DEPLOY.md` - Vercel 部署指南

---

## 🔮 技术亮点

1. **混合 AI 架构**
   - 服务端训练 (Python/scikit-learn)
   - 客户端推理 (TensorFlow.js)
   - LLM 分析 (Google Gemini)

2. **区块链集成**
   - 真实区块链交易 (Polygon Mainnet)
   - IPFS 去中心化存储
   - 智能合约自动化

3. **现代化前端**
   - React 19 最新特性
   - 响应式设计
   - 流畅动画和交互

4. **可扩展架构**
   - 模块化设计
   - 微服务架构 (Edge Functions)
   - 数据库 RLS 安全策略

---

## 📊 系统规模

- **前端组件**: 100+ React 组件
- **页面**: 30+ 页面
- **API 端点**: 20+ Edge Functions
- **数据库表**: 20+ 表
- **AI 模型**: 3 个核心模型
- **智能合约**: 1 个 ERC-721 合约

---

## 🎨 UI/UX 特性

- **设计系统**: 现代化渐变和玻璃态效果
- **动画**: Framer Motion 流畅过渡
- **响应式**: 移动端和桌面端适配
- **主题**: 深色/浅色模式支持
- **交互**: 粒子效果、3D 背景、动态线条

---

## 🔄 持续改进

- ✅ 已实现: 核心学习功能、AI 调度、区块链证书
- 🚧 进行中: AI 模型优化、性能提升
- 📋 计划中: 移动应用、更多 AI 功能、社交功能

---

## 📞 技术栈总结

| 类别 | 技术 |
|------|------|
| **前端** | React 19, TypeScript, Vite, Tailwind CSS |
| **后端** | Supabase, Deno Edge Functions, Python FastAPI |
| **数据库** | PostgreSQL (Supabase) |
| **AI/ML** | scikit-learn, TensorFlow.js, Google Gemini |
| **区块链** | Polygon, Ethers.js, Thirdweb, IPFS |
| **部署** | Vercel (前端), Supabase (后端) |
| **认证** | Supabase Auth |
| **存储** | Supabase Storage, IPFS |

---

**最后更新**: 2024年
**版本**: 1.0.0
**状态**: 生产就绪 ✅

