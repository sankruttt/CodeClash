import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow importing the shared scoring config from ../server/src/config
    fs: {
      allow: ['..'],
    },
  },
})
