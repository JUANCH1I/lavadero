import { defineConfig } from 'vite'

export default defineConfig({
  // Ubicación de los archivos fuente del frontend.
  root: './src',
  // Base relativa para que Tauri pueda cargar los recursos correctamente.
  base: './',
  build: {
    // Directorio de salida (por ejemplo, "dist") relativo a la raíz del proyecto.
    outDir: '../dist',
  },
})
