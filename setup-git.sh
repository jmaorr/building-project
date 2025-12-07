#!/bin/bash

# Navigate to the Building Project directory
cd "/Users/joshua.orr/Documents/Building Project"

echo "=== Setting up Git Repository ==="
echo ""

# Step 1: Initialize git if not already initialized
if [ ! -d .git ]; then
    echo "1. Initializing git repository..."
    git init
    echo "   ✅ Git repository initialized"
else
    echo "1. Git repository already exists"
fi

# Step 2: Remove all existing remotes
echo ""
echo "2. Removing existing remotes..."
remotes=$(git remote 2>/dev/null)
if [ -z "$remotes" ]; then
    echo "   ℹ️  No remotes to remove"
else
    for remote in $remotes; do
        echo "   Removing remote: $remote"
        git remote remove "$remote" 2>/dev/null
    done
    echo "   ✅ All remotes removed"
fi

# Step 3: Check for uncommitted changes
echo ""
echo "3. Checking repository status..."
git status --short

echo ""
echo "=== Next Steps ==="
echo ""
echo "To complete the setup, you have two options:"
echo ""
echo "OPTION 1: Using GitHub CLI (if installed)"
echo "  gh repo create building-project --public --source=. --remote=origin --push"
echo ""
echo "OPTION 2: Manual setup"
echo "  1. Create a new repository on GitHub: https://github.com/new"
echo "  2. Run these commands:"
echo "     git add ."
echo "     git commit -m 'Initial commit'"
echo "     git branch -M main"
echo "     git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git"
echo "     git push -u origin main"
echo ""






