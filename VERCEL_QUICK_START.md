# 🚀 Vercel 快速部署指南

## ✅ 当前状态
- ✅ 代码已推送到 GitHub: https://github.com/SongKhuen0828/SkillChain
- ✅ Vercel 配置文件已准备好
- ⏳ 等待在 Vercel 中导入项目

## 📋 部署步骤（5 分钟）

### 步骤 1: 导入项目到 Vercel

1. **访问**: https://vercel.com/new
2. **登录/注册** Vercel（可以使用 GitHub 账号登录）
3. **点击 "Add New Project"**
4. **导入仓库**:
   - 在仓库列表中找到 `SongKhuen0828/SkillChain`
   - 点击 "Import"

### 步骤 2: 配置项目设置

Vercel 会自动检测配置，确认以下设置：

- **Framework Preset**: `Vite` ✅（自动检测）
- **Root Directory**: 留空（或设置为项目根目录）
- **Build Command**: `cd apps/web && npm install && npm run build`
- **Output Directory**: `apps/web/dist`
- **Install Command**: `cd apps/web && npm install`

### 步骤 3: 配置环境变量（重要！）

在部署前，点击 **"Environment Variables"** 添加：

#### ✅ 必需的环境变量（必须配置）：

```
VITE_SUPABASE_URL=你的_Supabase_项目_URL
VITE_SUPABASE_ANON_KEY=你的_Supabase_匿名_Key
```

#### 如何获取 Supabase 环境变量：

1. 登录 Supabase Dashboard: https://app.supabase.com/
2. 选择你的项目
3. 进入 **Settings** → **API**
4. 复制：
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

#### ⚠️ 区块链证书功能环境变量（真实上链需要）：

证书功能**需要真实上链**，以下变量是必需的：

```
VITE_CERTIFICATE_CONTRACT_ADDRESS=你的_合约地址（必需）
VITE_ADMIN_PRIVATE_KEY=管理员私钥（必需，用于签名交易）
VITE_POLYGON_RPC_URL=Polygon_RPC_URL（可选，有默认值）
VITE_PINATA_API_KEY=Pinata_API_Key（必需，用于 IPFS 存储）
VITE_PINATA_SECRET_KEY=Pinata_Secret_Key（必需，用于 IPFS 存储）
```

**重要说明**：
- `VITE_CERTIFICATE_CONTRACT_ADDRESS`：如果没有配置，证书铸造会失败
- `VITE_PINATA_API_KEY` 和 `VITE_PINATA_SECRET_KEY`：如果没有配置，IPFS 上传会失败
- `VITE_ADMIN_PRIVATE_KEY`：如果没有配置，真实上链会失败（会使用模拟模式）
- `VITE_POLYGON_RPC_URL`：可选，默认使用 `https://polygon-rpc.com`

**获取方式**：
- **合约地址**：部署智能合约后获得
- **Pinata API Key**：https://app.pinata.cloud/ → API Keys
- **Polygon RPC URL**：可以使用公共 RPC 或 Alchemy/Infura 的 RPC
- **管理员私钥**：用于签名交易的钱包私钥（请妥善保管！）

### 步骤 4: 部署

1. 点击 **"Deploy"** 按钮
2. 等待构建完成（通常 2-5 分钟）
3. 部署成功后，你会得到一个 Vercel URL（如：`skillchain.vercel.app`）

## 🔧 部署后配置

### 1. 更新 Supabase 重定向 URL

部署完成后，需要在 Supabase 中添加 Vercel 的 URL：

1. 进入 Supabase Dashboard → **Authentication** → **URL Configuration**
2. 添加 **Site URL**: `https://your-project.vercel.app`
3. 添加 **Redirect URLs**: 
   ```
   https://your-project.vercel.app/**
   https://your-project.vercel.app/callback
   ```

### 2. 测试部署

访问你的 Vercel URL，测试：
- ✅ 页面加载
- ✅ 登录/注册功能
- ✅ API 连接（Supabase）

## 📝 快速命令

如果使用 Vercel CLI：

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 在项目根目录部署
cd /Users/jac/SkillChain
vercel

# 配置环境变量
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# 部署到生产环境
vercel --prod
```

## 🎯 当前仓库信息

- **GitHub 仓库**: https://github.com/SongKhuen0828/SkillChain
- **Vercel 配置**: 已准备好（`vercel.json`）
- **构建配置**: 已优化

## 🆘 常见问题

### 问题 1: 构建失败

**检查**:
- 环境变量是否正确配置
- 构建命令是否正确
- 查看 Vercel 构建日志

### 问题 2: 环境变量未生效

**解决**:
- 确保变量名以 `VITE_` 开头
- 重新部署项目
- 检查环境变量作用域（Production/Preview/Development）

### 问题 3: 路由 404

**解决**:
- 确认 `vercel.json` 中的 `rewrites` 配置
- 所有路由应重定向到 `/index.html`

## ✅ 完成！

部署成功后：
1. 🌐 访问你的 Vercel URL
2. 🔗 可以添加自定义域名（可选）
3. 🔄 每次推送到 GitHub 会自动部署

需要帮助？查看详细指南：`VERCEL_DEPLOY.md`

