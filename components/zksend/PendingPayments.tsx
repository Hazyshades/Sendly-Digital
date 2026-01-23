import { useEffect, useMemo, useRef, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { toast } from 'sonner';

import web3Service from '../../utils/web3/web3Service';
import {
  generateSocialIdentityHash,
  normalizeSocialPlatform,
  normalizeSocialUsername,
} from '../../utils/reclaim/identity';
import { fetchReclaimProofRequestConfig, verifyReclaimProofs } from '../../utils/reclaim/api';
import { toOnchainReclaimProof } from '../../utils/reclaim/onchain';
import type { ReclaimProof } from '../../utils/reclaim/types';
import { markZkSendPaymentClaimed } from '../../utils/zksend/zksendPaymentsAPI';
import { EURC_ADDRESS, USDC_ADDRESS } from '../../utils/web3/constants';
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk';
import { usePrivySafe } from '../../utils/privy/usePrivySafe';

import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

import type { ZkSendPlatform } from './ZkSendPanel';

type PaymentRow = {
  paymentId: string;
  sender: string;
  platform: string;
  amount: string;
  token: string;
  claimed: boolean;
  createdAt: number;
};

type Props = {
  platform: ZkSendPlatform;
  username: string;
  isActive?: boolean;
  onEditIdentity?: () => void;
};

export function PendingPayments({ platform, username, isActive, onEditIdentity }: Props) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { authenticated, getAccessToken } = usePrivySafe();
  const reclaimApiBaseUrl =
    (import.meta.env.VITE_RECLAIM_API_URL as string | undefined) ||
    (import.meta.env.VITE_ZKTLS_API_URL as string | undefined) ||
    'http://localhost:3001';

  const reclaimMinSignaturesRaw = Number(import.meta.env.VITE_RECLAIM_MIN_SIGNATURES ?? 2);
  const reclaimMinSignatures =
    Number.isFinite(reclaimMinSignaturesRaw) && reclaimMinSignaturesRaw > 0
      ? Math.floor(reclaimMinSignaturesRaw)
      : 2;
  const [accessToken, setAccessToken] = useState('');
  const [twitchAccessToken, setTwitchAccessToken] = useState('');
  const [privyAccessToken, setPrivyAccessToken] = useState<string | null>(null);
  const [connectingTwitter, setConnectingTwitter] = useState(false);
  const [connectingTwitch, setConnectingTwitch] = useState(false);
  const [clearingToken, setClearingToken] = useState(false);
  const [reclaimProofs, setReclaimProofs] = useState<ReclaimProof[] | null>(null);
  const [proofLoading, setProofLoading] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const identityHash = useMemo(() => {
    const u = normalizeSocialUsername(username.replace(/^@/, ''));
    if (!u) return null;
    return generateSocialIdentityHash(platform, u);
  }, [platform, username]);

  const [loadingList, setLoadingList] = useState(false);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const lastAutoLoadKeyRef = useRef<string | null>(null);

  const resolveCurrency = (tokenAddressOrSymbol: string) => {
    const normalized = tokenAddressOrSymbol.toLowerCase();
    if (normalized === USDC_ADDRESS.toLowerCase()) return 'USDC';
    if (normalized === EURC_ADDRESS.toLowerCase()) return 'EURC';
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

  const startReclaimFlow = async () => {
    const u = normalizeSocialUsername(username.replace(/^@/, ''));
    if (!u) throw new Error('Enter username');
    if (!address) throw new Error('Connect wallet to generate proof');

    setProofLoading(true);
    setProofError(null);
    try {
      const config = await fetchReclaimProofRequestConfig({
        platform,
        username: u,
        recipient: address,
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

  const requestTwitterOAuthTokenFlow = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const twitterClientId = import.meta.env.VITE_TWITTER_CLIENT_ID as string | undefined;
      if (!twitterClientId) {
        toast.error('Twitter Client ID not configured');
        resolve(null);
        return;
      }

      const redirectUri = `${window.location.origin}/auth/twitter/callback`;
      const scopes = 'users.read follows.read offline.access';
      const state = Math.random().toString(36).substring(7);

      const generateCodeVerifier = (): string => {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode(...array))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
      };

      const generateCodeChallenge = async (verifier: string): Promise<string> => {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode(...new Uint8Array(digest)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
      };

      const codeVerifier = generateCodeVerifier();

      generateCodeChallenge(codeVerifier).then((codeChallenge) => {
        sessionStorage.setItem('twitter_oauth_state', state);
        sessionStorage.setItem('twitter_oauth_redirect', window.location.href);
        sessionStorage.setItem('twitter_code_verifier', codeVerifier);

        const authUrl = `https://x.com/i/oauth2/authorize?redirect_uri=${encodeURIComponent(
          redirectUri
        )}&response_type=code&scope=${encodeURIComponent(
          scopes
        )}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256&client_id=${encodeURIComponent(
          twitterClientId
        )}`;

        toast.info('Opening Twitter authorization...');

        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        const popup = window.open(
          authUrl,
          'Twitter OAuth',
          `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
        );

        if (!popup) {
          toast.error('Popup blocked. Please allow popups for this site.');
          resolve(null);
          return;
        }

        const messageHandler = (event: MessageEvent) => {
          if (event.data?.target === 'metamask-inpage' || event.data?.name === 'metamask-provider') {
            return;
          }

          if (event.origin !== window.location.origin) {
            return;
          }

          if (event.data && typeof event.data === 'object' && event.data.type === 'twitter_oauth_token' && event.data.accessToken) {
            const token = event.data.accessToken as string;
            localStorage.setItem('twitter_oauth', token);
            localStorage.setItem('twitter_oauth_token', token);

            window.removeEventListener('message', messageHandler);
            if (popup) popup.close();
            resolve(token);
          } else if (event.data && typeof event.data === 'object' && event.data.type === 'twitter_oauth_error') {
            window.removeEventListener('message', messageHandler);
            if (popup) popup.close();
            resolve(null);
          }
        };

        window.addEventListener('message', messageHandler);

        const checkStorage = setInterval(() => {
          const token = localStorage.getItem('twitter_oauth_token') || localStorage.getItem('twitter_oauth');
          if (token && token.length > 10) {
            clearInterval(checkStorage);
            window.removeEventListener('message', messageHandler);
            if (popup) popup.close();
            resolve(token);
          }
        }, 500);

        const checkPopup = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkPopup);
            clearInterval(checkStorage);
            window.removeEventListener('message', messageHandler);
            resolve(null);
          }
        }, 500);
      });
    });
  };

  const connectTwitter = async () => {
    setConnectingTwitter(true);
    try {
      const token = await requestTwitterOAuthTokenFlow();
      if (!token) {
        throw new Error('Twitter authorization failed or was cancelled');
      }
      setAccessToken(token);
      toast.success('Twitter connected');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to connect Twitter';
      toast.error(msg);
    } finally {
      setConnectingTwitter(false);
    }
  };

  const requestTwitchOAuthTokenImplicitFlow = async (clientId: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const redirectUri = `${window.location.origin}/auth/twitch/callback`;
      const scopes = 'user:read:email';
      const state = Math.random().toString(36).substring(7);

      sessionStorage.setItem('twitch_oauth_state', state);
      sessionStorage.setItem('twitch_oauth_redirect', window.location.href);

      const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${encodeURIComponent(
        clientId
      )}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=token&scope=${encodeURIComponent(scopes)}&state=${state}`;

      toast.info('Opening Twitch authorization...');

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        'Twitch OAuth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        toast.error('Popup blocked. Please allow popups for this site.');
        resolve(null);
        return;
      }

      const messageHandler = (event: MessageEvent) => {
        if (event.data?.target === 'metamask-inpage' || event.data?.name === 'metamask-provider') {
          return;
        }

        if (event.origin !== window.location.origin) {
          return;
        }

        if (event.data && typeof event.data === 'object' && event.data.type === 'twitch_oauth_token' && event.data.accessToken) {
          const token = String(event.data.accessToken);
          window.removeEventListener('message', messageHandler);
          if (popup) popup.close();
          resolve(token);
        } else if (event.data && typeof event.data === 'object' && event.data.type === 'twitch_oauth_error') {
          window.removeEventListener('message', messageHandler);
          if (popup) popup.close();
          resolve(null);
        }
      };

      window.addEventListener('message', messageHandler);

      const checkStorage = setInterval(() => {
        const token = localStorage.getItem('twitch_oauth_token') || localStorage.getItem('twitch_oauth');
        if (token && token.length > 10) {
          clearInterval(checkStorage);
          window.removeEventListener('message', messageHandler);
          if (popup) popup.close();
          resolve(token);
        }
      }, 500);

      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup);
          clearInterval(checkStorage);
          window.removeEventListener('message', messageHandler);
          resolve(null);
        }
      }, 500);
    });
  };

  const connectTwitch = async () => {
    setConnectingTwitch(true);
    try {
      const twitchClientId = import.meta.env.VITE_TWITCH_CLIENT_ID as string | undefined;
      if (!twitchClientId) {
        throw new Error('Twitch Client ID not configured');
      }
      const token = await requestTwitchOAuthTokenImplicitFlow(twitchClientId);
      if (!token) {
        throw new Error('Twitch authorization failed or was cancelled');
      }
      localStorage.setItem('twitch_oauth', token);
      localStorage.setItem('twitch_oauth_token', token);
      setTwitchAccessToken(token);
      toast.success('Twitch connected');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to connect Twitch';
      toast.error(msg);
    } finally {
      setConnectingTwitch(false);
    }
  };

  const clearTwitterToken = () => {
    setClearingToken(true);
    try {
      localStorage.removeItem('twitter_oauth');
      localStorage.removeItem('twitter_oauth_token');
      localStorage.removeItem('twitter_oauth_scope');
      localStorage.removeItem('twitter_refresh_token');
      sessionStorage.removeItem('twitter_oauth_state');
      sessionStorage.removeItem('twitter_oauth_redirect');
      sessionStorage.removeItem('twitter_code_verifier');
      setAccessToken('');
      toast.success('Twitter token cleared');
    } catch (error) {
      console.error('[zkSEND] Failed to clear Twitter token:', error);
      toast.error('Failed to clear Twitter token');
    } finally {
      setClearingToken(false);
    }
  };

  const clearTwitchToken = () => {
    setClearingToken(true);
    try {
      localStorage.removeItem('twitch_oauth');
      localStorage.removeItem('twitch_oauth_token');
      localStorage.removeItem('twitch_access_token');
      sessionStorage.removeItem('twitch_oauth_state');
      sessionStorage.removeItem('twitch_oauth_redirect');
      setTwitchAccessToken('');
      toast.success('Twitch token cleared');
    } catch (error) {
      console.error('[zkSEND] Failed to clear Twitch token:', error);
      toast.error('Failed to clear Twitch token');
    } finally {
      setClearingToken(false);
    }
  };

  const loadPending = async () => {
    try {
      if (!identityHash) throw new Error('Enter username');
      setLoadingList(true);

      const ids = await web3Service.getZkSendPendingPayments(identityHash);
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
    if (!identityHash) return;

    const key = `${platform}:${identityHash}`;
    if (lastAutoLoadKeyRef.current === key) return;
    lastAutoLoadKeyRef.current = key;

    void loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, identityHash, platform]);

  const claim = async (paymentId: string) => {
    try {
      if (!isConnected || !address || !walletClient) {
        throw new Error('Connect wallet to claim payment');
      }
      const u = normalizeSocialUsername(username.replace(/^@/, ''));
      if (!u) throw new Error('Enter username');
      const normalizedPlatform = normalizeSocialPlatform(platform);
      if (!normalizedPlatform) throw new Error('Unsupported platform');
      if (normalizedPlatform === 'twitter') {
        if (!accessToken && !privyAccessToken) {
          throw new Error('Connect Twitter or login with Privy to generate proof');
        }
      }
      if (normalizedPlatform === 'twitch' && !twitchAccessToken) {
        throw new Error('Connect Twitch to generate proof');
      }

      setClaimingId(paymentId);
      await web3Service.initialize(walletClient, address);

      if (normalizedPlatform !== 'twitter' && normalizedPlatform !== 'twitch') {
        if (!reclaimProofs || reclaimProofs.length === 0) {
          throw new Error('Generate Reclaim proof first');
        }

        const proofsArray = reclaimProofs;

        const extractedUsername = normalizeSocialUsername(
          String(proofsArray[0]?.extractedParameterValues?.username || '')
        );
        if (extractedUsername && extractedUsername !== u) {
          throw new Error('Proof username mismatch');
        }

        const verify = await verifyReclaimProofs(proofsArray);
        if (!verify.isValid) {
          throw new Error('Reclaim proof verification failed (backend)');
        }

        const onchainProof = toOnchainReclaimProof(proofsArray[0]);
        const txHash = await web3Service.claimZkSendPayment({
          paymentId,
          proof: onchainProof,
          recipient: address as `0x${string}`,
        });

        const paymentRow = rows.find((row) => row.paymentId === paymentId);
        const identityHashValue = identityHash ?? generateSocialIdentityHash(platform, u);
        if (paymentRow && identityHashValue) {
          try {
            await markZkSendPaymentClaimed({
              paymentId,
              senderAddress: paymentRow.sender,
              recipientIdentityHash: identityHashValue,
              platform: paymentRow.platform,
              amount: paymentRow.amount,
              currency: resolveCurrency(paymentRow.token),
              recipientWallet: address,
              claimTxHash: txHash,
            });
          } catch (dbError) {
            console.warn('[zkSEND] Failed to update payment claim in DB:', dbError);
          }
        }

        toast.success(`Payment claimed. TX: ${txHash.slice(0, 10)}...`);
        await loadPending();
        return;
      }

      const isTwitter = normalizedPlatform === 'twitter';
      const twitchClientId = import.meta.env.VITE_TWITCH_CLIENT_ID as string | undefined;
      if (!isTwitter && !twitchClientId) {
        throw new Error('Twitch Client ID not configured');
      }
      const requestUrl = isTwitter
        ? 'https://api.x.com/2/users/me?user.fields=username'
        : 'https://api.twitch.tv/helix/users';
      const proveUrl = `${reclaimApiBaseUrl.replace(/\/$/, '')}/api/reclaim/zkfetch/prove`;
      const proveRes = await fetch(proveUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(privyAccessToken ? { Authorization: `Bearer ${privyAccessToken}` } : {}),
        },
        body: JSON.stringify({
          requestUrl,
          ...(isTwitter ? (accessToken ? { accessToken } : {}) : { accessToken: twitchAccessToken }),
          ...(isTwitter ? {} : { clientId: twitchClientId }),
          platform: normalizedPlatform,
          username: u,
          paymentId,
          recipient: address,
          responseMatches: [
            {
              type: 'regex',
              value: isTwitter
                ? '"username":"(?<username>[^"]+)"'
                : '"login":"(?<username>[^"]+)"',
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
      const extractedUsername = normalizeSocialUsername(
        String(proofsArray[0]?.extractedParameterValues?.username || '')
      );
      if (extractedUsername && extractedUsername !== u) {
        throw new Error('Proof username mismatch');
      }

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
      const txHash = await web3Service.claimZkSendPayment({
        paymentId,
        proof: onchainProof,
        recipient: address as `0x${string}`,
      });

      const paymentRow = rows.find((row) => row.paymentId === paymentId);
      const identityHashValue = identityHash ?? generateSocialIdentityHash(platform, u);
      if (paymentRow && identityHashValue) {
        try {
          await markZkSendPaymentClaimed({
            paymentId,
            senderAddress: paymentRow.sender,
            recipientIdentityHash: identityHashValue,
            platform: paymentRow.platform,
            amount: paymentRow.amount,
            currency: resolveCurrency(paymentRow.token),
            recipientWallet: address,
            claimTxHash: txHash,
          });
        } catch (dbError) {
          console.warn('[zkSEND] Failed to update payment claim in DB:', dbError);
        }
      }

      toast.success(`Payment claimed. TX: ${txHash.slice(0, 10)}...`);
      await loadPending();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to claim payment';
      console.error('[zkSEND] claim error:', e);
      toast.error(msg);
      setClaimingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connections & pending</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-medium">Identity</div>
            <div className="text-xs text-muted-foreground">
              {platform} · {username || '— enter username in Create tab'}
            </div>
          </div>
          {onEditIdentity ? (
            <Button type="button" variant="outline" onClick={onEditIdentity} className="w-full sm:w-auto">
              Edit
            </Button>
          ) : null}
        </div>

        {platform === 'twitter' ? (
          <div className="space-y-3">
            <Button
              type="button"
              size="lg"
              onClick={connectTwitter}
              disabled={connectingTwitter}
              className="w-full"
            >
              {connectingTwitter ? 'Connecting...' : accessToken ? 'Reconnect Twitter / X' : 'Connect Twitter / X'}
            </Button>

            {accessToken ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border bg-background p-3">
                <div className="text-xs text-muted-foreground">Connected (token stored in this browser)</div>
                <Button type="button" variant="ghost" onClick={clearTwitterToken} disabled={clearingToken}>
                  {clearingToken ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              </div>
            ) : null}

            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAdvanced((v) => !v)}
              className="w-full sm:w-auto"
            >
              {showAdvanced ? 'Hide advanced' : 'Advanced'}
            </Button>

            {showAdvanced ? (
              <div className="space-y-2 rounded-xl border bg-background p-3">
                <Label>Access token (manual)</Label>
                <Input
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="Will be kept only in your browser"
                  type="password"
                  aria-label="Twitter access token"
                />
                <div className="text-xs text-muted-foreground">
                  Used for zkFetch web-proof. Prefer “Connect Twitter / X” above.
                </div>
              </div>
            ) : null}
          </div>
        ) : platform === 'twitch' ? (
          <div className="space-y-3">
            <Button
              type="button"
              size="lg"
              onClick={connectTwitch}
              disabled={connectingTwitch}
              className="w-full"
            >
              {connectingTwitch ? 'Connecting...' : twitchAccessToken ? 'Reconnect Twitch' : 'Connect Twitch'}
            </Button>

            {twitchAccessToken ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border bg-background p-3">
                <div className="text-xs text-muted-foreground">Connected (token stored in this browser)</div>
                <Button type="button" variant="ghost" onClick={clearTwitchToken} disabled={clearingToken}>
                  {clearingToken ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-2 rounded-xl border bg-background p-3">
            <div className="text-sm font-medium">Reclaim proof</div>
            <div className="text-xs text-muted-foreground">
              For this platform you’ll generate a Reclaim proof (no OAuth needed).
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={startReclaimFlow} disabled={proofLoading}>
                {proofLoading ? 'Generating...' : reclaimProofs?.length ? 'Regenerate proof' : 'Generate proof'}
              </Button>
              {reclaimProofs?.length ? <div className="text-xs text-muted-foreground self-center">Proof ready</div> : null}
            </div>
            {proofError ? <div className="text-xs text-red-500">{proofError}</div> : null}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-muted-foreground">
            {isActive ? 'Pending payments auto-load when this tab opens.' : 'Open this tab to auto-load pending payments.'}
          </div>
          <Button type="button" variant="outline" onClick={loadPending} disabled={loadingList} className="w-full sm:w-auto">
            {loadingList ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">No pending payments (or not loaded yet).</div>
        ) : (
          <div className="space-y-2">
            {rows.map((p) => (
              <div
                key={p.paymentId}
                className="flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="text-sm font-medium">paymentId: {p.paymentId}</div>
                  <div className="text-xs text-muted-foreground">
                    from: {p.sender} · amount: {p.amount} · token: {p.token}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => claim(p.paymentId)}
                  disabled={claimingId === p.paymentId}
                >
                  {claimingId === p.paymentId ? 'Claiming...' : 'Claim via Reclaim'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

