// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Configuración para el servidor de desarrollo
    port: 5173
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      // 1. Configuración de entrada (input) para incluir el Service Worker
      input: {
        main: './index.html',
        sw: './public/service-worker.js' // Archivo del Service Worker que deseas incluir
      },
      // 2. Configuración de salida (output) para los "chunks" manuales
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        }
      }
    }
  }
})
