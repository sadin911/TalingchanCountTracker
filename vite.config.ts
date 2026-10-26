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
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'card-placeholder.svg',
      ],
      manifest: {
        id: '/',
        name: 'Talingchan Count Tracker - Battle of Talingchan TCG',
        short_name: 'TalingchanCount',
        description: 'สมุดสะสมการ์ดและจัดเด็ค Battle of Talingchan (แบทเทิล ออฟ ตลิ่งชัน)',
        theme_color: '#090a0f',
        background_color: '#090a0f',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,json}'],
        globIgnores: [
          'card-images/**',
          'card-images-hd/**',
          '**/*.map',
        ],
        navigateFallback: '/index.html',
        ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
        runtimeCaching: [
          {
            // Cloudflare R2 Card Images
            urlPattern: /^https:\/\/pub-851c7b1da9514507a99b79bc2fd47577\.r2\.dev\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'r2-card-images',
              expiration: {
                maxEntries: 3000,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
        ],
      },
    }),
  ],
  base: '/',
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
});
