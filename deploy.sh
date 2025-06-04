#!/bin/bash

# Build the project
echo "Building the project..."
npm run build

# Navigate to the dist directory
cd dist

# Create .nojekyll file to ensure GitHub Pages serves the PWA correctly
echo "Creating .nojekyll file for GitHub Pages..."
touch .nojekyll

# Add CNAME if you have a custom domain (optional)
# echo "your-domain.com" > CNAME

echo "✅ Build complete! Deploy the dist/ folder to GitHub Pages."
echo ""
echo "🚀 Your PWA is ready with:"
echo "  • Offline support with service worker"
echo "  • App install capability"  
echo "  • Cached GitHub API responses"
echo "  • Offline banner for user feedback"
echo ""
echo "📱 Users can install this as a desktop/mobile app!" 