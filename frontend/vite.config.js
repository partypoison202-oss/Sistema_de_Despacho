import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    // Silencia la advertencia de chunk grande para librerías de exportación bajo demanda (xlsx / pdf)
    chunkSizeWarningLimit: 1500,
  },
})
