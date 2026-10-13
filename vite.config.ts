import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { devApiPlugin } from './src/server/dev-middleware.ts';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devApiPlugin()],
});
