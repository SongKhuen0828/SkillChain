#!/bin/bash

echo "🚀 部署 SkillChain 到 Vercel"
echo "=============================="
echo ""

# 检查 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "📦 安装 Vercel CLI..."
    npm install -g vercel
fi

echo "✅ Vercel CLI 已准备"
echo ""

# 检查是否已登录
if ! vercel whoami &>/dev/null; then
    echo "🔐 需要登录 Vercel"
    echo ""
    vercel login
fi

echo "✅ 已登录 Vercel"
echo ""

# 检查环境变量
echo "📋 环境变量检查："
echo ""
read -p "是否已准备好 Supabase 环境变量？(y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "⚠️  请先准备环境变量："
    echo "  1. VITE_SUPABASE_URL"
    echo "  2. VITE_SUPABASE_ANON_KEY"
    echo ""
    echo "获取方式："
    echo "  Supabase Dashboard → Settings → API"
    echo ""
    read -p "准备好后按 Enter 继续..."
fi

echo ""
echo "📤 开始部署..."
echo ""

# 部署
cd /Users/jac/SkillChain
vercel --prod

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 部署成功！"
    echo ""
    echo "下一步："
    echo "1. 在 Vercel Dashboard 配置环境变量（如果还没配置）"
    echo "2. 更新 Supabase 重定向 URL"
    echo "3. 测试部署的应用"
else
    echo ""
    echo "❌ 部署失败"
    echo ""
    echo "请检查："
    echo "1. 网络连接"
    echo "2. Vercel 账号状态"
    echo "3. 项目配置"
fi

