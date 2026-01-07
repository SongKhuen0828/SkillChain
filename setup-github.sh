#!/bin/bash

# SkillChain GitHub Setup Script
# This script helps you push your code to GitHub

echo "🚀 SkillChain GitHub Setup"
echo "=========================="
echo ""

# Check if remote already exists
if git remote get-url origin 2>/dev/null; then
    echo "✅ Remote 'origin' already exists"
    REMOTE_URL=$(git remote get-url origin)
    echo "   Current remote: $REMOTE_URL"
    echo ""
    read -p "Do you want to push to existing remote? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📤 Pushing to GitHub..."
        git push -u origin main
        echo "✅ Done! Your code is now on GitHub."
        exit 0
    fi
fi

echo "📝 To push to GitHub, you need to:"
echo ""
echo "Option 1: Create repository on GitHub.com (Recommended)"
echo "  1. Go to: https://github.com/new"
echo "  2. Repository name: SkillChain (or your preferred name)"
echo "  3. Description: Personalized Skill Learning Platform with Blockchain Certificates"
echo "  4. Choose: Public or Private"
echo "  5. DO NOT initialize with README, .gitignore, or license"
echo "  6. Click 'Create repository'"
echo ""
echo "Option 2: Use GitHub CLI (if installed)"
echo "  Run: gh repo create SkillChain --public --source=. --remote=origin --push"
echo ""

read -p "Have you created the repository on GitHub? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter your GitHub username: " GITHUB_USER
    read -p "Enter repository name (default: SkillChain): " REPO_NAME
    REPO_NAME=${REPO_NAME:-SkillChain}
    
    echo ""
    echo "Adding remote repository..."
    git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git" 2>/dev/null || \
    git remote set-url origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
    
    echo "📤 Pushing to GitHub..."
    git branch -M main
    git push -u origin main
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Success! Your code is now on GitHub!"
        echo "🌐 Repository URL: https://github.com/$GITHUB_USER/$REPO_NAME"
        echo ""
        echo "Next steps:"
        echo "  1. Go to https://vercel.com/new"
        echo "  2. Import your GitHub repository"
        echo "  3. Configure environment variables"
        echo "  4. Deploy!"
    else
        echo ""
        echo "❌ Push failed. Please check:"
        echo "  - Repository name is correct"
        echo "  - You have access to the repository"
        echo "  - Your GitHub credentials are set up"
    fi
else
    echo ""
    echo "Please create the repository first, then run this script again."
    echo "Or run: ./setup-github.sh"
fi

