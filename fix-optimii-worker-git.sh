#!/bin/bash

# Script to ensure Optimii Worker folder is tracked by git

cd "/Users/joshua.orr/Documents/Building Project"

echo "=== Fixing Optimii Worker Git Tracking ==="
echo ""

# Step 1: Check if Optimii Worker still has a .git directory
if [ -d "Optimii Worker/.git" ]; then
    echo "⚠️  Found .git directory in Optimii Worker - this prevents it from being tracked!"
    echo ""
    echo "Removing .git directory from Optimii Worker..."
    rm -rf "Optimii Worker/.git"
    echo "✅ Removed .git directory"
else
    echo "✅ No .git directory in Optimii Worker (good!)"
fi

echo ""
echo "Step 2: Force adding Optimii Worker to git..."
git add -f "Optimii Worker/"

echo ""
echo "Step 3: Checking git status..."
git status --short | head -20

echo ""
echo "Step 4: If Optimii Worker appears above, commit and push:"
echo "   git commit -m 'Add Optimii Worker folder'"
echo "   git push origin main"
echo ""








