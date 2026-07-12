import { useEffect, useMemo, useRef, useState } from 'react';
import { useAccount, useWalletClient, useChainId } from 'wagmi';
import { toast } from 'sonner';

import web3Service from '@/lib/web3/web3Service';
import {
  fetchTwitchAuthenticatedUser,
  generateSocialIdentityHash,
  generateTwitchUidIdentityHash,
  gmailIdentityHashes,
  normalizeGmailIdentity,
  normalizeSocialPlatform,
  normalizeSocialUsername,
  socialProofUsernamesMatch,
  twitchUidHandleSegment,
} from '@/lib/reclaim/identity';
import { fetchReclaimProofRequestConfig, verifyReclaimProofs } from '@/lib/reclaim/api';
import { toOnchainReclaimProof } from '@/lib/reclaim/onchain';
import type { ReclaimProof } from '@/lib/reclaim/types';
import { markZkSendPaymentClaimed } from '@/lib/zksend/zksendPaymentsAPI';
import { markDirectDepositClaimed } from '@/lib/directsend/directSendPaymentsAPI';
import {
  getExplorerAddressUrl,
  getContractsForChain,
  ARC_CHAIN_ID,
  isDirectSendEscrowActiveForChain,
} from '@/lib/web3/constants';
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk';
import { usePrivySafe } from '@/lib/privy/usePrivySafe';
import { isZkLocalhost } from '@/lib/runtime/zkHost';
import { DeveloperWalletService, type DeveloperWallet } from '@/lib/circle/developerWalletService';
import { apiCall } from '@/lib/supabase/client';
import { getCircleWalletPrivyUserIdForTx } from '@/hooks/useCircleWallet';
import { WalletSourceToggle, type WalletSource } from './WalletSourceToggle';
import {
  ZKSEND_SUCCESS_COPY,
  renderTransactionLink,
} from './transactionFeedback';


import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { SendRecipientType } from './ZkSendPanel';
import { ZkAccountsConnectHint } from '@/components/zk-accounts/ZkAccountsConnectHint';

const TOKEN_SYMBOL_BY_ADDRESS: Record<string, string> = {
  '0x89b50855aa3be2f677cd6303cec089b5f319d72a': 'EURC',
  '0x3600000000000000000000000000000000000000': 'USDC',
};

function getTokenDisplay(tokenAddress: string): string {
  return TOKEN_SYMBOL_BY_ADDRESS[tokenAddress?.toLowerCase() ?? ''] ?? tokenAddress;
}

type PaymentRow = {
  paymentId: string;
  sender: string;
  platform: string;
  amount: string;
  token: string;
  claimed: boolean;
  createdAt: number;
};

type DirectDepositRow = {
  depositId: string;
  sender: string;
  amount: string;
  token: string;
  claimed: boolean;
  createdAt: number;
};

type Props = {
  platform: SendRecipientType;
  username: string;
  isActive?: boolean;
  isIdentityValid?: boolean;
  truncateAddresses?: boolean;
  walletSource?: WalletSource;
  onWalletSourceChange?: (value: WalletSource) => void;
  developerWallet?: DeveloperWallet | null;
  hasDeveloperWallet?: boolean;
  /** Override card title (default: Receive). */
  title?: string;
  /** Payment to visually identify when opened from a remit claim link. */
  highlightPaymentId?: string | null;
};

function shortenAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function resolveRecipientUsername(platform: SendRecipientType, raw: string): string | null {
  if (platform === 'gmail') return normalizeGmailIdentity(raw);
  return normalizeSocialUsername(raw.replace(/^@/, ''));
}

