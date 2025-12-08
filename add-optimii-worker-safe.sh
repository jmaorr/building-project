#!/bin/bash

cd "/Users/joshua.orr/Documents/Building Project"

echo "=== Safely Adding Optimii Worker (excluding node_modules) ==="
echo ""

# Step 1: Remove .git from Optimii Worker if it exists
if [ -d "Optimii Worker/.git" ]; then
    echo "Removing .git from Optimii Worker..."
    rm -rf "Optimii Worker/.git"
fi

# Step 2: Remove Optimii Worker from git cache
echo "Removing Optimii Worker from git cache..."
git rm -r --cached "Optimii Worker" 2>/dev/null || true

# Step 3: Make sure node_modules is ignored
echo "Ensuring node_modules is ignored..."
if ! grep -q "node_modules" .gitignore 2>/dev/null; then
    echo "node_modules/" >> .gitignore
    echo "**/node_modules/" >> .gitignore
fi

# Step 4: Add files excluding node_modules
echo "Adding Optimii Worker files (excluding node_modules)..."

# Use git add with explicit paths, excluding node_modules
find "Optimii Worker" -type f \
    ! -path "*/node_modules/*" \
    ! -path "*/.next/*" \
    ! -path "*/.open-next/*" \
    ! -path "*/dist/*" \
    ! -path "*/build/*" \
    ! -path "*/.git/*" \
    ! -name "*.log" \
    ! -name ".DS_Store" \
    -exec git add -f {} \;

# Alternative: Add specific important directories
echo ""
echo "Adding key directories..."
git add -f "Optimii Worker/src/"
git add -f "Optimii Worker/public/"
git add -f "Optimii Worker/drizzle/"
git add -f "Optimii Worker/package.json"
git add -f "Optimii Worker/package-lock.json"
git add -f "Optimii Worker/tsconfig.json"
git add -f "Optimii Worker/wrangler.toml"
git add -f "Optimii Worker/next.config.ts"
git add -f "Optimii Worker/eslint.config.mjs"
git add -f "Optimii Worker/postcss.config.mjs"
git add -f "Optimii Worker/components.json"
git add -f "Optimii Worker/open-next.config.ts"
git add -f "Optimii Worker/drizzle.config.ts"
git add -f "Optimii Worker/README.md"
git add -f "Optimii Worker/*.md" 2>/dev/null || true

# Step 5: Show what's staged
echo ""
echo "Files staged:"
git status --short | grep "Optimii Worker" | head -20

echo ""
echo "✅ Done! Now commit and push:"
echo "  git commit -m 'Add Optimii Worker folder (excluding node_modules)'"
echo "  git push origin main"








