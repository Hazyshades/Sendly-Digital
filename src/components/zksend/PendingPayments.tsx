import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAccount, useWalletClient, useChainId } from 'wagmi';
import { toast } from 'sonner';

import web3Service from '@/lib/web3/web3Service';
import {
  fetchTwitchAuthenticatedUser,
  generateSocialIdentityHash,
  generateTwitchUidIdentityHash,
  gmailIdentityHashes,
  normalizeGmailIdentity,
  normalizeSocialUsername,
} from '@/lib/reclaim/identity';
import { fetchReclaimProofRequestConfig } from '@/lib/reclaim/api';
import type { ReclaimProof } from '@/lib/reclaim/types';
import {
  getExplorerAddressUrl,
  getContractsForChain,
  ARC_CHAIN_ID,
  isDirectSendEscrowActiveForChain,
} from '@/lib/web3/constants';
import { tokenSymbolForAddress } from '@/lib/web3/chains';
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk';
import { usePrivySafe } from '@/lib/privy/usePrivySafe';
import { isZkLocalhost } from '@/lib/runtime/zkHost';
import { type DeveloperWallet } from '@/lib/circle/developerWalletService';
import { getCircleWalletPrivyUserIdForTx } from '@/hooks/useCircleWallet';
import { WalletSourceToggle, type WalletSource } from './WalletSourceToggle';
import {
  ZKSEND_SUCCESS_COPY,
  renderTransactionLink,
} from './transactionFeedback';
import {
  readTwitterOAuthTokens,
  readTwitchAccessToken,
  readGithubAccessToken,
  readTelegramAccessToken,
  readGmailAccessToken,
  readLinkedInAccessToken,
  ZK_OAUTH_IDENTITY_UPDATED_EVENT,
} from '@/lib/zk-oauth/tokenStorage';
import {
  claimDirectDeposit as claimDirectDepositService,
  claimPayments,
  type ClaimOAuthTokens,
} from '@/lib/zksend/claimService';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { SendRecipientType } from './ZkSendPanel';
import { ZkAccountsConnectHint } from '@/components/zk-accounts/ZkAccountsConnectHint';

/** Platform OAuth update events dispatched by usePlatformConnection descriptors. */
const PLATFORM_OAUTH_UPDATED_EVENTS = [
  'twitter-oauth-updated',
  'twitch-oauth-updated',
  'github-oauth-updated',
  'telegram-oauth-updated',
  'gmail-oauth-updated',
  'linkedin-oauth-updated',
] as const;

function readInstagramAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const stored =
    localStorage.getItem('instagram_oauth_token') ||
    localStorage.getItem('instagram_oauth') ||
    localStorage.getItem('instagram_access_token');
  return stored && stored.length > 0 ? stored : null;
}

