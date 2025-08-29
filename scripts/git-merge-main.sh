#!/bin/bash

# Custom git command: git-merge-main.sh
# Usage: ./scripts/git-merge-main.sh "Your commit message here"
# This script will: stage, commit, push to current branch, then merge to main, push to main, and stay on main

# Check if commit message is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide a commit message"
    echo "Usage: ./scripts/git-merge-main.sh \"Your commit message here\""
    exit 1
fi

COMMIT_MESSAGE="$1"
CURRENT_BRANCH=$(git branch --show-current)

echo "🚀 Git MERGE MAIN - Complete Workflow"
echo "====================================="
echo "📝 Commit Message: $COMMIT_MESSAGE"
echo "🌿 Current Branch: $CURRENT_BRANCH"
echo "🎯 Target: main branch"
echo ""

# Check if we're already on main branch
if [ "$CURRENT_BRANCH" = "main" ]; then
    echo "❌ Error: Already on main branch. Please use this script from a feature branch."
    exit 1
fi

# Step 1: Stage all changes
echo "📦 Staging all changes..."
git add .
if [ $? -eq 0 ]; then
    echo "✅ All changes staged successfully"
else
    echo "❌ Failed to stage changes"
    exit 1
fi

echo ""

# Step 2: Commit with provided message (if there are staged changes)
echo "💾 Committing changes..."
if git diff --cached --quiet; then
    echo "ℹ️  No staged changes to commit, continuing with merge process..."
else
    git commit -m "$COMMIT_MESSAGE"
    if [ $? -eq 0 ]; then
        echo "✅ Changes committed successfully"
    else
        echo "❌ Failed to commit changes"
        exit 1
    fi
fi

echo ""

# Step 3: Push to origin current branch
echo "🚀 Pushing to origin/$CURRENT_BRANCH..."
git push origin "$CURRENT_BRANCH"
if [ $? -eq 0 ]; then
    echo "✅ Changes pushed successfully to origin/$CURRENT_BRANCH"
else
    echo "❌ Failed to push changes"
    exit 1
fi

echo ""

# Step 4: Switch to main branch
echo "🔄 Switching to main branch..."
git checkout main
if [ $? -eq 0 ]; then
    echo "✅ Switched to main branch successfully"
else
    echo "❌ Failed to switch to main branch"
    exit 1
fi

echo ""

# Step 5: Pull latest changes from origin/main
echo "📥 Pulling latest changes from origin/main..."
git pull origin main
if [ $? -eq 0 ]; then
    echo "✅ Latest changes pulled successfully"
else
    echo "❌ Failed to pull latest changes"
    exit 1
fi

echo ""

# Step 6: Merge the feature branch into main
echo "🔀 Merging $CURRENT_BRANCH into main..."
git merge "$CURRENT_BRANCH"
if [ $? -eq 0 ]; then
    echo "✅ Merge completed successfully"
else
    echo "❌ Failed to merge $CURRENT_BRANCH into main"
    echo "💡 You may need to resolve merge conflicts manually"
    exit 1
fi

echo ""

# Step 7: Push merged changes to origin/main
echo "🚀 Pushing merged changes to origin/main..."
git push origin main
if [ $? -eq 0 ]; then
    echo "✅ Changes pushed successfully to origin/main"
else
    echo "❌ Failed to push to origin/main"
    exit 1
fi

echo ""

# Step 8: Stay on main branch (don't switch back)
echo "✅ Staying on main branch after successful merge"
echo ""

echo "🎉 Git MERGE MAIN completed successfully!"
echo "📊 Summary:"
echo "   • Staged: All changes"
if ! git diff --cached --quiet; then
    echo "   • Committed: \"$COMMIT_MESSAGE\""
else
    echo "   • Committed: No changes to commit (already committed)"
fi
echo "   • Pushed: origin/$CURRENT_BRANCH"
echo "   • Merged: $CURRENT_BRANCH → main"
echo "   • Pushed: origin/main"
echo "   • Current: on main branch"
echo ""
echo "💡 You can now delete the feature branch if desired:"
echo "   git branch -d $CURRENT_BRANCH"
echo "   git push origin --delete $CURRENT_BRANCH"
