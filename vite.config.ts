import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        id: '/',
        name: 'Talingchan Count Tracker - Battle of Talingchan TCG',
        short_name: 'TalingchanCount',
        description: 'สมุดสะสมการ์ดและจัดเด็ค Battle of Talingchan (แบทเทิล ออฟ ตลิ่งชัน)',
        theme_color: '#090a0f',
        background_color: '#090a0f',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    host: true
  }
});
