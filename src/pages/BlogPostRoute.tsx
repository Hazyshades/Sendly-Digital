import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
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
import { InternalWalletDashboardPreview } from '@/components/InternalWalletDashboardPreview';
import { InternalWalletCreatePromptPreview } from '@/components/InternalWalletCreatePromptPreview';
import { BlogLayout } from '@/components/BlogLayout';
import { BlogEngagementBar } from '@/components/blog/BlogEngagementBar';
import { BlogPostHead } from '@/components/blog/BlogPostHead';
import { BlogStepFrame } from '@/components/blog/BlogStepFrame';
import { GiftCardAmountPreview } from '@/components/blog/GiftCardAmountPreview';
import { GiftCardNavPreview } from '@/components/blog/GiftCardNavPreview';
import { GiftCardRecipientTypePreview } from '@/components/blog/GiftCardRecipientTypePreview';
import { GiftCardReviewPreview } from '@/components/blog/GiftCardReviewPreview';
import { GiftCardWalletSourcePreview } from '@/components/blog/GiftCardWalletSourcePreview';
import {
  getBlogPostMeta,
  isPublicBlogSlug,
  resolveBlogSlug,
} from '@/lib/blog/posts';
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
  variant?: 'default' | 'step';
}

type BlogImageComponentId =
  | 'verification-infographic'
  | 'zktls-infographic'
  | 'zktls-architecture-infographic'
  | 'privy-oauth-infographic'
  | 'payments-send-embed'
  | 'payments-receive-embed'
  | 'gift-card-create-embed'
  | 'gift-card-nav-embed'
  | 'gift-card-wallet-source-embed'
  | 'gift-card-recipient-type-embed'
  | 'gift-card-amount-embed'
  | 'gift-card-review-embed'
  | 'internal-wallet-dashboard-embed'
  | 'internal-wallet-create-embed';

interface BlogImage {
  id: string;
  src?: string;
  componentId?: BlogImageComponentId;
  alt: string;
  caption: string;
}

const GIFT_CARD_STEP_LIGHTBOX: Partial<
  Record<BlogImageComponentId, ComponentType<{ compact?: boolean }>>
> = {
  'gift-card-nav-embed': GiftCardNavPreview,
  'gift-card-wallet-source-embed': GiftCardWalletSourcePreview,
  'gift-card-recipient-type-embed': GiftCardRecipientTypePreview,
  'gift-card-amount-embed': GiftCardAmountPreview,
  'gift-card-review-embed': GiftCardReviewPreview,
};

