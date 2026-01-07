# AI 训练功能部署指南

## 1. 数据库迁移

### 方式一：使用 Supabase Dashboard
1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 进入 SQL Editor
4. 复制并执行 `supabase/migrations/create_ai_model_metrics.sql` 的内容

### 方式二：使用 Supabase CLI（如果已安装）
```bash
supabase migration up
```

## 2. 部署 Edge Function

### 方式一：使用 Supabase CLI
```bash
# 确保已登录
supabase login

# 链接项目
supabase link --project-ref YOUR_PROJECT_REF

# 部署函数
supabase functions deploy train-ai-models
```

### 方式二：使用 Supabase Dashboard
1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 进入 Edge Functions 页面
3. 创建新函数或更新现有函数
4. 将 `supabase/functions/train-ai-models/index.ts` 的内容复制到编辑器
5. 点击 Deploy

## 3. 设置环境变量

确保 Edge Function 可以访问数据库：
- Edge Function 会自动使用项目的 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`
- 这些值在 Supabase Dashboard > Settings > API 中可以找到

## 4. 验证部署

1. 在 Admin AI 页面 (`/admin/ai`)
2. 检查 "Training Service" 状态应该是绿色 "Deployed"
3. 点击 "Train Scheduling Model" 测试训练功能

## 5. 测试

运行训练测试：
```typescript
// 在浏览器控制台或 Admin AI 页面
const { TrainingService } = await import('@/lib/ai/TrainingService');
const result = await TrainingService.trainModel('scheduling');
console.log(result);
```

## 故障排除

### Edge Function 未部署
- 检查 Supabase Dashboard 中的 Edge Functions 页面
- 确认函数名称为 `train-ai-models`
- 检查函数日志查看错误信息

### 数据库迁移失败
- 检查 SQL 语法错误
- 确认表 `ai_model_metrics` 是否已存在
- 检查 RLS 策略是否正确

### 训练失败
- 确保 `study_sessions` 表有足够的数据（至少50条）
- 检查 Edge Function 日志
- 确认数据库连接正常
