# GitHub 仓库设置指南

## 🚀 快速设置（3 步）

### 步骤 1: 创建 GitHub 仓库

1. **访问**: https://github.com/new
2. **Repository name**: `SkillChain` (或你喜欢的名字)
3. **Description**: `Personalized Skill Learning Platform with Blockchain Certificates`
4. **Visibility**: 选择 Public 或 Private
5. **重要**: ❌ 不要勾选 "Initialize this repository with a README"
6. **点击**: "Create repository"

### 步骤 2: 运行设置脚本

```bash
cd /Users/jac/SkillChain
./setup-github.sh
```

脚本会提示你输入：
- GitHub 用户名
- 仓库名称（默认：SkillChain）

然后自动推送代码到 GitHub。

### 步骤 3: 验证

访问你的 GitHub 仓库 URL：
```
https://github.com/你的用户名/SkillChain
```

## 🔧 手动设置（如果脚本不工作）

### 1. 添加远程仓库

```bash
cd /Users/jac/SkillChain
git remote add origin https://github.com/你的用户名/SkillChain.git
```

### 2. 推送代码

```bash
git branch -M main
git push -u origin main
```

## ✅ 完成后

代码已经在 GitHub 上了！下一步：

1. **部署到 Vercel**:
   - 访问: https://vercel.com/new
   - 导入你的 GitHub 仓库
   - 配置环境变量
   - 部署！

2. **查看部署指南**: 查看 `QUICK_DEPLOY.md` 或 `VERCEL_DEPLOY.md`

## 🆘 遇到问题？

### 问题: "remote origin already exists"

**解决方案**:
```bash
git remote remove origin
git remote add origin https://github.com/你的用户名/SkillChain.git
```

### 问题: "Authentication failed"

**解决方案**:
- 使用 Personal Access Token (推荐)
- 或配置 SSH key

**使用 Token**:
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. 生成新 token (需要 `repo` 权限)
3. 使用 token 作为密码推送

**配置 SSH**:
```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# 然后添加公钥到 GitHub Settings → SSH and GPG keys
```

## 📝 当前状态

✅ Git 仓库已初始化
✅ 所有文件已提交
⏳ 等待推送到 GitHub

运行 `./setup-github.sh` 完成设置！

