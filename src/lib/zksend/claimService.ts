import {
  fetchTwitchAuthenticatedUser,
  generateSocialIdentityHash,
  generateTwitchUidIdentityHash,
  gmailIdentityHashes,
  normalizeSocialPlatform,
  normalizeSocialUsername,
  socialProofUsernamesMatch,
  twitchUidHandleSegment,
  type SocialPlatform,
} from '@/lib/reclaim/identity';
import { verifyReclaimProofs } from '@/lib/reclaim/api';
import { toOnchainReclaimProof } from '@/lib/reclaim/onchain';
import type { ReclaimProof } from '@/lib/reclaim/types';
import { markZkSendPaymentClaimed } from '@/lib/zksend/zksendPaymentsAPI';
import { markDirectDepositClaimed } from '@/lib/directsend/directSendPaymentsAPI';
import {
  DeveloperWalletService,
  type DeveloperWallet,
} from '@/lib/circle/developerWalletService';
import { isZkLocalhost } from '@/lib/runtime/zkHost';
import web3Service from '@/lib/web3/web3Service';

/** Platforms that acquire proof via zkFetch (OAuth-backed). */
export const ZKFETCH_PLATFORMS = [
  'twitter',
  'twitch',
  'github',
  'telegram',
  'instagram',
  'linkedin',
] as const;

export type ZkFetchPlatform = (typeof ZKFETCH_PLATFORMS)[number];

export type ClaimOAuthTokens = {
  twitterAccessToken?: string | null;
  oauth1Token?: string | null;
  oauth1TokenSecret?: string | null;
  twitchAccessToken?: string | null;
  githubAccessToken?: string | null;
  telegramAccessToken?: string | null;
  instagramAccessToken?: string | null;
  linkedinAccessToken?: string | null;
  gmailAccessToken?: string | null;
  privyAccessToken?: string | null;
};

export type ZkFetchDescriptor = {
  requestUrl: string;
  regexPattern: string;
  accessToken?: string;
  clientId?: string;
  headers?: Record<string, string>;
  oauth1?: { token: string; tokenSecret: string };
};

export type ProofPrerequisites = {
  platform: SocialPlatform;
  twitchUserId: string | null;
};

export type ClaimPaymentRow = {
  paymentId: string;
  sender: string;
  platform: string;
  amount: string;
  token: string;
};

export type ClaimOutcome = {
  paymentId: string;
  txHash: string;
};

export type ClaimAttribution = {
  privyUserId?: string;
  socialPlatform?: string;
  socialUserId?: string;
};

export type ClaimWalletSource = 'circle' | 'external';

export type ClaimExecutorContext = {
  walletSource: ClaimWalletSource;
  chainId: number;
  zksendAddress: string;
  recipientAddress: string;
  loginUsername: string;
  platform: string;
  tokens: ClaimOAuthTokens;
  primaryIdentityHash?: `0x${string}` | null;
  reclaimProofs?: ReclaimProof[] | null;
  reclaimMinSignatures: number;
  getReclaimApiUrl: (path: string) => string;
  resolveCurrency: (tokenAddressOrSymbol: string) => string;
  developerWallet?: DeveloperWallet | null;
  attribution?: ClaimAttribution;
  /** Called before browser-wallet claims when source is external. */
  initializeExternalWallet?: () => Promise<void>;
};

export type ClaimPaymentsCallbacks = {
  onProofAcquired?: (proofs: ReclaimProof[]) => void;
};

export type ClaimDirectDepositInput = {
  depositId: string;
  walletSource: ClaimWalletSource;
  chainId: number;
  directSendAddress: string;
  recipientWallet: string;
  developerWallet?: DeveloperWallet | null;
  attribution?: ClaimAttribution;
  initializeExternalWallet?: () => Promise<void>;
};

function isZkFetchPlatform(platform: string): platform is ZkFetchPlatform {
  return (ZKFETCH_PLATFORMS as readonly string[]).includes(platform);
}

