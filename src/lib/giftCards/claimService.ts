import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { arcTestnet } from '@/lib/web3/wagmiConfig';
import {
  ARC_CHAIN_ID,
  GiftCardABI,
  getContractsForChain,
} from '@/lib/web3/constants';
import web3Service from '@/lib/web3/web3Service';
import { fromMicro } from '@/lib/tokenAmount';
import { DeveloperWalletService } from '@/lib/circle/developerWalletService';
import {
  DEFAULT_BLOCKCHAIN,
  getPrivySocialIdentity,
} from '@/lib/circle/walletResolution';
import { giftCardMappingAPI } from '@/lib/giftCards/mappingAPI';
import {
  GIFT_CARD_PLATFORMS,
  getGiftCardPlatform,
  type GiftCardPlatform,
} from '@/lib/giftCards/registry';
import type { GiftCardMapping } from '@/lib/giftCards/mappingAPI';

export type PendingCard = GiftCardMapping & { cardType: GiftCardPlatform };

export type GiftCardIdentity = {
  platform: GiftCardPlatform;
  /** Privy social subject / platform uid (needed for Internal Wallet claim). */
  socialUserId?: string | null;
  /** Handle used for vault lookups (required for fetch/count). */
  username?: string | null;
};

export type ClaimWalletSource = 'internal' | 'browser';

export type ClaimSession = {
  privyUser: any;
  privyUserId: string;
  address?: string;
  isConnected: boolean;
  chainId?: number;
  /** When true, auto-provision requests testnet faucet tokens (create-wallet path). */
  requestTestnetFaucet?: boolean;
  /** Optional UI progress hook (toasts). */
  onProgress?: (message: string, kind?: 'info' | 'success' | 'warn') => void;
};

export type ClaimResult = {
  txHash?: string;
  transactionId?: string;
  walletSource: ClaimWalletSource;
  walletAddress: string;
};

function contractsFor(chainId: number = ARC_CHAIN_ID) {
  return getContractsForChain(chainId);
}

async function getCardInfoFromContract(
  tokenId: string,
  chainId: number = ARC_CHAIN_ID,
): Promise<{ amount: string; currency: string; message: string } | null> {
  try {
    const contracts = contractsFor(chainId);
    const publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http(contracts.rpcUrls[0] || 'https://rpc.testnet.arc.network'),
    });

    if (!contracts.contractAddress) return null;
    const giftCardInfo = (await publicClient.readContract({
      address: contracts.contractAddress as `0x${string}`,
      abi: GiftCardABI,
      functionName: 'getGiftCardInfo',
      args: [BigInt(tokenId)],
    })) as {
      amount: bigint;
      token: `0x${string}`;
      redeemed: boolean;
      message: string;
    };

    const amount = fromMicro(giftCardInfo.amount);

    const tokenAddr = giftCardInfo.token.toLowerCase();
    let currency = 'USDC';
    if (tokenAddr === contracts.usdc.toLowerCase()) currency = 'USDC';
    else if (contracts.eurc && tokenAddr === contracts.eurc.toLowerCase()) currency = 'EURC';
    else if (contracts.usyc && tokenAddr === contracts.usyc.toLowerCase()) currency = 'USYC';

    return {
      amount,
      currency,
      message: giftCardInfo.message || '',
    };
  } catch (error) {
    console.warn(`[claimService] Failed to get card info from contract for tokenId ${tokenId}:`, error);
    return null;
  }
}

async function hydratePendingCard(
  platform: GiftCardPlatform,
  tokenId: string,
  username: string,
  chainId: number = ARC_CHAIN_ID,
): Promise<PendingCard> {
  const mappingAPI = giftCardMappingAPI(platform);
  try {
    const metadata = await mappingAPI.getByToken(tokenId);
    if (metadata) {
      if (!metadata.amount || metadata.amount === '0') {
        const contractInfo = await getCardInfoFromContract(tokenId, chainId);
        if (contractInfo) {
          return {
            ...metadata,
            amount: contractInfo.amount,
            currency: contractInfo.currency,
            message: contractInfo.message || metadata.message,
            cardType: platform,
          };
        }
      }
      return { ...metadata, cardType: platform };
    }
  } catch (error) {
    console.warn(
      `[claimService] Failed to fetch metadata for ${platform} card ${tokenId}:`,
      error,
    );
  }

  const contractInfo = await getCardInfoFromContract(tokenId, chainId);
  if (contractInfo) {
    return {
      tokenId,
      username,
      temporaryOwner: '',
      senderAddress: '',
      amount: contractInfo.amount,
      currency: contractInfo.currency,
      message: contractInfo.message,
      metadataUri: '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      claimedAt: null,
      realOwner: null,
      cardType: platform,
    };
  }

  return {
    tokenId,
    username,
    temporaryOwner: '',
    senderAddress: '',
    amount: '0',
    currency: 'USDC',
    message: '',
    metadataUri: '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    claimedAt: null,
    realOwner: null,
    cardType: platform,
  };
}

