import { useEffect, useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, ArrowLeft, Tag, Clock } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { VerificationInfographic } from '@/components/figma/VerificationInfographic';
import { ZkTLSInfographic } from '@/components/figma/ZkTLSInfographic';
import { ZkTLSArchitectureInfographic } from '@/components/figma/ZkTLSArchitectureInfographic';
import { PrivyOAuthInfographic } from '@/components/figma/PrivyOAuthInfographic';
import { ZkSendPanel } from '@/components/zksend/ZkSendPanel';
import type { SendPaymentPreviewValues } from '@/components/zksend/SendPaymentForm';
import { CreateGiftCardPreview } from '@/components/CreateGiftCardPreview';
import { BlogLayout } from '@/components/BlogLayout';
import { fetchTwitterUserPreview } from '@/lib/twitter/userLookup';

/** Fallback when cache/API has no data or request fails. */
const PAYMENTS_SEND_PREVIEW_FALLBACK: SendPaymentPreviewValues = {
  amount: '100',
  token: 'USDC',
  platform: 'twitter',
  username: 'arc',
  balance: '362.347036',
  suggestionLabel: 'Arc @arc',
};

const BLOG_PREVIEW_USERNAME = 'arc';

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
  paragraphs: (string | React.ReactNode)[];
  bullets?: string[];
  imageId?: string;
}

interface BlogImage {
  id: string;
  src?: string;
  componentId?: 'verification-infographic' | 'zktls-infographic' | 'zktls-architecture-infographic' | 'privy-oauth-infographic' | 'payments-send-embed' | 'payments-receive-embed' | 'gift-card-create-embed';
  alt: string;
  caption: string;
}

