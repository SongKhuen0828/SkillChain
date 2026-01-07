# 快速部署到 Vercel

## 🚀 5 分钟快速部署

### 步骤 1: 准备代码（如果还没推送到 Git）

```bash
cd /Users/jac/SkillChain
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 步骤 2: 登录 Vercel 并导入项目

1. 访问：https://vercel.com/new
2. 使用 GitHub/GitLab/Bitbucket 登录
3. 选择 `SkillChain` 仓库
4. 点击 **"Import"**

### 步骤 3: 配置环境变量

在部署前，点击 **"Environment Variables"** 添加：

```
VITE_SUPABASE_URL = 你的_Supabase_URL
VITE_SUPABASE_ANON_KEY = 你的_Supabase_匿名_Key
```

**如何获取：**
- Supabase Dashboard → Settings → API
- 复制 Project URL 和 anon public key

### 步骤 4: 确认构建设置

Vercel 会自动检测配置，确认以下设置：

- **Framework:** Vite ✅
- **Root Directory:** (留空)
- **Build Command:** `cd apps/web && npm install && npm run build`
- **Output Directory:** `apps/web/dist`

### 步骤 5: 点击 "Deploy"

等待 2-5 分钟，部署完成后你会得到：
- 🌐 生产 URL：`https://your-project.vercel.app`
- 📊 部署日志和状态

### 步骤 6: 配置 Supabase 重定向

部署后，在 Supabase Dashboard：

1. **Authentication** → **URL Configuration**
2. 添加 **Site URL**: `https://your-project.vercel.app`
3. 添加 **Redirect URLs**: 
   ```
   https://your-project.vercel.app/**
   https://your-project.vercel.app/callback
   ```

## ✅ 完成！

现在你的应用已经部署到 Vercel 了！

- 🔗 **访问你的应用**: `https://your-project.vercel.app`
- 🔄 **自动部署**: 每次推送到 main 分支都会自动部署
- 🌿 **预览部署**: 每个 Pull Request 都会创建预览 URL

## 📝 后续步骤

1. **测试功能** - 确保登录、注册、课程等功能正常
2. **自定义域名**（可选）- 在 Vercel Settings → Domains 添加
3. **监控** - 在 Vercel Dashboard 查看 Analytics

## 🆘 遇到问题？

查看 `VERCEL_DEPLOY.md` 获取详细故障排除指南。

