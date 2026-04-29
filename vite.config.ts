import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const basePath = normalizeBasePath(process.env.VITE_BASE_PATH)

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['app-icon.svg'],
      manifest: {
        name: 'PWA API Lab',
        short_name: 'PWA Lab',
        description:
          'React test application for checking Progressive Web App API compatibility on desktop and mobile devices.',
        theme_color: '#0f172a',
        background_color: '#020617',
        display: 'standalone',
        scope: basePath,
        start_url: basePath,
        icons: [
          {
            src: 'app-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Compatibility dashboard',
            short_name: 'Dashboard',
            description: 'Open the PWA capability test dashboard.',
            url: basePath,
            icons: [
              {
                src: 'app-icon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
              },
            ],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,png,webmanifest}'],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})

function normalizeBasePath(value = '/'): string {
  if (!value.trim()) {
    return '/'
  }

  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}
