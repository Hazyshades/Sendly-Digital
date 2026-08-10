import { expect, test as base, type BrowserContext, type Page, type Route, type TestInfo } from '@playwright/test';
import { decodeFunctionData, encodeFunctionResult } from 'viem';

export const E2E_ADDRESS = '0x1111111111111111111111111111111111111111';
export const E2E_OTHER_ADDRESS = '0x2222222222222222222222222222222222222222';
export const E2E_INTERNAL_WALLET_ADDRESS = '0x3333333333333333333333333333333333333333';
export const E2E_TX_HASH = `0x${'a'.repeat(64)}`;

type Json = Record<string, unknown> | unknown[];

export type E2EWalletScenario = {
  connected?: boolean;
  address?: string;
  chainId?: number;
  rejectConnect?: boolean;
  rejectSwitch?: boolean;
  rejectTransaction?: boolean;
};

export type E2EIdentity = {
  platform: 'twitter' | 'twitch' | 'github' | 'telegram' | 'gmail' | 'linkedin';
  socialUserId: string;
  username: string;
};

export type E2EInternalWallet = {
  user_id: string;
  circle_wallet_id: string;
  wallet_address: string;
  blockchain: string;
  account_type: 'EOA' | 'SCA';
  state: 'LIVE' | 'FROZEN';
  custody_type: 'DEVELOPER';
  social_platform?: string | null;
  social_user_id?: string | null;
  social_username?: string | null;
  privy_user_id?: string | null;
};

export type E2EScenario = {
  /** Browser wallet behavior injected before the app loads. */
  wallet?: E2EWalletScenario;
  /** OAuth identities that are seeded into browser storage before navigation. */
  identities?: E2EIdentity[];
  /** Deterministic main-host identity consumed only when VITE_E2E=true. */
  privyUser?: Record<string, unknown> | null;
  internalWallet?: E2EInternalWallet | null;
  payments?: Record<string, unknown>[];
  directDeposits?: Record<string, unknown>[];
  giftCards?: Record<string, unknown>[];
  /** A controlled failure returned by an app-owned mock endpoint. */
  serviceError?: string | null;
};

type MutableState = {
  scenario: E2EScenario;
  wallet: E2EInternalWallet | null;
  payments: Record<string, unknown>[];
  directDeposits: Record<string, unknown>[];
  giftCards: Record<string, unknown>[];
  unexpectedRequests: string[];
};

export type E2EApp = {
  page: Page;
  mainUrl: string;
  zkUrl: string;
  scenario: E2EScenario;
  gotoMain(path: string): Promise<void>;
  gotoZk(path: string): Promise<void>;
  readClipboard(): Promise<string>;
};

type E2EFixtures = {
  scenario: E2EScenario;
  app: E2EApp;
};

const ARC_CHAIN_ID = 5_042_002;
const jsonHeaders = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
const RPC_REVERT = Symbol('e2e-rpc-revert');

// Kept intentionally small: these are the read-only contract surfaces used by
// P0 Receive fixtures, not a second copy of the production contract ABI.
const E2E_PAYMENT_READ_ABI = [
  {
    type: 'function',
    name: 'getPendingPayments',
    stateMutability: 'view',
    inputs: [{ name: '_socialIdentityHash', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getPayment',
    stateMutability: 'view',
    inputs: [{ name: '_paymentId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'paymentId', type: 'uint256' },
          { name: 'sender', type: 'address' },
          { name: 'socialIdentityHash', type: 'bytes32' },
          { name: 'platform', type: 'string' },
          { name: 'amount', type: 'uint256' },
          { name: 'token', type: 'address' },
          { name: 'recipient', type: 'address' },
          { name: 'claimed', type: 'bool' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'claimedAt', type: 'uint256' },
        ],
      },
    ],
  },
] as const;

const E2E_DIRECT_DEPOSIT_READ_ABI = [
  {
    type: 'function',
    name: 'deposits',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'sender', type: 'address' },
      { name: 'recipient', type: 'address' },
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'claimed', type: 'bool' },
      { name: 'createdAt', type: 'uint256' },
    ],
  },
] as const;