const blogPosts: Record<string, BlogPost> = {
  'privy-results': {
    slug: 'privy-results',
    title: 'Privy testnet: metrics, methodology, and takeaways',
    description:
      'Roughly 12k wallets, 31k cards sent, ~$89k TVL, ~$315k total volume. Privy as our auth + embedded wallet layer, the checks we ran before trusting a chart, and the operational stuff that actually mattered.',
    date: '2026-04-01',
    category: 'Technology',
    tags: ['Privy', 'OAuth', 'Testnet'],
    readTime: '8 min',
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
          'Sendly\'s testnet leaned on Privy for identity and embedded wallets: one login, socials and wallet lined up. OAuth tokens lived in memory for the API calls we needed; nothing fancy beyond that. Provider traffic funneled through a single backend layer with retries and rate limits. When a metric looked off, we triangulated: Privy payloads against our schema, on-chain activity against our DB (indexer/subgraph when it helped), and spot calls to X (Twitter) or Telegram on a random slice of users.'
        ]
      },
      {
        id: 'metrics',
        title: 'Metrics',
        paragraphs: [
          'Counts and balances for the window we measured:'
        ],
        bullets: [
          'Addresses: 11,700. Cards sent: 31,800. Transactions: 39,000.',
          'Gas spent: \u2248 780 USDC',
          'TVL: 86,000 USDC + 3,100 EURC (\u2248 89,100 total)',
          'Total volume: \u2248 315,000 USDC and \u2248 5,000 EURC.',
        ]
      },
      {
        id: 'privy-oauth-method',
        title: 'Privy + OAuth pipeline',
        paragraphs: [
          'Users sign in with Privy. The session carries linked accounts and the embedded address. Keys stay in Privy\'s MPC split (their side + the device); we never assemble the full private key. Same login covers signing and social linking. JWT verification and how that identity must line up with Circle custodial calls are covered in Sendly on Privy today.',
          'OAuth tokens are short-lived and narrow (read:user on X (Twitter), openid on Twitch, that kind of scope). We ping providers when we need profile or entitlement data, then drop them when the session ends. Outbound calls go through one gateway with three tries and exponential backoff on 429/5xx.'
        ],
        imageId: 'privy-oauth-flow'
      },
      {
        id: 'sendly-privy-today',
        title: 'Sendly on Privy today',
        paragraphs: [
          'Sendly still treats Privy as the main social-login layer for Gift Card flows. zkTLS-based payments, which are shipping soon, will use Sendly\'s own auth flow instead.',
          'People can also plug in an external wallet through the usual EVM connector when a flow needs it. Money that moves through Circle Developer Wallets picks an Internal Wallet by a fixed order: connected address first, then provider ids off the Privy profile, then a normalized Privy user id our APIs already know how to digest.',
          'We\'ll spell out request payloads, retries, and the full Privy and Circle user_id map in a later blog. The short version: whichever identity you establish in Privy is the hook our services use to authorize the right Circle wallet for sends, mints, and the rest.',
          'Two different checks have to line up. First, the server verifies Privy JWTs (signature, issuer, expiry, the claims we care about) so we know whose session this is. Second, Circle Developer Wallet calls carry a user id that matches that answer: Privy-created wallets get the normalized Privy id Circle stored with them; purely external wallets go down the address path. If those don\'t match, you don\'t get to trigger custodial work for someone else\'s wallet.'
        ]
      },
      {
        id: 'verification',
        title: 'Verification methodology',
        paragraphs: [
          'Three layers. Privy payloads: linked accounts and wallet fields have to match what our schema allows. On-chain: mints, transfers, and gas need to agree with our tables, and we pull indexer/subgraph data when the chain view is easier there. Spot checks: sample users, hit X (Twitter) or Telegram live, make sure cached links haven\'t rotted.',
          'Mismatches get a request id in the log, never tokens or secrets. We watch link errors, provider failures, duplicates. If the error rate jumps past a line we drew in advance, a human actually reads the cases.'
        ],
        imageId: 'verification-flow'
      },
      {
        id: 'security',
        title: 'Security considerations',
        paragraphs: [
          'Embedded wallet keys stay split between Privy\'s servers and the device; our backend never sees a complete key. Provider tokens sit in RAM for the session and don\'t get written to disk or Postgres.',
          'Privy\'s SDK parks session state in localStorage, so XSS remains the boring threat model. We lean on a tight CSP, ban inline script, and pin third-party bundles with SRI where we can. On a shared machine, logging out still matters.',
          'Every provider call logs request id, HTTP status, latency: no OAuth material, no secrets, no PII in the line. Retention is 240 days, mostly so we have something useful when things go sideways.'
        ]
      },
      {
        id: 'learnings',
        title: 'Operational takeaways',
        paragraphs: [
          'Gas hovered near $0.05 a transaction. At that level the fee is basically flat whether someone moves ten dollars or ten thousand, which is a strong result for any ticket size. About four in five cards moved through X (Twitter); Telegram landed near 12%, Twitch near 8%. We keep the smaller channels on, but X (Twitter) is where we spend attention first.',
        ]
      }
    ],
    content: ''
  },
  'zktls-payments-guide': {
    slug: 'zktls-payments-guide',
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
          'Normalize platform: lowercase and trim; map x to twitter. Normalize username: trim, lowercase, strip @. Example: X (Twitter) + @Alice becomes twitter:alice; x + Bob becomes twitter:bob.',
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
          '(4) To prove ownership, use Connect X (Twitter), Twitch, GitHub, Telegram, or LinkedIn; finish OAuth, come back, then Refresh.'
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
  'nft-gift-cards-guide': {
    slug: 'nft-gift-cards-guide',
    title: 'Send USDC as a Gift Card to Anyone - User Guide',
    description:
      'Create a USDC or EURC gift card and send it to a wallet or verified social username. The recipient can claim it later through Sendly - even if they are new to crypto.',
    date: '2026-02-11',
    category: 'Tutorial',
    tags: ['Gift Cards', 'USDC', 'Arc Testnet'],
    readTime: '8 min',
    images: [
      {
        id: 'nft-flow',
        componentId: 'gift-card-create-embed',
        alt: 'Create Gift Card flow in Sendly',
        caption: ''
      },
      {
        id: 'gift-card-nav',
        componentId: 'gift-card-nav-embed',
        alt: 'Sendly navigation with Create tab selected',
        caption: '',
      },
      {
        id: 'gift-card-wallet-source',
        componentId: 'gift-card-wallet-source-embed',
        alt: 'Choose wallet source: Rabby or Internal Wallet',
        caption: '',
      },
      {
        id: 'gift-card-recipient-type',
        componentId: 'gift-card-recipient-type-embed',
        alt: 'Select recipient type and enter Twitter username',
        caption: '',
      },
      {
        id: 'gift-card-amount',
        componentId: 'gift-card-amount-embed',
        alt: 'Enter gift card amount in USDC or EURC',
        caption: '',
      },
      {
        id: 'gift-card-review',
        componentId: 'gift-card-review-embed',
        alt: 'Review gift card details and confirm in wallet',
        caption: '',
      },
    ],
    sections: [
      {
        id: 'intro',
        title: 'What is a Sendly Gift Card?',
        paragraphs: [
          'Sending crypto should not start with “send me your wallet address.”',
          'With Sendly Gift Cards, you create a funded digital card and send it to someone by wallet address or social username. The recipient can claim it later - even if they are new to crypto.',
          'It feels like sending a normal gift card. Under the hood, Sendly uses on-chain ownership, stablecoin settlement, and social identity verification to make the claim flow secure.',
          'A Sendly Gift Card works like a digital prepaid card: you choose an amount, add a message, and send it to someone. For advanced users and developers: the card is represented on-chain as an ERC-721 NFT, which makes ownership and claiming verifiable.',
          'This guide covers the Arc Testnet version of Sendly Gift Cards. Balances, gas, and contracts run on Arc Testnet - not mainnet production funds.'
        ],
        imageId: 'nft-flow'
      },
      {
        id: 'why',
        title: 'Why use Sendly Gift Cards?',
        paragraphs: [
          'Normally, sending crypto requires the recipient to already have a wallet, choose the right network, and share a long wallet address.',
          'Sendly removes that friction. You can create a funded gift card now and let the recipient claim it later using a wallet or a verified social account.',
          'The core idea: send value to identity, not wallet address. You send to @alice on X (Twitter), a Twitch username, or a Gmail address - the recipient proves they own that account when they claim.'
        ]
      },
      {
        id: 'how-it-works',
        title: 'How it works',
        paragraphs: [
          'You pick a recipient (wallet or social username), choose USDC or EURC, set an amount, and add an optional message.',
          'Sendly locks the value in a smart contract on Arc Testnet. Card metadata and artwork are stored on IPFS.',
          'If you send by username, the card stays in a vault until the recipient proves they control that account. If you send to a wallet address, the card can land directly after mint.',
          'After claiming, the recipient can access the funds through Sendly\'s supported claim flow and see the card in their wallet.'
        ]
      },
      {
        id: 'sender-flow',
        title: 'How to create a gift card (for senders)',
        paragraphs: [
          'Follow the steps below to create and share a funded gift card on Arc Testnet.',
          'You can send to a wallet address or a social username -the recipient claims later by proving they own that account.',
        ],
        bullets: [
          'Double-check the wallet address or username before you confirm -on-chain sends cannot be undone.',
          'You need USDC or EURC on Arc Testnet plus a small amount of gas for the transaction.',
          'Optional: add a password to protect the claim link.',
        ],
      },
      {
        id: 'sender-step-open',
        title: 'Step 1 · Open Create Gift Card',
        variant: 'step',
        imageId: 'gift-card-nav',
        paragraphs: [
          <>Open <a href="https://www.sendly.digital/create" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Sendly</a> and select <strong>Create</strong> in the navigation bar.</>,
        ],
      },
      {
        id: 'sender-step-wallet',
        title: 'Step 2 · Choose your wallet source',
        variant: 'step',
        imageId: 'gift-card-wallet-source',
        paragraphs: [
          'Connect MetaMask, Rabby, or another browser wallet -or use your Circle Internal Wallet if you already have one in Sendly.',
          'The wallet you select here pays gas and signs the transaction when you create the card.',
        ],
      },
      {
        id: 'sender-step-recipient',
        title: 'Step 3 · Select recipient type',
        variant: 'step',
        imageId: 'gift-card-recipient-type',
        paragraphs: [
          'Pick wallet address or a social platform: X (Twitter), Twitch, Telegram, Gmail, and more.',
          'Enter the recipient’s username -for example, sama on X.',
        ],
      },
      {
        id: 'sender-step-amount',
        title: 'Step 4 · Enter amount & message',
        variant: 'step',
        imageId: 'gift-card-amount',
        paragraphs: [
          'Set the amount in USDC or EURC. Add an optional personal message on the form below the amount field.',
        ],
      },
      {
        id: 'sender-step-review',
        title: 'Step 5 · Review & confirm',
        variant: 'step',
        imageId: 'gift-card-review',
        paragraphs: [
          'Choose card design and currency, check the preview, then click Create a card.',
          'Confirm the transaction in your wallet to mint the card and share the claim link with the recipient.',
        ],
      },
      {
        id: 'recipient-flow',
        title: 'How the recipient claims it',
        paragraphs: [
          'Steps:',
          '(1) Open the claim link or log in to Sendly with the social account that should receive the card.',
          '(2) Verify ownership of the username or wallet (OAuth or wallet signature, depending on the path).',
          '(3) Click Claim and confirm in the wallet.',
          '(4) Use a Circle Internal Wallet (created automatically if needed) or connect an external wallet to receive the card and access the funds.'
        ],
        bullets: [
          'Wallet recipient: the card can appear in that wallet after mint.',
          'Username recipient: the recipient logs in with that platform, proves ownership, then claims.',
          'No wallet yet? Sendly can create a Circle Internal Wallet so they can still claim.'
        ]
      },
      {
        id: 'wallet-vs-username',
        title: 'Wallet vs social username',
        paragraphs: [
          'Wallet address: best when the recipient already has a crypto wallet on Arc Testnet. The card goes straight to that address.',
          'Social username: best when you only know their @handle, Twitch login, or Gmail. They claim later by proving they own that account - no wallet address needed upfront.',
          'Pick the path that matches how you know the person. Username sends are what make Sendly different from a normal crypto transfer.'
        ]
      },
      {
        id: 'after-claiming',
        title: 'After claiming',
        paragraphs: [
          'The card carries value in USDC or EURC. In Sendly, the recipient can claim the card and access the funds through the supported claim flow.',
          'After claiming, the recipient can see the card in their wallet. Other apps may display the NFT differently depending on their support for this standard.',
          'For developers: the card is represented as an ERC-721 NFT after claim; metadata lives on IPFS (Pinata).'
        ]
      },
      {
        id: 'requirements',
        title: 'Requirements',
        paragraphs: [
          'This guide applies to Sendly Gift Cards on Arc Testnet.'
        ],
        bullets: [
          'Wallet: MetaMask, Rabby, or Circle Internal Wallet',
          'Tokens: USDC or EURC on Arc Testnet',
          'A supported social account (if sending or receiving by username)',
          'A small amount of gas on Arc Testnet for mint and claim transactions'
        ]
      },
      {
        id: 'common-issues',
        title: 'Common issues',
        paragraphs: [],
        bullets: [
          'No card showing: log in with the account that should receive it, then refresh.',
          'Claim errors: stay on Arc Testnet and keep a little gas for fees.',
          'Wrong recipient: on-chain sends cannot be undone. Check the address or username before you confirm.',
          'Lost password: only whoever set it can help; Sendly does not store or recover it.',
          'Username mismatch: make sure platform and spelling match what the sender used.'
        ]
      },
      {
        id: 'security',
        title: 'Security checklist',
        paragraphs: [
          'Smart contracts on Arc Testnet enforce the rules. Sendly does not store private keys. With Circle Internal Wallet, Circle manages keys on the backend.',
          'Do not sign transactions you do not understand.'
        ],
        bullets: [
          'Always check the recipient username or wallet address before confirming.',
          'Sendly cannot reverse completed on-chain transactions.',
          'Never share your wallet seed phrase or private keys.',
          'If you receive a claim link, make sure it comes from the official Sendly domain (sendly.digital).',
          'If a card is protected by a password, only the person who created the card knows it.'
        ]
      },
      {
        id: 'faq',
        title: 'FAQ',
        paragraphs: [],
        bullets: [
          'Do recipients need a wallet before I send? No - send by username and they can claim later, optionally with a new Internal Wallet.',
          'Is this real money? This guide is for Arc Testnet. Use test tokens only; do not treat testnet balances as production funds.',
          'What is the NFT part? It is how ownership is tracked on-chain. You do not need to understand NFTs to send or claim a gift card.',
          'Can I send to Gmail? Yes - use the full @gmail.com address or the supported username flow in the Create form.',
          'What if I sent to the wrong person? On-chain transactions are final. Always verify the recipient before confirming.'
        ]
      },
      {
        id: 'get-started',
        title: 'Get started',
        paragraphs: [
          'Ready to try it?',
          <> <a href="https://www.sendly.digital/create" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors mr-3 mb-3">Create a Gift Card</a> <a href="https://www.sendly.digital" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-5 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors mr-3 mb-3">Try Sendly</a> <a href="https://www.zk.sendly.digital/payments" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-5 py-2.5 border border-gray-300 text-gray-900 rounded-xl font-medium hover:bg-gray-50 transition-colors mb-3">Send by Username</a> </>
        ]
      }
    ],
    content: ''
  },
  'circle-sdk-wallet-playbook': {
    slug: 'circle-sdk-wallet-playbook',
    title: 'Circle SDK in Sendly: Internal Wallet, Asset Flow, and NFT Cards',
    description:
      'How Sendly uses Circle Developer Wallet: internal-wallet payments, funding and transfers, and minting NFT gift cards.',
    date: '2026-04-14',
    category: 'Technology',
    tags: ['Circle', 'Developer Wallets', 'NFT'],
    readTime: '9 min',
    images: [
      {
        id: 'circle-create-wallet',
        componentId: 'internal-wallet-create-embed',
        alt: 'Create Internal Wallet prompt in Sendly',
        caption: ''
      },
      {
        id: 'circle-cover',
        componentId: 'internal-wallet-dashboard-embed',
        alt: 'Circle wallet flow in Sendly',
        caption: ''
      }
    ],
    sections: [
      {
        id: 'overview',
        title: 'What is the Internal Wallet?',
        paragraphs: [
          'Sendly\'s Internal Wallet is Circle Developer Wallet (Circle SDK). If someone signs in with a social account and does not bring their own crypto wallet, they can still get an on-chain address and keep using the app.',
          'This post describes what we ship: dashboard setup, balances and transfers, and NFT gift cards. The browser calls our API; the backend runs the wallet work.'
        ],
        bullets: [
          'Find or create an internal Circle wallet for the logged-in user.',
          'Read balances and fund the wallet (top-up or deposit-style flows).',
          'Mint and claim NFT gift cards to a wallet address or a social handle.'
        ],
        imageId: 'circle-create-wallet'
      },
      
      {
        id: 'dashboard-wallet',
        title: 'Internal Wallet Flow',
        paragraphs: [
          'Opening the wallet screen, the app looks for an existing Internal Wallet first: address, then linked social account, then Privy-related ids.',
          'If nothing matches, we create a wallet through the backend. On some social claim paths the wallet is created automatically, then the claim tx runs.',
          'Scenario 1: Social login, no web3 wallet yet. They create an Internal Wallet and can receive a payment to it. Some flows create the wallet right before claim.',
          'Scenario 2: They already use a web3 wallet. They can still add an Internal Wallet and tie it to socials or to an external address, depending on how you wire identity.'
        ],
      
      },
      {
        id: 'asset-flow',
        title: 'Asset flow: balances, top-up, and transfer',
        paragraphs: [
          'When people say "pull asset" here, they usually mean one of three things: read balances, send funds into the Internal Wallet, or move value between supported networks or addresses.',
          'The Internal Wallet screen reads ERC-20 balances and allows top-up from an external wallet. Gateway flows use approve and deposit, then burn intent, attestation, and mint.'
        ],
        bullets: [
          'Gateway client/service modules hold the balance and transfer plumbing.',
          'Internal Wallet UI includes top-up and test-token requests.',
          'Transactions are not always synchronous: the UI polls by `transactionId` until it gets a hash or a final state.'
        ],
        imageId: 'circle-cover'
      },
      {
        id: 'nft-cards',
        title: 'Create an NFT card from Circle Internal Wallet',
        paragraphs: [
          'Gift cards are minted through `CreateGiftCard`. The app checks balance and allowance, prepares metadata, then calls the contract on whichever path you picked.',
          'Internal Wallet mode routes the transaction through the backend. External wallet mode asks the user to confirm in their browser wallet.'
        ],
        bullets: [
          'After mint, we read `tokenId` from the ERC-721 `Transfer` event.',
          'X (Twitter), Twitch, Telegram, and similar recipients use separate create/claim paths.',
          'After claim, the NFT is a normal ERC-721 in the recipient\'s context.'
        ]
      },
      {
        id: 'internal-wallet-stats',
        title: 'Statistics',
        paragraphs: [
          'Counts and amounts below are gift cards minted through Circle Developer Wallet (Internal Wallet). Balances use 6 decimals; raw is the integer in smallest units.',
          'Our testnet writeup put total volume around $310k. The percentage is internal-wallet mint face value divided by that $310k number. Treat it as a rough comparison (EURC is not exactly USD).'
        ],
        bullets: [
          'Users who minted cards via Internal Wallet: 220',
          'Combined face value of those mints: 6,634',
          'USDC portion: 4,499',
          'EURC portion: 2,134',
          'Versus ~$310k total volume:≈ 2.14%.'
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

  const canonicalSlug = slug ? resolveBlogSlug(slug) : null;
  const post =
    canonicalSlug && isPublicBlogSlug(canonicalSlug)
      ? blogPosts[canonicalSlug] ?? null
      : null;
  const postMeta = canonicalSlug ? getBlogPostMeta(canonicalSlug) : undefined;

  useEffect(() => {
    if (!slug || !canonicalSlug || slug === canonicalSlug) return;
    navigate(`/blog/${canonicalSlug}`, { replace: true });
  }, [slug, canonicalSlug, navigate]);

  useEffect(() => {
    // Ensure each blog post opens from the top in SPA navigation.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [canonicalSlug]);

  useEffect(() => {
    if (post?.slug !== 'zktls-payments-guide') return;
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

  const renderSections = (
    sections: BlogSection[],
    images: BlogImage[],
    cohereStyle = false
  ) => {
    const imageMap = new Map(images.map((image) => [image.id, image]));

    const renderGiftCardStepEmbed = (
      img: BlogImage,
      Preview: ComponentType<{ compact?: boolean }>
    ) => (
      <button
        type="button"
        onClick={() => setActiveImage(img)}
        className="group w-full text-left"
        aria-label={`Open: ${img.alt}`}
      >
        <BlogStepFrame compact>
          <Preview compact />
        </BlogStepFrame>
      </button>
    );

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
        return (<button type="button" onClick={() => setActiveImage(img)} className="w-full text-left rounded-xl overflow-hidden bg-transparent" aria-label={`Open: ${img.caption}`}><PrivyOAuthInfographic compact />{img.caption && <div className="mt-3 text-sm text-gray-600">{img.caption}</div>}</button>);
      }
      if (img.componentId === 'gift-card-create-embed') {
        return (<button type="button" onClick={() => setActiveImage(img)} className="w-full text-left rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden" aria-label={`Open: ${img.alt}`}><div className="p-2 min-h-[200px]"><CreateGiftCardPreview compact /></div></button>);
      }
      if (img.componentId === 'gift-card-nav-embed') {
        return renderGiftCardStepEmbed(img, GiftCardNavPreview);
      }
      if (img.componentId === 'gift-card-wallet-source-embed') {
        return renderGiftCardStepEmbed(img, GiftCardWalletSourcePreview);
      }
      if (img.componentId === 'gift-card-recipient-type-embed') {
        return renderGiftCardStepEmbed(img, GiftCardRecipientTypePreview);
      }
      if (img.componentId === 'gift-card-amount-embed') {
        return renderGiftCardStepEmbed(img, GiftCardAmountPreview);
      }
      if (img.componentId === 'gift-card-review-embed') {
        return renderGiftCardStepEmbed(img, GiftCardReviewPreview);
      }
      if (img.componentId === 'payments-send-embed') {
        return (<button type="button" onClick={() => setActiveImage(img)} className="w-full text-left rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden" aria-label={`Open: ${img.alt}`}><div className="p-4 min-h-[200px]"><ZkSendPanel initialTab="send" preview previewValues={paymentsPreviewValues ?? PAYMENTS_SEND_PREVIEW_FALLBACK} /></div></button>);
      }
      if (img.componentId === 'payments-receive-embed') {
        return (<button type="button" onClick={() => setActiveImage(img)} className="w-full text-left rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden" aria-label={`Open: ${img.alt}`}><div className="p-4 min-h-[200px]"><ZkSendPanel initialTab="receive" preview previewValues={paymentsPreviewValues ?? PAYMENTS_SEND_PREVIEW_FALLBACK} /></div></button>);
      }
      if (img.componentId === 'internal-wallet-dashboard-embed') {
        return (<button type="button" onClick={() => setActiveImage(img)} className="w-full text-left rounded-xl overflow-hidden" aria-label={`Open: ${img.alt}`}><div className="p-2 min-h-[200px]"><InternalWalletDashboardPreview compact /></div></button>);
      }
      if (img.componentId === 'internal-wallet-create-embed') {
        return (<button type="button" onClick={() => setActiveImage(img)} className="w-full text-left rounded-xl overflow-hidden" aria-label={`Open: ${img.alt}`}><div className="p-2 min-h-[200px]"><InternalWalletCreatePromptPreview compact /></div></button>);
      }
      const isSR = img.id === 'send-tab' || img.id === 'receive-tab';
      return (<button type="button" onClick={() => setActiveImage(img)} className={`w-full text-left ${isSR ? 'border-0 shadow-none ring-0 outline-none' : ''}`} aria-label={`Open image: ${img.alt}`}><img src={img.src} alt={img.alt} loading="lazy" className={`w-full h-40 object-cover ${isSR ? 'rounded-xl border-0 shadow-none' : 'rounded-xl'}`} />{!isSR && img.caption && <div className="mt-3 text-sm text-gray-600">{img.caption}</div>}</button>);
    };

    const renderSectionText = (section: BlogSection, isLast: boolean) => {
      const isStep = section.variant === 'step';
      return (
      <section key={section.id} id={section.id} className="scroll-mt-28">
        <div className={cohereStyle ? `px-4 md:px-6 ${isLast ? 'pb-12' : isStep ? 'pb-6' : 'pb-8'}` : `px-12 md:px-22 ${isLast ? 'pb-12 md:pb-22' : ''}`}>
          {isStep ? (
            <h3 className="text-xl md:text-2xl font-medium text-gray-900 mb-4 tracking-tight">{section.title}</h3>
          ) : (
            <h2 className={cohereStyle ? 'text-2xl md:text-3xl font-medium text-gray-900 mb-6 tracking-tight' : 'text-3xl md:text-4xl font-bold text-gray-900 mb-4'}>{section.title}</h2>
          )}
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
    };

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
      {postMeta && <BlogPostHead post={postMeta} />}
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
              <div className="pt-12 border-t border-gray-200 mt-12 space-y-6">
                <BlogEngagementBar slug={post.slug} recordViewOnMount />
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
                      className={`block rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors ${
                        section.variant === 'step'
                          ? 'pl-6 pr-3 py-1.5 text-xs'
                          : 'px-3 py-2 text-sm'
                      }`}
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

          <div className="mt-12 pt-8 border-t border-gray-200 space-y-6">
            <BlogEngagementBar slug={post.slug} recordViewOnMount />
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
              </div>
            ) : activeImage.componentId === 'privy-oauth-infographic' ? (
              <div className="bg-transparent overflow-hidden">
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
              </div>
            ) : activeImage.componentId === 'gift-card-create-embed' ? (
              <div className="bg-white rounded-xl overflow-hidden p-6 max-h-[85vh] overflow-y-auto">
                <CreateGiftCardPreview />
              </div>
            ) : activeImage.componentId && GIFT_CARD_STEP_LIGHTBOX[activeImage.componentId] ? (
              <div className="max-h-[85vh] overflow-y-auto p-2">
                {(() => {
                  const StepPreview = GIFT_CARD_STEP_LIGHTBOX[activeImage.componentId!]!;
                  return (
                    <BlogStepFrame>
                      <StepPreview />
                    </BlogStepFrame>
                  );
                })()}
              </div>
            ) : activeImage.componentId === 'payments-send-embed' || activeImage.id === 'send-tab' ? (
              <div className="bg-white rounded-xl overflow-hidden p-6 max-h-[85vh] overflow-y-auto">
                <ZkSendPanel initialTab="send" preview previewValues={paymentsPreviewValues ?? PAYMENTS_SEND_PREVIEW_FALLBACK} />
              </div>
            ) : activeImage.componentId === 'payments-receive-embed' || activeImage.id === 'receive-tab' ? (
              <div className="bg-white rounded-xl overflow-hidden p-6 max-h-[85vh] overflow-y-auto">
                <ZkSendPanel initialTab="receive" preview previewValues={paymentsPreviewValues ?? PAYMENTS_SEND_PREVIEW_FALLBACK} />
              </div>
            ) : activeImage.componentId === 'internal-wallet-dashboard-embed' ? (
              <div className="bg-white rounded-xl overflow-hidden p-6 max-h-[85vh] overflow-y-auto">
                <InternalWalletDashboardPreview />
              </div>
            ) : activeImage.componentId === 'internal-wallet-create-embed' ? (
              <div className="bg-white rounded-xl overflow-hidden p-6 max-h-[85vh] overflow-y-auto">
                <InternalWalletCreatePromptPreview />
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
