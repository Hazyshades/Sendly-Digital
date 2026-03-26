import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Disable HTTPS when VITE_DEV_HTTPS=false to avoid ERR_SSL_VERSION_OR_CIPHER_MISMATCH
  // on Windows (Node self-signed cert often uses ciphers rejected by Chrome).
  // Enable HTTPS + mkcert certs (localhost-key.pem, localhost.pem) for Twitch OAuth.
  const useHttps = env.VITE_DEV_HTTPS !== 'false' && env.VITE_DEV_HTTPS !== '0';

  const httpsConfig = {
    key: undefined as Buffer | undefined,
    cert: undefined as Buffer | undefined,
  };

  if (useHttps) {
    try {
      const keyPath = path.resolve(__dirname, 'localhost-key.pem');
      const certPath = path.resolve(__dirname, 'localhost.pem');
      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        httpsConfig.key = fs.readFileSync(keyPath);
        httpsConfig.cert = fs.readFileSync(certPath);
      } else {
        console.warn('HTTPS: certificates not found. Use mkcert localhost or set VITE_DEV_HTTPS=false.');
      }
    } catch (error) {
      console.error('Error reading certificates:', error);
    }
  }

  const zktlsTarget = env.VITE_ZKTLS_PROXY_TARGET || 'http://localhost:3002';
  const server: Record<string, unknown> = {
    port: 3000,
    host: true,
    open: useHttps ? 'https://localhost:3000' : true,
    strictPort: true,
    proxy: {
      '/api': {
        target: zktlsTarget,
        changeOrigin: true,
      },
    },
  };

  if (useHttps) {
    if (httpsConfig.key && httpsConfig.cert) server.https = { key: httpsConfig.key, cert: httpsConfig.cert };
    else server.https = true;
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        buffer: 'buffer/',
      },
    },
    define: {
      global: 'globalThis',
    },
    optimizeDeps: {
      include: ['buffer'],
    },
    server,
    envDir: '.',
    envPrefix: 'VITE_',
  };
}) 