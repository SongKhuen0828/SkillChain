#!/bin/bash

echo "🚀 使用 Vercel CLI 部署 SkillChain"
echo "=================================="
echo ""

cd /Users/jac/SkillChain

# 检查是否已登录
if ! npx vercel whoami &>/dev/null; then
    echo "🔐 需要登录 Vercel"
    echo ""
    echo "请运行: npx vercel login"
    echo "然后在浏览器中完成登录"
    echo ""
    read -p "登录完成后按 Enter 继续..."
fi

# 检查登录状态
if ! npx vercel whoami &>/dev/null; then
    echo "❌ 仍未登录，请先运行: npx vercel login"
    exit 1
fi

echo "✅ 已登录 Vercel"
echo ""

# 检查环境变量
echo "📋 环境变量检查："
echo ""
echo "必需的环境变量："
echo "  ✅ VITE_SUPABASE_URL"
echo "  ✅ VITE_SUPABASE_ANON_KEY"
echo ""
read -p "是否已在 Vercel Dashboard 配置环境变量？(y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "⚠️  请先在 Vercel Dashboard 配置环境变量："
    echo "  1. 访问你的项目设置"
    echo "  2. 进入 Environment Variables"
    echo "  3. 添加必需的环境变量"
    echo ""
    read -p "配置完成后按 Enter 继续..."
fi

echo ""
echo "📤 开始部署到 Vercel..."
echo ""

# 部署到生产环境
npx vercel --prod

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 部署成功！"
    echo ""
    echo "下一步："
    echo "1. 在 Vercel Dashboard 检查部署状态"
    echo "2. 更新 Supabase 重定向 URL"
    echo "3. 测试部署的应用"
else
    echo ""
    echo "❌ 部署失败"
    echo ""
    echo "请检查："
    echo "1. 构建日志中的错误"
    echo "2. 环境变量配置"
    echo "3. 项目设置"
fi

