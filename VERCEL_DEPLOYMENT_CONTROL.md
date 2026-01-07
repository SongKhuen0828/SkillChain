# Vercel 部署控制指南

## 当前行为
Vercel 连接到 GitHub 后，**每次 push 到 main 分支都会自动部署**。这是默认行为。

## 控制部署的方法

### 方法 1：在 Vercel Dashboard 中配置（推荐）

1. 进入 Vercel 项目设置：
   - 访问 https://vercel.com/songkhuens-projects/skill-chain/settings
   - 点击左侧菜单的 **"Git"**

2. 配置自动部署：
   - **Production Branch**: 设置为 `main`（只部署 main 分支）
   - **Ignore Build Step**: 可以添加条件来跳过某些提交
   - **Deploy Hooks**: 可以创建手动触发的部署钩子

3. 使用 Ignore Build Step（跳过某些提交）：
   在项目根目录创建 `vercel.json` 或修改现有配置：
   ```json
   {
     "git": {
       "deploymentEnabled": {
         "main": true,
         "develop": false
       }
     }
   }
   ```

### 方法 2：使用分支策略

1. **创建开发分支**：
   ```bash
   git checkout -b develop
   git push origin develop
   ```

2. **在 Vercel 中配置**：
   - 只让 `main` 分支自动部署到 Production
   - `develop` 分支可以部署到 Preview 环境

### 方法 3：使用 [skip ci] 或 [vercel skip]

在 commit message 中添加 `[skip ci]` 或 `[vercel skip]` 来跳过部署：

```bash
git commit -m "docs: update README [vercel skip]"
git push origin main
```

### 方法 4：使用部署钩子（手动部署）

1. 在 Vercel Dashboard → Settings → Git → Deploy Hooks
2. 创建部署钩子
3. 只在需要时手动触发部署

### 方法 5：修改 vercel.json 添加忽略规则

```json
{
  "git": {
    "deploymentEnabled": {
      "main": true
    }
  },
  "ignoreCommand": "git diff HEAD^ HEAD --quiet ."
}
```

## 推荐方案

对于开发阶段，建议：
1. **保留自动部署** - 方便快速看到更改
2. **使用 [vercel skip]** - 对于文档、配置等不需要部署的更改
3. **使用分支策略** - 开发在 `develop` 分支，稳定后再合并到 `main`

## 当前配置

你的项目已经配置了 `vercel.json`，可以添加以下配置来控制部署：

```json
{
  "version": 2,
  "buildCommand": "cd apps/web && npm ci && npm run build",
  "outputDirectory": "apps/web/dist",
  "git": {
    "deploymentEnabled": {
      "main": true
    }
  },
  "ignoreCommand": "git diff HEAD^ HEAD --quiet apps/web/"
}
```

这样只有 `apps/web/` 目录的更改才会触发部署。

