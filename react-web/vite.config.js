import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const appDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(appDir, '..')

function resolveGoogleMapsApiKey(mode) {
  const appEnv = loadEnv(mode, appDir, 'VITE_')
  const repoEnv = loadEnv(mode, repoRoot, 'VITE_')
  return (
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    appEnv.VITE_GOOGLE_MAPS_API_KEY ||
    repoEnv.VITE_GOOGLE_MAPS_API_KEY ||
    ''
  )
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const googleMapsApiKey = resolveGoogleMapsApiKey(mode)
  const isProd = mode === 'production'

  return {
    plugins: [react(), tailwindcss()],
    // Load .env from react-web/ and repo root (docker-compose .env)
    envDir: repoRoot,
    define: {
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(googleMapsApiKey),
    },
    build: {
      sourcemap: !isProd,
      target: 'es2020',
      cssMinify: true,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('@react-google-maps')) return 'maps'
            if (id.includes('recharts') || id.includes('d3-')) return 'charts'
            if (id.includes('framer-motion')) return 'motion'
            if (id.includes('tesseract')) return 'ocr'
            if (id.includes('jspdf')) return 'pdf'
            if (id.includes('react-dom') || id.includes('react-router')) return 'vendor'
            return undefined
          },
        },
      },
    },
    server: {
      proxy: {
        // Spring Boot runs on 8090; calls from fetch('/api/...') work in dev.
        '/api': {
          target: 'http://127.0.0.1:8090',
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://127.0.0.1:8090',
          changeOrigin: true,
        },
      },
    },
  }
})
