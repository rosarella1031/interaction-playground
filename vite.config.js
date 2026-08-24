import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Deployed as a GitHub Pages *project* site, so assets are served from
// /interaction-playground/ rather than the domain root.
// https://vite.dev/config/
export default defineConfig({
  base: '/interaction-playground/',
  plugins: [react()],
})