const E2E_GIFT_CARD_READ_ABI = [
  {
    type: 'function',
    name: 'getGiftCardInfo',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'amount', type: 'uint256' },
          { name: 'token', type: 'address' },
          { name: 'redeemed', type: 'bool' },
          { name: 'message', type: 'string' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

const E2E_TWITTER_VAULT_READ_ABI = [
  {
    type: 'function',
    name: 'getPendingCardsForUsername',
    stateMutability: 'view',
    inputs: [{ name: 'username', type: 'string' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
] as const;

const defaultScenario: E2EScenario = {
  wallet: { connected: false, address: E2E_ADDRESS, chainId: ARC_CHAIN_ID },
  identities: [],
  privyUser: null,
  internalWallet: null,
  payments: [],
  directDeposits: [],
  giftCards: [],
  serviceError: null,
};

export function createInternalWallet(overrides: Partial<E2EInternalWallet> = {}): E2EInternalWallet {
  return {
    user_id: E2E_ADDRESS.toLowerCase(),
    circle_wallet_id: 'e2e-circle-wallet',
    wallet_address: E2E_INTERNAL_WALLET_ADDRESS,
    blockchain: 'ARC-TESTNET',
    account_type: 'SCA',
    state: 'LIVE',
    custody_type: 'DEVELOPER',
    ...overrides,
  };
}

function createState(scenario: E2EScenario): MutableState {
  return {
    scenario: {
      ...defaultScenario,
      ...scenario,
      wallet: { ...defaultScenario.wallet, ...scenario.wallet },
      identities: [...(scenario.identities ?? [])],
      payments: [...(scenario.payments ?? [])],
      directDeposits: [...(scenario.directDeposits ?? [])],
      giftCards: [...(scenario.giftCards ?? [])],
    },
    wallet: scenario.internalWallet ? { ...scenario.internalWallet } : null,
    payments: [...(scenario.payments ?? [])],
    directDeposits: [...(scenario.directDeposits ?? [])],
    giftCards: [...(scenario.giftCards ?? [])],
    unexpectedRequests: [],
  };
}

function asJson(value: unknown): Json {
  return value as Json;
}

async function fulfillJson(route: Route, body: Json, status = 200) {
  await route.fulfill({ status, headers: jsonHeaders, body: JSON.stringify(body) });
}

function asBigInt(value: unknown, fallback: bigint): bigint {
  try {
    return BigInt(value as string | number | bigint);
  } catch {
    return fallback;
  }
}

function asAddress(value: unknown, fallback: string): `0x${string}` {
  const candidate = typeof value === 'string' ? value : '';
  return /^0x[0-9a-fA-F]{40}$/.test(candidate) ? candidate as `0x${string}` : fallback as `0x${string}`;
}

function asBytes32(value: unknown): `0x${string}` {
  const candidate = typeof value === 'string' ? value : '';
  return /^0x[0-9a-fA-F]{64}$/.test(candidate) ? candidate as `0x${string}` : `0x${'1'.repeat(64)}`;
}

function getPaymentCallResult(data: `0x${string}`, state: MutableState): string | null | typeof RPC_REVERT {
  try {
    const decoded = decodeFunctionData({ abi: E2E_PAYMENT_READ_ABI, data });
    if (decoded.functionName === 'getPendingPayments') {
      const ids = state.payments
        .filter((payment) => payment.claimed !== true)
        .map((payment, index) => asBigInt(payment.paymentId ?? payment.id, BigInt(index + 1)));
      return encodeFunctionResult({
        abi: E2E_PAYMENT_READ_ABI,
        functionName: 'getPendingPayments',
        result: ids,
      });
    }
    if (decoded.functionName === 'getPayment') {
      const requestedId = String(decoded.args?.[0] ?? '');
      const payment = state.payments.find((candidate, index) => String(candidate.paymentId ?? candidate.id ?? index + 1) === requestedId) ?? {};
      const result = {
        paymentId: asBigInt(payment.paymentId ?? payment.id, asBigInt(requestedId, 1n)),
        sender: asAddress(payment.sender ?? payment.senderAddress, E2E_OTHER_ADDRESS),
        socialIdentityHash: asBytes32(payment.socialIdentityHash ?? payment.recipientIdentityHash),
        platform: typeof payment.platform === 'string' ? payment.platform : 'twitter',
        amount: asBigInt(payment.amountWei ?? payment.amount, 1_000_000n),
        token: asAddress(payment.token, '0x0000000000000000000000000000000000000001'),
        recipient: asAddress(payment.recipient ?? payment.recipientWallet, E2E_ADDRESS),
        claimed: payment.claimed === true,
        createdAt: asBigInt(payment.createdAt, 1n),
        claimedAt: asBigInt(payment.claimedAt, 0n),
      };
      return encodeFunctionResult({
        abi: E2E_PAYMENT_READ_ABI,
        functionName: 'getPayment',
        result,
      });
    }
  } catch {
    // This call belongs to another contract surface.
  }

  try {
    const decoded = decodeFunctionData({ abi: E2E_DIRECT_DEPOSIT_READ_ABI, data });
    if (decoded.functionName === 'deposits') {
      const requestedId = String(decoded.args?.[0] ?? '');
      const deposit = state.directDeposits.find((candidate, index) => String(candidate.depositId ?? candidate.deposit_id ?? index + 1) === requestedId) ?? {};
      return encodeFunctionResult({
        abi: E2E_DIRECT_DEPOSIT_READ_ABI,
        functionName: 'deposits',
        result: [
          asAddress(deposit.sender ?? deposit.sender_address, E2E_OTHER_ADDRESS),
          asAddress(deposit.recipient ?? deposit.recipient_wallet, E2E_ADDRESS),
          asAddress(deposit.token, '0x0000000000000000000000000000000000000001'),
          asBigInt(deposit.amountWei ?? deposit.amount, 1_000_000n),
          deposit.claimed === true,
          asBigInt(deposit.createdAt ?? deposit.created_at, 1n),
        ],
      });
    }
  } catch {
    // This call belongs to another contract surface.
  }

  try {
    const decoded = decodeFunctionData({ abi: E2E_GIFT_CARD_READ_ABI, data });
    const requestedId = String(decoded.args?.[0] ?? '');
    const card = state.giftCards.find((candidate) => String(candidate.token_id ?? candidate.tokenId) === requestedId);
    if (!card) return RPC_REVERT;
    if (decoded.functionName === 'getGiftCardInfo') {
      return encodeFunctionResult({
        abi: E2E_GIFT_CARD_READ_ABI,
        functionName: 'getGiftCardInfo',
        result: {
          amount: asBigInt(card.amountWei ?? card.amount, 1_000_000n),
          token: asAddress(card.token, '0x0000000000000000000000000000000000000001'),
          redeemed: card.redeemed === true || card.status === 'redeemed',
          message: typeof card.message === 'string' ? card.message : 'E2E gift card',
        },
      });
    }
    if (decoded.functionName === 'ownerOf') {
      return encodeFunctionResult({
        abi: E2E_GIFT_CARD_READ_ABI,
        functionName: 'ownerOf',
        result: asAddress(card.recipient_address ?? card.owner, E2E_ADDRESS),
      });
    }
  } catch {
    // This call belongs to another contract surface.
  }

  try {
    const decoded = decodeFunctionData({ abi: E2E_TWITTER_VAULT_READ_ABI, data });
    if (decoded.functionName === 'getPendingCardsForUsername') {
      const username = String(decoded.args?.[0] ?? '').replace(/^@/, '').toLowerCase();
      const ids = state.giftCards
        .filter((card) =>
          card.recipient_type === 'twitter' &&
          String(card.recipient_username ?? card.username ?? '').replace(/^@/, '').toLowerCase() === username &&
          card.claimed !== true &&
          card.redeemed !== true,
        )
        .map((card, index) => asBigInt(card.token_id ?? card.tokenId, BigInt(index + 1)));
      return encodeFunctionResult({
        abi: E2E_TWITTER_VAULT_READ_ABI,
        functionName: 'getPendingCardsForUsername',
        result: ids,
      });
    }
  } catch {
    // This call belongs to another contract surface.
  }

  return null;
}

function rpcResult(method: string, state: MutableState, params: unknown[] = []): string | Json | typeof RPC_REVERT {
  const zero = `0x${'0'.repeat(64)}`;
  const balance = `0x${(1_000_000_000n).toString(16).padStart(64, '0')}`;
  switch (method) {
    case 'eth_chainId':
      return `0x${(state.scenario.wallet?.chainId ?? ARC_CHAIN_ID).toString(16)}`;
    case 'eth_blockNumber':
      return '0x1';
    case 'eth_getBalance':
      return balance;
    case 'eth_getTransactionReceipt':
      return {
        transactionHash: E2E_TX_HASH,
        transactionIndex: '0x0',
        blockHash: `0x${'b'.repeat(64)}`,
        blockNumber: '0x1',
        from: E2E_ADDRESS,
        to: E2E_OTHER_ADDRESS,
        cumulativeGasUsed: '0x5208',
        gasUsed: '0x5208',
        contractAddress: null,
        logs: [],
        logsBloom: `0x${'0'.repeat(512)}`,
        status: '0x1',
        type: '0x2',
        effectiveGasPrice: '0x1',
      };
    case 'eth_getTransactionByHash':
      return {
        hash: E2E_TX_HASH,
        nonce: '0x0',
        blockHash: `0x${'b'.repeat(64)}`,
        blockNumber: '0x1',
        transactionIndex: '0x0',
        from: E2E_ADDRESS,
        to: E2E_OTHER_ADDRESS,
        value: '0x0',
        gas: '0x5208',
        gasPrice: '0x1',
        input: '0x',
        type: '0x2',
        chainId: `0x${ARC_CHAIN_ID.toString(16)}`,
      };
    case 'eth_getLogs':
      return [];
    case 'eth_call': {
      const call = (params[0] ?? {}) as { data?: string };
      const data = call.data?.startsWith('0x') ? call.data as `0x${string}` : null;
      return data ? getPaymentCallResult(data, state) ?? balance : balance;
    }
    default:
      return zero;
  }
}

async function handleRpc(route: Route, state: MutableState) {
  let body: unknown = {};
  try {
    body = route.request().postDataJSON();
  } catch {
    // A malformed RPC request is still kept in-process and gets a clear JSON-RPC error.
  }
  const requests = Array.isArray(body) ? body : [body];
  const responses = requests.map((request) => {
    const rpc = (request ?? {}) as { id?: number | string | null; method?: string; params?: unknown[] };
    const result = rpcResult(rpc.method ?? '', state, rpc.params ?? []);
    return result === RPC_REVERT
      ? { jsonrpc: '2.0', id: rpc.id ?? null, error: { code: 3, message: 'execution reverted', data: '0x' } }
      : { jsonrpc: '2.0', id: rpc.id ?? null, result };
  });
  await fulfillJson(route, asJson(Array.isArray(body) ? responses : responses[0]));
}

function parseBody(route: Route): Record<string, unknown> {
  try {
    return route.request().postDataJSON() as Record<string, unknown>;
  } catch {
    return {};
  }
}

function firstIdentity(state: MutableState): E2EIdentity | undefined {
  return state.scenario.identities?.[0];
}

function createWalletFromRequest(state: MutableState, body: Record<string, unknown>): E2EInternalWallet {
  const identity = firstIdentity(state);
  const userId = String(body.userId ?? body.privyUserId ?? identity?.socialUserId ?? E2E_ADDRESS).toLowerCase();
  return createInternalWallet({
    user_id: userId,
    social_platform: String(body.platform ?? identity?.platform ?? '') || null,
    social_user_id: String(body.socialUserId ?? identity?.socialUserId ?? '') || null,
    social_username: String(body.socialUsername ?? identity?.username ?? '') || null,
    privy_user_id: String(body.privyUserId ?? '') || null,
  });
}

async function handleFunctions(route: Route, state: MutableState, pathname: string) {
  const method = route.request().method();
  const body = parseBody(route);
  const error = state.scenario.serviceError;

  if (error && (pathname.includes('/wallets/send-transaction') || pathname.includes('/zk-sender/payments'))) {
    await fulfillJson(route, { error }, 500);
    return;
  }

  if (pathname.endsWith('/wallets') && method === 'GET') {
    await fulfillJson(route, { success: true, wallets: state.wallet ? [state.wallet] : [] });
    return;
  }
  if (pathname.includes('/wallets/get-by-social')) {
    await fulfillJson(route, { success: true, wallet: state.wallet });
    return;
  }
  if (pathname.endsWith('/wallets/create') || pathname.endsWith('/wallets/create-for-social')) {
    state.wallet = createWalletFromRequest(state, body);
    await fulfillJson(route, { success: true, wallet: state.wallet });
    return;
  }
  if (pathname.endsWith('/wallets/request-testnet-tokens')) {
    await fulfillJson(route, { success: true, message: 'Testnet tokens requested' });
    return;
  }
  if (pathname.endsWith('/wallets/send-transaction')) {
    await fulfillJson(route, { success: true, txHash: E2E_TX_HASH, transactionState: 'COMPLETE' });
    return;
  }
  if (pathname.endsWith('/wallets/transaction-status')) {
    await fulfillJson(route, { success: true, transaction: { state: 'COMPLETE', txHash: E2E_TX_HASH } });
    return;
  }
  if (pathname.includes('/direct-send/deposits')) {
    if (pathname.endsWith('/claim')) {
      const pathParts = pathname.split('/');
      const depositId = pathParts[pathParts.length - 2];
      const deposit = state.directDeposits.find((candidate) => String(candidate.depositId ?? candidate.deposit_id) === depositId);
      if (deposit) {
        deposit.claimed = true;
        deposit.claim_tx_hash = E2E_TX_HASH;
      }
      await fulfillJson(route, { deposit: deposit ?? null });
      return;
    }
    await fulfillJson(route, { deposits: state.directDeposits });
    return;
  }
  if (pathname.includes('/zk-sender/payments')) {
    if (pathname.endsWith('/claim')) {
      const pathParts = pathname.split('/');
      const paymentId = pathParts[pathParts.length - 2];
      const payment = state.payments.find((candidate) => String(candidate.paymentId ?? candidate.id) === paymentId);
      if (payment) {
        payment.claimed = true;
        payment.claimTxHash = E2E_TX_HASH;
      }
      await fulfillJson(route, { payment: payment ?? null });
      return;
    }
    const payment = { id: 'e2e-payment', paymentId: '1', ...body };
    state.payments.push(payment);
    await fulfillJson(route, { payment });
    return;
  }
  const giftCardClaimMatch = pathname.match(/\/gift-cards\/twitter\/([^/]+)\/claim$/);
  if (giftCardClaimMatch) {
    const tokenId = giftCardClaimMatch[1];
    const card = state.giftCards.find((candidate) => String(candidate.token_id ?? candidate.tokenId) === tokenId);
    if (card) {
      card.claimed = true;
      card.recipient_address = String(body.walletAddress ?? body.recipientWallet ?? E2E_INTERNAL_WALLET_ADDRESS);
      card.status = 'received';
    }
    await fulfillJson(route, { success: true, card: card ?? null });
    return;
  }
  // Paywall is outside this P0 suite; a deterministic 404 lets the zk route
  // render its ordinary not-found state without a live creator API.
  if (pathname.includes('/creator-paywall/paywall/')) {
    await fulfillJson(route, { error: 'Not found' }, 404);
    return;
  }
  if (pathname.includes('/gift-cards')) {
    await fulfillJson(route, { success: true, card: state.giftCards[0] ?? null });
    return;
  }
  await fulfillJson(route, { success: true });
}

async function handleRest(route: Route, state: MutableState, pathname: string) {
  const method = route.request().method();
  if (pathname.includes('gift_cards') || pathname.includes('zksend_payments')) {
    if (method === 'GET') {
      if (pathname.includes('zksend')) {
        await fulfillJson(route, state.payments);
        return;
      }
      const url = new URL(route.request().url());
      const equalValue = (key: string) => (url.searchParams.get(key) ?? '').replace(/^eq\./, '').toLowerCase();
      const sender = equalValue('sender_address');
      const recipient = equalValue('recipient_address');
      const cards = state.giftCards.filter((card) =>
        (!sender || String(card.sender_address ?? '').toLowerCase() === sender) &&
        (!recipient || String(card.recipient_address ?? '').toLowerCase() === recipient),
      );
      await fulfillJson(route, cards);
      return;
    }
    await fulfillJson(route, pathname.includes('zksend') ? state.payments : state.giftCards);
    return;
  }
  await fulfillJson(route, []);
}

async function handleMockApi(route: Route, state: MutableState) {
  const url = new URL(route.request().url());
  const pathname = url.pathname;

  if (pathname.endsWith('/__e2e__/rpc')) {
    await handleRpc(route, state);
    return;
  }
  if (pathname.includes('/rest/v1/')) {
    await handleRest(route, state, pathname);
    return;
  }
  if (pathname.includes('/functions/v1/')) {
    await handleFunctions(route, state, pathname);
    return;
  }
  if (pathname.endsWith('/api/reclaim/config')) {
    await fulfillJson(route, { minSignatures: 2 });
    return;
  }
  if (pathname.endsWith('/api/reclaim/verify')) {
    await fulfillJson(route, { isValid: true, context: {} });
    return;
  }
  if (pathname.endsWith('/api/reclaim/zkfetch/prove')) {
    await fulfillJson(route, {
      proof: [
        {
          claimData: {
            provider: 'e2e-provider',
            parameters: '',
            context: '',
            identifier: `0x${'e'.repeat(64)}`,
            owner: E2E_ADDRESS,
            timestampS: '1',
            epoch: '1',
          },
          signatures: ['0x01', '0x02'],
          extractedParameterValues: { username: firstIdentity(state)?.username ?? 'alice' },
        },
      ],
    });
    return;
  }
  if (pathname.endsWith('/api/twitter/oauth1/request-token')) {
    await fulfillJson(route, { success: true, oauthToken: 'e2e-twitter-request-token' });
    return;
  }
  if (pathname.endsWith('/api/twitter/oauth1/access-token')) {
    await fulfillJson(route, {
      oauthToken: 'e2e-twitter-access-token',
      oauthTokenSecret: 'e2e-twitter-access-secret',
      screenName: firstIdentity(state)?.username ?? 'alice',
      userId: firstIdentity(state)?.socialUserId ?? 'e2e-twitter-id',
    });
    return;
  }
  await fulfillJson(route, { success: true });
}

async function installRouteHandlers(context: BrowserContext, state: MutableState) {
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    const hostname = url.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === 'zk.localhost' || hostname === '127.0.0.1') {
      await route.continue();
      return;
    }
    if (hostname.endsWith('vercel-insights.com') || hostname.endsWith('va.vercel-scripts.com')) {
      await route.abort('blockedbyclient');
      return;
    }
    state.unexpectedRequests.push(route.request().url());
    await route.abort('blockedbyclient');
  });

  await context.route('**://eiiprokgcuksmunmszxf.supabase.co/**', (route) => handleMockApi(route, state));
  await context.route('**/__e2e__/**', (route) => handleMockApi(route, state));
  // Fonts are static presentation assets, not a P0 product integration. Return
  // an empty stylesheet so the test document can finish loading offline.
  await context.route('https://fonts.googleapis.com/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'text/css', body: '' });
  });
  await context.route('https://fonts.gstatic.com/**', async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });
  await context.route('https://api.x.com/**', async (route) => {
    const identity = state.scenario.identities?.find((candidate) => candidate.platform === 'twitter');
    await fulfillJson(route, { data: { id: identity?.socialUserId ?? 'e2e-twitter-id', username: identity?.username ?? 'alice' } });
  });
  await context.route('https://api.github.com/**', async (route) => {
    const identity = state.scenario.identities?.find((candidate) => candidate.platform === 'github');
    await fulfillJson(route, { id: identity?.socialUserId ?? 'e2e-github-id', login: identity?.username ?? 'octocat' });
  });
  await context.route('https://api.twitch.tv/**', async (route) => {
    const identity = state.scenario.identities?.find((candidate) => candidate.platform === 'twitch');
    await fulfillJson(route, { data: [{ id: identity?.socialUserId ?? 'e2e-twitch-id', login: identity?.username ?? 'streamer' }] });
  });
}

