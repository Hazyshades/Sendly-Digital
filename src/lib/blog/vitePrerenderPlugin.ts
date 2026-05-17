import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';
import { getBlogPrerenderRoutes, injectBlogMetaIntoHtml } from './prerenderMeta';

/** After build, emit /blog/:slug/index.html with per-post OG meta for crawlers. */
export function blogPrerenderPlugin(): Plugin {
  return {
    name: 'blog-prerender-meta',
    apply: 'build',
    closeBundle() {
      const distDir = path.resolve(process.cwd(), 'dist');
      const indexPath = path.join(distDir, 'index.html');
      if (!fs.existsSync(indexPath)) {
        console.warn('[blog-prerender] dist/index.html not found, skipping');
        return;
      }
      const baseHtml = fs.readFileSync(indexPath, 'utf8');
      for (const route of getBlogPrerenderRoutes()) {
        const html = injectBlogMetaIntoHtml(baseHtml, route.meta);
        const outDir = path.join(distDir, route.path.replace(/^\//, ''));
        fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
      }
      console.info(`[blog-prerender] wrote ${getBlogPrerenderRoutes().length} blog HTML shells`);
    },
  };
}
