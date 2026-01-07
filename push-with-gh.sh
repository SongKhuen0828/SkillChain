#!/bin/bash

echo "🚀 使用 GitHub CLI 推送代码"
echo "=========================="
echo ""

# 检查是否已登录
if ! gh auth status &>/dev/null; then
    echo "⚠️  需要先登录 GitHub CLI"
    echo ""
    echo "正在启动登录流程..."
    gh auth login
fi

# 确认登录状态
if ! gh auth status &>/dev/null; then
    echo "❌ 登录失败，请手动运行: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI 已登录"
echo ""

# 配置远程仓库
echo "🔗 配置远程仓库..."
git remote remove origin 2>/dev/null
git remote add origin https://github.com/SongKhuen0828/SkillChain.git
git branch -M main

echo "📤 推送代码到 GitHub..."
echo ""

# 使用 GitHub CLI 的 credential helper
git config --global credential.helper ""
export GIT_TERMINAL_PROMPT=1

# 推送
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 成功！代码已推送到 GitHub！"
    echo "🌐 仓库地址: https://github.com/SongKhuen0828/SkillChain"
    echo ""
    echo "下一步："
    echo "1. 访问: https://vercel.com/new"
    echo "2. 导入 GitHub 仓库: SongKhuen0828/SkillChain"
    echo "3. 配置环境变量并部署"
else
    echo ""
    echo "❌ 推送失败"
    echo ""
    echo "请尝试："
    echo "1. 运行: gh auth login"
    echo "2. 或使用 Personal Access Token"
    echo "   访问: https://github.com/settings/tokens"
    echo "   生成 token 后，推送时："
    echo "   用户名: SongKhuen0828"
    echo "   密码: 你的 token"
fi

