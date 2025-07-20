import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  define: {
    // Ensure environment variables are properly defined for production builds
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
      process.env.VITE_SUPABASE_URL || ''
    ),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY || ''
    ),
    'import.meta.env.VITE_OPENAI_API_KEY': JSON.stringify(
      process.env.VITE_OPENAI_API_KEY || ''
    ),
    'import.meta.env.VITE_APP_NAME': JSON.stringify(
      process.env.VITE_APP_NAME || 'Baby Names Explorer'
    ),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(
      process.env.VITE_APP_VERSION || '1.0.0'
    ),
    'import.meta.env.PROD': JSON.stringify(
      process.env.NODE_ENV === 'production'
    ),
    'import.meta.env.MODE': JSON.stringify(
      process.env.NODE_ENV || 'development'
    ),
  },
});
