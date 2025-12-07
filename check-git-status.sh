#!/bin/bash

cd "/Users/joshua.orr/Documents/Building Project"

echo "=== Git Status Check ==="
echo ""

echo "1. Checking if Optimii Worker/.git exists:"
if [ -d "Optimii Worker/.git" ]; then
    echo "   ❌ FOUND .git directory in Optimii Worker!"
    echo "   This is why it's being ignored."
else
    echo "   ✅ No .git directory found"
fi

echo ""
echo "2. Checking if Optimii Worker is tracked by git:"
if git ls-files "Optimii Worker/" | head -1 > /dev/null 2>&1; then
    echo "   ✅ Optimii Worker is tracked"
    echo "   Files tracked:"
    git ls-files "Optimii Worker/" | head -5
else
    echo "   ❌ Optimii Worker is NOT tracked"
fi

echo ""
echo "3. Checking git status:"
git status --short | grep "Optimii Worker" | head -10 || echo "   No Optimii Worker changes shown"

echo ""
echo "4. Checking if it's in .gitignore:"
if git check-ignore "Optimii Worker" > /dev/null 2>&1; then
    echo "   ❌ Optimii Worker is in .gitignore"
    git check-ignore -v "Optimii Worker"
else
    echo "   ✅ Not in .gitignore"
fi

echo ""
echo "5. Checking for .gitmodules (submodule):"
if [ -f .gitmodules ]; then
    echo "   ⚠️  Found .gitmodules file:"
    cat .gitmodules
else
    echo "   ✅ No .gitmodules file"
fi

echo ""
echo "6. Checking .git/info/exclude:"
if [ -f .git/info/exclude ]; then
    if grep -q "Optimii Worker" .git/info/exclude 2>/dev/null; then
        echo "   ❌ Found in .git/info/exclude:"
        grep "Optimii Worker" .git/info/exclude
    else
        echo "   ✅ Not in exclude file"
    fi
fi






