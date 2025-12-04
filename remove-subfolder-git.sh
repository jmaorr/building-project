#!/bin/bash

# Script to remove git repository from Optimii Worker subfolder

echo "=== Removing Git Repository from Optimii Worker ==="
echo ""

cd "/Users/joshua.orr/Documents/Building Project/Optimii Worker"

if [ -d .git ]; then
    echo "Found .git directory in 'Optimii Worker'"
    echo ""
    echo "Checking for remotes..."
    remotes=$(git remote 2>/dev/null)
    if [ -n "$remotes" ]; then
        echo "Remotes found:"
        git remote -v
        echo ""
        echo "Removing remotes..."
        for remote in $remotes; do
            git remote remove "$remote"
        done
    else
        echo "No remotes found (good!)"
    fi
    
    echo ""
    echo "Removing .git directory..."
    rm -rf .git
    echo "✅ Git repository removed from 'Optimii Worker'"
    echo ""
    echo "The folder is now ready to be tracked by the parent repository."
else
    echo "No .git directory found in 'Optimii Worker'"
fi

echo ""
echo "Done!"

