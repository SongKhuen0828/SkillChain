#!/bin/bash
echo "🔍 请确认你的 GitHub 仓库信息："
echo ""
read -p "GitHub 用户名 (默认: Jac0828): " USER
USER=${USER:-Jac0828}
read -p "仓库名称 (例如: SkillChain): " REPO
echo ""
echo "正在配置并推送..."
git remote remove origin 2>/dev/null
git remote add origin "https://github.com/$USER/$REPO.git"
git branch -M main
echo ""
echo "📤 正在推送代码到 GitHub..."
echo "   如果提示输入密码，请使用 GitHub Personal Access Token"
echo ""
git push -u origin main
