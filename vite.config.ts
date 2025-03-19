import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import cors from 'cors'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api/fal': {
        target: 'https://gateway.fal.ai/api/v1/workflows/stable-video-diffusion',
        changeOrigin: true,
        rewrite: (path) => '',
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            if (req.body) {
              const bodyData = JSON.stringify(req.body);
              proxyReq.setHeader('Content-Type', 'application/json');
              proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
              proxyReq.write(bodyData);
            }
          });
        },
      }
    },
    cors: true
  }
}) 