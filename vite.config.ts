import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { blogPrerenderPlugin } from './src/lib/blog/vitePrerenderPlugin'

function copyDirSync(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name)
    const to = path.join(dest, entry.name)
    if (entry.isDirectory()) copyDirSync(from, to)
    else fs.copyFileSync(from, to)
  }
}

const ARCHITECTURE_MOUNT = '/Architecture'
const ARCHITECTURE_MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
}

function architecturePresentationPlugin(): Plugin {
  const src = path.resolve(__dirname, 'html_presentation')
  const dest = path.resolve(__dirname, 'public/Architecture')

  const sync = () => {
    if (!fs.existsSync(src)) return
    copyDirSync(src, dest)
    const legacyIndex = path.join(dest, 'index.html')
    if (fs.existsSync(legacyIndex)) fs.unlinkSync(legacyIndex)
  }

  const serveArchitecture = (
    req: import('http').IncomingMessage,
    res: import('http').ServerResponse,
    next: (err?: unknown) => void,
  ) => {
    const rawUrl = req.url?.split('?')[0] ?? ''
    if (!rawUrl.startsWith(ARCHITECTURE_MOUNT)) return next()

    let rel = decodeURIComponent(rawUrl.slice(ARCHITECTURE_MOUNT.length) || '/')
    if (rel === '/' || rel === '' || rel === '/index.html') rel = '/overview.html'

    const file = path.normalize(path.join(dest, rel.replace(/^\//, '')))
    if (!file.startsWith(dest) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      return next()
    }

    const ext = path.extname(file)
    res.statusCode = 200
    res.setHeader('Content-Type', ARCHITECTURE_MIME[ext] ?? 'application/octet-stream')
    fs.createReadStream(file).pipe(res)
  }

  return {
    name: 'architecture-presentation-sync',
    buildStart: sync,
    configureServer: {
      order: 'pre',
      handler(server) {
        sync()
        server.middlewares.use(serveArchitecture)
      },
    },
  }
}

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
    plugins: [react(), architecturePresentationPlugin(), blogPrerenderPlugin()],
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