async function installBrowserFixture(context: BrowserContext, scenario: E2EScenario) {
  const wallet = { ...defaultScenario.wallet, ...scenario.wallet };
  const identities = scenario.identities ?? [];
  const defaultIdentity = identities[0];
  const privyUser = scenario.privyUser ?? (defaultIdentity
    ? {
        id: `did:privy:e2e-${defaultIdentity.socialUserId}`,
        linkedAccounts: [
          {
            type: defaultIdentity.platform,
            provider: defaultIdentity.platform,
            subject: defaultIdentity.socialUserId,
            username: defaultIdentity.username,
          },
        ],
        [defaultIdentity.platform]: { subject: defaultIdentity.socialUserId, username: defaultIdentity.username },
      }
    : null);

  await context.addInitScript(
    ({ configuredWallet, configuredIdentities, configuredPrivyUser }) => {
      const byPlatform = Object.fromEntries(configuredIdentities.map((identity) => [identity.platform, identity]));
      const twitter = byPlatform.twitter;
      if (twitter) {
        localStorage.setItem('twitter_oauth1_token', 'e2e-twitter-token');
        localStorage.setItem('twitter_oauth1_secret', 'e2e-twitter-secret');
        localStorage.setItem('twitter_oauth1_user_id', twitter.socialUserId);
        localStorage.setItem('twitter_oauth1_screen_name', twitter.username);
        localStorage.setItem('sendly-primary-identity', 'twitter');
      }
      const tokenPlatforms = ['twitch', 'github', 'telegram', 'gmail', 'linkedin'];
      for (const platform of tokenPlatforms) {
        const identity = byPlatform[platform];
        if (identity) localStorage.setItem(`${platform}_oauth_token`, `e2e-${platform}-token`);
      }

      window.__SENDLY_E2E_PRIVY__ = {
        authenticated: Boolean(configuredPrivyUser),
        ready: true,
        user: configuredPrivyUser,
        getAccessToken: async () => 'e2e-privy-access-token',
      };

      const listeners = new Map<string, Array<(value: unknown) => void>>();
      const walletAddress = configuredWallet.address ?? '0x1111111111111111111111111111111111111111';
      const state = {
        accounts: configuredWallet.connected ? [walletAddress] : [],
        chainId: configuredWallet.chainId ?? 5042002,
      };
      if (configuredWallet.connected) {
        // Wagmi's targetless injected connector intentionally will not
        // reconnect from a non-empty EIP-1193 account list alone. Seed its
        // connector-scoped authorization flag so the declared fixture state
        // mounts as a connected browser wallet without driving RainbowKit.
        localStorage.setItem('wagmi.injected.connected', JSON.stringify(true));
      }
      const emit = (event: string, value: unknown) => {
        for (const handler of listeners.get(event) ?? []) handler(value);
      };
      const provider = {
        isMetaMask: true,
        request: async ({ method }: { method: string }) => {
          if (method === 'eth_accounts') return state.accounts;
          if (method === 'eth_requestAccounts') {
            if (configuredWallet.rejectConnect) throw { code: 4001, message: 'User rejected wallet connection' };
            state.accounts = [walletAddress];
            emit('accountsChanged', state.accounts);
            return state.accounts;
          }
          if (method === 'eth_chainId') return `0x${Number(state.chainId).toString(16)}`;
          if (method === 'wallet_switchEthereumChain') {
            if (configuredWallet.rejectSwitch) throw { code: 4001, message: 'User rejected network switch' };
            state.chainId = 5042002;
            emit('chainChanged', '0x4cec12');
            return null;
          }
          if (method === 'wallet_addEthereumChain') return null;
          if (method === 'eth_sendTransaction' || method === 'personal_sign' || method === 'eth_signTypedData_v4') {
            if (configuredWallet.rejectTransaction) throw { code: 4001, message: 'User rejected request' };
            return `0x${'a'.repeat(64)}`;
          }
          return null;
        },
        on: (event: string, handler: (value: unknown) => void) => {
          const handlers = listeners.get(event) ?? [];
          handlers.push(handler);
          listeners.set(event, handlers);
          return provider;
        },
        removeListener: (event: string, handler: (value: unknown) => void) => {
          listeners.set(event, (listeners.get(event) ?? []).filter((candidate) => candidate !== handler));
          return provider;
        },
      };
      Object.defineProperty(window, 'ethereum', { configurable: true, value: provider });
      window.__SENDLY_E2E_WALLET__ = state;
      window.__SENDLY_E2E_CLIPBOARD__ = '';
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async (value: string) => {
            window.__SENDLY_E2E_CLIPBOARD__ = String(value);
          },
          readText: async () => window.__SENDLY_E2E_CLIPBOARD__,
        },
      });
      window.open = (() => {
        window.setTimeout(() => {
          const identity = byPlatform.twitter ?? { socialUserId: 'e2e-twitter-id', username: 'alice' };
          localStorage.setItem('twitter_oauth1_token', 'e2e-twitter-access-token');
          localStorage.setItem('twitter_oauth1_secret', 'e2e-twitter-access-secret');
          localStorage.setItem('twitter_oauth1_user_id', identity.socialUserId);
          localStorage.setItem('twitter_oauth1_screen_name', identity.username);
          localStorage.setItem('sendly-primary-identity', 'twitter');
          window.dispatchEvent(new Event('identity-updated'));
        }, 0);
        let closed = false;
        return {
          get closed() { return closed; },
          close() { closed = true; },
        } as unknown as Window;
      }) as typeof window.open;
    },
    { configuredWallet: wallet, configuredIdentities: identities, configuredPrivyUser: privyUser },
  );
}