/**
 * Build vault-lookup identities from a Privy user via getPrivySocialIdentity.
 * Telegram may surface username OR numeric id — both are accepted as `username`
 * for vault lookup (matching ClaimCards' telegramIdentifier behavior).
 */
export function identitiesFromPrivyUser(privyUser: any): GiftCardIdentity[] {
  if (!privyUser) return [];

  const identities: GiftCardIdentity[] = [];
  for (const platform of GIFT_CARD_PLATFORMS) {
    const identity = getPrivySocialIdentity(privyUser, platform);
    if (!identity) continue;

    let username = identity.username || null;
    if (platform === 'telegram') {
      const telegram = (privyUser as any)?.telegram;
      username =
        telegram?.username ||
        telegram?.telegramUserId ||
        telegram?.id ||
        identity.username ||
        null;
    }

    if (!username) continue;
    identities.push({
      platform,
      socialUserId: identity.socialUserId,
      username: String(username),
    });
  }
  return identities;
}

/**
 * Fetch pending vault cards for the given identities (metadata → contract → fallback).
 */
export async function fetchPendingCards(
  identities: GiftCardIdentity[],
  options?: { chainId?: number },
): Promise<PendingCard[]> {
  const chainId = options?.chainId ?? ARC_CHAIN_ID;
  const allCards: PendingCard[] = [];

  for (const identity of identities) {
    const username = identity.username?.trim();
    if (!username) continue;

    const descriptor = getGiftCardPlatform(identity.platform);
    const normalized = descriptor.normalizeHandle(username);
    const tokenIds = await web3Service.getPendingCards(identity.platform, normalized);
    const cards = await Promise.all(
      tokenIds.map((tokenId) =>
        hydratePendingCard(identity.platform, tokenId, normalized, chainId),
      ),
    );
    allCards.push(...cards);
  }

  return allCards;
}

/** Count pending vault cards across identities (no metadata hydration). */
export async function countPendingCards(
  identities: GiftCardIdentity[],
): Promise<number> {
  let total = 0;
  for (const identity of identities) {
    const username = identity.username?.trim();
    if (!username) continue;
    try {
      const descriptor = getGiftCardPlatform(identity.platform);
      const normalized = descriptor.normalizeHandle(username);
      const tokenIds = await web3Service.getPendingCards(identity.platform, normalized);
      total += tokenIds.length;
    } catch (error) {
      console.warn(`[claimService] Failed to count ${identity.platform} cards:`, error);
    }
  }
  return total;
}

function resolveClaimUsername(
  card: PendingCard,
  session: ClaimSession,
): { username: string; normalized: string; socialUserId: string | null } {
  const descriptor = getGiftCardPlatform(card.cardType);
  const identity = getPrivySocialIdentity(session.privyUser, card.cardType);

  let username: string | null = identity?.username ?? null;
  if (card.cardType === 'telegram') {
    const telegram = session.privyUser?.telegram;
    username =
      telegram?.username ||
      telegram?.telegramUserId ||
      telegram?.id ||
      identity?.username ||
      null;
  }

  if (!username) {
    throw new Error(`${descriptor.displayName} account not found`);
  }

  const normalizedLoggedIn = descriptor.normalizeHandle(String(username));
  const normalizedCard = descriptor.normalizeHandle(card.username);
  if (normalizedLoggedIn !== normalizedCard) {
    throw new Error(`This card is not for your ${descriptor.displayName} account`);
  }

  return {
    username: String(username),
    normalized: normalizedLoggedIn,
    socialUserId: identity?.socialUserId ?? null,
  };
}

