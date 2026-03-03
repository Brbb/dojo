import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    allowedHosts: [
      'localhost',
      'stale-taxis-lose.loca.lt'
    ]
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'appstore.png'],
      manifest: {
        name: 'Dojo - Japanese Flashcards',
        short_name: 'Dojo',
        description: 'Learn Japanese Kanji and Vocabulary with SRS flashcards',
        theme_color: '#6366f1',
        background_color: '#0f0f23',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'appstore.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'appstore.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'appstore.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ],
})
