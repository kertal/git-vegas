import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import svgr from 'vite-plugin-svgr'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory
  const env = loadEnv(mode, process.cwd(), '')

  // Check if building for Tauri (Tauri sets this env var)
  const isTauri = process.env.TAURI_ENV_PLATFORM !== undefined

  // Determine base and scope from environment
  // Use '/' for Tauri builds, '/git-vegas/' for web builds
  const base = isTauri ? '/' : (env.VITE_BASE_PATH || '/git-vegas/')
  const scope = isTauri ? '/' : (env.VITE_SCOPE || '/git-vegas/')
  const startUrl = isTauri ? '/' : (env.VITE_START_URL || '/git-vegas/')
  
  return {
    plugins: [
      react(),
      svgr(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'GitVegas - GitHub Search Tool',
          short_name: 'GitVegas',
          description: 'A 777 tool for searching GitHub issues and pull requests',
          theme_color: '#0969da',
          background_color: '#ffffff',
          display: 'standalone',
          scope: scope,
          start_url: startUrl,
          icons: [
            {
              src: 'icon-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'icon-512-x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'icon-512-x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
 workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.github\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'github-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            urlPattern: /^https:\/\/avatars\.githubusercontent\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'github-avatars-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
    base: base,
  }
})