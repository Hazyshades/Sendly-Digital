import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, ArrowLeft, Tag, Clock } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { VerificationInfographic } from '../components/VerificationInfographic';
import { BlogLayout } from '../components/BlogLayout';

interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  tags: string[];
  readTime?: string;
  content: string;
  sections?: BlogSection[];
  images?: BlogImage[];
}

interface BlogSection {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
  imageId?: string;
}

interface BlogImage {
  id: string;
  src?: string;
  componentId?: 'verification-infographic';
  alt: string;
  caption: string;
}

const blogPosts: Record<string, BlogPost> = {
  privy_results: {
    slug: 'privy_results',
    title: 'Privy testnet results: metrics, methodology, and takeaways',
    description:
      'Testnet metrics, the Privy + OAuth token workflow, how we verify data, and main practical takeaways.',
    date: '2026-02-10',
    category: 'Technology',
    tags: ['Privy', 'OAuth', 'Testnet'],
    readTime: '8 min',
    images: [
      {
        id: 'verification-flow',
        componentId: 'verification-infographic',
        alt: 'Verification methodology flow: Privy consistency, on-chain reconciliation, OAuth checks, logging and metrics',
        caption: ''
      }
    ],
    sections: [
      {
        id: 'context',
        title: 'Testnet context',
        paragraphs: [
          'This post summarises the Sendly testnet that used Privy for authentication and social linking. We document the metrics, the working approach with Privy and OAuth tokens, how we verify data, and the main takeaways for product and infrastructure.'
        ]
      },
      {
        id: 'metrics',
        title: 'Aggregate metrics',
        paragraphs: [
          'Over the testnet period we observed the following totals.'
        ],
        bullets: [
          'Total addresses: 10,697.',
          'Total cards sent: 17,667.',
          'Gas spent: 1,131.80 USDC.',
          'Transactions: 22,636.',
          'Total Value Locked: $37,843.03 USDC.'
        ]
      },
      {
        id: 'channels',
        title: 'Breakdown by channel',
        paragraphs: [
          'Distribution across connected platforms (cards and addresses).'
        ],
        bullets: [
          'Twitter: 810 cards, 483 addresses.',
          'Twitch: 77 cards, 34 addresses.',
          'Telegram: 124 cards, 73 addresses.'
        ]
      },
      {
        id: 'privy-oauth-method',
        title: 'Working with Privy and OAuth tokens',
        paragraphs: [
          'Authentication combines Privy (embedded wallet and identity) with OAuth providers (Twitter, Twitch, Telegram, etc.). The user signs in with a provider; we get from Privy verified bindings of social account to wallet.',
          'OAuth tokens are used only within the session and for flows that explicitly need provider API access (e.g. checking subscription or profile). We do not keep tokens longer than needed and request only the scopes we use. On the backend, all calls to providers go through a single layer: token validation, error and rate-limit handling, and logging without storing sensitive payloads.',
          'Privy’s embedded wallet is bound to our app; transaction signing and social-account linking share one login flow. That reduces friction and gives a single source of truth for the social-identity–to–wallet link.'
        ]
      },
      {
        id: 'verification',
        title: 'Verification methodology',
        paragraphs: [
          'Verification runs at several levels.',
          '(1) Privy consistency: we check that returned fields (linked accounts, wallet) match the expected schema and our validation rules.',
          '(2) On-chain reconciliation: card creation, transfers, and gas usage are matched against our records and, when needed, index or subgraph data.',
          '(3) Spot checks with OAuth providers: for a subset of requests we call provider APIs (e.g. to confirm Twitter/Telegram linkage is still valid) so cache and bindings do not drift from the real state.',
          'All discrepancies are logged with a minimal set of identifiers (no tokens or raw secrets). We use them to compute quality metrics (link errors, provider failures, duplicates) and trigger manual review when appropriate.'
        ],
        imageId: 'verification-flow'
      },
      {
        id: 'learnings',
        title: 'Main takeaways',
        paragraphs: [
          'Testnet scale (10k+ addresses and 17k+ cards) showed that the Privy + OAuth setup holds up under load and gives stable social-to-wallet binding. Twitter remains the main channel by cards and addresses; Twitch and Telegram contribute a smaller but measurable share and are worth keeping in product and analytics.',
          'Gas spend in USDC (~1,132 USDC over 22k+ transactions) gives a baseline for cost-per-user and cost-per-operation as we scale. TVL around $38k USDC reflects real usage of deposits on testnet.',
          'On the operations side: a consistent contract with providers (retries, limits, clear errors), minimal token lifetime and scope, and regular reconciliation of on-chain data with internal analytics are important. We will carry these practices into the next product phases.'
        ]
      }
    ],
    content: ''
  },
  zktls_payments_guide: {
    slug: 'zktls_payments_guide',
    title: 'User Guide: Payments (via zkTLS and zkSend)',
    description:
      'How to send and receive payments by social identity in Sendly using zkTLS (proof of account ownership) and the ZkSend contract.',
    date: '2026-02-11',
    category: 'Tutorial',
    tags: ['zkTLS', 'zkSend', 'Payments'],
    readTime: '10 min',
    images: [
      {
        id: 'payments-fees',
        src: '/images/blog/testnet-fees.svg',
        alt: 'Payments and fees on zkSync',
        caption: 'On-chain fees and payments on zkSync'
      }
    ],
    sections: [
      {
        id: 'how-it-works',
        title: 'How it works (TL;DR)',
        paragraphs: [
          'Sender creates a payment on the smart contract, specifying the recipient as platform:username (e.g., twitter:alice), not a wallet address. Funds are locked in the contract and wait for the recipient.',
          'Recipient opens the Payments section, proves ownership of the social account (via zkTLS-proof), and clicks Claim. The contract verifies the proof and sends the funds to the recipient\'s wallet.',
          'Important: the recipient receives money to their own wallet, but the sender doesn\'t need to know their address — just the username.'
        ],
        imageId: 'payments-fees'
      },
      {
        id: 'prerequisites',
        title: 'Prerequisites',
        paragraphs: [
          'Wallet: MetaMask / Rabby / Circle Wallet (Sendly Internal Wallet).',
          'Tokens to send: USDC or EURC.',
          'Social account on a supported platform (Twitter/X, Twitch, GitHub, Telegram, LinkedIn, etc.).'
        ]
      },
      {
        id: 'platform-username',
        title: 'Important rules for platform:username',
        paragraphs: [
          'Identity is normalized before sending/searching: Platform is converted to lowercase, trimmed; alias x → twitter. Username is trimmed and lowercased. If you enter @username, the @ symbol is ignored.',
          'Examples: Twitter + @Alice → twitter:alice, x + Bob → twitter:bob. Tip: enter the username exactly as it appears in the profile (without extra spaces).'
        ]
      },
      {
        id: 'sending',
        title: 'Sending a payment (Send tab)',
        paragraphs: [
          'Open zk.sendly.digital and go to the payments section. Connect your wallet using the Connect wallet button. Open the Send tab.',
          'In the Amount field, enter the amount (e.g., 10). Select the token (USDC or EURC). In the To block: select the platform (icon on the right), enter the recipient\'s username (or email for Gmail, if enabled). Click Send and confirm the transaction in your wallet.',
          'The contract creates a payment and assigns it a paymentId. The payment becomes visible to the recipient in the Receive tab (if they enter the same platform:username).',
          'Tips: If the Send button is inactive — check that a wallet is connected, amount is > 0, and username is valid. For some platforms, selection may be unavailable in the UI (e.g., if the platform is temporarily disabled).'
        ]
      },
      {
        id: 'receiving',
        title: 'Receiving a payment (Receive tab)',
        paragraphs: [
          'Open .../payments and connect your wallet. Go to the Receive tab. Enter your username and select the platform (this should be the account the payment was sent to). Wait for the pending payments list to auto-load (or click Refresh).',
          'To prove ownership: for various platforms, you\'ll be offered a button like Connect Twitter / X, Connect Twitch, Connect GitHub, Connect Telegram, Connect LinkedIn, etc. Click Connect ... and complete the authorization (usually opens a popup/redirect). After connecting, return to Payments and click Refresh if needed.'
        ],
        bullets: [
          'Connection tokens are used to obtain zkTLS-proof and are stored only in your browser (localStorage).',
          'We do not store these tokens on our servers — they are used only locally for proof generation.',
          'Only use this connection on your own device.'
        ]
      },
      {
        id: 'claim',
        title: 'Claim: how to collect your funds',
        paragraphs: [
          'When pending payments are loaded, you\'ll see cards with paymentId, from (sender\'s address), amount and token.'
        ],
        bullets: [
          'Claim a single payment: Click Claim next to the desired paymentId. Confirm the transaction in your wallet. On success, the interface will show a link to the transaction in the block explorer.',
          'Claim multiple payments (Claim all): If you have multiple payments, click Claim all and confirm a single transaction. Note: claim uses the currently connected wallet — funds will be sent there.'
        ]
      },
      {
        id: 'troubleshooting',
        title: 'Troubleshooting (FAQ)',
        paragraphs: [
          'Below are common errors encountered in Payments and what usually helps.'
        ],
        bullets: [
          '"Unsupported platform" — Select a different platform in the selector.',
          '"Connect Twitter/Twitch/GitHub/Telegram/LinkedIn … to generate proof" — Go to Receive tab, select platform, enter username, click Connect ... and complete connection, then Refresh.',
          '"Proof username mismatch" — Check that you selected the correct platform and entered the correct username. If you connected the wrong account — reconnect the social account (Reconnect).',
          '"Reclaim proof signatures are incomplete … Regenerate proof" — Click Regenerate proof and try again. If it repeats — wait 1–5 minutes and retry.',
          '"Reclaim proof verification failed (backend)" / "zkFetch proof failed …" — Click Refresh, reconnect the social account, regenerate the proof if using Reclaim proof mode.',
          '"No pending payments." — Check that you selected the same platform and username, click Refresh, ensure you\'re in .../payments on the zk domain.'
        ]
      },
      {
        id: 'security',
        title: 'Security and Privacy',
        paragraphs: [
          'Never share access to your wallet and don\'t confirm unclear transactions. Connecting social accounts may store tokens in your browser for convenience — don\'t do this on public/shared computers. If you need to reset connections — use Disconnect (if available) or clear site data in your browser. Proof is used to confirm ownership of platform:username, but the goal is to not reveal unnecessary data.'
        ]
      },
      {
        id: 'transparency',
        title: 'Transparency: how to verify the ZkSend contract (optional)',
        paragraphs: [
          'If you want to make sure the contract is truly verified and matches the source code: After a successful Send or Claim, open the transaction via the link in the UI. Go to the contract page from the transaction and verify that the contract is marked as Verified.'
        ]
      }
    ],
    content: ''
  }
};

