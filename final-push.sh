#!/bin/bash

echo "🚀 最终推送方案"
echo "================"
echo ""

# 方法 1: 让用户直接输入完整 URL
read -p "请输入 GitHub 仓库的完整 URL (例如: https://github.com/用户名/仓库名): " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo "❌ URL 不能为空"
    exit 1
fi

# 提取用户名和仓库名
GITHUB_USER=$(echo $REPO_URL | sed -E 's|https://github.com/([^/]+)/.*|\1|')
REPO_NAME=$(echo $REPO_URL | sed -E 's|https://github.com/[^/]+/([^/]+).*|\1|')

echo ""
echo "📝 解析的信息："
echo "   用户名: $GITHUB_USER"
echo "   仓库名: $REPO_NAME"
echo "   完整 URL: $REPO_URL"
echo ""

# 配置远程
git remote remove origin 2>/dev/null
git remote add origin "$REPO_URL.git"
git branch -M main

echo "📤 开始推送..."
echo ""
echo "⚠️  如果需要认证："
echo "   用户名: 输入你的 GitHub 用户名"
echo "   密码: 使用 Personal Access Token (不是 GitHub 密码)"
echo "   获取 Token: https://github.com/settings/tokens"
echo ""

git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 成功！代码已推送到 GitHub！"
    echo "🌐 $REPO_URL"
else
    echo ""
    echo "❌ 推送失败"
    echo ""
    echo "请尝试："
    echo "1. 确认仓库 URL 正确: $REPO_URL"
    echo "2. 获取 Personal Access Token: https://github.com/settings/tokens"
    echo "3. 或告诉我确切的仓库名称，我可以帮你重新配置"
fi