function resolveClaimIdentityHash(
  platform: string,
  loginUsername: string,
  twitchUserId: string | null
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
  twitchUserId: string | null
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

function toUserFacingErrorMessage(error: unknown, fallback: string): string {
  const maybeObj = typeof error === 'object' && error !== null ? (error as { code?: unknown; message?: unknown }) : null;
  const code = maybeObj?.code;
  const message = typeof maybeObj?.message === 'string' ? maybeObj.message : '';

  if (code === 4001 || /user rejected the request/i.test(message)) {
    return 'User rejected the request';
  }

  if (message) {
    return message;
  }

  return fallback;
}

function ReceiveOAuthStatus({
  connected,
  platformLabel,
  platform,
  username,
  hasUsername,
}: {
  connected: boolean;
  platformLabel: string;
  platform?: SendRecipientType;
  username: string;
  hasUsername: boolean;
}) {
  if (!connected) return <ZkAccountsConnectHint />;
  if (!hasUsername) {
    return (
      <p className="text-sm text-muted-foreground">
        {platformLabel} connected. Enter a username above to load pending payments.
      </p>
    );
  }
  const handle = username.replace(/^@/, '');
  const display =
    platform === 'gmail' ? handle : `@${handle}`;
  return (
    <p className="text-sm text-muted-foreground">
      {platformLabel} connected as <span className="font-medium text-foreground">{display}</span>. Pending payments load
      automatically.
    </p>
  );
}

export function PendingPayments({
  platform,
  username,
  isActive,
  isIdentityValid = false,
  truncateAddresses = false,
  walletSource = 'external',
  onWalletSourceChange,
  developerWallet = null,
  hasDeveloperWallet = false,
  title = 'Receive',
  highlightPaymentId = null,
}: Props) {
  const connectedChainId = useChainId();
  const activeChainId = connectedChainId || ARC_CHAIN_ID;
  const contracts = getContractsForChain(activeChainId);
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { authenticated, getAccessToken, user: privyUser } = usePrivySafe();
  const reclaimApiBaseUrl = (() => {
    const envUrl =
      (import.meta.env.VITE_ZKTLS_SERVICE_URL as string | undefined) ||
      (import.meta.env.VITE_ZKTLS_API_URL as string | undefined);
    if (envUrl) return envUrl.replace(/\/$/, '');
    if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
    return 'http://localhost:3001';
  })();

  /** API URL for reclaim/zkfetch: same-origin uses relative path so Vite proxy is used. */
  const getReclaimApiUrl = (path: string) => {
    if (typeof window !== 'undefined' && reclaimApiBaseUrl === window.location.origin) return path;
    return `${reclaimApiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  };

  const reclaimMinSignaturesRaw = Number(import.meta.env.VITE_RECLAIM_MIN_SIGNATURES ?? 2);
  const reclaimMinSignatures =
    Number.isFinite(reclaimMinSignaturesRaw) && reclaimMinSignaturesRaw > 0
      ? Math.floor(reclaimMinSignaturesRaw)
      : 2;
  const [accessToken, setAccessToken] = useState('');
  const [oauth1Token, setOauth1Token] = useState('');
  const [oauth1TokenSecret, setOauth1TokenSecret] = useState('');
  const [twitchAccessToken, setTwitchAccessToken] = useState('');
  const [twitchResolvedUserId, setTwitchResolvedUserId] = useState<string | null>(null);
  const [githubAccessToken, setGithubAccessToken] = useState('');
  const [telegramAccessToken, setTelegramAccessToken] = useState('');
  const [instagramAccessToken, setInstagramAccessToken] = useState('');
  // const [tiktokAccessToken, setTiktokAccessToken] = useState('');
  const [gmailAccessToken, setGmailAccessToken] = useState('');
  const [linkedinAccessToken, setLinkedinAccessToken] = useState('');
  const [privyAccessToken, setPrivyAccessToken] = useState<string | null>(null);
  const [reclaimProofs, setReclaimProofs] = useState<ReclaimProof[] | null>(null);
  const [proofLoading, setProofLoading] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);

  useEffect(() => {
    if (walletSource !== 'circle') return;
    if (!hasDeveloperWallet && onWalletSourceChange) onWalletSourceChange('external');
  }, [walletSource, hasDeveloperWallet, onWalletSourceChange]);

  const useCircle = walletSource === 'circle' && hasDeveloperWallet && !!developerWallet;
  const effectiveRecipientAddress = useCircle ? developerWallet!.wallet_address : address;
  const canClaimPayments = useCircle
    ? Boolean(developerWallet?.wallet_address)
    : Boolean(isConnected && address);

  useEffect(() => {
    if (accessToken) return;
    try {
      const stored = localStorage.getItem('twitter_oauth_token') || localStorage.getItem('twitter_oauth');
      if (!stored) return;

      // Allow either a raw token or a JSON payload with access_token.
      let token = stored;
      if (stored.trim().startsWith('{')) {
        const parsed = JSON.parse(stored) as { access_token?: string; token?: string };
        token = parsed.access_token || parsed.token || stored;
      }

      if (typeof token === 'string' && token.length > 0) {
        setAccessToken(token);
      }
    } catch (error) {
      console.warn('[zkSEND] Failed to parse stored Twitter token:', error);
    }
  }, [accessToken]);

  useEffect(() => {
    if (oauth1Token && oauth1TokenSecret) return;
    try {
      const token = localStorage.getItem('twitter_oauth1_token');
      const secret = localStorage.getItem('twitter_oauth1_secret');
      if (token && secret) {
        setOauth1Token(token);
        setOauth1TokenSecret(secret);
      }
    } catch (error) {
      console.warn('[zkSEND] Failed to load Twitter OAuth1 tokens:', error);
    }
  }, [oauth1Token, oauth1TokenSecret]);

  useEffect(() => {
    if (twitchAccessToken) return;
    try {
      const stored =
        localStorage.getItem('twitch_oauth_token') ||
        localStorage.getItem('twitch_oauth') ||
        localStorage.getItem('twitch_access_token');
      if (!stored) return;
      if (typeof stored === 'string' && stored.length > 0) {
        setTwitchAccessToken(stored);
      }
    } catch (error) {
      console.warn('[zkSEND] Failed to load Twitch token:', error);
    }
  }, [twitchAccessToken]);

  useEffect(() => {
    if (platform !== 'twitch' || !twitchAccessToken) {
      setTwitchResolvedUserId(null);
      return;
    }
    const twitchClientId = import.meta.env.VITE_TWITCH_CLIENT_ID as string | undefined;
    if (!twitchClientId) return;

    let active = true;
    void fetchTwitchAuthenticatedUser(twitchAccessToken, twitchClientId)
      .then((user) => {
        if (!active) return;
        setTwitchResolvedUserId(user?.userId ?? null);
      })
      .catch((error) => {
        console.warn('[zkSEND] Failed to resolve Twitch user id:', error);
        if (active) setTwitchResolvedUserId(null);
      });
    return () => {
      active = false;
    };
  }, [platform, twitchAccessToken]);

  useEffect(() => {
    if (githubAccessToken) return;
    try {
      const stored =
        localStorage.getItem('github_oauth_token') ||
        localStorage.getItem('github_oauth') ||
        localStorage.getItem('github_access_token');
      if (!stored) return;
      if (typeof stored === 'string' && stored.length > 0) {
        setGithubAccessToken(stored);
      }
    } catch (error) {
      console.warn('[zkSEND] Failed to load GitHub token:', error);
    }
  }, [githubAccessToken]);

  useEffect(() => {
    if (telegramAccessToken) return;
    try {
      const stored =
        localStorage.getItem('telegram_oauth_token') ||
        localStorage.getItem('telegram_oauth');
      if (!stored) return;
      if (typeof stored === 'string' && stored.length > 0) {
        setTelegramAccessToken(stored);
      }
    } catch (error) {
      console.warn('[zkSEND] Failed to load Telegram token:', error);
    }
  }, [telegramAccessToken]);

  useEffect(() => {
    if (instagramAccessToken) return;
    try {
      const stored =
        localStorage.getItem('instagram_oauth_token') ||
        localStorage.getItem('instagram_oauth') ||
        localStorage.getItem('instagram_access_token');
      if (!stored) return;
      if (typeof stored === 'string' && stored.length > 0) {
        setInstagramAccessToken(stored);
      }
    } catch (error) {
      console.warn('[zkSEND] Failed to load Instagram token:', error);
    }
  }, [instagramAccessToken]);

  // useEffect(() => {
  //   if (tiktokAccessToken) return;
  //   try {
  //     const stored =
  //       localStorage.getItem('tiktok_oauth_token') ||
  //       localStorage.getItem('tiktok_oauth') ||
  //       localStorage.getItem('tiktok_access_token');
  //     if (!stored) return;
  //     if (typeof stored === 'string' && stored.length > 0) {
  //       setTiktokAccessToken(stored);
  //     }
  //   } catch (error) {
  //     console.warn('[zkSEND] Failed to load TikTok token:', error);
  //   }
  // }, [tiktokAccessToken]);

  useEffect(() => {
    if (gmailAccessToken) return;
    try {
      const stored =
        localStorage.getItem('gmail_oauth_token') ||
        localStorage.getItem('gmail_oauth') ||
        localStorage.getItem('gmail_access_token');
      if (!stored) return;
      if (typeof stored === 'string' && stored.length > 0) {
        setGmailAccessToken(stored);
      }
    } catch (error) {
      console.warn('[zkSEND] Failed to load Gmail token:', error);
    }
  }, [gmailAccessToken]);

  useEffect(() => {
    if (linkedinAccessToken) return;
    try {
      const stored =
        localStorage.getItem('linkedin_oauth_token') ||
        localStorage.getItem('linkedin_oauth') ||
        localStorage.getItem('linkedin_access_token');
      if (!stored) return;
      if (typeof stored === 'string' && stored.length > 0) {
        setLinkedinAccessToken(stored);
      }
    } catch (error) {
      console.warn('[zkSEND] Failed to load LinkedIn token:', error);
    }
  }, [linkedinAccessToken]);

  useEffect(() => {
    const syncOAuthFromPanel = () => {
      try {
        const twitterStored = localStorage.getItem('twitter_oauth_token') || localStorage.getItem('twitter_oauth');
        if (twitterStored) {
          let token = twitterStored;
          if (twitterStored.trim().startsWith('{')) {
            const parsed = JSON.parse(twitterStored) as { access_token?: string; token?: string };
            token = parsed.access_token || parsed.token || twitterStored;
          }
          if (token) setAccessToken(token);
        }
        const oauth1 = localStorage.getItem('twitter_oauth1_token');
        const oauth1Secret = localStorage.getItem('twitter_oauth1_secret');
        if (oauth1 && oauth1Secret) {
          setOauth1Token(oauth1);
          setOauth1TokenSecret(oauth1Secret);
        }
        const twitch =
          localStorage.getItem('twitch_oauth_token') ||
          localStorage.getItem('twitch_oauth') ||
          localStorage.getItem('twitch_access_token');
        if (twitch) setTwitchAccessToken(twitch);
        const github =
          localStorage.getItem('github_oauth_token') ||
          localStorage.getItem('github_oauth') ||
          localStorage.getItem('github_access_token');
        if (github) setGithubAccessToken(github);
        const telegram =
          localStorage.getItem('telegram_oauth_token') || localStorage.getItem('telegram_oauth');
        if (telegram) setTelegramAccessToken(telegram);
        const instagram =
          localStorage.getItem('instagram_oauth_token') ||
          localStorage.getItem('instagram_oauth') ||
          localStorage.getItem('instagram_access_token');
        if (instagram) setInstagramAccessToken(instagram);
        const gmail =
          localStorage.getItem('gmail_oauth_token') ||
          localStorage.getItem('gmail_oauth') ||
          localStorage.getItem('gmail_access_token');
        if (gmail) setGmailAccessToken(gmail);
        const linkedin =
          localStorage.getItem('linkedin_oauth_token') ||
          localStorage.getItem('linkedin_oauth') ||
          localStorage.getItem('linkedin_access_token');
        if (linkedin) setLinkedinAccessToken(linkedin);
      } catch (error) {
        console.warn('[zkSEND] Failed to sync OAuth tokens from Accounts panel:', error);
      }
    };

    window.addEventListener('identity-updated', syncOAuthFromPanel);
    return () => window.removeEventListener('identity-updated', syncOAuthFromPanel);
  }, []);

  useEffect(() => {
    // Privy is disabled for zk.localhost to prevent OAuth interception
    if (isZkLocalhost()) {
      setPrivyAccessToken(null);
      return;
    }

    let isActive = true;
    const loadPrivyToken = async () => {
      if (!authenticated) {
        if (isActive) setPrivyAccessToken(null);
        return;
      }
      try {
        const token = await getAccessToken();
        if (isActive) setPrivyAccessToken(token);
      } catch (error) {
        console.warn('[zkSEND] Failed to load Privy access token:', error);
        if (isActive) setPrivyAccessToken(null);
      }
    };

    loadPrivyToken();
    return () => {
      isActive = false;
    };
  }, [authenticated, getAccessToken]);

  const identityHashes = useMemo(() => {
    if (platform === 'address') return null;
    if (platform === 'twitch') {
      if (!twitchResolvedUserId) return null;
      const hash = generateTwitchUidIdentityHash(twitchResolvedUserId);
      return hash ? [hash] : null;
    }
    if (platform === 'gmail') {
      const hashes = gmailIdentityHashes(username);
      return hashes.length > 0 ? hashes : null;
    }
    const u = normalizeSocialUsername(username.replace(/^@/, ''));
    if (!u) return null;
    const hash = generateSocialIdentityHash(platform, u);
    return hash ? [hash] : null;
  }, [platform, username, twitchResolvedUserId]);

  const primaryIdentityHash = identityHashes?.[0] ?? null;

  const addressModeRecipient = useMemo(() => {
    if (platform !== 'address') return null;
    const t = username.trim();
    return /^0x[a-fA-F0-9]{40}$/.test(t) ? (t as `0x${string}`) : null;
  }, [platform, username]);

  const directEscrowEnabled = isDirectSendEscrowActiveForChain(activeChainId);

  const [loadingList, setLoadingList] = useState(false);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [directRows, setDirectRows] = useState<DirectDepositRow[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimingAll, setClaimingAll] = useState(false);
  const [lastClaimedTxHash, setLastClaimedTxHash] = useState<string | null>(null);
  const lastAutoLoadKeyRef = useRef<string | null>(null);

  useEffect(() => {
    web3Service.setChainId(activeChainId);
  }, [activeChainId]);

  useEffect(() => {
    if (rows.length > 0 || directRows.length > 0) setLastClaimedTxHash(null);
  }, [rows.length, directRows.length]);

  const resolveCurrency = (tokenAddressOrSymbol: string) => {
    const normalized = tokenAddressOrSymbol.toLowerCase();
    if (normalized === contracts.usdc.toLowerCase()) return 'USDC';
    if (contracts.eurc && normalized === contracts.eurc.toLowerCase()) return 'EURC';
    return tokenAddressOrSymbol;
  };

  const normalizeProofs = (proof: unknown): ReclaimProof[] => {
    if (typeof proof === 'string') {
      const parsed = JSON.parse(proof) as any;
      const raw = parsed?.proofs ?? parsed?.proof ?? parsed;
      return Array.isArray(raw) ? (raw as ReclaimProof[]) : ([raw] as ReclaimProof[]);
    }
    if (Array.isArray(proof)) {
      return proof as ReclaimProof[];
    }
    return [proof as ReclaimProof];
  };

  const pollCircleTxHash = async (transactionId: string): Promise<string> => {
    const maxAttempts = 30;
    const pollInterval = 1000;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, pollInterval));
      const status = (await apiCall(`/wallets/transaction-status?transactionId=${encodeURIComponent(transactionId)}`, {
        method: 'GET',
      })) as { txHash?: string; transactionState?: string; error?: string };
      if (status?.transactionState === 'FAILED') {
        throw new Error(status?.error ?? 'Transaction failed');
      }
      if (status?.txHash) return status.txHash;
    }
    throw new Error('Transaction status timeout');
  };

  const startReclaimFlow = async () => {
    if (platform === 'address') throw new Error('Select a social platform to generate a proof');
    const u = resolveRecipientUsername(platform, username);
    if (!u) throw new Error('Enter username');
    if (!effectiveRecipientAddress) throw new Error('Select a wallet to generate proof');

    setProofLoading(true);
    setProofError(null);
    try {
      const config = await fetchReclaimProofRequestConfig({
        platform,
        username: u,
        recipient: effectiveRecipientAddress,
        paymentId: undefined,
        redirectUrl: window.location.href,
      });
      const request = await ReclaimProofRequest.fromJsonString(config);
      await request.triggerReclaimFlow();

      await request.startSession({
        onSuccess: (proof) => {
          const proofsArray = normalizeProofs(proof || []);
          if (!proofsArray[0]) {
            setProofError('Proof was not returned');
            setReclaimProofs(null);
            return;
          }
          setReclaimProofs(proofsArray);
          setProofError(null);
          toast.success('Reclaim proof received');
        },
        onError: (error) => {
          setProofError(error.message || 'Failed to generate proof');
          setReclaimProofs(null);
        },
      });
    } finally {
      setProofLoading(false);
    }
  };

  const loadPending = async () => {
    try {
      if (platform === 'address') {
        if (!directEscrowEnabled) {
          setDirectRows([]);
          setRows([]);
          return;
        }
        if (!addressModeRecipient) throw new Error('Enter your wallet address (0x...)');
        setLoadingList(true);
        const list = await web3Service.getPendingDirectDepositsForRecipient(addressModeRecipient);
        setDirectRows(
          list.map((d) => ({
            depositId: d.depositId,
            sender: d.sender,
            amount: d.amount,
            token: d.token,
            claimed: d.claimed,
            createdAt: d.createdAt,
          }))
        );
        setRows([]);
        return;
      }

      if (!identityHashes || identityHashes.length === 0) {
        if (platform === 'twitch' && twitchAccessToken) return;
        throw new Error('Enter username');
      }
      setLoadingList(true);

      const idSets = await Promise.all(
        identityHashes.map((hash) => web3Service.getZkSendPendingPayments(hash))
      );
      const ids = [...new Set(idSets.flat())];
      const payments = await Promise.all(ids.map((id) => web3Service.getZkSendPayment(id)));
      setRows(
        payments.map((p) => ({
          paymentId: p.paymentId,
          sender: p.sender,
          platform: p.platform,
          amount: p.amount,
          token: p.token,
          claimed: p.claimed,
          createdAt: p.createdAt,
        }))
      );
      setDirectRows([]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load pending payments';
      console.error('[zkSEND] loadPending error:', e);
      toast.error(msg);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!isActive) return;
    if (platform === 'address') {
      if (!directEscrowEnabled || !addressModeRecipient) return;
      const key = `address:${addressModeRecipient}`;
      if (lastAutoLoadKeyRef.current === key) return;
      lastAutoLoadKeyRef.current = key;
      void loadPending();
      return;
    }
    if (!identityHashes || identityHashes.length === 0) return;

    const key = `${platform}:${identityHashes.join(',')}`;
    if (lastAutoLoadKeyRef.current === key) return;
    lastAutoLoadKeyRef.current = key;

    void loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, identityHashes, platform, addressModeRecipient, directEscrowEnabled]);

  const claim = async (paymentId: string) => {
    try {
      if (!useCircle && (!isConnected || !address || !walletClient)) throw new Error('Connect wallet to claim payment');
      if (useCircle && !developerWallet) throw new Error('Internal Wallet not available');
    const u = resolveRecipientUsername(platform, username);
    if (!u) throw new Error('Enter username');
    const normalizedPlatform = normalizeSocialPlatform(platform);
    if (!normalizedPlatform) throw new Error('Unsupported platform');
    if (normalizedPlatform === 'twitter') {
      const hasOAuth1 = Boolean(oauth1Token && oauth1TokenSecret);
      if (isZkLocalhost()) {
        if (!hasOAuth1) {
          throw new Error('Connect Twitter to generate proof');
        }
      } else {
        if (!hasOAuth1 && !accessToken && !privyAccessToken) {
          throw new Error('Connect Twitter or login with Privy to generate proof');
        }
      }
    }
    if (normalizedPlatform === 'twitch' && !twitchAccessToken) {
        throw new Error('Connect Twitch to generate proof');
      }
      if (normalizedPlatform === 'twitch' && !twitchResolvedUserId) {
        throw new Error('Resolving Twitch user id - connect Twitch and retry');
      }
      if (normalizedPlatform === 'github' && !githubAccessToken) {
        throw new Error('Connect GitHub to generate proof');
      }
      if (normalizedPlatform === 'instagram' && !instagramAccessToken) {
        throw new Error('Connect Instagram to generate proof');
      }
      // if (normalizedPlatform === 'tiktok' && !tiktokAccessToken) {
      //   throw new Error('Connect TikTok to generate proof');
      // }
      if (normalizedPlatform === 'telegram' && !telegramAccessToken) {
        throw new Error('Connect Telegram to generate proof');
      }
      if (normalizedPlatform === 'linkedin' && !linkedinAccessToken) {
        throw new Error('Connect LinkedIn to generate proof');
      }

      setClaimingId(paymentId);
      if (!useCircle) {
        await web3Service.initialize(walletClient, address!, activeChainId);
      }

      if (
        normalizedPlatform !== 'twitter' &&
        normalizedPlatform !== 'twitch' &&
        normalizedPlatform !== 'github' &&
        normalizedPlatform !== 'telegram' &&
        normalizedPlatform !== 'instagram' &&
        // normalizedPlatform !== 'tiktok' &&
        normalizedPlatform !== 'linkedin'
      ) {
        if (!reclaimProofs || reclaimProofs.length === 0) {
          throw new Error('Generate Reclaim proof first');
        }

        const proofsArray = reclaimProofs;

        const extractedUsername = normalizeSocialUsername(
          String(proofsArray[0]?.extractedParameterValues?.username || '')
        );
        if (extractedUsername && !socialProofUsernamesMatch(normalizedPlatform, u, extractedUsername)) {
          throw new Error('Proof username mismatch');
        }

        const verify = await verifyReclaimProofs(proofsArray);
        if (!verify.isValid) {
          throw new Error('Reclaim proof verification failed (backend)');
        }

        const onchainProof = toOnchainReclaimProof(proofsArray[0]);
        const txHash = useCircle
          ? await (async () => {
              const privyUserIdForTx = getCircleWalletPrivyUserIdForTx(
                developerWallet!,
                address ?? undefined,
                privyUser?.id
              );
              const res = await DeveloperWalletService.sendTransaction({
                walletId: developerWallet!.circle_wallet_id,
                walletAddress: developerWallet!.wallet_address,
                contractAddress: contracts.zksend,
                functionName: 'claimPayment',
                args: [paymentId, onchainProof, developerWallet!.wallet_address],
                blockchain: 'ARC-TESTNET',
                privyUserId: privyUserIdForTx,
                socialPlatform: developerWallet!.social_platform ?? undefined,
                socialUserId: developerWallet!.social_user_id ?? undefined,
              });
              if (!res.success) throw new Error(res.error ?? 'Claim failed');
              if (res.txHash) return res.txHash;
              if (res.transactionId) return await pollCircleTxHash(res.transactionId);
              throw new Error('Missing transactionId');
            })()
          : await web3Service.claimZkSendPayment({
              paymentId,
              proof: onchainProof,
              recipient: address as `0x${string}`,
            });

        const paymentRow = rows.find((row) => row.paymentId === paymentId);
        const identityHashValue =
          primaryIdentityHash ?? resolveClaimIdentityHash(platform, u, twitchResolvedUserId);
        if (paymentRow && identityHashValue) {
          try {
            await markZkSendPaymentClaimed({
              paymentId,
              senderAddress: paymentRow.sender,
              recipientIdentityHash: identityHashValue,
              platform: paymentRow.platform,
              amount: paymentRow.amount,
              currency: resolveCurrency(paymentRow.token),
              recipientWallet: (useCircle ? developerWallet!.wallet_address : address)!,
              claimTxHash: txHash,
              chainId: activeChainId,
              contractAddress: contracts.zksend,
            });
          } catch (dbError) {
            console.warn('[zkSEND] Failed to update payment claim in DB:', dbError);
          }
        }

        setLastClaimedTxHash(txHash);
        toast.success(ZKSEND_SUCCESS_COPY.paymentClaimed, {
          description: (
            <span className="text-sm">
              TX: {renderTransactionLink(activeChainId, txHash)}
            </span>
          ),
        });
        await loadPending();
        return;
      }

      const isTwitter = normalizedPlatform === 'twitter';
      const isTwitch = normalizedPlatform === 'twitch';
      const isGithub = normalizedPlatform === 'github';
      const isTelegram = normalizedPlatform === 'telegram';
      const isInstagram = normalizedPlatform === 'instagram';
      // const isTiktok = normalizedPlatform === 'tiktok';
      const isLinkedIn = normalizedPlatform === 'linkedin';

      let requestUrl: string;
      let accessTokenToUse: string | undefined;
      let clientId: string | undefined;
      let regexPattern: string;

      if (isTwitter) {
        const useOAuth1 = Boolean(oauth1Token && oauth1TokenSecret);
        if (useOAuth1) {
          requestUrl = 'https://api.x.com/1.1/account/verify_credentials.json?include_email=false&skip_status=true';
          regexPattern = '"screen_name":"(?<username>[^"]+)"';
        } else {
          requestUrl = 'https://api.x.com/2/users/me?user.fields=username';
          accessTokenToUse = accessToken || undefined;
          regexPattern = '"username":"(?<username>[^"]+)"';
        }
      } else if (isTwitch) {
        const twitchClientId = import.meta.env.VITE_TWITCH_CLIENT_ID as string | undefined;
        if (!twitchClientId) {
          throw new Error('Twitch Client ID not configured');
        }
        requestUrl = 'https://api.twitch.tv/helix/users';
        accessTokenToUse = twitchAccessToken;
        clientId = twitchClientId;
        regexPattern = '"id":"(?<userId>[^"]+)"';
      } else if (isGithub) {
        requestUrl = 'https://api.github.com/user';
        accessTokenToUse = githubAccessToken;
        regexPattern = '"login":"(?<username>[^"]+)"';
      } else if (isTelegram) {
        requestUrl = getReclaimApiUrl('/api/telegram/me');
        accessTokenToUse = telegramAccessToken;
        regexPattern = '"login":"(?<username>[^"]+)"';
      } else if (isInstagram) {
        const instagramClientId = import.meta.env.VITE_INSTAGRAM_CLIENT_ID as string | undefined;
        if (!instagramClientId) {
          throw new Error('Instagram Client ID not configured');
        }
        requestUrl = 'https://graph.instagram.com/me?fields=username';
        accessTokenToUse = instagramAccessToken;
        clientId = instagramClientId;
        regexPattern = '"username":"(?<username>[^"]+)"';
      // } else if (isTiktok) {
      //   const tiktokClientId = import.meta.env.VITE_TIKTOK_CLIENT_ID as string | undefined;
      //   if (!tiktokClientId) {
      //     throw new Error('TikTok Client ID not configured');
      //   }
      //   requestUrl = 'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name';
      //   accessTokenToUse = tiktokAccessToken;
      //   clientId = tiktokClientId;
      //   regexPattern = '"display_name":"(?<username>[^"]+)"';
      } else if (isLinkedIn) {
        requestUrl = 'https://api.linkedin.com/v2/userinfo';
        accessTokenToUse = linkedinAccessToken;
        regexPattern = '"name":"(?<username>[^"]+)"';
      } else {
        throw new Error('Unsupported platform for zkFetch');
      }

      const proveUrl = getReclaimApiUrl('/api/reclaim/zkfetch/prove');
      const proveRes = await fetch(proveUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Only use Privy token if not on zk.localhost (where Privy is disabled) and for Twitter
          ...(!isZkLocalhost() && privyAccessToken && isTwitter ? { Authorization: `Bearer ${privyAccessToken}` } : {}),
        },
        body: JSON.stringify({
          requestUrl,
          ...(accessTokenToUse ? { accessToken: accessTokenToUse } : {}),
          ...(oauth1Token && oauth1TokenSecret && isTwitter
            ? { oauth1: { token: oauth1Token, tokenSecret: oauth1TokenSecret } }
            : {}),
          ...(clientId ? { clientId } : {}),
          platform: normalizedPlatform,
          username: isTwitch ? twitchProveUsername(twitchResolvedUserId, u) : u,
          paymentId,
          recipient: effectiveRecipientAddress,
          responseMatches: [
            {
              type: 'regex',
              value: regexPattern,
            },
          ],
        }),
      });

      if (!proveRes.ok) {
        const text = await proveRes.text().catch(() => '');
        throw new Error(`zkFetch proof failed: ${proveRes.status} ${text}`);
      }

      const proveJson = (await proveRes.json()) as { proof?: ReclaimProof[] | ReclaimProof };
      const proof = proveJson.proof;

      if (!proof) {
        throw new Error('No proof received from zkFetch');
      }

      const proofsArray: ReclaimProof[] = Array.isArray(proof) ? (proof as ReclaimProof[]) : [proof as ReclaimProof];
      validateZkFetchExtraction(normalizedPlatform, proofsArray, u, twitchResolvedUserId);

      const signatures =
        (Array.isArray((proofsArray[0] as any)?.signatures) && (proofsArray[0] as any).signatures) ||
        (Array.isArray((proofsArray[0] as any)?.signedClaim?.signatures) &&
          (proofsArray[0] as any).signedClaim.signatures) ||
        [];
      console.log('[zkSEND] Reclaim proof signatures length:', signatures.length, {
        epoch: (proofsArray[0] as any)?.claimData?.epoch ?? (proofsArray[0] as any)?.epoch,
        provider: (proofsArray[0] as any)?.claimData?.provider ?? (proofsArray[0] as any)?.provider,
        taskId: (proofsArray[0] as any)?.taskId ?? null,
      });
      if (signatures.length < reclaimMinSignatures) {
        throw new Error(
          `Reclaim proof signatures are incomplete (got ${signatures.length}, need ${reclaimMinSignatures}). Regenerate proof.`
        );
      }

      const verify = await verifyReclaimProofs(proofsArray);
      if (!verify.isValid) {
        throw new Error('Reclaim proof verification failed (backend)');
      }

      const onchainProof = toOnchainReclaimProof(proofsArray[0]);
      const txHash = useCircle
        ? await (async () => {
            const privyUserIdForTx = getCircleWalletPrivyUserIdForTx(
              developerWallet!,
              address ?? undefined,
              privyUser?.id
            );
            const res = await DeveloperWalletService.sendTransaction({
              walletId: developerWallet!.circle_wallet_id,
              walletAddress: developerWallet!.wallet_address,
              contractAddress: contracts.zksend,
              functionName: 'claimPayment',
              args: [paymentId, onchainProof, developerWallet!.wallet_address],
              blockchain: 'ARC-TESTNET',
              privyUserId: privyUserIdForTx,
              socialPlatform: developerWallet!.social_platform ?? undefined,
              socialUserId: developerWallet!.social_user_id ?? undefined,
            });
            if (!res.success) throw new Error(res.error ?? 'Claim failed');
            if (res.txHash) return res.txHash;
            if (res.transactionId) return await pollCircleTxHash(res.transactionId);
            throw new Error('Missing transactionId');
          })()
        : await web3Service.claimZkSendPayment({
            paymentId,
            proof: onchainProof,
            recipient: address as `0x${string}`,
          });

      const paymentRow = rows.find((row) => row.paymentId === paymentId);
        const identityHashValue =
          primaryIdentityHash ?? resolveClaimIdentityHash(platform, u, twitchResolvedUserId);
      if (paymentRow && identityHashValue) {
        try {
          await markZkSendPaymentClaimed({
            paymentId,
            senderAddress: paymentRow.sender,
            recipientIdentityHash: identityHashValue,
            platform: paymentRow.platform,
            amount: paymentRow.amount,
            currency: resolveCurrency(paymentRow.token),
          recipientWallet: (useCircle ? developerWallet!.wallet_address : address)!,
            claimTxHash: txHash,
            chainId: activeChainId,
            contractAddress: contracts.zksend,
          });
        } catch (dbError) {
          console.warn('[zkSEND] Failed to update payment claim in DB:', dbError);
        }
      }

      setLastClaimedTxHash(txHash);
      toast.success(ZKSEND_SUCCESS_COPY.paymentClaimed, {
        description: (
          <span className="text-sm">
            TX: {renderTransactionLink(activeChainId, txHash)}
          </span>
        ),
      });
      await loadPending();
    } catch (e) {
      const msg = toUserFacingErrorMessage(e, 'Failed to claim payment');
      console.error('[zkSEND] claim error:', e);
      toast.error(msg);
      setClaimingId(null);
    }
  };

  const claimAll = async () => {
    if (rows.length === 0) return;
    try {
      if (!useCircle && (!isConnected || !address || !walletClient)) throw new Error('Connect wallet to claim payment');
      if (useCircle && !developerWallet) throw new Error('Internal Wallet not available');
      const u = resolveRecipientUsername(platform, username);
      if (!u) throw new Error('Enter username');
      const normalizedPlatform = normalizeSocialPlatform(platform);
      if (!normalizedPlatform) throw new Error('Unsupported platform');
      if (normalizedPlatform === 'twitter') {
        const hasOAuth1 = Boolean(oauth1Token && oauth1TokenSecret);
        if (isZkLocalhost()) {
          if (!hasOAuth1) throw new Error('Connect Twitter to generate proof');
        } else {
          if (!hasOAuth1 && !accessToken && !privyAccessToken) {
            throw new Error('Connect Twitter or login with Privy to generate proof');
          }
        }
      }
      if (normalizedPlatform === 'twitch' && !twitchAccessToken) {
        throw new Error('Connect Twitch to generate proof');
      }
      if (normalizedPlatform === 'twitch' && !twitchResolvedUserId) {
        throw new Error('Resolving Twitch user id - connect Twitch and retry');
      }
      if (normalizedPlatform === 'github' && !githubAccessToken) {
        throw new Error('Connect GitHub to generate proof');
      }
      if (normalizedPlatform === 'telegram' && !telegramAccessToken) {
        throw new Error('Connect Telegram to generate proof');
      }
      if (normalizedPlatform === 'instagram' && !instagramAccessToken) {
        throw new Error('Connect Instagram to generate proof');
      }
      if (normalizedPlatform === 'linkedin' && !linkedinAccessToken) {
        throw new Error('Connect LinkedIn to generate proof');
      }

      setClaimingAll(true);
      if (!useCircle) {
        await web3Service.initialize(walletClient, address!, activeChainId);
      }

      const paymentIds = rows.map((r) => r.paymentId);
      const identityHashValue =
        primaryIdentityHash ?? resolveClaimIdentityHash(platform, u, twitchResolvedUserId);
      if (!identityHashValue) {
        throw new Error('Invalid identity');
      }

      if (
        normalizedPlatform !== 'twitter' &&
        normalizedPlatform !== 'twitch' &&
        normalizedPlatform !== 'github' &&
        normalizedPlatform !== 'telegram' &&
        normalizedPlatform !== 'instagram' &&
        normalizedPlatform !== 'linkedin'
      ) {
        if (!reclaimProofs || reclaimProofs.length === 0) {
          throw new Error('Generate Reclaim proof first');
        }
        const proofsArray = reclaimProofs;
        const extractedUsername = normalizeSocialUsername(
          String(proofsArray[0]?.extractedParameterValues?.username || '')
        );
        if (extractedUsername && !socialProofUsernamesMatch(normalizedPlatform, u, extractedUsername)) {
          throw new Error('Proof username mismatch');
        }
        const verify = await verifyReclaimProofs(proofsArray);
        if (!verify.isValid) {
          throw new Error('Reclaim proof verification failed (backend)');
        }
        const onchainProof = toOnchainReclaimProof(proofsArray[0]);
        const txHash = useCircle
          ? await (async () => {
              const privyUserIdForTx = getCircleWalletPrivyUserIdForTx(
                developerWallet!,
                address ?? undefined,
                privyUser?.id
              );
              const res = await DeveloperWalletService.sendTransaction({
                walletId: developerWallet!.circle_wallet_id,
                walletAddress: developerWallet!.wallet_address,
                contractAddress: contracts.zksend,
                functionName: 'claimPayments',
                args: [paymentIds.map((id) => BigInt(id).toString()), onchainProof, developerWallet!.wallet_address],
                blockchain: 'ARC-TESTNET',
                privyUserId: privyUserIdForTx,
                socialPlatform: developerWallet!.social_platform ?? undefined,
                socialUserId: developerWallet!.social_user_id ?? undefined,
              });
              if (!res.success) throw new Error(res.error ?? 'Claim failed');
              if (res.txHash) return res.txHash;
              if (res.transactionId) return await pollCircleTxHash(res.transactionId);
              throw new Error('Missing transactionId');
            })()
          : await web3Service.claimZkSendPayments({
              paymentIds,
              proof: onchainProof,
              recipient: address as `0x${string}`,
            });
        await Promise.all(
          rows.map((paymentRow) =>
            markZkSendPaymentClaimed({
              paymentId: paymentRow.paymentId,
              senderAddress: paymentRow.sender,
              recipientIdentityHash: identityHashValue as string,
              platform: paymentRow.platform,
              amount: paymentRow.amount,
              currency: resolveCurrency(paymentRow.token),
              recipientWallet: (useCircle ? developerWallet!.wallet_address : address)!,
              claimTxHash: txHash,
              chainId: activeChainId,
              contractAddress: contracts.zksend,
            }).catch((dbError) => {
              console.warn('[zkSEND] Failed to update payment claim in DB:', dbError);
            })
          )
        );
        setLastClaimedTxHash(txHash);
        toast.success(ZKSEND_SUCCESS_COPY.paymentsClaimed, {
          description: (
            <span className="text-sm">
              TX: {renderTransactionLink(activeChainId, txHash)}
            </span>
          ),
        });
        await loadPending();
        return;
      }

      const isTwitter = normalizedPlatform === 'twitter';
      const isTwitch = normalizedPlatform === 'twitch';
      const isGithub = normalizedPlatform === 'github';
      const isTelegram = normalizedPlatform === 'telegram';
      const isInstagram = normalizedPlatform === 'instagram';
      const isLinkedIn = normalizedPlatform === 'linkedin';

      let requestUrl: string;
      let accessTokenToUse: string | undefined;
      let clientId: string | undefined;
      let regexPattern: string;

      if (isTwitter) {
        const useOAuth1 = Boolean(oauth1Token && oauth1TokenSecret);
        if (useOAuth1) {
          requestUrl = 'https://api.x.com/1.1/account/verify_credentials.json?include_email=false&skip_status=true';
          regexPattern = '"screen_name":"(?<username>[^"]+)"';
        } else {
          requestUrl = 'https://api.x.com/2/users/me?user.fields=username';
          accessTokenToUse = accessToken || undefined;
          regexPattern = '"username":"(?<username>[^"]+)"';
        }
      } else if (isTwitch) {
        const twitchClientId = import.meta.env.VITE_TWITCH_CLIENT_ID as string | undefined;
        if (!twitchClientId) throw new Error('Twitch Client ID not configured');
        requestUrl = 'https://api.twitch.tv/helix/users';
        accessTokenToUse = twitchAccessToken;
        clientId = twitchClientId;
        regexPattern = '"id":"(?<userId>[^"]+)"';
      } else if (isGithub) {
        requestUrl = 'https://api.github.com/user';
        accessTokenToUse = githubAccessToken;
        regexPattern = '"login":"(?<username>[^"]+)"';
      } else if (isTelegram) {
        requestUrl = getReclaimApiUrl('/api/telegram/me');
        accessTokenToUse = telegramAccessToken;
        regexPattern = '"login":"(?<username>[^"]+)"';
      } else if (isInstagram) {
        const instagramClientId = import.meta.env.VITE_INSTAGRAM_CLIENT_ID as string | undefined;
        if (!instagramClientId) throw new Error('Instagram Client ID not configured');
        requestUrl = 'https://graph.instagram.com/me?fields=username';
        accessTokenToUse = instagramAccessToken;
        clientId = instagramClientId;
        regexPattern = '"username":"(?<username>[^"]+)"';
      } else if (isLinkedIn) {
        requestUrl = 'https://api.linkedin.com/v2/userinfo';
        accessTokenToUse = linkedinAccessToken;
        regexPattern = '"name":"(?<username>[^"]+)"';
      } else {
        throw new Error('Unsupported platform for zkFetch');
      }

      const firstPaymentId = rows[0].paymentId;
      const proveUrl = getReclaimApiUrl('/api/reclaim/zkfetch/prove');
      const proveRes = await fetch(proveUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(!isZkLocalhost() && privyAccessToken && isTwitter ? { Authorization: `Bearer ${privyAccessToken}` } : {}),
        },
        body: JSON.stringify({
          requestUrl,
          ...(accessTokenToUse ? { accessToken: accessTokenToUse } : {}),
          ...(oauth1Token && oauth1TokenSecret && isTwitter
            ? { oauth1: { token: oauth1Token, tokenSecret: oauth1TokenSecret } }
            : {}),
          ...(clientId ? { clientId } : {}),
          platform: normalizedPlatform,
          username: isTwitch ? twitchProveUsername(twitchResolvedUserId, u) : u,
          paymentId: firstPaymentId,
          recipient: effectiveRecipientAddress,
          responseMatches: [{ type: 'regex', value: regexPattern }],
        }),
      });

      if (!proveRes.ok) {
        const text = await proveRes.text().catch(() => '');
        throw new Error(`zkFetch proof failed: ${proveRes.status} ${text}`);
      }

      const proveJson = (await proveRes.json()) as { proof?: ReclaimProof[] | ReclaimProof };
      const proof = proveJson.proof;
      if (!proof) throw new Error('No proof received from zkFetch');

      const proofsArray: ReclaimProof[] = Array.isArray(proof) ? (proof as ReclaimProof[]) : [proof as ReclaimProof];
      validateZkFetchExtraction(normalizedPlatform, proofsArray, u, twitchResolvedUserId);

      const signatures =
        (Array.isArray((proofsArray[0] as any)?.signatures) && (proofsArray[0] as any).signatures) ||
        (Array.isArray((proofsArray[0] as any)?.signedClaim?.signatures) &&
          (proofsArray[0] as any).signedClaim.signatures) ||
        [];
      if (signatures.length < reclaimMinSignatures) {
        throw new Error(
          `Reclaim proof signatures are incomplete (got ${signatures.length}, need ${reclaimMinSignatures}). Regenerate proof.`
        );
      }

      const verify = await verifyReclaimProofs(proofsArray);
      if (!verify.isValid) {
        throw new Error('Reclaim proof verification failed (backend)');
      }

      const onchainProof = toOnchainReclaimProof(proofsArray[0]);
      const txHash = useCircle
        ? await (async () => {
            const privyUserIdForTx = getCircleWalletPrivyUserIdForTx(
              developerWallet!,
              address ?? undefined,
              privyUser?.id
            );
            const res = await DeveloperWalletService.sendTransaction({
              walletId: developerWallet!.circle_wallet_id,
              walletAddress: developerWallet!.wallet_address,
              contractAddress: contracts.zksend,
              functionName: 'claimPayments',
              args: [paymentIds.map((id) => BigInt(id).toString()), onchainProof, developerWallet!.wallet_address],
              blockchain: 'ARC-TESTNET',
              privyUserId: privyUserIdForTx,
              socialPlatform: developerWallet!.social_platform ?? undefined,
              socialUserId: developerWallet!.social_user_id ?? undefined,
            });
            if (!res.success) throw new Error(res.error ?? 'Claim failed');
            if (res.txHash) return res.txHash;
            if (res.transactionId) return await pollCircleTxHash(res.transactionId);
            throw new Error('Missing transactionId');
          })()
        : await web3Service.claimZkSendPayments({
            paymentIds,
            proof: onchainProof,
            recipient: address as `0x${string}`,
          });

      await Promise.all(
        rows.map((paymentRow) =>
          markZkSendPaymentClaimed({
            paymentId: paymentRow.paymentId,
            senderAddress: paymentRow.sender,
            recipientIdentityHash: identityHashValue as string,
            platform: paymentRow.platform,
            amount: paymentRow.amount,
            currency: resolveCurrency(paymentRow.token),
          recipientWallet: (useCircle ? developerWallet!.wallet_address : address)!,
            claimTxHash: txHash,
            chainId: activeChainId,
            contractAddress: contracts.zksend,
          }).catch((dbError) => {
            console.warn('[zkSEND] Failed to update payment claim in DB:', dbError);
          })
        )
      );

      setLastClaimedTxHash(txHash);
      toast.success(ZKSEND_SUCCESS_COPY.paymentsClaimed, {
        description: (
          <span className="text-sm">
            TX: {renderTransactionLink(activeChainId, txHash)}
          </span>
        ),
      });
      await loadPending();
    } catch (e) {
      const msg = toUserFacingErrorMessage(e, 'Failed to claim all payments');
      console.error('[zkSEND] claimAll error:', e);
      toast.error(msg);
    } finally {
      setClaimingAll(false);
    }
  };

  const claimDirectDeposit = async (depositId: string) => {
    try {
      if (!directEscrowEnabled || !contracts.directSendV2) {
        throw new Error('DirectSend V2 is not configured');
      }
      if (!useCircle && (!isConnected || !address || !walletClient)) throw new Error('Connect wallet to claim');
      if (useCircle && !developerWallet) throw new Error('Internal Wallet not available');
      if (!addressModeRecipient) throw new Error('Enter your wallet address');
      if (address?.toLowerCase() !== addressModeRecipient.toLowerCase()) {
        throw new Error('Connected wallet must match the address field above');
      }

      setClaimingId(`direct:${depositId}`);
      if (!useCircle) {
        await web3Service.initialize(walletClient!, address!, activeChainId);
      }

      const txHash = useCircle
        ? await (async () => {
            const privyUserIdForTx = getCircleWalletPrivyUserIdForTx(
              developerWallet!,
              address ?? undefined,
              privyUser?.id
            );
            const res = await DeveloperWalletService.sendTransaction({
              walletId: developerWallet!.circle_wallet_id,
              walletAddress: developerWallet!.wallet_address,
              contractAddress: contracts.directSendV2!,
              functionName: 'claim',
              args: [BigInt(depositId).toString()],
              blockchain: 'ARC-TESTNET',
              privyUserId: privyUserIdForTx,
              socialPlatform: developerWallet!.social_platform ?? undefined,
              socialUserId: developerWallet!.social_user_id ?? undefined,
            });
            if (!res.success) throw new Error(res.error ?? 'Claim failed');
            if (res.txHash) return res.txHash;
            if (res.transactionId) return await pollCircleTxHash(res.transactionId);
            throw new Error('Missing transactionId');
          })()
        : await web3Service.claimDirectDeposit(depositId);

      try {
        await markDirectDepositClaimed({
          depositId,
          recipientWallet: addressModeRecipient,
          claimTxHash: txHash,
          chainId: activeChainId,
          contractAddress: contracts.directSendV2,
        });
      } catch (dbError) {
        console.warn('[DirectSend] Failed to update claim in DB:', dbError);
      }

      setLastClaimedTxHash(txHash);
      toast.success(ZKSEND_SUCCESS_COPY.depositClaimed, {
        description: (
          <span className="text-sm">
            TX: {renderTransactionLink(activeChainId, txHash)}
          </span>
        ),
      });
      await loadPending();
    } catch (e) {
      const msg = toUserFacingErrorMessage(e, 'Failed to claim deposit');
      console.error('[DirectSend] claim error:', e);
      toast.error(msg);
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>{title}</CardTitle>
        {!truncateAddresses && onWalletSourceChange ? (
          <WalletSourceToggle
            value={walletSource}
            onChange={onWalletSourceChange}
            hasCircleWallet={hasDeveloperWallet}
            compact
          />
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">

        {platform === 'address' && !directEscrowEnabled ? (
          <p className="text-sm text-muted-foreground">
            DirectSend escrow is disabled. Address sends use instant delivery (legacy). Set{' '}
            <code className="text-xs">VITE_DIRECT_SEND_CLAIM_MODE=escrow_v2</code> and deploy DirectSend V2 to load
            claimable deposits here.
          </p>
        ) : platform === 'address' && directEscrowEnabled ? (
          <p className="text-sm text-muted-foreground">
            Enter the <strong>recipient</strong> wallet address above, connect that wallet, then refresh to see pending
            deposits.
          </p>
        ) : platform === 'twitter' ? (
          <ReceiveOAuthStatus
            connected={Boolean((oauth1Token && oauth1TokenSecret) || accessToken || privyAccessToken)}
            platformLabel="Twitter / X"
            platform={platform}
            username={username}
            hasUsername={isIdentityValid}
          />
        ) : platform === 'twitch' ? (
          <ReceiveOAuthStatus connected={Boolean(twitchAccessToken)} platformLabel="Twitch" platform={platform} username={username} hasUsername={isIdentityValid} />
        ) : platform === 'github' ? (
          <ReceiveOAuthStatus connected={Boolean(githubAccessToken)} platformLabel="GitHub" platform={platform} username={username} hasUsername={isIdentityValid} />
        ) : platform === 'telegram' ? (
          <ReceiveOAuthStatus connected={Boolean(telegramAccessToken)} platformLabel="Telegram" platform={platform} username={username} hasUsername={isIdentityValid} />
        ) : platform === 'instagram' ? (
          <ReceiveOAuthStatus connected={Boolean(instagramAccessToken)} platformLabel="Instagram" platform={platform} username={username} hasUsername={isIdentityValid} />
        ) : platform === 'gmail' ? (
          <ReceiveOAuthStatus connected={Boolean(gmailAccessToken)} platformLabel="Gmail" platform={platform} username={username} hasUsername={isIdentityValid} />
        ) : platform === 'linkedin' ? (
          <ReceiveOAuthStatus connected={Boolean(linkedinAccessToken)} platformLabel="LinkedIn" platform={platform} username={username} hasUsername={isIdentityValid} />
        ) : (
          <div className="space-y-2 rounded-xl border bg-background p-3">
            <div className="text-sm font-medium">Reclaim proof</div>
            <div className="text-xs text-muted-foreground">
              For this platform you’ll generate a Reclaim proof (no OAuth needed).
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={startReclaimFlow}
                disabled={proofLoading || !isIdentityValid}
              >
                {proofLoading ? 'Generating...' : reclaimProofs?.length ? 'Regenerate proof' : 'Generate proof'}
              </Button>
              {reclaimProofs?.length ? <div className="text-xs text-muted-foreground self-center">Proof ready</div> : null}
            </div>
            {proofError ? <div className="text-xs text-red-500">{proofError}</div> : null}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
         {/* <div className="text-xs text-muted-foreground">
            {isActive ? 'Pending payments auto-load when this tab opens.' : 'Open this tab to auto-load pending payments.'}
          </div> */}
          <Button
            type="button"
            variant="outline"
            onClick={loadPending}
            disabled={
              loadingList ||
              (platform === 'address'
                ? !addressModeRecipient || !directEscrowEnabled
                : !isIdentityValid)
            }
            className="w-full sm:w-auto"
          >
            {loadingList ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {platform === 'address' && directEscrowEnabled ? (
          directRows.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              {lastClaimedTxHash ? (
                <span className="font-medium text-foreground">
                  {ZKSEND_SUCCESS_COPY.depositClaimed}:{' '}
                  {renderTransactionLink(activeChainId, lastClaimedTxHash)}
                </span>
              ) : (
                'No pending deposits for this address.'
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {directRows.map((d) => (
                <div
                  key={d.depositId}
                  className="flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Deposit #{d.depositId}</div>
                    <div className="text-xs text-muted-foreground">
                      from:{' '}
                      <a
                        href={getExplorerAddressUrl(activeChainId, d.sender)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                        title={d.sender}
                      >
                        {truncateAddresses ? shortenAddress(d.sender) : d.sender}
                      </a>
                      {' · amount: '}
                      {d.amount}
                      {' · token: '}
                      {getTokenDisplay(d.token)}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => claimDirectDeposit(d.depositId)}
                    disabled={
                      claimingId === `direct:${d.depositId}` ||
                      claimingAll ||
                      !isConnected ||
                      !address ||
                      address.toLowerCase() !== (addressModeRecipient ?? '').toLowerCase()
                    }
                  >
                    {claimingId === `direct:${d.depositId}` ? 'Claiming...' : 'Claim'}
                  </Button>
                </div>
              ))}
            </div>
          )
        ) : platform !== 'address' ? (
          rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              {lastClaimedTxHash ? (
                <span className="font-medium text-foreground">
                  {ZKSEND_SUCCESS_COPY.paymentClaimed}:{' '}
                  {renderTransactionLink(activeChainId, lastClaimedTxHash)}
                </span>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              {rows.length > 1 && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    onClick={claimAll}
                    disabled={
                      claimingAll ||
                      !canClaimPayments ||
                      !isIdentityValid ||
                      loadingList
                    }
                    className="w-full sm:w-auto"
                  >
                    {claimingAll ? 'Claiming all...' : `Claim all (${rows.length} payments)`}
                  </Button>
                </div>
              )}
              {rows.map((p) => (
                <div
                  key={p.paymentId}
                  className={`flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between ${
                    highlightPaymentId === p.paymentId ? 'border-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/20' : ''
                  }`}
                >
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Payment</div>
                    <div className="text-xs text-muted-foreground">
                      from:{' '}
                      <a
                        href={getExplorerAddressUrl(activeChainId, p.sender)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                        title={p.sender}
                      >
                        {truncateAddresses ? shortenAddress(p.sender) : p.sender}
                      </a>
                      {' · amount: '}
                      {p.amount}
                      {' · token: '}
                      {getTokenDisplay(p.token)}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => claim(p.paymentId)}
                    disabled={claimingId === p.paymentId || claimingAll}
                  >
                    {claimingId === p.paymentId ? 'Claiming...' : 'Claim'}
                  </Button>
                </div>
              ))}
            </div>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}

