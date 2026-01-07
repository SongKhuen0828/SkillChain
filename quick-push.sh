#!/bin/bash

echo "🚀 SkillChain - 推送到 GitHub"
echo "=============================="
echo ""

# 清除旧的远程配置
git remote remove origin 2>/dev/null

echo "请确认你的 GitHub 仓库信息："
echo ""
read -p "GitHub 用户名 (当前: Jac0828): " GITHUB_USER
GITHUB_USER=${GITHUB_USER:-Jac0828}

read -p "仓库名称 (例如: SkillChain, skillchain, Skill-Chain): " REPO_NAME

if [ -z "$REPO_NAME" ]; then
    echo "❌ 仓库名称不能为空"
    exit 1
fi

echo ""
echo "📝 配置信息："
echo "   用户名: $GITHUB_USER"
echo "   仓库名: $REPO_NAME"
echo "   URL: https://github.com/$GITHUB_USER/$REPO_NAME"
echo ""

# 检查仓库是否存在
echo "🔍 检查仓库是否存在..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://github.com/$GITHUB_USER/$REPO_NAME")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 仓库存在！"
elif [ "$HTTP_CODE" = "404" ]; then
    echo "❌ 仓库不存在 (404)"
    echo ""
    echo "请先创建仓库："
    echo "1. 访问: https://github.com/new"
    echo "2. Repository name: $REPO_NAME"
    echo "3. 不要勾选任何初始化选项"
    echo "4. 点击 'Create repository'"
    echo ""
    read -p "创建完成后按 Enter 继续..."
else
    echo "⚠️  无法检查仓库状态 (HTTP $HTTP_CODE)"
    echo "继续尝试推送..."
fi

echo ""
echo "🔗 配置远程仓库..."
git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"

echo "📤 推送代码到 GitHub..."
echo ""
echo "⚠️  如果提示输入密码："
echo "   请使用 GitHub Personal Access Token（不是你的 GitHub 密码）"
echo "   获取 Token: https://github.com/settings/tokens"
echo "   需要 'repo' 权限"
echo ""

git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 成功！代码已推送到 GitHub！"
    echo "🌐 仓库地址: https://github.com/$GITHUB_USER/$REPO_NAME"
    echo ""
    echo "下一步："
    echo "1. 访问: https://vercel.com/new"
    echo "2. 导入 GitHub 仓库"
    echo "3. 配置环境变量并部署"
else
    echo ""
    echo "❌ 推送失败"
    echo ""
    echo "可能的原因："
    echo "1. 仓库不存在或名称错误"
    echo "2. 没有访问权限"
    echo "3. 需要 GitHub 认证（使用 Personal Access Token）"
    echo ""
    echo "解决方案："
    echo "- 确认仓库 URL: https://github.com/$GITHUB_USER/$REPO_NAME"
    echo "- 获取 Token: https://github.com/settings/tokens"
    echo "- 或使用 SSH: git remote set-url origin git@github.com:$GITHUB_USER/$REPO_NAME.git"
fi

