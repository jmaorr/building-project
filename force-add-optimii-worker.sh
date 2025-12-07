#!/bin/bash

# Force add Optimii Worker folder to git

cd "/Users/joshua.orr/Documents/Building Project"

echo "=== Force Adding Optimii Worker to Git ==="
echo ""

# Check if .git exists in Optimii Worker
if [ -d "Optimii Worker/.git" ]; then
    echo "⚠️  WARNING: Found .git directory in Optimii Worker!"
    echo "   This makes it a nested git repository and git will ignore it."
    echo ""
    read -p "Remove it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "Optimii Worker/.git"
        echo "✅ Removed .git directory"
    else
        echo "❌ Keeping .git directory - Optimii Worker will remain ignored"
        exit 1
    fi
fi

# Check if it's in .gitignore
if git check-ignore "Optimii Worker" > /dev/null 2>&1; then
    echo "⚠️  Optimii Worker is in .gitignore!"
    echo "   Removing from .gitignore..."
    # This is tricky - we'd need to edit .gitignore manually
    echo "   Please check your .gitignore file for 'Optimii Worker' and remove it"
fi

# Force add the folder
echo ""
echo "Force adding Optimii Worker folder..."
git add -f "Optimii Worker/"

# Show what was added
echo ""
echo "Files staged:"
git status --short | grep "Optimii Worker" | head -10

echo ""
echo "✅ Done! Now commit and push:"
echo "   git commit -m 'Add Optimii Worker folder'"
echo "   git push origin main"