function getTokenDisplay(chainId: number, tokenAddress: string): string {
  return tokenSymbolForAddress(chainId, tokenAddress);
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
  const display = platform === 'gmail' ? handle : `@${handle}`;
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
  const getReclaimApiUrl = useCallback((path: string) => {
    if (typeof window !== 'undefined' && reclaimApiBaseUrl === window.location.origin) return path;
    return `${reclaimApiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }, [reclaimApiBaseUrl]);

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

  const syncOAuthTokens = useCallback(() => {
    try {
      const twitter = readTwitterOAuthTokens();
      if (twitter?.kind === 'oauth1') {
        setOauth1Token(twitter.oauthToken);
        setOauth1TokenSecret(twitter.oauthTokenSecret);
        setAccessToken('');
      } else if (twitter?.kind === 'oauth2') {
        setAccessToken(twitter.accessToken);
      }

      const twitch = readTwitchAccessToken();
      if (twitch) setTwitchAccessToken(twitch);

      const github = readGithubAccessToken();
      if (github) setGithubAccessToken(github);

      const telegram = readTelegramAccessToken();
      if (telegram) setTelegramAccessToken(telegram);

      const gmail = readGmailAccessToken();
      if (gmail) setGmailAccessToken(gmail);

      const linkedin = readLinkedInAccessToken();
      if (linkedin) setLinkedinAccessToken(linkedin);

      const instagram = readInstagramAccessToken();
      if (instagram) setInstagramAccessToken(instagram);
    } catch (error) {
      console.warn('[zkSEND] Failed to sync OAuth tokens:', error);
    }
  }, []);

  useEffect(() => {
    syncOAuthTokens();
  }, [syncOAuthTokens]);

  useEffect(() => {
    const onUpdate = () => syncOAuthTokens();
    window.addEventListener(ZK_OAUTH_IDENTITY_UPDATED_EVENT, onUpdate);
    for (const eventName of PLATFORM_OAUTH_UPDATED_EVENTS) {
      window.addEventListener(eventName, onUpdate);
    }
    return () => {
      window.removeEventListener(ZK_OAUTH_IDENTITY_UPDATED_EVENT, onUpdate);
      for (const eventName of PLATFORM_OAUTH_UPDATED_EVENTS) {
        window.removeEventListener(eventName, onUpdate);
      }
    };
  }, [syncOAuthTokens]);

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

  const oauthTokens = useMemo((): ClaimOAuthTokens => {
    return {
      twitterAccessToken: accessToken || null,
      oauth1Token: oauth1Token || null,
      oauth1TokenSecret: oauth1TokenSecret || null,
      twitchAccessToken: twitchAccessToken || null,
      githubAccessToken: githubAccessToken || null,
      telegramAccessToken: telegramAccessToken || null,
      instagramAccessToken: instagramAccessToken || null,
      linkedinAccessToken: linkedinAccessToken || null,
      gmailAccessToken: gmailAccessToken || null,
      privyAccessToken,
    };
  }, [
    accessToken,
    oauth1Token,
    oauth1TokenSecret,
    twitchAccessToken,
    githubAccessToken,
    telegramAccessToken,
    instagramAccessToken,
    linkedinAccessToken,
    gmailAccessToken,
    privyAccessToken,
  ]);

  const buildExecutorContext = useCallback(
    (loginUsername: string) => {
      const recipientAddress = (useCircle ? developerWallet!.wallet_address : address) ?? '';
      return {
        walletSource: (useCircle ? 'circle' : 'external') as 'circle' | 'external',
        chainId: activeChainId,
        zksendAddress: contracts.zksend,
        recipientAddress,
        loginUsername,
        platform,
        tokens: oauthTokens,
        primaryIdentityHash,
        reclaimProofs,
        reclaimMinSignatures,
        getReclaimApiUrl,
        resolveCurrency: (tokenAddressOrSymbol: string) =>
          tokenSymbolForAddress(activeChainId, tokenAddressOrSymbol),
        developerWallet,
        attribution: useCircle
          ? {
              privyUserId: getCircleWalletPrivyUserIdForTx(
                developerWallet!,
                address ?? undefined,
                privyUser?.id,
              ),
              socialPlatform: developerWallet!.social_platform ?? undefined,
              socialUserId: developerWallet!.social_user_id ?? undefined,
            }
          : undefined,
        initializeExternalWallet: async () => {
          if (!walletClient || !address) throw new Error('Connect wallet to claim payment');
          await web3Service.initialize(walletClient, address, activeChainId);
        },
      };
    },
    [
      useCircle,
      developerWallet,
      address,
      activeChainId,
      contracts.zksend,
      platform,
      oauthTokens,
      primaryIdentityHash,
      reclaimProofs,
      reclaimMinSignatures,
      getReclaimApiUrl,
      privyUser?.id,
      walletClient,
    ],
  );

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
      if (!useCircle && (!isConnected || !address || !walletClient)) {
        throw new Error('Connect wallet to claim payment');
      }
      if (useCircle && !developerWallet) throw new Error('Internal Wallet not available');
      const u = resolveRecipientUsername(platform, username);
      if (!u) throw new Error('Enter username');

      const paymentRow = rows.find((row) => row.paymentId === paymentId);
      if (!paymentRow) throw new Error('Payment not found');

      setClaimingId(paymentId);
      const outcomes = await claimPayments({
        payments: [paymentRow],
        executorContext: buildExecutorContext(u),
      });
      const txHash = outcomes[0]?.txHash;
      if (!txHash) throw new Error('Claim failed');

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
    } finally {
      setClaimingId(null);
    }
  };

  const claimAll = async () => {
    if (rows.length === 0) return;
    try {
      if (!useCircle && (!isConnected || !address || !walletClient)) {
        throw new Error('Connect wallet to claim payment');
      }
      if (useCircle && !developerWallet) throw new Error('Internal Wallet not available');
      const u = resolveRecipientUsername(platform, username);
      if (!u) throw new Error('Enter username');

      setClaimingAll(true);
      const outcomes = await claimPayments({
        payments: rows,
        executorContext: buildExecutorContext(u),
      });
      const txHash = outcomes[0]?.txHash;
      if (!txHash) throw new Error('Claim failed');

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
      if (!useCircle && (!isConnected || !address || !walletClient)) {
        throw new Error('Connect wallet to claim');
      }
      if (useCircle && !developerWallet) throw new Error('Internal Wallet not available');
      if (!addressModeRecipient) throw new Error('Enter your wallet address');
      if (address?.toLowerCase() !== addressModeRecipient.toLowerCase()) {
        throw new Error('Connected wallet must match the address field above');
      }

      setClaimingId(`direct:${depositId}`);
      const { txHash } = await claimDirectDepositService({
        depositId,
        walletSource: useCircle ? 'circle' : 'external',
        chainId: activeChainId,
        directSendAddress: contracts.directSendV2,
        recipientWallet: addressModeRecipient,
        developerWallet,
        attribution: useCircle
          ? {
              privyUserId: getCircleWalletPrivyUserIdForTx(
                developerWallet!,
                address ?? undefined,
                privyUser?.id,
              ),
              socialPlatform: developerWallet!.social_platform ?? undefined,
              socialUserId: developerWallet!.social_user_id ?? undefined,
            }
          : undefined,
        initializeExternalWallet: async () => {
          await web3Service.initialize(walletClient!, address!, activeChainId);
        },
      });

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
    <Card className="bg-white/90 shadow-circle-card backdrop-blur-sm">
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
                      {getTokenDisplay(activeChainId, d.token)}
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
                      {getTokenDisplay(activeChainId, p.token)}
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
