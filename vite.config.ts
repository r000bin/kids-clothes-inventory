import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // GitHub Pages serves the app under /kids-clothes-inventory/; CI sets BASE_PATH.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
})
