#!/bin/bash

echo "🚀 自动创建 GitHub 仓库并推送代码"
echo "=================================="
echo ""

# 检查是否已登录
if ! gh auth status &>/dev/null; then
    echo "⚠️  需要先登录 GitHub"
    echo ""
    echo "运行以下命令登录："
    echo "  gh auth login"
    echo ""
    echo "登录步骤："
    echo "  1. 选择 GitHub.com"
    echo "  2. 选择 HTTPS"
    echo "  3. 选择 Login with a web browser"
    echo "  4. 按 Enter 打开浏览器"
    echo "  5. 在浏览器中授权"
    echo ""
    read -p "登录完成后按 Enter 继续..."
fi

# 检查是否已登录
if ! gh auth status &>/dev/null; then
    echo "❌ 仍未登录，请先运行: gh auth login"
    exit 1
fi

echo "✅ GitHub 已登录"
echo ""

# 创建仓库
REPO_NAME="SkillChain"
echo "📦 创建仓库: $REPO_NAME"
echo ""

gh repo create $REPO_NAME --public --source=. --remote=origin --push

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 成功！"
    echo "🌐 仓库地址: https://github.com/Jac0828/$REPO_NAME"
    echo ""
    echo "下一步："
    echo "1. 访问: https://vercel.com/new"
    echo "2. 导入 GitHub 仓库: $REPO_NAME"
    echo "3. 配置环境变量并部署"
else
    echo ""
    echo "❌ 创建失败"
    echo ""
    echo "可能的原因："
    echo "1. 仓库已存在（换个名称）"
    echo "2. 权限问题"
    echo ""
    echo "请告诉我仓库名称，我可以直接推送"
fi

