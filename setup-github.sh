#!/bin/bash

# Script to set up clean GitHub connection for Building Project

cd "/Users/joshua.orr/Documents/Building Project"

# Check if git is initialized at top level
if [ ! -d .git ]; then
    echo "Initializing git repository at top level..."
    git init
    echo "Git repository initialized."
else
    echo "Git repository already exists at top level."
fi

# Remove all existing remotes
echo ""
echo "Removing existing remotes..."
git remote | while read remote; do
    echo "  Removing remote: $remote"
    git remote remove "$remote" 2>/dev/null || true
done

# Check if GitHub CLI is available
if command -v gh &> /dev/null; then
    echo ""
    echo "GitHub CLI found. Would you like to create a new repository?"
    echo "Repository name (default: building-project): "
    read -r repo_name
    repo_name=${repo_name:-building-project}
    
    echo ""
    echo "Creating GitHub repository: $repo_name"
    gh repo create "$repo_name" --public --source=. --remote=origin --push
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Successfully created repository and pushed code!"
        echo "Repository URL: $(git remote get-url origin)"
    else
        echo ""
        echo "⚠️  Failed to create repository via GitHub CLI."
        echo "Please create the repository manually on GitHub and run:"
        echo "  git remote add origin https://github.com/YOUR_USERNAME/$repo_name.git"
        echo "  git add ."
        echo "  git commit -m 'Initial commit'"
        echo "  git push -u origin main"
    fi
else
    echo ""
    echo "GitHub CLI not found. Please follow these steps:"
    echo ""
    echo "1. Create a new repository on GitHub (https://github.com/new)"
    echo "2. Run these commands:"
    echo ""
    echo "   git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    echo "   git branch -M main"
    echo "   git push -u origin main"
    echo ""
fi



