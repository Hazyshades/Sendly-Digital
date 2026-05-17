import { BLOG_POSTS, PUBLIC_BLOG_SLUGS, getOgImageUrl, type BlogPostMeta } from './posts';

export interface BlogPrerenderRoute {
  path: string;
  meta: BlogPostMeta;
}

export function getBlogPrerenderRoutes(): BlogPrerenderRoute[] {
  return BLOG_POSTS.filter((p) => PUBLIC_BLOG_SLUGS.has(p.slug)).map((meta) => ({
    path: `/blog/${meta.slug}`,
    meta,
  }));
}

export function injectBlogMetaIntoHtml(html: string, meta: BlogPostMeta): string {
  const url = `https://www.sendly.digital/blog/${meta.slug}`;
  const image = getOgImageUrl(meta);
  const title = `${meta.title} | Sendly`;
  const tags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeAttr(meta.description)}" />
    <link rel="canonical" href="${escapeAttr(url)}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${escapeAttr(url)}" />
    <meta property="og:title" content="${escapeAttr(meta.title)}" />
    <meta property="og:description" content="${escapeAttr(meta.description)}" />
    <meta property="og:image" content="${escapeAttr(image)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${escapeAttr(url)}" />
    <meta name="twitter:title" content="${escapeAttr(meta.title)}" />
    <meta name="twitter:description" content="${escapeAttr(meta.description)}" />
    <meta name="twitter:image" content="${escapeAttr(image)}" />
  `;

  return html
    .replace(/<meta\s+name="description"[^>]*>/gi, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta\s+property="twitter:[^"]*"[^>]*>/gi, '')
    .replace(/<title>[^<]*<\/title>/i, tags.trim());
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeHtml(value: string): string {
  return escapeAttr(value);
}