async function claimViaInternalWallet(
  card: PendingCard,
  session: ClaimSession,
  username: string,
  normalized: string,
  socialUserId: string,
): Promise<ClaimResult> {
  const descriptor = getGiftCardPlatform(card.cardType);
  const contracts = contractsFor(session.chainId ?? ARC_CHAIN_ID);
  const vaultAddress = contracts[descriptor.vaultContractKey] ?? descriptor.vaultAddress;

  let devWallet = await DeveloperWalletService.getWalletBySocial(
    card.cardType,
    socialUserId,
  );

  if (!devWallet) {
    session.onProgress?.('Creating Internal Wallet for receiving donations...', 'info');
    const createResult = await DeveloperWalletService.createWalletForSocial(
      card.cardType,
      socialUserId,
      normalized,
      session.privyUserId,
    );

    if (!createResult.success || !createResult.wallet) {
      throw new Error('Failed to create Internal Wallet');
    }

    devWallet = createResult.wallet;
    session.onProgress?.('Internal Wallet created successfully!', 'success');

    if (session.requestTestnetFaucet !== false) {
      try {
        session.onProgress?.('Requesting testnet tokens for the wallet...', 'info');
        const tokenResult = await DeveloperWalletService.requestTestnetTokens(
          devWallet.wallet_address,
          DEFAULT_BLOCKCHAIN,
        );
        if (tokenResult.success) {
          session.onProgress?.('Testnet tokens requested successfully!', 'success');
        } else {
          console.warn('Failed to request testnet tokens (non-critical):', tokenResult);
        }
      } catch (tokenError) {
        console.warn('Error requesting testnet tokens (non-critical):', tokenError);
      }
    }
  }

  const executed = await DeveloperWalletService.executeContractCall({
    walletId: devWallet.circle_wallet_id,
    walletAddress: devWallet.wallet_address,
    contractAddress: vaultAddress,
    abiFunctionSignature: 'claimCard',
    abiParameters: [BigInt(card.tokenId), normalized, devWallet.wallet_address],
    blockchain: DEFAULT_BLOCKCHAIN,
    attribution: {
      privyUserId: session.privyUserId,
      socialPlatform: card.cardType,
      socialUserId,
    },
  });

  try {
    await giftCardMappingAPI(card.cardType).claim(
      card.tokenId,
      username,
      devWallet.wallet_address,
    );
  } catch (apiError) {
    console.warn(
      'Failed to update Supabase after claim (non-critical - blockchain transaction succeeded):',
      apiError,
    );
  }

  return {
    txHash: executed.txHash || undefined,
    transactionId: executed.txId || undefined,
    walletSource: 'internal',
    walletAddress: devWallet.wallet_address,
  };
}

async function claimViaBrowserWallet(
  card: PendingCard,
  session: ClaimSession,
  username: string,
): Promise<ClaimResult> {
  if (!session.address) {
    throw new Error('No wallet address found. Please connect your wallet.');
  }
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('No browser wallet found. Please connect MetaMask.');
  }

  const chainId = session.chainId ?? ARC_CHAIN_ID;
  const walletClient = createWalletClient({
    chain: arcTestnet,
    transport: custom((window as any).ethereum),
  });

  await web3Service.initialize(walletClient, session.address, chainId);
  const txHash = await web3Service.claimCard(card.cardType, card.tokenId, username);

  try {
    await giftCardMappingAPI(card.cardType).claim(card.tokenId, username, session.address);
  } catch (apiError) {
    console.warn(
      'Failed to update Supabase after claim (non-critical - blockchain transaction succeeded):',
      apiError,
    );
  }

  return {
    txHash,
    walletSource: 'browser',
    walletAddress: session.address,
  };
}

/**
 * Full claim flow for a pending social gift card.
 * Internal Wallet: getWalletBySocial → createWalletForSocial (+ faucet) → executeContractCall → mapping claim.
 * Browser Wallet: web3Service.claimCard → mapping claim.
 */
export async function claimCard(params: {
  card: PendingCard;
  walletSource: ClaimWalletSource;
  session: ClaimSession;
}): Promise<ClaimResult> {
  const { card, walletSource, session } = params;
  if (!session.privyUserId) {
    throw new Error('Privy user ID not found. Please ensure you are logged in.');
  }

  const { username, normalized, socialUserId } = resolveClaimUsername(card, session);

  if (walletSource === 'internal') {
    if (!socialUserId) {
      const descriptor = getGiftCardPlatform(card.cardType);
      throw new Error(
        `${descriptor.displayName} ID not found. Please ensure you are logged in with ${descriptor.displayName}.`,
      );
    }
    return claimViaInternalWallet(card, session, username, normalized, socialUserId);
  }

  return claimViaBrowserWallet(card, session, username);
}

/** Collect Internal Wallet addresses for all linked gift-card platforms. */
export async function resolveGiftCardWalletAddresses(params: {
  privyUser: any;
  connectedAddress?: string | null;
  blockchain?: string;
}): Promise<string[]> {
  const addresses: string[] = [];
  if (params.connectedAddress) {
    addresses.push(params.connectedAddress.toLowerCase());
  }

  if (!params.privyUser) return addresses;

  const blockchain = params.blockchain ?? DEFAULT_BLOCKCHAIN;
  for (const platform of GIFT_CARD_PLATFORMS) {
    const identity = getPrivySocialIdentity(params.privyUser, platform);
    if (!identity) continue;
    try {
      const wallet = await DeveloperWalletService.getWalletBySocial(
        identity.platform,
        identity.socialUserId,
        blockchain,
      );
      if (wallet?.wallet_address) {
        const addr = wallet.wallet_address.toLowerCase();
        if (!addresses.includes(addr)) addresses.push(addr);
      }
    } catch {
      // non-critical
    }
  }
  return addresses;
}
