#!/bin/bash
# ==============================================
# Blue Ocean Care — Quick Deploy Script
# Run this on YOUR computer (not in Claude)
# ==============================================

set -e

echo "🌊 Blue Ocean Care — Deploy Setup"
echo "=================================="
echo ""

# Check prerequisites
command -v git >/dev/null 2>&1 || { echo "❌ git not found. Install it first."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm not found. Install Node.js first."; exit 1; }

# Check for gh CLI
if ! command -v gh &>/dev/null; then
  echo "📦 Installing GitHub CLI..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew install gh
  else
    echo "Please install gh CLI: https://cli.github.com/"
    exit 1
  fi
fi

# Login to GitHub if needed
if ! gh auth status &>/dev/null 2>&1; then
  echo "🔑 Please log in to GitHub..."
  gh auth login
fi

# Create the repo
REPO_NAME="blue-ocean-care"
echo ""
echo "📁 Creating GitHub repo: $REPO_NAME"
gh repo create "$REPO_NAME" --private --source=. --push --remote=origin 2>/dev/null || {
  echo "Repo may already exist. Setting remote and pushing..."
  GITHUB_USER=$(gh api user -q .login)
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
  git push -u origin main
}

echo ""
echo "✅ Code pushed to GitHub!"
echo ""

# Vercel deployment
if ! command -v vercel &>/dev/null; then
  echo "📦 Installing Vercel CLI..."
  npm install -g vercel
fi

echo "🚀 Deploying to Vercel..."
vercel --prod

echo ""
echo "============================================"
echo "🎉 DEPLOYED!"
echo "============================================"
echo ""
echo "Next: Add ANTHROPIC_API_KEY in Vercel → Settings → Environment Variables"
echo "Then redeploy to enable AI features."
