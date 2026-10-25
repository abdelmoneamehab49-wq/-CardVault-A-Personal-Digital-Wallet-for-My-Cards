import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The cloud preview hostname changes between VM restores, so it is supplied at
// startup through PREVIEW_HOST instead of being hardcoded in this file.
const previewHost = process.env.PREVIEW_HOST

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: previewHost ? [previewHost] : undefined,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: previewHost ? [previewHost] : undefined,
  },
})
