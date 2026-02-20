#!/bin/bash

# GitVegas Deployment Pipeline
#
# Production deployments happen automatically via GitHub Actions when
# pushing to the main branch. PR preview deployments are created
# automatically when opening or updating a pull request.
#
# This script is for local builds and manual gh-pages deployment.

set -e

# Build the project
echo "Building the project..."
npm run build

# Create .nojekyll file to ensure GitHub Pages serves the PWA correctly
touch ./dist/.nojekyll

echo ""
echo "Build complete!"
echo ""
echo "Deployment options:"
echo ""
echo "  Automatic (recommended):"
echo "    Push to main     -> production deployment to GitHub Pages"
echo "    Open a PR        -> preview deployment at /pr-preview/pr-<number>/"
echo ""
echo "  Manual:"
echo "    npm run deploy   -> deploys dist/ via gh-pages package"
echo ""
echo "PWA features included:"
echo "  - Offline support with service worker"
echo "  - App install capability"
echo "  - Cached GitHub API responses"
echo "  - Offline banner for user feedback"
