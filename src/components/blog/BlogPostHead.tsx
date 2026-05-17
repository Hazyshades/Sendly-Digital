import { Helmet } from 'react-helmet-async';
import type { BlogPostMeta } from '@/lib/blog/posts';
import { getCanonicalPostUrl, getOgImageUrl } from '@/lib/blog/posts';

interface BlogPostHeadProps {
  post: BlogPostMeta;
}

export function BlogPostHead({ post }: BlogPostHeadProps) {
  const url = getCanonicalPostUrl(post.slug);
  const image = getOgImageUrl(post);

  return (
    <Helmet>
      <title>{`${post.title} | Sendly`}</title>
      <meta name="description" content={post.description} />
      <link rel="canonical" href={url} />
      <meta property="og:type" content="article" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={post.title} />
      <meta property="og:description" content={post.description} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={post.title} />
      <meta name="twitter:description" content={post.description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