export function BlogPostRoute() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [activeImage, setActiveImage] = useState<BlogImage | null>(null);

  const post = slug ? blogPosts[slug] : null;

  if (!post) {
    return (
      <BlogLayout backLink={{ to: '/blog', label: <><ArrowLeft className="w-4 h-4" /> Back to blog</> }}>
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Post Not Found</h1>
          <p className="text-gray-600 mb-6">The requested post does not exist.</p>
          <button
            onClick={() => navigate('/blog')}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to blog
          </button>
        </div>
      </BlogLayout>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Simple markdown-like content rendering
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    const elements: ReactNode[] = [];
    let currentParagraph: string[] = [];
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    let currentList: string[] = [];
    let listKey = 0;

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        elements.push(
          <p key={`p-${elements.length}`} className="mb-4 text-gray-700 leading-relaxed text-lg">
            {currentParagraph.join(' ')}
          </p>
        );
        currentParagraph = [];
      }
    };

    const flushList = () => {
      if (currentList.length > 0) {
        elements.push(
          <ul key={`ul-${listKey++}`} className="list-disc list-inside mb-6 space-y-2 text-gray-700 text-lg ml-4">
            {currentList.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    lines.forEach((line, index) => {
      if (line.trim().startsWith('```')) {
        flushList();
        flushParagraph();
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${index}`} className="bg-gray-100 p-4 rounded-lg overflow-x-auto my-6">
              <code className="text-sm">{codeBlockContent.join('\n')}</code>
            </pre>
          );
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      if (line.trim().startsWith('# ')) {
        flushList();
        flushParagraph();
        elements.push(
          <h2 key={`h2-${index}`} className="text-4xl font-bold text-gray-900 mt-12 mb-6">
            {line.replace('# ', '')}
          </h2>
        );
      } else if (line.trim().startsWith('## ')) {
        flushList();
        flushParagraph();
        elements.push(
          <h3 key={`h3-${index}`} className="text-3xl font-semibold text-gray-900 mt-8 mb-4">
            {line.replace('## ', '')}
          </h3>
        );
      } else if (line.trim().startsWith('### ')) {
        flushList();
        flushParagraph();
        elements.push(
          <h4 key={`h4-${index}`} className="text-2xl font-semibold text-gray-900 mt-6 mb-3">
            {line.replace('### ', '')}
          </h4>
        );
      } else if (line.trim().startsWith('- ')) {
        flushParagraph();
        currentList.push(line.replace('- ', ''));
      } else if (/^\d+\./.test(line.trim())) {
        flushParagraph();
        currentList.push(line.replace(/^\d+\.\s*/, ''));
      } else if (line.trim() === '') {
        flushList();
        flushParagraph();
      } else {
        flushList();
        currentParagraph.push(line.trim());
      }
    });

    flushList();
    flushParagraph();

    return <div className="prose prose-lg max-w-none">{elements}</div>;
  };

  useEffect(() => {
    if (!activeImage) {
      return;
    }

    // Close the image preview on Escape for better accessibility.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveImage(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeImage]);

  const renderSections = (
    sections: BlogSection[],
    images: BlogImage[],
    cohereStyle = false
  ) => {
    const imageMap = new Map(images.map((image) => [image.id, image]));

    return (
      <div className={cohereStyle ? 'space-y-0' : 'space-y-12'}>
        {sections.map((section, index) => {
          const sectionImage = section.imageId ? imageMap.get(section.imageId) : null;
          const isLastSection = index === sections.length - 1;

          return (
            <section
              key={section.id}
              id={section.id}
              className={`scroll-mt-28 grid grid-cols-1 ${cohereStyle ? 'gap-6' : 'gap-10'} ${
                cohereStyle
                  ? 'blog-content-section lg:grid-cols-[280px,minmax(0,1fr)]'
                  : 'lg:grid-cols-[280px,minmax(0,1fr)]'
              }`}
            >
              <div>
                {sectionImage && (
                  sectionImage.componentId === 'verification-infographic' ? (
                    <div className="w-full">
                      <button
                        type="button"
                        onClick={() => setActiveImage(sectionImage)}
                        className="w-full text-left rounded-xl overflow-hidden bg-[#FAFAFA]"
                        aria-label={`Open: ${sectionImage.caption}`}
                      >
                        <VerificationInfographic compact />
                        <div className="mt-3 text-sm text-gray-600">{sectionImage.caption}</div>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveImage(sectionImage)}
                      className="w-full text-left"
                      aria-label={`Open image: ${sectionImage.caption}`}
                    >
                      <img
                        src={sectionImage.src}
                        alt={sectionImage.alt}
                        loading="lazy"
                        className="w-full h-40 object-cover rounded-xl"
                      />
                      <div className="mt-3 text-sm text-gray-600">{sectionImage.caption}</div>
                    </button>
                  )
                )}
              </div>
              <div
                className={
                  cohereStyle
                    ? `px-4 md:px-6 ${isLastSection ? 'pb-12' : ''}`
                    : `px-12 md:px-22 ${isLastSection ? 'pb-12 md:pb-22' : ''}`
                }
              >
                <h2
                  className={
                    cohereStyle
                      ? 'text-2xl md:text-3xl font-medium text-gray-900 mb-6 tracking-tight'
                      : 'text-3xl md:text-4xl font-bold text-gray-900 mb-4'
                  }
                >
                  {section.title}
                </h2>
                <div
                  className={
                    cohereStyle
                      ? 'space-y-5 text-gray-600 text-lg leading-[1.7] font-normal'
                      : 'space-y-4 text-gray-700 text-lg leading-relaxed'
                  }
                >
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {section.bullets && section.bullets.length > 0 && (
                  <ul
                    className={
                      cohereStyle
                        ? 'list-disc list-inside mt-6 space-y-3 text-gray-600 text-lg leading-[1.7]'
                        : 'list-disc list-inside mt-6 space-y-2 text-gray-700 text-lg'
                    }
                  >
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          );
        })}
      </div>
    );
  };

  const hasEnhancedLayout = Boolean(post.sections?.length && post.images?.length);

  const backLink = { to: '/blog' as const, label: <><ArrowLeft className="w-4 h-4" /> Back to blog</> };

  return (
    <BlogLayout backLink={backLink} cohereTypography={hasEnhancedLayout}>
      {hasEnhancedLayout ? (
        <>
          {/* Hero - full width, centered (no TOC beside it) */}
          <div
            className="flex flex-col items-center text-center max-w-3xl mx-auto w-full"
            style={{ paddingTop: 6, paddingBottom: 6 }}
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="px-4 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
                {post.category}
              </span>
              {post.readTime && (
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {post.readTime}
                </span>
              )}
            </div>
            <h1 className="hero-title text-gray-900">{post.title}</h1>
            <p className="hero-subtitle max-w-2xl mx-auto mb-12">
              {post.description}
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center justify-center gap-4 pb-6 border-b border-gray-200 flex-wrap">
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(post.date)}
              </span>
              <div className="flex flex-wrap gap-2 justify-center">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-50 text-gray-600 text-sm rounded-md flex items-center gap-1"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Grid: sections + footer | TOC (TOC aligns with first section) */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr,240px] gap-8 items-start">
            <article className="relative">
              {post.sections && post.images &&
                renderSections(post.sections, post.images, true)}
              <div className="pt-12 border-t border-gray-200 mt-12">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => navigate('/blog')}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to blog
                  </button>
                  <div className="text-sm text-gray-500">
                    Published {formatDate(post.date)}
                  </div>
                </div>
              </div>
            </article>

            {/* TOC - aligns with first section */}
            <aside className="lg:sticky lg:top-24 h-fit">
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">
                  Contents
                </p>
                <nav className="space-y-2 text-sm">
                  {post.sections?.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="block px-3 py-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                    >
                      {section.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          </div>
        </>
      ) : (
        <article className="max-w-3xl mx-auto">
          {/* Meta info */}
          <div className="flex items-center gap-3 mb-6">
            <span className="px-4 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-full">
              {post.category}
            </span>
            {post.readTime && (
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {post.readTime}
              </span>
            )}
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {post.title}
          </h1>

          <p className="text-xl text-gray-600 mb-6">
            {post.description}
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-gray-200 mb-8">
            <span className="text-sm text-gray-500 flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(post.date)}
            </span>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gray-50 text-gray-600 text-sm rounded-md flex items-center gap-1"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="article-content">
            {renderContent(post.content)}
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate('/blog')}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to blog
              </button>
              <div className="text-sm text-gray-500">
                Published {formatDate(post.date)}
              </div>
            </div>
          </div>
        </article>
      )}

      {activeImage && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setActiveImage(null)}
        >
          <div
            className="relative max-w-5xl w-full bg-white rounded-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveImage(null)}
              className="absolute right-4 top-4 z-10 bg-white/90 text-gray-700 rounded-full px-3 py-1 text-sm hover:bg-white"
            >
              Close
            </button>
            {activeImage.componentId === 'verification-infographic' ? (
              <div className="bg-[#FAFAFA] overflow-hidden">
                <TransformWrapper
                  initialScale={1}
                  minScale={0.5}
                  maxScale={3}
                  centerOnInit
                  doubleClick={{ mode: 'zoomIn' }}
                >
                  <TransformComponent
                    wrapperStyle={{ width: '100%', maxHeight: '70vh' }}
                    contentStyle={{ minHeight: '400px' }}
                  >
                    <VerificationInfographic embedded />
                  </TransformComponent>
                </TransformWrapper>
                <p className="px-4 py-2 text-xs text-gray-500 text-center border-t border-gray-100">
                  Scroll or pinch to zoom · Double-tap to zoom in
                </p>
              </div>
            ) : (
              <img
                src={activeImage.src}
                alt={activeImage.alt}
                className="w-full max-h-[75vh] object-contain bg-gray-900"
              />
            )}
            <div className="p-4 text-sm text-gray-600">{activeImage.caption}</div>
          </div>
        </div>
      )}
    </BlogLayout>
  );
}
