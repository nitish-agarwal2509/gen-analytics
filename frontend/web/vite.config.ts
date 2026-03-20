import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.BACKEND_URL || 'http://localhost:8000'

  console.log(`[Vite] Proxying API calls to: ${backendUrl}`)

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
    },
    base: '/web/',
    server: {
      port: 3000,
      proxy: {
        '/run_sse': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/run': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/apps': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/list-apps': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/health': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