function readViteEnv(name: string): string | undefined {
  try {
    const fromImportMeta = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.[
      name
    ];
    if (typeof fromImportMeta === 'string' && fromImportMeta) return fromImportMeta;
  } catch {
    // ignore — Node unit tests may lack import.meta.env
  }
  if (typeof process !== 'undefined' && process.env?.[name]) return process.env[name];
  return undefined;
}

export function resolveClaimIdentityHash(
  platform: string,
  loginUsername: string,
  twitchUserId: string | null,
): `0x${string}` | null {
  if (platform === 'twitch' && twitchUserId) {
    return generateTwitchUidIdentityHash(twitchUserId);
  }
  if (platform === 'gmail') {
    const hashes = gmailIdentityHashes(loginUsername);
    return hashes[0] ?? null;
  }
  return generateSocialIdentityHash(platform, loginUsername);
}

function twitchProveUsername(twitchUserId: string | null, loginUsername: string): string {
  if (twitchUserId) return twitchUidHandleSegment(twitchUserId);
  return loginUsername;
}

function validateZkFetchExtraction(
  platform: string,
  proofsArray: ReclaimProof[],
  loginUsername: string,
  twitchUserId: string | null,
): void {
  const extracted = proofsArray[0]?.extractedParameterValues ?? {};
  if (platform === 'twitch') {
    const extractedUserId = String((extracted as { userId?: string }).userId ?? '').trim();
    if (twitchUserId && extractedUserId && extractedUserId !== twitchUserId) {
      throw new Error('Proof Twitch user id mismatch');
    }
    return;
  }
  const extractedUsername = normalizeSocialUsername(String(extracted.username || ''));
  if (extractedUsername && !socialProofUsernamesMatch(platform, loginUsername, extractedUsername)) {
    throw new Error('Proof username mismatch');
  }
}

function assertSignatureCount(proofsArray: ReclaimProof[], minSignatures: number): void {
  const first = proofsArray[0] as {
    signatures?: unknown;
    signedClaim?: { signatures?: unknown };
  };
  const signatures =
    (Array.isArray(first?.signatures) && first.signatures) ||
    (Array.isArray(first?.signedClaim?.signatures) && first.signedClaim!.signatures) ||
    [];
  if (signatures.length < minSignatures) {
    throw new Error(
      `Reclaim proof signatures are incomplete (got ${signatures.length}, need ${minSignatures}). Regenerate proof.`,
    );
  }
}

/**
 * Table-driven zkFetch request descriptor (exact platform values from PendingPayments).
 */
export function buildZkFetchDescriptor(
  platform: string,
  tokens: ClaimOAuthTokens,
  options?: { getReclaimApiUrl?: (path: string) => string },
): ZkFetchDescriptor {
  const normalized = normalizeSocialPlatform(platform);
  if (!normalized || !isZkFetchPlatform(normalized)) {
    throw new Error('Unsupported platform for zkFetch');
  }

  const getReclaimApiUrl =
    options?.getReclaimApiUrl ??
    ((path: string) => (path.startsWith('/') ? path : `/${path}`));

  switch (normalized) {
    case 'twitter': {
      const useOAuth1 = Boolean(tokens.oauth1Token && tokens.oauth1TokenSecret);
      if (useOAuth1) {
        return {
          requestUrl:
            'https://api.x.com/1.1/account/verify_credentials.json?skip_status=true',
          regexPattern: '"screen_name":"(?<username>[^"]+)"',
          oauth1: {
            token: tokens.oauth1Token!,
            tokenSecret: tokens.oauth1TokenSecret!,
          },
        };
      }
      return {
        requestUrl: 'https://api.x.com/2/users/me',
        accessToken: tokens.twitterAccessToken || undefined,
        regexPattern: '"username":"(?<username>[^"]+)"',
      };
    }
    case 'twitch': {
      const twitchClientId = readViteEnv('VITE_TWITCH_CLIENT_ID');
      if (!twitchClientId) throw new Error('Twitch Client ID not configured');
      return {
        requestUrl: 'https://api.twitch.tv/helix/users',
        accessToken: tokens.twitchAccessToken || undefined,
        clientId: twitchClientId,
        regexPattern: '"id":"(?<userId>[^"]+)"',
      };
    }
    case 'github':
      return {
        requestUrl: 'https://api.github.com/user',
        accessToken: tokens.githubAccessToken || undefined,
        regexPattern: '"login":"(?<username>[^"]+)"',
      };
    case 'telegram':
      return {
        requestUrl: getReclaimApiUrl('/api/telegram/me'),
        accessToken: tokens.telegramAccessToken || undefined,
        regexPattern: '"login":"(?<username>[^"]+)"',
      };
    case 'instagram': {
      const instagramClientId = readViteEnv('VITE_INSTAGRAM_CLIENT_ID');
      if (!instagramClientId) throw new Error('Instagram Client ID not configured');
      return {
        requestUrl: 'https://graph.instagram.com/me?fields=username',
        accessToken: tokens.instagramAccessToken || undefined,
        clientId: instagramClientId,
        regexPattern: '"username":"(?<username>[^"]+)"',
      };
    }
    case 'linkedin':
      return {
        requestUrl: 'https://api.linkedin.com/v2/userinfo',
        accessToken: tokens.linkedinAccessToken || undefined,
        regexPattern: '"name":"(?<username>[^"]+)"',
      };
    default:
      throw new Error('Unsupported platform for zkFetch');
  }
}

