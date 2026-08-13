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
    // Silencia la advertencia de chunk grande (son librerías externas)
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Vite 8 (Rolldown) requiere manualChunks como función
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Librerías de mapas — solo Patio / Infracción
            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'vendor-maps';
            }
            // Gráficas — solo Dashboard / Infracción
            if (id.includes('recharts')) {
              return 'vendor-charts';
            }
            // PDF / exportación — solo al generar reportes
            if (
              id.includes('jspdf') ||
              id.includes('html2pdf') ||
              id.includes('html2canvas') ||
              id.includes('html-to-image')
            ) {
              return 'vendor-pdf';
            }
            // Excel — solo CargaExcel
            if (id.includes('xlsx')) {
              return 'vendor-xlsx';
            }
            // React core
            if (id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
          }
        },
      },
    },
  },
})
