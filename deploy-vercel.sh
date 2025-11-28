#!/bin/bash

echo "🔧 Starting Vercel deployment for image loading fix..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Build the project
echo "🏗️ Building project..."
bun run build

# Verify assets exist
echo "🔍 Verifying assets..."
if [ -d "dist/assets" ]; then
  echo "✅ Assets directory found in dist/"
  ls -la dist/assets/
else
  echo "❌ Assets directory missing from dist/"
  echo "📂 Public assets:"
  ls -la public/assets/
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod --yes

echo "✨ Deployment complete!"