/**
 * OAuth preflight: required tokens per platform, including Twitch Helix user resolution.
 */
export async function ensureProofPrerequisites(
  platform: string,
  tokens: ClaimOAuthTokens,
): Promise<ProofPrerequisites> {
  const normalized = normalizeSocialPlatform(platform);
  if (!normalized) throw new Error('Unsupported platform');

  if (normalized === 'twitter') {
    const hasOAuth1 = Boolean(tokens.oauth1Token && tokens.oauth1TokenSecret);
    if (isZkLocalhost()) {
      if (!hasOAuth1) throw new Error('Connect Twitter to generate proof');
    } else if (!hasOAuth1 && !tokens.twitterAccessToken && !tokens.privyAccessToken) {
      throw new Error('Connect Twitter or login with Privy to generate proof');
    }
  }

  if (normalized === 'twitch') {
    if (!tokens.twitchAccessToken) throw new Error('Connect Twitch to generate proof');
    const twitchClientId = readViteEnv('VITE_TWITCH_CLIENT_ID');
    if (!twitchClientId) throw new Error('Twitch Client ID not configured');
    const user = await fetchTwitchAuthenticatedUser(tokens.twitchAccessToken, twitchClientId);
    if (!user?.userId) {
      throw new Error('Resolving Twitch user id - connect Twitch and retry');
    }
    return { platform: normalized, twitchUserId: user.userId };
  }

  if (normalized === 'github' && !tokens.githubAccessToken) {
    throw new Error('Connect GitHub to generate proof');
  }
  if (normalized === 'instagram' && !tokens.instagramAccessToken) {
    throw new Error('Connect Instagram to generate proof');
  }
  if (normalized === 'telegram' && !tokens.telegramAccessToken) {
    throw new Error('Connect Telegram to generate proof');
  }
  if (normalized === 'linkedin' && !tokens.linkedinAccessToken) {
    throw new Error('Connect LinkedIn to generate proof');
  }

  return { platform: normalized, twitchUserId: null };
}

