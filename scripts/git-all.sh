#!/bin/bash

# Custom git command: git-all.sh
# Usage: ./scripts/git-all.sh "Your commit message here"

# Check if commit message is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide a commit message"
    echo "Usage: ./scripts/git-all.sh \"Your commit message here\""
    exit 1
fi

COMMIT_MESSAGE="$1"
CURRENT_BRANCH=$(git branch --show-current)

echo "🚀 Git ALL - Staging, Committing, and Pushing"
echo "=============================================="
echo "📝 Commit Message: $COMMIT_MESSAGE"
echo "🌿 Current Branch: $CURRENT_BRANCH"
echo ""

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

# Step 2: Commit with provided message
echo "💾 Committing changes..."
git commit -m "$COMMIT_MESSAGE"
if [ $? -eq 0 ]; then
    echo "✅ Changes committed successfully"
else
    echo "❌ Failed to commit changes"
    exit 1
fi

echo ""

# Step 3: Push to origin
echo "🚀 Pushing to origin/$CURRENT_BRANCH..."
git push origin "$CURRENT_BRANCH"
if [ $? -eq 0 ]; then
    echo "✅ Changes pushed successfully to origin/$CURRENT_BRANCH"
else
    echo "❌ Failed to push changes"
    exit 1
fi

echo ""
echo "🎉 Git ALL completed successfully!"
echo "📊 Summary:"
echo "   • Staged: All changes"
echo "   • Committed: \"$COMMIT_MESSAGE\""
echo "   • Pushed: origin/$CURRENT_BRANCH"
