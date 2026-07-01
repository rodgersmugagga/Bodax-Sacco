import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development: the built-in proxy forwards /api → localhost:4000
// In production (Render Static Site): VITE_API_BASE_URL is set to the
// deployed API URL (e.g. https://bodax-api.onrender.com) so axios uses
// an absolute URL instead of a relative /api path.
export default defineConfig({
  plugins: [react()],
  define: {
    // Expose the env var to client-side code
    __API_BASE_URL__: JSON.stringify(process.env.VITE_API_BASE_URL || ''),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