async function acquireZkFetchProofs(input: {
  platform: SocialPlatform;
  loginUsername: string;
  twitchUserId: string | null;
  paymentId: string;
  recipient: string;
  tokens: ClaimOAuthTokens;
  getReclaimApiUrl: (path: string) => string;
}): Promise<ReclaimProof[]> {
  const descriptor = buildZkFetchDescriptor(input.platform, input.tokens, {
    getReclaimApiUrl: input.getReclaimApiUrl,
  });

  const proveUrl = input.getReclaimApiUrl('/api/reclaim/zkfetch/prove');
  const isTwitter = input.platform === 'twitter';
  const proveRes = await fetch(proveUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(!isZkLocalhost() && input.tokens.privyAccessToken && isTwitter
        ? { Authorization: `Bearer ${input.tokens.privyAccessToken}` }
        : {}),
    },
    body: JSON.stringify({
      requestUrl: descriptor.requestUrl,
      ...(descriptor.accessToken ? { accessToken: descriptor.accessToken } : {}),
      ...(descriptor.oauth1 ? { oauth1: descriptor.oauth1 } : {}),
      ...(descriptor.clientId ? { clientId: descriptor.clientId } : {}),
      platform: input.platform,
      username:
        input.platform === 'twitch'
          ? twitchProveUsername(input.twitchUserId, input.loginUsername)
          : input.loginUsername,
      paymentId: input.paymentId,
      recipient: input.recipient,
      responseMatches: [{ type: 'regex', value: descriptor.regexPattern }],
    }),
  });

  if (!proveRes.ok) {
    const text = await proveRes.text().catch(() => '');
    throw new Error(`zkFetch proof failed: ${proveRes.status} ${text}`);
  }

  const proveJson = (await proveRes.json()) as { proof?: ReclaimProof[] | ReclaimProof };
  const proof = proveJson.proof;
  if (!proof) throw new Error('No proof received from zkFetch');

  const proofsArray: ReclaimProof[] = Array.isArray(proof) ? proof : [proof];
  validateZkFetchExtraction(input.platform, proofsArray, input.loginUsername, input.twitchUserId);
  return proofsArray;
}

async function acquireReclaimProofs(input: {
  platform: SocialPlatform;
  loginUsername: string;
  reclaimProofs?: ReclaimProof[] | null;
}): Promise<ReclaimProof[]> {
  if (!input.reclaimProofs || input.reclaimProofs.length === 0) {
    throw new Error('Generate Reclaim proof first');
  }
  const proofsArray = input.reclaimProofs;
  const extractedUsername = normalizeSocialUsername(
    String(proofsArray[0]?.extractedParameterValues?.username || ''),
  );
  if (
    extractedUsername &&
    !socialProofUsernamesMatch(input.platform, input.loginUsername, extractedUsername)
  ) {
    throw new Error('Proof username mismatch');
  }
  return proofsArray;
}

async function executeClaimTx(input: {
  paymentIds: string[];
  onchainProof: ReturnType<typeof toOnchainReclaimProof>;
  ctx: ClaimExecutorContext;
}): Promise<string> {
  const { paymentIds, onchainProof, ctx } = input;
  const isBatch = paymentIds.length > 1;

  if (ctx.walletSource === 'circle') {
    const wallet = ctx.developerWallet;
    if (!wallet) throw new Error('Internal Wallet not available');
    const executed = await DeveloperWalletService.executeContractCall({
      walletId: wallet.circle_wallet_id,
      walletAddress: wallet.wallet_address,
      contractAddress: ctx.zksendAddress,
      abiFunctionSignature: isBatch ? 'claimPayments' : 'claimPayment',
      abiParameters: isBatch
        ? [paymentIds.map((id) => BigInt(id).toString()), onchainProof, wallet.wallet_address]
        : [paymentIds[0], onchainProof, wallet.wallet_address],
      attribution: ctx.attribution,
    });
    if (!executed.txHash) throw new Error('Missing transaction hash');
    return executed.txHash;
  }

  if (ctx.initializeExternalWallet) {
    await ctx.initializeExternalWallet();
  }

  if (isBatch) {
    return web3Service.claimZkSendPayments({
      paymentIds,
      proof: onchainProof,
      recipient: ctx.recipientAddress as `0x${string}`,
    });
  }

  return web3Service.claimZkSendPayment({
    paymentId: paymentIds[0],
    proof: onchainProof,
    recipient: ctx.recipientAddress as `0x${string}`,
  });
}

/**
 * Shared claim engine for one or many pending zkSEND payments.
 * Single claim = `claimPayments` with one payment.
 */