async function waitForRenderedApp(page: Page) {
  await expect(page.locator('#root > *').first()).toBeAttached({ timeout: 60_000 });
}

export const test = base.extend<E2EFixtures>({
  scenario: [{}, { option: true }],
  app: async ({ page, context, scenario }, provideApp, testInfo: TestInfo) => {
    const state = createState(scenario);
    await installBrowserFixture(context, state.scenario);
    await installRouteHandlers(context, state);
    page.on('pageerror', (error) => {
      state.unexpectedRequests.push(`App error: ${error.stack ?? error.message}`);
    });

    const mainUrl = 'http://localhost:4173';
    const zkUrl = 'http://zk.localhost:4173';
    const app: E2EApp = {
      page,
      mainUrl,
      zkUrl,
      scenario: state.scenario,
      gotoMain: async (path) => {
        await page.goto(new URL(path, mainUrl).toString(), { waitUntil: 'commit' });
        await waitForRenderedApp(page);
      },
      gotoZk: async (path) => {
        await page.goto(new URL(path, zkUrl).toString(), { waitUntil: 'commit' });
        await waitForRenderedApp(page);
      },
      readClipboard: async () => (await page.evaluate(() => window.__SENDLY_E2E_CLIPBOARD__)) ?? '',
    };

    try {
      await provideApp(app);
    } finally {
      expect(
        state.unexpectedRequests,
        `Unexpected live external traffic in ${testInfo.title}`,
      ).toEqual([]);
    }
  },
});

export { expect };

declare global {
  interface Window {
    __SENDLY_E2E_PRIVY__?: {
      authenticated: boolean;
      ready: boolean;
      user: Record<string, unknown> | null;
      getAccessToken: () => Promise<string>;
    };
    __SENDLY_E2E_WALLET__?: { accounts: string[]; chainId: number };
    __SENDLY_E2E_CLIPBOARD__?: string;
  }
}
