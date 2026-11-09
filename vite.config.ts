import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      devOptions: { enabled: true, type: 'module' },
      includeAssets: ['icons/*.svg', 'icons/*.png'],
      manifest: {
        name: 'PulseX – Visual Task Dashboard',
        short_name: 'PulseX',
        description: 'Visual to-do dashboard, weekly report generator and reminders.',
        theme_color: '#0a7aff',
        background_color: '#f2f3f8',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
        shortcuts: [
          { name: 'Today', url: '/tasks?view=today' },
          { name: 'Weekly report', url: '/report' },
        ],
      },
    }),
  ],
})