export async function claimPayments(input: {
  payments: ClaimPaymentRow[];
  executorContext: ClaimExecutorContext;
  callbacks?: ClaimPaymentsCallbacks;
}): Promise<ClaimOutcome[]> {
  const { payments, executorContext: ctx, callbacks } = input;
  if (payments.length === 0) return [];

  if (ctx.walletSource === 'circle' && !ctx.developerWallet) {
    throw new Error('Internal Wallet not available');
  }
  if (ctx.walletSource === 'external' && !ctx.recipientAddress) {
    throw new Error('Connect wallet to claim payment');
  }

  const prerequisites = await ensureProofPrerequisites(ctx.platform, ctx.tokens);
  const { platform: normalizedPlatform, twitchUserId } = prerequisites;

  const identityHashValue =
    ctx.primaryIdentityHash ??
    resolveClaimIdentityHash(normalizedPlatform, ctx.loginUsername, twitchUserId);
  if (!identityHashValue) throw new Error('Invalid identity');

  const proofsArray = isZkFetchPlatform(normalizedPlatform)
    ? await acquireZkFetchProofs({
        platform: normalizedPlatform,
        loginUsername: ctx.loginUsername,
        twitchUserId,
        paymentId: payments[0].paymentId,
        recipient: ctx.recipientAddress,
        tokens: ctx.tokens,
        getReclaimApiUrl: ctx.getReclaimApiUrl,
      })
    : await acquireReclaimProofs({
        platform: normalizedPlatform,
        loginUsername: ctx.loginUsername,
        reclaimProofs: ctx.reclaimProofs,
      });

  callbacks?.onProofAcquired?.(proofsArray);

  if (isZkFetchPlatform(normalizedPlatform)) {
    assertSignatureCount(proofsArray, ctx.reclaimMinSignatures);
  }

  const verify = await verifyReclaimProofs(proofsArray);
  if (!verify.isValid) {
    throw new Error('Reclaim proof verification failed (backend)');
  }

  const onchainProof = toOnchainReclaimProof(proofsArray[0]);
  const paymentIds = payments.map((p) => p.paymentId);
  const txHash = await executeClaimTx({ paymentIds, onchainProof, ctx });

  await Promise.all(
    payments.map((paymentRow) =>
      markZkSendPaymentClaimed({
        paymentId: paymentRow.paymentId,
        senderAddress: paymentRow.sender,
        recipientIdentityHash: identityHashValue as string,
        platform: paymentRow.platform,
        amount: paymentRow.amount,
        currency: ctx.resolveCurrency(paymentRow.token),
        recipientWallet: ctx.recipientAddress,
        claimTxHash: txHash,
        chainId: ctx.chainId,
        contractAddress: ctx.zksendAddress,
      }).catch((dbError) => {
        console.warn('[zkSEND] Failed to update payment claim in DB:', dbError);
      }),
    ),
  );

  return payments.map((p) => ({ paymentId: p.paymentId, txHash }));
}

/**
 * DirectSend escrow claim — no zkTLS proof. Kept lean and separate from claimPayments.
 */
export async function claimDirectDeposit(input: ClaimDirectDepositInput): Promise<{ txHash: string }> {
  const {
    depositId,
    walletSource,
    chainId,
    directSendAddress,
    recipientWallet,
    developerWallet,
    attribution,
    initializeExternalWallet,
  } = input;

  if (!directSendAddress) {
    throw new Error('DirectSend V2 is not configured');
  }

  let txHash: string;

  if (walletSource === 'circle') {
    if (!developerWallet) throw new Error('Internal Wallet not available');
    const executed = await DeveloperWalletService.executeContractCall({
      walletId: developerWallet.circle_wallet_id,
      walletAddress: developerWallet.wallet_address,
      contractAddress: directSendAddress,
      abiFunctionSignature: 'claim',
      abiParameters: [BigInt(depositId).toString()],
      attribution,
    });
    if (!executed.txHash) throw new Error('Missing transaction hash');
    txHash = executed.txHash;
  } else {
    if (initializeExternalWallet) await initializeExternalWallet();
    txHash = await web3Service.claimDirectDeposit(depositId);
  }

  try {
    await markDirectDepositClaimed({
      depositId,
      recipientWallet,
      claimTxHash: txHash,
      chainId,
      contractAddress: directSendAddress,
    });
  } catch (dbError) {
    console.warn('[DirectSend] Failed to update claim in DB:', dbError);
  }

  return { txHash };
}
