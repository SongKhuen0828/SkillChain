#!/bin/bash

# Simple script to push to GitHub after repository is created

echo "🚀 Pushing SkillChain to GitHub"
echo "================================"
echo ""

# Get GitHub username and repo name
read -p "Enter your GitHub username (default: Jac0828): " GITHUB_USER
GITHUB_USER=${GITHUB_USER:-Jac0828}

read -p "Enter repository name (default: SkillChain): " REPO_NAME
REPO_NAME=${REPO_NAME:-SkillChain}

echo ""
echo "📝 Make sure you've created the repository at:"
echo "   https://github.com/$GITHUB_USER/$REPO_NAME"
echo ""
read -p "Press Enter when ready to push..."

# Add or update remote
echo ""
echo "🔗 Adding remote repository..."
git remote remove origin 2>/dev/null
git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"

# Ensure we're on main branch
git branch -M main

# Push
echo "📤 Pushing code to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Success! Your code is now on GitHub!"
    echo "🌐 Repository: https://github.com/$GITHUB_USER/$REPO_NAME"
    echo ""
    echo "Next: Deploy to Vercel at https://vercel.com/new"
else
    echo ""
    echo "❌ Push failed. Please check:"
    echo "  1. Repository exists at https://github.com/$GITHUB_USER/$REPO_NAME"
    echo "  2. You have write access"
    echo "  3. Your GitHub credentials are configured"
fi