const blogPosts: Record<string, BlogPost> = {
  privy_results: {
    slug: 'privy_results',
    title: 'Privy testnet results: metrics, methodology, and takeaways',
    description:
      'Sendly testnet metrics: 11,000 addresses, 31,000 cards, $84,000 TVL and $310,000 total volume. How Privy + OAuth fit our stack, how we verified numbers in three layers, and what we learned running it.',
    date: '2026-02-10',
    category: 'Technology',
    tags: ['Privy', 'OAuth', 'Testnet'],
    readTime: '6 min',
    images: [
      {
        id: 'verification-flow',
        componentId: 'verification-infographic',
        alt: 'Verification flow: Privy fields, on-chain checks against our data, OAuth spot checks, logging',
        caption: ''
      },
      {
        id: 'privy-oauth-flow',
        componentId: 'privy-oauth-infographic',
        alt: 'Privy + OAuth: sign-in, JWT checks, MPC wallet keys, gateway to providers',
        caption: ''
      }
    ],
    sections: [
      {
        id: 'context',
        title: 'Testnet context',
        paragraphs: [
          'During the Sendly testnet, Privy was our only identity and embedded-wallet provider. One login tied social accounts to a wallet. OAuth tokens stayed in-session for API checks only. Every provider call went through one service layer with retries and rate limits. We checked quality in three steps: Privy field schema, on-chain numbers against our records, and occasional live calls to providers.'
        ]
      },
      {
        id: 'metrics',
        title: 'Metrics',
        paragraphs: [
          'Numbers for the testnet period:'
        ],
        bullets: [
          'Addresses: 11,673. Cards sent: 31,700. Transactions: 38,747.',
          'Gas spent: \u2248 770 USDC',
          'TVL: 82,100 USDC + 2,900 EURC (\u2248 85,000 total)',
          'Total volume: \u2248 310,000 USDC and \u2248 5,000 EURC.',
        ]
      },
      {
        id: 'privy-oauth-method',
        title: 'Privy + OAuth pipeline',
        paragraphs: [
          'Users sign in with Privy. Privy returns a JWT with linked accounts and an embedded wallet address. Our backend verifies the signature and checks those fields against our schema. The wallet key sits in Privy\'s MPC setup (split between Privy\'s servers and the user\'s device); we never hold the full private key. Signing transactions and linking social accounts use the same login.',
          'OAuth tokens are short-lived and tightly scoped (for example read:user on Twitter, openid on Twitch). We call provider APIs only when we need them (profile, subscription status) and drop tokens when the session ends. All backend traffic goes through one gateway: validate the JWT, call the provider with retries (three tries, exponential backoff, handle 429/5xx), and log request id, status, and latency. Tokens and secrets never go in logs.'
        ],
        imageId: 'privy-oauth-flow'
      },
      {
        id: 'verification',
        title: 'Verification methodology',
        paragraphs: [
          'We used three checks. (1) Privy payload: linked accounts and wallet fields match what we expect. (2) On-chain: card mints, transfers, and gas line up with our data and, when needed, the indexer or subgraph. (3) Spot checks: on a sample of users we hit provider APIs to confirm Twitter or Telegram links are still real, so cached state does not drift.',
          'When something does not match, we log a request id only (no tokens or secrets). We track link errors, provider failures, and duplicates. If rates cross a threshold, someone reviews by hand.'
        ],
        imageId: 'verification-flow'
      },
      {
        id: 'security',
        title: 'Security considerations',
        paragraphs: [
          'The embedded wallet key is MPC-split between Privy\'s servers and the user\'s device. The backend never sees the full key. Provider API tokens live in server memory for the session only; we do not write them to disk or a database.',
          'The Privy SDK keeps the session token in localStorage, which XSS can read. We mitigate with a strict Content-Security-Policy, no inline scripts, and subresource integrity on third-party bundles. On shared devices, users should sign out to clear storage.',
          'We log every provider call with request id, HTTP status, and latency. OAuth tokens, secrets, and PII are not in logs. We keep logs 240 days for incident response.'
        ]
      },
      {
        id: 'learnings',
        title: 'Operational takeaways',
        paragraphs: [
          'Gas averaged about $0.05 per transaction, which is fine for production. Roughly 80% of cards went through Twitter; Telegram was about 12% and Twitch about 8%. We still support those, but they are lower priority than Twitter.',
        ]
      }
    ],
    content: ''
  },
  zktls_payments_guide: {
    slug: 'zktls_payments_guide',
    title: 'User Guide: Payments (zkTLS and zkSend)',
    description:
      'Send money to platform:username. The recipient proves they control that account (zkTLS), then the contract sends funds to their wallet.',
    date: '2026-02-11',
    category: 'Tutorial',
    tags: ['zkTLS', 'zkSend', 'Payments'],
    readTime: '8 min',
    images: [
      {
        id: 'zktls-flow',
        componentId: 'zktls-infographic',
        alt: 'zkTLS flow: connect account, TLS, create claim, cryptographic proof',
        caption: ''
      },
      {
        id: 'zktls-architecture',
        componentId: 'zktls-architecture-infographic',
        alt: 'zkTLS architecture: device, attestor, platform, contract, chain',
        caption: ''
      },
  
      {
        id: 'send-tab',
        componentId: 'payments-send-embed',
        alt: 'Payments: Send tab (preview)',
        caption: ''
      },
      {
        id: 'receive-tab',
        componentId: 'payments-receive-embed',
        alt: 'Payments: Receive tab (preview)',
        caption: ''
      }
    ],
    sections: [
      {
        id: 'what-is-zktls',
        title: 'What is zkTLS',
        paragraphs: [
          'TLS encrypts traffic to websites (the "s" in HTTPS). It does not by itself let anyone else verify what happened in that session. zkTLS adds a zero-knowledge layer: you can prove something about your Web2 session (for example that you control a social account) without handing over credentials, session keys, or raw responses. A verifier can check that proof on-chain.',
          'Sendly uses a proxy (witness) model. An attestor sits between your device and the social site, relays encrypted TLS traffic, and signs that a real session happened. It does not terminate TLS or hold your client keys. Your device keeps the TLS session; the attestor sees metadata and signs a claim. It cannot read your traffic. We use Reclaim Protocol for this in production.',
          'In Payments, zkTLS proofs back platform:username (e.g. twitter:alice). A claim includes claimId, identifier (platform:username), timestamp, requestUrl, and the attestor signature. The contract checks the signature before it pays out.'
        ],
        bullets: [
          'Claim fields: claimId, identifier (platform:username), timestamp, requestUrl, attestor signature.',
          'The attestor does not terminate TLS; it checks that the client-server session is valid. TLS keys stay on your device.',
          'The contract verifies the attestor signature before paying out.'
        ],
        imageId: 'zktls-flow'
      },
      {
        id: 'architecture',
        title: 'Architecture',
        paragraphs: [
          'Path: your device to the attestor (relay and signer) to the social platform. The attestor validates the TLS session and signs the claim. You submit the claim on-chain; the contract checks the signature and sends funds to the recipient wallet.'
        ],
        imageId: 'zktls-architecture'
      },
      {
        id: 'how-it-works',
        title: 'How it works',
        paragraphs: [
          'The sender sets the recipient as platform:username (e.g. twitter:alice), not a wallet address. Funds sit in the contract until the recipient claims.',
          'The recipient opens Payments, proves they own the account (zkTLS proof), and clicks Claim. The contract checks the proof and pays their wallet.',
          'The sender never needs the recipient\'s address; the username is enough.'
        ],
        imageId: 'payments-fees'
      },
      {
        id: 'platform-username',
        title: 'platform:username rules',
        paragraphs: [
          'Normalize platform: lowercase and trim; map x to twitter. Normalize username: trim, lowercase, strip @. Example: Twitter + @Alice becomes twitter:alice; x + Bob becomes twitter:bob.',
          'Usernames max 64 characters; letters, digits, underscores, hyphens. The UI and contract reject invalid or too-long values.'
        ]
      },
      {
        id: 'sending',
        title: 'Sending a payment (Send tab)',
        paragraphs: [
          'Steps:',
          <>(1) Open <a href="https://www.zk.sendly.digital/payments" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">zk.sendly.digital → Payments</a> → Send tab.</>,
          '(2) Connect your wallet.',
          '(3) Enter amount, pick USDC or EURC, pick platform, enter the recipient username.',
          '(4) Click Send and confirm in your wallet. The contract stores a paymentId; it shows up on Receive for that same platform:username.'
        ],
        bullets: [
          'Send stays gray: connect wallet, amount above zero, valid username.',
          'Platform missing: it may be turned off in the UI for now.'
        ],
        imageId: 'send-tab'
      },
      {
        id: 'receiving',
        title: 'Receiving a payment (Receive tab)',
        paragraphs: [
          'Steps:',
          <>(1) Open <a href="https://www.zk.sendly.digital/payments" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Payments</a> → Receive tab, connect wallet.</>,
          '(2) Enter username and select platform.',
          '(3) Wait for pending items or hit Refresh.',
          '(4) To prove ownership, use Connect Twitter/X, Twitch, GitHub, Telegram, or LinkedIn; finish OAuth, come back, then Refresh.'
        ],
        imageId: 'receive-tab'
      },
      {
        id: 'claim',
        title: 'Claim: how to collect your funds',
        paragraphs: [
          'Each row shows paymentId, sender, amount, token. One payment: Claim, then confirm in your wallet. Several: Claim all, one confirmation. Payout goes to the wallet you connected.'
        ]
      },
      {
        id: 'troubleshooting',
        title: 'Troubleshooting',
        paragraphs: [
          'Quick fixes:'
        ],
        bullets: [
          'Wrong platform: pick another one from the list.',
          'Need a proof: on Receive, set platform and username, Connect, finish OAuth, Refresh.',
          'Username on proof does not match: fix platform or spelling, reconnect if needed.',
          'Incomplete Reclaim signatures: build the proof again; if it happens twice, wait a few minutes and retry.',
          'Proof failed or zkFetch failed: Refresh, reconnect the account, try a new proof.',
          'Nothing pending: same platform and username as the sender, Refresh, and use the zk payments URL.'
        ]
      },
      {
        id: 'security',
        title: 'Security considerations',
        paragraphs: [
          'Connection tokens live in your browser (localStorage) so zkTLS proofs can run. We do not store them on our servers. XSS can read localStorage; use a clean browser, skip sketchy extensions, and avoid shared machines when you can.',
          'Tokens are session-scoped. Disconnect or refresh when you are done. On a shared device, use Disconnect if the UI offers it, or clear site data after.',
          'Do not share wallet access or sign transactions you do not understand. Proofs only show you control platform:username; credentials do not go on-chain.'
        ]
      }
    ],
    content: ''
  },
  nft_gift_cards_guide: {
    slug: 'nft_gift_cards_guide',
    title: 'NFT Gift Cards - User Guide',
    description:
      'Mint a gift card on-chain. Pick an amount, add a message, and send it to a wallet or to someone\'s social username.',
    date: '2026-02-11',
    category: 'Tutorial',
    tags: ['NFT', 'Gift Cards', 'Tutorial'],
    readTime: '8 min',
    images: [
      {
        id: 'nft-flow',
        componentId: 'gift-card-create-embed',
        alt: 'Create Gift Card tab (live)',
        caption: ''
      }
    ],
    sections: [
      {
        id: 'intro',
        title: 'Overview',
        paragraphs: [
          'A gift card here is an on-chain NFT. Set the amount, optional message, and send to a wallet address or a social username.',
          'After it is claimed, it shows up in the recipient\'s wallet as an ERC-721.'
        ],
        imageId: 'nft-flow'
      },
      {
        id: 'how-it-works',
        title: 'How it works',
        paragraphs: [
          'On the Create page, pick wallet or username, set USDC or EURC, add an optional message (you can password-protect it), then confirm in your wallet.',
          'The contract mints an ERC-721. Metadata and art sit on IPFS (Pinata). If you send by username, the card stays in a vault until the recipient proves they own that account.'
        ]
      },
      {
        id: 'recipient',
        title: 'What the recipient does',
        paragraphs: [
          'Wallet: the NFT lands in that wallet after mint.',
          'Username: the recipient logs in with that platform, then claims. If they have no wallet yet, Circle can create one.'
        ]
      },
      {
        id: 'after-claiming',
        title: 'After claiming',
        paragraphs: [
          'After claim, the card is in the recipient\'s wallet. Any app that supports these NFTs can use it.',
          'Value is in USDC or EURC; redemption depends on the app.'
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
          'No card: log in with the account that should receive it.',
          'Claim errors: stay on ARC Testnet and keep a little gas for fees.',
          'Wrong person: on-chain sends cannot be undone. Check the address or username before you confirm.',
          'Lost password: only whoever set it can help; we do not have it.'
        ]
      },
      {
        id: 'security',
        title: 'Security notes',
        paragraphs: [
          'Smart contracts on ARC Testnet hold the rules. We do not store private keys.',
          'With Circle, Circle manages keys. Do not sign transactions you do not understand.'
        ]
      }
    ],
    content: ''
  },
  circle_sdk_wallet_playbook: {
    slug: 'circle_sdk_wallet_playbook',
    title: 'Circle SDK in Sendly: Internal Wallet, Asset Flow, and NFT Cards',
    description:
      'How Sendly uses Circle Developer Wallet: internal-wallet payments, funding and transfers, and minting NFT gift cards.',
    date: '2026-04-14',
    category: 'Technology',
    tags: ['Circle', 'Developer Wallets', 'NFT'],
    readTime: '9 min',
    images: [
      {
        id: 'circle-cover',
        src: '/ttt.png',
        alt: 'Circle wallet flow in Sendly',
        caption: ''
      }
    ],
    sections: [
      {
        id: 'overview',
        title: 'What is the Internal Wallet?',
        paragraphs: [
          'Sendly\'s internal wallet is Circle Developer Wallet (Circle SDK). If someone signs in with a social account and does not bring their own crypto wallet, they can still get an on-chain address and keep using the app.',
          'This post describes what we ship: dashboard setup, balances and transfers, and NFT gift cards. The browser calls our API; the backend runs the wallet work.'
        ],
        bullets: [
          'Find or create an internal Circle wallet for the logged-in user.',
          'Read balances and fund the wallet (top-up or deposit-style flows).',
          'Mint and claim NFT gift cards to a wallet address or a social handle.'
        ],
        imageId: 'circle-cover'
      },
      
      {
        id: 'dashboard-wallet',
        title: 'Internal Wallet Flow',
        paragraphs: [
          'Opening the wallet screen, the app looks for an existing internal wallet first: address, then linked social account, then Privy-related ids.',
          'If nothing matches, we create a wallet through the backend. On some social claim paths the wallet is created automatically, then the claim tx runs.',
          'Scenario 1: Social login, no web3 wallet yet. They create an internal wallet and can receive a payment to it. Some flows create the wallet right before claim.',
          'Scenario 2: They already use a web3 wallet. They can still add an internal wallet and tie it to socials or to an external address, depending on how you wire identity.'
        ],
        bullets: [
          'Primary UI entry: `DeveloperWallet.tsx`.',
          'Wallet helper logic: `useCircleWallet.ts`.',
          'Service wrapper: `developerWalletService.ts`.'
        ]
      },
      {
        id: 'asset-flow',
        title: 'Asset flow: balances, top-up, and transfer',
        paragraphs: [
          'When people say "pull asset" here, they usually mean one of three things: read balances, send funds into the internal wallet, or move value between supported networks or addresses.',
          'The internal wallet screen reads ERC-20 balances and allows top-up from an external wallet. Gateway flows use approve and deposit, then burn intent, attestation, and mint.'
        ],
        bullets: [
          'Gateway client/service modules hold the balance and transfer plumbing.',
          'Internal wallet UI includes top-up and test-token requests.',
          'Transactions are not always synchronous: the UI polls by `transactionId` until it gets a hash or a final state.'
        ]
      },
      {
        id: 'nft-cards',
        title: 'Create an NFT card from Circle internal wallet',
        paragraphs: [
          'Gift cards are minted through `CreateGiftCard`. The app checks balance and allowance, prepares metadata, then calls the contract on whichever path you picked.',
          'Internal wallet mode routes the transaction through the backend. External wallet mode asks the user to confirm in their browser wallet.'
        ],
        bullets: [
          'After mint, we read `tokenId` from the ERC-721 `Transfer` event.',
          'Twitter, Twitch, Telegram, and similar recipients use separate create/claim paths.',
          'After claim, the NFT is a normal ERC-721 in the recipient\'s context.'
        ]
      },
      {
        id: 'internal-wallet-stats',
        title: 'Statistics (cards minted via Internal Wallet)',
        paragraphs: [
          'Counts and amounts below are gift cards minted through Circle Developer Wallet (internal wallet). Balances use 6 decimals; raw is the integer in smallest units.',
          'Our testnet writeup put total volume around $310k. The percentage is internal-wallet mint face value divided by that $310k number. Treat it as a rough comparison (EURC is not exactly USD).'
        ],
        bullets: [
          'Users who minted cards via Internal Wallet: 216.',
          'Combined face value of those mints: 6,634.486746 (raw 6,634,486,746, 6 decimals).',
          'USDC portion: 4,499.750146.',
          'EURC portion: 2,134.736600.',
          'Versus ~$310k total volume: 6,634.486746 / 310,000 ≈ 2.14% (rough; EURC vs USD is not 1:1 in the market).'
        ]
      },
      {
        id: 'security-and-ops',
        title: 'Security and operational notes',
        paragraphs: [
          'Circle credentials and entity secrets belong on the server. The browser should keep calling your backend for anything that touches keys or signing.',
          'Most of this was written for ARC-TESTNET. Other chains need testing and explicit config.'
        ],
        bullets: [
          'Do not ship production API secrets in scripts or client code.',
          'Watch for slow finalization; the UI retries polling by `transactionId`.',
          'Document per-chain switches before you enable Circle in a new environment.'
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
  const [paymentsPreviewValues, setPaymentsPreviewValues] = useState<SendPaymentPreviewValues | null>(null);

  const post = slug ? blogPosts[slug] : null;

  useEffect(() => {
    // Ensure each blog post opens from the top in SPA navigation.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [slug]);

  useEffect(() => {
    if (post?.slug !== 'zktls_payments_guide') return;
    fetchTwitterUserPreview(BLOG_PREVIEW_USERNAME)
      .then((result) => {
        if (result.success) {
          setPaymentsPreviewValues({
            ...PAYMENTS_SEND_PREVIEW_FALLBACK,
            username: result.data.username,
            suggestionLabel: `${result.data.name} @${result.data.username}`,
            profileImageUrl: result.data.profile_image_url ?? null,
          });
        }
      })
      .catch(() => {});
  }, [post?.slug]);

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

    const renderImage = (img: BlogImage) => {
      if (img.componentId === 'verification-infographic') {
        return (<button type="button" onClick={() => setActiveImage(img)} className="w-full text-left rounded-xl overflow-hidden bg-[#FAFAFA]" aria-label={`Open: ${img.caption}`}><VerificationInfographic compact />{img.caption && <div className="mt-3 text-sm text-gray-600">{img.caption}</div>}</button>);
      }
      if (img.componentId === 'zktls-infographic') {
        return (<button type="button" onClick={() => setActiveImage(img)} className="w-full text-left rounded-xl overflow-hidden bg-[#FAFAFA]" aria-label={`Open: ${img.caption}`}><ZkTLSInfographic compact />{img.caption && <div className="mt-3 text-sm text-gray-600">{img.caption}</div>}</button>);
      }
      if (img.componentId === 'zktls-architecture-infographic') {
        return (<button type="button" onClick={() => setActiveImage(img)} className="w-full text-left rounded-xl overflow-hidden bg-[#FAFAFA]" aria-label={`Open: ${img.caption}`}><ZkTLSArchitectureInfographic compact />{img.caption && <div className="mt-3 text-sm text-gray-600">{img.caption}</div>}</button>);
      }
      if (img.componentId === 'privy-oauth-infographic') {
        return (<button type="button" onClick={() => setActiveImage(img)} className="w-full text-left rounded-xl overflow-hidden bg-[#FAFAFA]" aria-label={`Open: ${img.caption}`}><PrivyOAuthInfographic compact />{img.caption && <div className="mt-3 text-sm text-gray-600">{img.caption}</div>}</button>);
      }
      if (img.componentId === 'gift-card-create-embed') {
        return (<button type="button" onClick={() => setActiveImage(img)} className="w-full text-left rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden" aria-label={`Open: ${img.alt}`}><div className="p-2 min-h-[200px]"><CreateGiftCardPreview compact /></div></button>);
      }
      if (img.componentId === 'payments-send-embed') {
        return (<button type="button" onClick={() => setActiveImage(img)} className="w-full text-left rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden" aria-label={`Open: ${img.alt}`}><div className="p-4 min-h-[200px]"><ZkSendPanel initialTab="send" preview previewValues={paymentsPreviewValues ?? PAYMENTS_SEND_PREVIEW_FALLBACK} /></div></button>);
      }
      if (img.componentId === 'payments-receive-embed') {
        return (<button type="button" onClick={() => setActiveImage(img)} className="w-full text-left rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden" aria-label={`Open: ${img.alt}`}><div className="p-4 min-h-[200px]"><ZkSendPanel initialTab="receive" preview previewValues={paymentsPreviewValues ?? PAYMENTS_SEND_PREVIEW_FALLBACK} /></div></button>);
      }
      const isSR = img.id === 'send-tab' || img.id === 'receive-tab';
      return (<button type="button" onClick={() => setActiveImage(img)} className={`w-full text-left ${isSR ? 'border-0 shadow-none ring-0 outline-none' : ''}`} aria-label={`Open image: ${img.alt}`}><img src={img.src} alt={img.alt} loading="lazy" className={`w-full h-40 object-cover ${isSR ? 'rounded-xl border-0 shadow-none' : 'rounded-xl'}`} />{!isSR && img.caption && <div className="mt-3 text-sm text-gray-600">{img.caption}</div>}</button>);
    };

    const renderSectionText = (section: BlogSection, isLast: boolean) => (
      <section key={section.id} id={section.id} className="scroll-mt-28">
        <div className={cohereStyle ? `px-4 md:px-6 ${isLast ? 'pb-12' : 'pb-8'}` : `px-12 md:px-22 ${isLast ? 'pb-12 md:pb-22' : ''}`}>
          <h2 className={cohereStyle ? 'text-2xl md:text-3xl font-medium text-gray-900 mb-6 tracking-tight' : 'text-3xl md:text-4xl font-bold text-gray-900 mb-4'}>{section.title}</h2>
          <div className={cohereStyle ? 'space-y-5 text-gray-600 text-lg leading-[1.7] font-normal' : 'space-y-4 text-gray-700 text-lg leading-relaxed'}>
            {section.paragraphs.map((p, i) => <p key={typeof p === 'string' ? p : i}>{p}</p>)}
          </div>
          {section.bullets && section.bullets.length > 0 && (
            <ul className={cohereStyle ? 'list-disc list-inside mt-6 space-y-3 text-gray-600 text-lg leading-[1.7]' : 'list-disc list-inside mt-6 space-y-2 text-gray-700 text-lg'}>
              {section.bullets.map((b) => <li key={b}>{b}</li>)}
            </ul>
          )}
        </div>
      </section>
    );

    // Group: each image-section + all following no-image sections share one grid row.
    const groups: { image: BlogImage | null; sections: BlogSection[] }[] = [];
    let cur: (typeof groups)[number] | null = null;
    for (const section of sections) {
      const img = section.imageId ? imageMap.get(section.imageId) ?? null : null;
      if (img) {
        cur = { image: img, sections: [section] };
        groups.push(cur);
      } else if (cur) {
        cur.sections.push(section);
      } else {
        cur = { image: null, sections: [section] };
        groups.push(cur);
      }
    }

    const totalSections = sections.length;
    let sectionCounter = 0;

    return (
      <div className={cohereStyle ? 'space-y-0' : 'space-y-12'}>
        {groups.map((group) => {
          const groupKey = group.sections[0].id;

          if (group.image) {
            return (
              <div
                key={groupKey}
                className={`grid grid-cols-1 ${cohereStyle ? 'gap-6 blog-content-section lg:grid-cols-[280px,minmax(0,1fr)]' : 'gap-10 lg:grid-cols-[280px,minmax(0,1fr)]'}`}
              >
                <div className="w-full">{renderImage(group.image)}</div>
                <div>
                  {group.sections.map((section) => {
                    sectionCounter++;
                    return renderSectionText(section, sectionCounter === totalSections);
                  })}
                </div>
              </div>
            );
          }

          return (
            <div key={groupKey}>
              {group.sections.map((section) => {
                sectionCounter++;
                return renderSectionText(section, sectionCounter === totalSections);
              })}
            </div>
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
          {/* Hero -  full width, above the grid */}
          <div
            className="flex flex-col items-center text-center w-full px-4 md:px-6"
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
            <p className="hero-subtitle w-full max-w-2xl mx-auto mb-12">
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

          {/* Grid: sections + footer | TOC -  starts at section level */}
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

            {/* TOC -  aligns with first section */}
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
            // Live Payments embed and infographics use frame; plain images (by src) can be frameless.
            const isPaymentsEmbed = activeImage.componentId === 'payments-send-embed' || activeImage.componentId === 'payments-receive-embed' || activeImage.id === 'send-tab' || activeImage.id === 'receive-tab';
            const isFramelessPreview = !isPaymentsEmbed && (activeImage.src != null && activeImage.componentId == null);
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
                  initialScale={0.02}
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
            ) : activeImage.componentId === 'gift-card-create-embed' ? (
              <div className="bg-white rounded-xl overflow-hidden p-6 max-h-[85vh] overflow-y-auto">
                <CreateGiftCardPreview />
              </div>
            ) : activeImage.componentId === 'payments-send-embed' || activeImage.id === 'send-tab' ? (
              <div className="bg-white rounded-xl overflow-hidden p-6 max-h-[85vh] overflow-y-auto">
                <ZkSendPanel initialTab="send" preview previewValues={paymentsPreviewValues ?? PAYMENTS_SEND_PREVIEW_FALLBACK} />
              </div>
            ) : activeImage.componentId === 'payments-receive-embed' || activeImage.id === 'receive-tab' ? (
              <div className="bg-white rounded-xl overflow-hidden p-6 max-h-[85vh] overflow-y-auto">
                <ZkSendPanel initialTab="receive" preview previewValues={paymentsPreviewValues ?? PAYMENTS_SEND_PREVIEW_FALLBACK} />
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
