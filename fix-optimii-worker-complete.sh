#!/bin/bash

cd "/Users/joshua.orr/Documents/Building Project"

echo "=== Complete Fix for Optimii Worker ==="
echo ""

# Step 1: Remove .git from Optimii Worker if it exists
echo "Step 1: Checking for .git in Optimii Worker..."
if [ -d "Optimii Worker/.git" ]; then
    echo "   ❌ Found .git directory - removing it..."
    rm -rf "Optimii Worker/.git"
    echo "   ✅ Removed"
else
    echo "   ✅ No .git directory found"
fi

# Step 2: Remove Optimii Worker from git cache (if it was previously tracked as empty/nested)
echo ""
echo "Step 2: Removing Optimii Worker from git cache..."
git rm -r --cached "Optimii Worker" 2>/dev/null || echo "   (Not in cache, that's fine)"

# Step 3: Force add the folder
echo ""
echo "Step 3: Force adding Optimii Worker folder..."
git add -f "Optimii Worker/"

# Step 4: Check what's staged
echo ""
echo "Step 4: Checking staged files..."
staged_count=$(git diff --cached --name-only | grep "^Optimii Worker" | wc -l | tr -d ' ')
if [ "$staged_count" -gt 0 ]; then
    echo "   ✅ Found $staged_count files from Optimii Worker staged"
    echo ""
    echo "   Sample files:"
    git diff --cached --name-only | grep "^Optimii Worker" | head -10
else
    echo "   ⚠️  No files from Optimii Worker are staged"
    echo ""
    echo "   Checking if already committed..."
    committed_count=$(git ls-files "Optimii Worker/" | wc -l | tr -d ' ')
    if [ "$committed_count" -gt 0 ]; then
        echo "   ✅ $committed_count files already committed"
        echo "   They should be in your repository. Check GitHub!"
    else
        echo "   ❌ Files are not tracked. Checking why..."
        echo ""
        echo "   Checking if folder exists:"
        ls -la "Optimii Worker/" | head -5
    fi
fi

echo ""
echo "=== Next Steps ==="
echo ""
if [ "$staged_count" -gt 0 ]; then
    echo "Files are staged! Now commit and push:"
    echo "  git commit -m 'Add Optimii Worker folder contents'"
    echo "  git push origin main"
elif [ "$committed_count" -gt 0 ]; then
    echo "Files are already committed. If they're not on GitHub, try:"
    echo "  git push origin main --force"
    echo ""
    echo "Or check if they're actually there:"
    echo "  git ls-tree -r HEAD --name-only | grep 'Optimii Worker' | head -10"
else
    echo "Files are not being tracked. Try:"
    echo "  1. Verify Optimii Worker/.git doesn't exist"
    echo "  2. Check .gitignore for any patterns matching it"
    echo "  3. Try: git add -f 'Optimii Worker/'"
fi



