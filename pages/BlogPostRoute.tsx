import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, ArrowLeft, Tag, Clock } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { VerificationInfographic } from '../components/figma/VerificationInfographic';
import { ZkTLSInfographic } from '../components/figma/ZkTLSInfographic';
import { ZkTLSArchitectureInfographic } from '../components/figma/ZkTLSArchitectureInfographic';
import { PrivyOAuthInfographic } from '../components/figma/PrivyOAuthInfographic';
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
  componentId?: 'verification-infographic' | 'zktls-infographic' | 'zktls-architecture-infographic' | 'privy-oauth-infographic';
  alt: string;
  caption: string;
}

const blogPosts: Record<string, BlogPost> = {
  privy_results: {
    slug: 'privy_results',
    title: 'Privy testnet results: metrics, methodology, and takeaways',
    description:
      'Privy testnet: 10k+ addresses, 17k+ cards, ~$0.05/tx gas cost. How the Privy + OAuth identity pipeline worked, three-level verification methodology, and operational takeaways.',
    date: '2026-02-10',
    category: 'Technology',
    tags: ['Privy', 'OAuth', 'Testnet'],
    readTime: '6 min',
    images: [
      {
        id: 'verification-flow',
        componentId: 'verification-infographic',
        alt: 'Verification methodology flow: Privy consistency, on-chain reconciliation, OAuth checks, logging and metrics',
        caption: ''
      },
      {
        id: 'privy-oauth-flow',
        componentId: 'privy-oauth-infographic',
        alt: 'Privy + OAuth pipeline: User authentication, JWT validation, MPC key management, OAuth gateway, provider API calls',
        caption: ''
      }
    ],
    sections: [
      {
        id: 'context',
        title: 'Testnet context',
        paragraphs: [
          'In the Sendly testnet Privy served as the single identity and embedded-wallet provider: social accounts were bound to a wallet in one login, OAuth tokens were used only within the session for API checks, and all provider calls went through a shared layer with error handling and rate-limiting. Quality was assessed via three-level verification: Privy schema \u2192 on-chain reconciliation \u2192 spot-checks via providers.'
        ]
      },
      {
        id: 'metrics',
        title: 'Aggregate metrics',
        paragraphs: [
          'Totals and derived values for the testnet period:'
        ],
        bullets: [
          'Addresses: 10,697. Cards sent: 17,667. Transactions: 22,636.',
          'Gas spent: 1,131.80 USDC \u2192 cost per tx \u2248 $0.05.',
          'TVL: $37,843.03 USDC \u2192 TVL per user \u2248 $3.54.',
          'Channel breakdown (cards / addresses / share of cards): Twitter \u2014 810 / 483 / 80.1%, Telegram \u2014 124 / 73 / 12.3%, Twitch \u2014 77 / 34 / 7.6%.',
          'Twitter dominates by volume; Telegram and Twitch contribute a smaller but measurable share worth keeping in product and analytics.'
        ]
      },
      {
        id: 'privy-oauth-method',
        title: 'Privy + OAuth pipeline',
        paragraphs: [
          'Flow: user authenticates via Privy; Privy returns a JWT with linked accounts and an embedded wallet address; our backend validates the JWT signature and checks the linked-accounts schema. The embedded wallet key is managed by Privy (MPC split between Privy infrastructure and the user\'s device); our app never holds the full private key. Transaction signing and social-account linking share one login flow.',
          'OAuth tokens: session-scoped, minimal scopes (e.g. read:user for Twitter, openid for Twitch). Tokens are used only for provider API calls that need them (profile check, subscription status) and discarded at session end. Backend calls go through a single gateway: JWT validation, provider call with retry (3x exponential backoff, 429/5xx handling), structured logging (request ID, status, latency; no tokens or secrets in logs).'
        ],
        imageId: 'privy-oauth-flow'
      },
      {
        id: 'verification',
        title: 'Verification methodology',
        paragraphs: [
          'Three levels: (1) Privy consistency \u2014 returned fields (linked accounts, wallet) are validated against expected schema. (2) On-chain reconciliation \u2014 card creation, transfers, gas usage matched against internal records and, when needed, indexer/subgraph data. (3) Spot checks \u2014 for a subset of requests we call provider APIs (e.g. confirm Twitter/Telegram linkage is still valid) to prevent cache drift.',
          'Discrepancies are logged with request IDs only (no tokens or secrets). Quality metrics computed: link errors, provider failures, duplicates. Manual review triggered when thresholds are exceeded.'
        ],
        imageId: 'verification-flow'
      },
      {
        id: 'security',
        title: 'Security considerations',
        paragraphs: [
          'Key custody: the embedded wallet private key is MPC-split between Privy infrastructure and the user\'s device. Our backend never has access to the full key. Provider API tokens are held only in server memory during the session and are never persisted to disk or database.',
          'Client-side storage: Privy SDK stores the user session token in localStorage. This is vulnerable to XSS. Mitigations: strict Content-Security-Policy, no inline scripts, subresource integrity on third-party bundles. On shared/public devices users should sign out explicitly to clear storage.',
          'Audit logging: all provider calls are logged with request ID, HTTP status, and latency. No OAuth tokens, secrets, or PII appear in logs. Logs are retained for 30 days for incident response.'
        ]
      },
      {
        id: 'learnings',
        title: 'Operational takeaways',
        paragraphs: [
          'At ~$0.05/tx the gas cost is viable for production. TVL per user ($3.54) sets a baseline for deposit incentive design. Twitter accounts for 80% of cards \u2014 Telegram (12%) and Twitch (8%) are worth supporting but secondary in priority.',
          'Provider SLA: implement retries with exponential backoff (3x, cap 30s) and circuit-breaker per provider. Keep OAuth token TTL minimal (session-only) and request only the scopes actually used. Run on-chain \u2194 analytics reconciliation daily; alert on >1% discrepancy.'
        ]
      }
    ],
    content: ''
  },
  zktls_payments_guide: {
    slug: 'zktls_payments_guide',
    title: 'User Guide: Payments (zkTLS and zkSend)',
    description:
      'With Sendly you can send money to platform:username \u2014 the recipient proves control of the account via a secure process (zkTLS), after which the contract transfers funds to their wallet.',
    date: '2026-02-11',
    category: 'Tutorial',
    tags: ['zkTLS', 'zkSend', 'Payments'],
    readTime: '8 min',
    images: [
      {
        id: 'zktls-flow',
        componentId: 'zktls-infographic',
        alt: 'zkTLS Protocol Flow: Connect account, TLS encryption, Create claim, Cryptographic proof',
        caption: ''
      },
      {
        id: 'zktls-architecture',
        componentId: 'zktls-architecture-infographic',
        alt: 'zkTLS Architecture Overview: User Device, Attestor, Social Platform, Smart Contract, Blockchain',
        caption: ''
      },
  
      {
        id: 'send-tab',
        src: '/Send.png',
        alt: 'Send tab — sending a payment',
        caption: ''
      },
      {
        id: 'receive-tab',
        src: '/Receive.png',
        alt: 'Receive tab — receiving a payment',
        caption: ''
      }
    ],
    sections: [
      {
        id: 'what-is-zktls',
        title: 'What is zkTLS',
        paragraphs: [
          'zkTLS is a protocol for proving account ownership without sharing credentials. Your device creates a signed claim via a local proof-generation process; the attestor validates that the TLS session to the social platform succeeded and signs the claim; the smart contract verifies it before payout.',
          'The attestor acts as an opaque proxy: it relays encrypted TLS traffic between your device and the platform and attests that the handshake and data exchange completed correctly. TLS keys never leave your device\u2014you hold the client-side TLS session, and the attestor only observes metadata (that a successful session occurred) and signs a claim. It cannot decrypt or access your data.',
          'In Sendly Payments, zkTLS proofs verify control of platform:username (e.g. twitter:alice). The claim structure typically includes fields such as claimId, identifier (platform:username), timestamp, and requestUrl. The attestor signs the claim (e.g. ECDSA), and the contract checks the signature before releasing funds.'
        ],
        bullets: [
          'Signed claim format: claimId, identifier (platform:username), timestamp, requestUrl, and attestor signature.',
          'The attestor does not terminate TLS; it validates the client\u2013server session. Client TLS keys stay on your device.',
          'Smart contract verifies the attestor\u2019s signature on the claim before executing the payout.'
        ],
        imageId: 'zktls-flow'
      },
      {
        id: 'architecture',
        title: 'Architecture',
        paragraphs: [
          'Flow: User Device \u2192 Attestor (opaque relay and signer) \u2192 Social Platform. The attestor validates the TLS session and signs the claim; the claim is submitted to the smart contract on-chain, which verifies the signature and releases funds to the recipient\u2019s wallet.'
        ],
        imageId: 'zktls-architecture'
      },
      {
        id: 'how-it-works',
        title: 'How it works',
        paragraphs: [
          'Sender creates a payment on the smart contract, specifying the recipient as platform:username (e.g., twitter:alice), not a wallet address. Funds are locked in the contract and wait for the recipient.',
          'Recipient opens the Payments section, proves ownership of the social account (zkTLS-proof), and clicks Claim. The contract verifies the proof and sends the funds to the recipient\'s wallet.',
          'Important: the recipient receives money to their own wallet, but the sender doesn\'t need to know their address - just the username.'
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
          'Normalization: platform is lowercased and trimmed; alias x \u2192 twitter. Username is trimmed and lowercased; @ is stripped. Examples: Twitter + @Alice \u2192 twitter:alice, x + Bob \u2192 twitter:bob.',
          'Validation: username max length 64 characters; allowed characters: letters, digits, underscores, hyphens. Invalid or overlong usernames are rejected by the UI and contract.'
        ]
      },
      {
        id: 'sending',
        title: 'Sending a payment (Send tab)',
        paragraphs: [
          'Steps:',
          '(1) Open zk.sendly.digital \u2192 Payments \u2192 Send tab.',
          '(2) Connect your wallet.',
          '(3) Enter amount, select token (USDC or EURC), select platform, enter recipient username.',
          '(4) Click Send and confirm in wallet. The contract creates a payment with a paymentId; it becomes visible in Receive tab for the same platform:username.'
        ],
        bullets: [
          'Send button inactive: ensure wallet is connected, amount > 0, username valid.',
          'Platform unavailable: some platforms may be temporarily disabled in the UI.'
        ],
        imageId: 'send-tab'
      },
      {
        id: 'receiving',
        title: 'Receiving a payment (Receive tab)',
        paragraphs: [
          'Steps:',
          '(1) Open Payments \u2192 Receive tab, connect wallet.',
          '(2) Enter username and select platform.',
          '(3) Wait for pending payments (or click Refresh).',
          '(4) To prove ownership: click Connect Twitter/X, Connect Twitch, Connect GitHub, Connect Telegram, or Connect LinkedIn; complete OAuth; return and Refresh.'
        ],
        imageId: 'receive-tab'
      },
      {
        id: 'claim',
        title: 'Claim: how to collect your funds',
        paragraphs: [
          'Cards show paymentId, sender address, amount, token. Single: click Claim \u2192 confirm in wallet. Multiple: click Claim all \u2192 confirm once. Funds go to the connected wallet.'
        ]
      },
      {
        id: 'troubleshooting',
        title: 'Troubleshooting',
        paragraphs: [
          'Common errors and fixes:'
        ],
        bullets: [
          'Unsupported platform \u2192 Select a different platform.',
          'Connect \u2026 to generate proof \u2192 Receive tab: select platform, enter username, click Connect, complete OAuth, Refresh.',
          'Proof username mismatch \u2192 Check platform and username; reconnect social account if wrong.',
          'Reclaim proof signatures incomplete \u2192 Regenerate proof; wait 1\u20135 min and retry if it repeats.',
          'Reclaim proof verification failed / zkFetch proof failed \u2192 Refresh; reconnect account; regenerate proof.',
          'No pending payments \u2192 Same platform and username; Refresh; ensure you are on .../payments (zk domain).'
        ]
      },
      {
        id: 'security',
        title: 'Security considerations',
        paragraphs: [
          'Connection tokens are stored in your browser (localStorage) to obtain zkTLS proofs. We do not store them on our servers. Risk: XSS can read localStorage. Mitigations: use a browser without malicious extensions; avoid public/shared devices.',
          'Token lifetime: connection tokens are session-scoped and should be refreshed or disconnected when no longer needed. On shared devices, use Disconnect (if available) or clear site data after use.',
          'Wallet: never share access or confirm unclear transactions. Proofs only attest platform:username ownership; no credentials or sensitive data are exposed on-chain.'
        ]
      }
    ],
    content: ''
  },
  nft_gift_cards_guide: {
    slug: 'nft_gift_cards_guide',
    title: 'NFT Gift Cards — User Guide',
    description:
      'An NFT gift card is a digital card minted on-chain. You choose the amount, add a message, and send it either to a wallet address or to someone\'s social username.',
    date: '2026-02-11',
    category: 'Tutorial',
    tags: ['NFT', 'Gift Cards', 'Tutorial'],
    readTime: '8 min',
    images: [
      {
        id: 'nft-flow',
        src: '/nft_create.png',
        alt: 'NFT gift cards on-chain',
        caption: 'On-chain NFT gift cards'
      }
    ],
    sections: [
      {
        id: 'intro',
        title: 'Overview',
        paragraphs: [
          'An NFT gift card is a digital card minted on-chain. You choose the amount, add a message, and send it either to a wallet address or to someone\'s social username.',
          'Once claimed, the card lives in the recipient\'s wallet as an ERC-721 NFT.'
        ],
        imageId: 'nft-flow'
      },
      {
        id: 'how-it-works',
        title: 'How it works',
        paragraphs: [
          'You create a card on the Create page. Choose how to send it: directly to a wallet address, or to a social username (Twitter, Twitch, Telegram, TikTok, Instagram). Enter the amount (USDC or EURC). Add a message (optional password protection available). Confirm the transaction in your wallet.',
          'The smart contract mints an ERC-721 NFT. Metadata and image are stored on IPFS (via Pinata). If you send it to a username, the card is held in a platform vault until the owner proves control of that account.'
        ]
      },
      {
        id: 'recipient',
        title: 'What the recipient does',
        paragraphs: [
          'If sent to a wallet address: The NFT appears in that wallet after minting.',
          'If sent to a username: The recipient logs in with that platform. After authentication, they can claim the card. If they don\'t yet have a wallet, one is created automatically through Circle.'
        ]
      },
      {
        id: 'after-claiming',
        title: 'After claiming',
        paragraphs: [
          'The NFT gift card is now in the recipient\'s wallet. They can use it in apps that support NFT gift cards.',
          'The value is stored in USDC or EURC and is redeemed according to the app\'s logic.'
        ]
      },
      {
        id: 'requirements',
        title: 'Requirements',
        paragraphs: [],
        bullets: [
          'Wallet: MetaMask, Rabby, or Circle wallet',
          'Tokens: USDC or EURC on ARC Testnet',
          'A supported social account (if sending or receiving by username)'
        ]
      },
      {
        id: 'common-issues',
        title: 'Common issues',
        paragraphs: [],
        bullets: [
          'No card visible → Make sure you logged in with the correct platform account.',
          'Claim fails → Check you are on ARC Testnet and have enough gas.',
          'Wrong recipient → Blockchain transactions cannot be reversed. Double-check before sending.',
          'Password lost → Only the sender knows it.'
        ]
      },
      {
        id: 'security',
        title: 'Security notes',
        paragraphs: [
          'Cards are managed by smart contracts on ARC Testnet. Private keys are never stored by the platform.',
          'If you use a Circle wallet, key management is handled by Circle. Never approve transactions you don\'t understand.'
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
                  ) : sectionImage.componentId === 'zktls-infographic' ? (
                    <div className="w-full">
                      <button
                        type="button"
                        onClick={() => setActiveImage(sectionImage)}
                        className="w-full text-left rounded-xl overflow-hidden bg-[#FAFAFA]"
                        aria-label={`Open: ${sectionImage.caption}`}
                      >
                        <ZkTLSInfographic compact />
                        <div className="mt-3 text-sm text-gray-600">{sectionImage.caption}</div>
                      </button>
                    </div>
                  ) : sectionImage.componentId === 'zktls-architecture-infographic' ? (
                    <div className="w-full">
                      <button
                        type="button"
                        onClick={() => setActiveImage(sectionImage)}
                        className="w-full text-left rounded-xl overflow-hidden bg-[#FAFAFA]"
                        aria-label={`Open: ${sectionImage.caption}`}
                      >
                        <ZkTLSArchitectureInfographic compact />
                        <div className="mt-3 text-sm text-gray-600">{sectionImage.caption}</div>
                      </button>
                    </div>
                  ) : sectionImage.componentId === 'privy-oauth-infographic' ? (
                    <div className="w-full">
                      <button
                        type="button"
                        onClick={() => setActiveImage(sectionImage)}
                        className="w-full text-left rounded-xl overflow-hidden bg-[#FAFAFA]"
                        aria-label={`Open: ${sectionImage.caption}`}
                      >
                        <PrivyOAuthInfographic compact />
                        <div className="mt-3 text-sm text-gray-600">{sectionImage.caption}</div>
                      </button>
                    </div>
                  ) : (
                    (() => {
                      const isSendReceive = sectionImage.id === 'send-tab' || sectionImage.id === 'receive-tab';
                      return (
                        <button
                          type="button"
                          onClick={() => setActiveImage(sectionImage)}
                          className={`w-full text-left ${isSendReceive ? 'border-0 shadow-none ring-0 outline-none' : ''}`}
                          aria-label={`Open image: ${sectionImage.alt}`}
                        >
                          <img
                            src={sectionImage.src}
                            alt={sectionImage.alt}
                            loading="lazy"
                            className={`w-full h-40 object-cover ${isSendReceive ? 'rounded-xl border-0 shadow-none' : 'rounded-xl'}`}
                          />
                          {!isSendReceive && sectionImage.caption && (
                            <div className="mt-3 text-sm text-gray-600">{sectionImage.caption}</div>
                          )}
                        </button>
                      );
                    })()
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
          {(() => {
            // Side images (by src) and send/receive: open as-is, no frame. Infographics keep frame.
            const isFramelessPreview =
              activeImage.id === 'send-tab' ||
              activeImage.id === 'receive-tab' ||
              (activeImage.src != null && activeImage.componentId == null);
            return (
          <div
            className={`relative max-w-5xl w-full ${isFramelessPreview ? 'bg-transparent shadow-none overflow-hidden' : 'bg-white rounded-2xl overflow-hidden'}`}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveImage(null)}
              className={`absolute right-4 top-4 z-10 text-sm ${isFramelessPreview ? 'bg-black/50 text-white rounded-full px-3 py-1 hover:bg-black/70' : 'bg-white/90 text-gray-700 rounded-full px-3 py-1 hover:bg-white'}`}
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
            ) : activeImage.componentId === 'zktls-infographic' ? (
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
                    <ZkTLSInfographic embedded />
                  </TransformComponent>
                </TransformWrapper>
                <p className="px-4 py-2 text-xs text-gray-500 text-center border-t border-gray-100">
                  Scroll or pinch to zoom · Double-tap to zoom in
                </p>
              </div>
            ) : activeImage.componentId === 'zktls-architecture-infographic' ? (
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
                    <ZkTLSArchitectureInfographic embedded />
                  </TransformComponent>
                </TransformWrapper>
                <p className="px-4 py-2 text-xs text-gray-500 text-center border-t border-gray-100">
                  Scroll or pinch to zoom · Double-tap to zoom in
                </p>
              </div>
            ) : activeImage.componentId === 'privy-oauth-infographic' ? (
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
                    <PrivyOAuthInfographic embedded />
                  </TransformComponent>
                </TransformWrapper>
                <p className="px-4 py-2 text-xs text-gray-500 text-center border-t border-gray-100">
                  Scroll or pinch to zoom · Double-tap to zoom in
                </p>
              </div>
            ) : (
              <div className={isFramelessPreview ? 'overflow-hidden' : 'rounded-xl overflow-hidden bg-gray-900'}>
                <img
                  src={activeImage.src}
                  alt={activeImage.alt}
                  className="w-full max-h-[75vh] object-contain"
                />
              </div>
            )}
            {!isFramelessPreview && activeImage.caption && (
              <div className="p-4 text-sm text-gray-600">{activeImage.caption}</div>
            )}
          </div>
            );
          })()}
        </div>
      )}
    </BlogLayout>
  );
}
