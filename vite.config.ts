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
      
      console.log(`Checking certificates:`);
      console.log(`  Key path: ${keyPath}`);
      console.log(`  Cert path: ${certPath}`);
      console.log(`  Key exists: ${fs.existsSync(keyPath)}`);
      console.log(`  Cert exists: ${fs.existsSync(certPath)}`);
      
      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        httpsConfig.key = fs.readFileSync(keyPath);
        httpsConfig.cert = fs.readFileSync(certPath);
        console.log('✓ Using mkcert certificates for HTTPS');
      } else {
        console.warn('⚠️  WARNING: HTTPS enabled but certificates not found!');
        console.warn('   To fix ERR_SSL_VERSION_OR_CIPHER_MISMATCH:');
        console.warn('   1. Install mkcert: https://github.com/FiloSottile/mkcert#installation');
        console.warn('   2. Run: mkcert -install');
        console.warn('   3. Run: mkcert localhost');
        console.warn('   4. Rename files: localhost-key.pem and localhost.pem');
        console.warn('   Or set VITE_DEV_HTTPS=false to use HTTP instead');
      }
    } catch (error) {
      console.error('Error reading certificates:', error);
    }
  }

  const zktlsTarget = env.VITE_ZKTLS_PROXY_TARGET || 'http://localhost:3001';
  const server: Record<string, unknown> = {
    port: 3002,
    host: true,
    open: useHttps ? 'https://localhost:3002' : true,
    strictPort: true,
    proxy: {
      '/api': {
        target: zktlsTarget,
        changeOrigin: true,
      },
    },
  };

  if (useHttps) {
    if (httpsConfig.key && httpsConfig.cert) {
      server.https = { key: httpsConfig.key, cert: httpsConfig.cert };
      console.log('✓ HTTPS enabled with mkcert certificates');
      console.log('✓ Server will be available at: https://localhost:3002');
    } else {
      console.warn('⚠️  Falling back to auto-generated self-signed certificate');
      console.warn('   This may cause ERR_SSL_VERSION_OR_CIPHER_MISMATCH in Chrome');
      server.https = true;
    }
  } else {
    console.log('ℹ️  HTTP mode (HTTPS disabled)');
    console.log('ℹ️  Server will be available at: http://localhost:3002');
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server,
    envDir: '.',
    envPrefix: 'VITE_',
  };
}) 