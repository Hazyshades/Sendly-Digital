export const SITE_ORIGIN = 'https://www.sendly.digital';

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  tags: string[];
  readTime?: string;
  coverImage: string;
  ogImage?: string;
}

/** Legacy underscore URLs → canonical kebab-case slugs */
export const LEGACY_SLUG_MAP: Record<string, string> = {
  privy_results: 'privy-results',
  nft_gift_cards_guide: 'nft-gift-cards-guide',
  zktls_payments_guide: 'zktls-payments-guide',
  circle_sdk_wallet_playbook: 'circle-sdk-wallet-playbook',
};

export const BLOG_POSTS: BlogPostMeta[] = [
  {
    slug: 'nft-gift-cards-guide',
    title: 'Send USDC as a Gift Card to Anyone - User Guide',
    description:
      'Create a USDC or EURC gift card and send it to a wallet or verified social username. The recipient can claim it later through Sendly - even if they are new to crypto.',
    date: '2026-02-11',
    category: 'Tutorial',
    tags: ['Gift Cards', 'USDC', 'Arc Testnet'],
    readTime: '8 min',
    coverImage: '/SENDLY GIFT CARD.png',
  },
  {
    slug: 'zktls-payments-guide',
    title: 'zkTLS in Sendly Payments: prove ownership and unlock USDC',
    description:
      'We use platform:username as the recipient identifier (e.g. twitter:alice). zkTLS proves ownership, then the contract unlocks USDC to the recipient wallet.',
    date: '2026-08-01',
    category: 'Tutorial',
    tags: ['zkTLS', 'zkSend', 'Payments'],
    readTime: '8 min',
    coverImage: '/SENDLY-ZKTLS.png',
  },
  {
    slug: 'circle-sdk-wallet-playbook',
    title:
      'Circle Developer-Controlled Wallets in Sendly: From Social Login to Managed Asset Flow',
    description:
      'How Sendly uses Circle Developer-Controlled Wallets so social-only users can mint, claim, top up, and redeem NFT gift cards on Arc Testnet - without crypto wallet',
    date: '2026-06-20',
    category: 'Technology',
    tags: ['Circle', 'Developer Wallets', 'Gateway', 'NFT', 'Arc Testnet', 'Privy'],
    readTime: '12 min',
    coverImage: '/SENDLY x CIRCLE.png',
  },
  {
    slug: 'privy-results',
    title: 'Privy testnet: metrics, methodology, and takeaways',
    description:
      'Roughly 12k wallets, 31k cards sent, ~$89k TVL, ~$315k total volume. Privy as our auth + embedded wallet layer, the checks we ran before trusting a chart, and the operational stuff that actually mattered.',
    date: '2026-04-01',
    category: 'Technology',
    tags: ['Privy', 'OAuth', 'Testnet'],
    readTime: '8 min',
    coverImage: '/images/blog/privy-results-cover.png',
    ogImage: '/images/blog/privy-results-cover.png',
  },
];

/** Slugs listed on /blog and served at /blog/:slug */
export const PUBLIC_BLOG_SLUGS = new Set<string>([
  'nft-gift-cards-guide',
  'privy-results',
  'circle-sdk-wallet-playbook',
  'zktls-payments-guide',
]);

export function resolveBlogSlug(slug: string): string {
  return LEGACY_SLUG_MAP[slug] ?? slug;
}

export function isPublicBlogSlug(slug: string): boolean {
  return PUBLIC_BLOG_SLUGS.has(slug);
}

export function getBlogPostMeta(slug: string): BlogPostMeta | undefined {
  const canonical = resolveBlogSlug(slug);
  return BLOG_POSTS.find((p) => p.slug === canonical);
}

export function toAbsoluteUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const encodedPath = normalized
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
    .replace(/^%2F/, '/');
  return `${SITE_ORIGIN}${encodedPath}`;
}

export function getOgImageUrl(meta: BlogPostMeta): string {
  return toAbsoluteUrl(meta.ogImage ?? meta.coverImage);
}

export function getCanonicalPostUrl(slug: string): string {
  return `${SITE_ORIGIN}/blog/${resolveBlogSlug(slug)}`;
}
