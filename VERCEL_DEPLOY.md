# Vercel 部署指南

本指南将帮助你将 SkillChain 前端部署到 Vercel。

## 前置要求

1. **GitHub/GitLab/Bitbucket 账号** - Vercel 需要连接到代码仓库
2. **Vercel 账号** - 注册：https://vercel.com/
3. **Supabase 项目** - 确保 Supabase 项目已创建并配置

## 方法 1: 通过 Vercel Dashboard 部署（推荐）

### 步骤 1: 准备代码仓库

1. **确保代码已推送到 Git 仓库**（GitHub/GitLab/Bitbucket）
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

### 步骤 2: 在 Vercel 创建项目

1. **登录 Vercel**：https://vercel.com/login
2. **点击 "Add New Project"**
3. **导入 Git 仓库**：
   - 选择你的 Git 提供商（GitHub/GitLab/Bitbucket）
   - 选择 `SkillChain` 仓库
   - 点击 "Import"

### 步骤 3: 配置项目设置

Vercel 会自动检测到 `vercel.json` 配置，但你需要确认以下设置：

**Framework Preset:** `Vite`（自动检测）

**Root Directory:** 保持为空（或设置为项目根目录）

**Build Command:** 
```
cd apps/web && npm install && npm run build
```

**Output Directory:** 
```
apps/web/dist
```

**Install Command:**
```
cd apps/web && npm install
```

### 步骤 4: 配置环境变量

在 Vercel 项目设置中添加以下环境变量：

**必需的环境变量：**

```
VITE_SUPABASE_URL=你的_Supabase_项目_URL
VITE_SUPABASE_ANON_KEY=你的_Supabase_匿名_Key
```

**可选的环境变量（如果使用）：**

```
VITE_POLYGON_RPC_URL=Polygon_RPC_URL（如果使用区块链功能）
VITE_PINATA_API_KEY=Pinata_API_Key（如果使用 IPFS）
VITE_PINATA_SECRET_KEY=Pinata_Secret_Key
```

**如何获取 Supabase 环境变量：**

1. 登录 Supabase Dashboard：https://app.supabase.com/
2. 选择你的项目
3. 进入 **Settings** → **API**
4. 复制：
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

### 步骤 5: 部署

1. 点击 **"Deploy"** 按钮
2. 等待构建完成（通常 2-5 分钟）
3. 部署成功后，你会得到一个 Vercel 提供的 URL（如：`skillchain.vercel.app`）

## 方法 2: 使用 Vercel CLI 部署

### 步骤 1: 安装 Vercel CLI

```bash
npm install -g vercel
```

### 步骤 2: 登录 Vercel

```bash
vercel login
```

### 步骤 3: 在项目根目录部署

```bash
cd /Users/jac/SkillChain
vercel
```

### 步骤 4: 配置环境变量

```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

### 步骤 5: 部署到生产环境

```bash
vercel --prod
```

## 部署后配置

### 1. 更新 Supabase 重定向 URL

部署后，需要在 Supabase 中添加 Vercel 的 URL：

1. 进入 Supabase Dashboard → **Authentication** → **URL Configuration**
2. 在 **Site URL** 中添加你的 Vercel URL：`https://your-project.vercel.app`
3. 在 **Redirect URLs** 中添加：
   ```
   https://your-project.vercel.app/**
   https://your-project.vercel.app/callback
   ```

### 2. 测试部署

访问你的 Vercel URL，测试以下功能：
- ✅ 登录/注册
- ✅ 页面加载
- ✅ API 连接（Supabase）
- ✅ 路由导航

### 3. 自定义域名（可选）

如果你有自己的域名：

1. 在 Vercel Dashboard → **Settings** → **Domains**
2. 添加你的域名（如：`skillchain.app`）
3. 按照提示配置 DNS 记录
4. 等待 DNS 传播（通常几分钟到几小时）

## 常见问题

### 问题 1: 构建失败 - "Cannot find module"

**解决方案：**
- 确保 `package.json` 中所有依赖都已安装
- 检查 `vercel.json` 中的构建命令是否正确
- 尝试在本地运行 `cd apps/web && npm install && npm run build` 测试

### 问题 2: 环境变量未生效

**解决方案：**
- 确保环境变量名称以 `VITE_` 开头（Vite 要求）
- 在 Vercel Dashboard 中重新添加环境变量
- 重新部署项目

### 问题 3: 路由 404 错误

**解决方案：**
- 确保 `vercel.json` 中有 `rewrites` 配置
- 所有路由都应该重定向到 `/index.html`

### 问题 4: Supabase 连接失败

**解决方案：**
- 检查环境变量是否正确配置
- 检查 Supabase 项目的 CORS 设置
- 确保 Supabase 项目的 URL 和 Key 正确

### 问题 5: 构建时间过长

**解决方案：**
- 优化依赖大小
- 使用 Vercel 的缓存功能
- 考虑使用 Vercel Pro 计划（更快的构建）

## 持续部署

Vercel 会自动：
- ✅ 监听 Git 推送
- ✅ 自动触发新部署
- ✅ 为每个分支创建预览部署
- ✅ 为每个 Pull Request 创建预览 URL

## 环境变量管理

### 开发环境
在本地 `.env.local` 文件中配置（不要提交到 Git）

### 生产环境
在 Vercel Dashboard → Settings → Environment Variables 中配置

### 预览环境
可以单独配置预览环境的环境变量

## 性能优化建议

1. **启用 Vercel Analytics**（可选）
2. **配置 CDN 缓存**（已在 `vercel.json` 中配置）
3. **优化图片和资源**（使用 WebP 格式）
4. **代码分割**（Vite 自动处理）

## 监控和日志

- **Vercel Dashboard** → **Deployments** → 查看部署日志
- **Vercel Dashboard** → **Analytics** → 查看性能指标
- **Vercel Dashboard** → **Functions** → 查看 Edge Functions 日志（如果使用）

## 下一步

部署成功后：
1. ✅ 测试所有功能
2. ✅ 配置自定义域名（如果需要）
3. ✅ 设置监控和告警
4. ✅ 配置 CI/CD（已自动配置）

## 需要帮助？

- Vercel 文档：https://vercel.com/docs
- Vercel 社区：https://github.com/vercel/vercel/discussions
- Supabase 文档：https://supabase.com/docs

