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
import { isZkLocalhost } from '../../utils/runtime/zkHost';

import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

import type { ZkSendPlatform } from './ZkSendPanel';
import { connectTwitter } from './Oauth/twitter';
import { connectTwitch } from './Oauth/twitch';
import { connectGithub } from './Oauth/github';
import { connectInstagram } from './Oauth/instagram';
// import { connectTiktok } from './Oauth/tiktok';
import { connectGmail } from './Oauth/gmail';
import { connectLinkedIn } from './Oauth/linkedin';

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
  isIdentityValid?: boolean;
};

export function PendingPayments({ platform, username, isActive, isIdentityValid = false }: Props) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { authenticated, getAccessToken } = usePrivySafe();
  const reclaimApiBaseUrl = (() => {
    if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
    const envUrl =
      (import.meta.env.VITE_RECLAIM_API_URL as string | undefined) ||
      (import.meta.env.VITE_ZKTLS_API_URL as string | undefined);
    if (envUrl) return envUrl;
    return 'http://localhost:3001';
  })();

  const reclaimMinSignaturesRaw = Number(import.meta.env.VITE_RECLAIM_MIN_SIGNATURES ?? 2);
  const reclaimMinSignatures =
    Number.isFinite(reclaimMinSignaturesRaw) && reclaimMinSignaturesRaw > 0
      ? Math.floor(reclaimMinSignaturesRaw)
      : 2;
  const [accessToken, setAccessToken] = useState('');
  const [oauth1Token, setOauth1Token] = useState('');
  const [oauth1TokenSecret, setOauth1TokenSecret] = useState('');
  const [twitchAccessToken, setTwitchAccessToken] = useState('');
  const [githubAccessToken, setGithubAccessToken] = useState('');
  const [instagramAccessToken, setInstagramAccessToken] = useState('');
  // const [tiktokAccessToken, setTiktokAccessToken] = useState('');
  const [gmailAccessToken, setGmailAccessToken] = useState('');
  const [linkedinAccessToken, setLinkedinAccessToken] = useState('');
  const [privyAccessToken, setPrivyAccessToken] = useState<string | null>(null);
  const [connectingTwitter, setConnectingTwitter] = useState(false);
  const [connectingTwitch, setConnectingTwitch] = useState(false);
  const [connectingGithub, setConnectingGithub] = useState(false);
  const [connectingInstagram, setConnectingInstagram] = useState(false);
  // const [connectingTiktok, setConnectingTiktok] = useState(false);
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [connectingLinkedIn, setConnectingLinkedIn] = useState(false);
  const [reclaimProofs, setReclaimProofs] = useState<ReclaimProof[] | null>(null);
  const [proofLoading, setProofLoading] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);

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

  const handleConnectTwitter = async () => {
    setConnectingTwitter(true);
    try {
      const token = await connectTwitter();
      if (token) {
        const secret = localStorage.getItem('twitter_oauth1_secret');
        if (secret) {
          setOauth1Token(token);
          setOauth1TokenSecret(secret);
        } else {
          setAccessToken(token);
        }
      }
    } finally {
      setConnectingTwitter(false);
    }
  };

  const handleConnectTwitch = async () => {
    setConnectingTwitch(true);
    try {
      const token = await connectTwitch();
      if (token) {
        setTwitchAccessToken(token);
      }
    } finally {
      setConnectingTwitch(false);
    }
  };

  const handleConnectGithub = async () => {
    setConnectingGithub(true);
    try {
      const token = await connectGithub();
      if (token) {
        setGithubAccessToken(token);
      }
    } finally {
      setConnectingGithub(false);
    }
  };

  const handleConnectInstagram = async () => {
    setConnectingInstagram(true);
    try {
      const token = await connectInstagram();
      if (token) {
        setInstagramAccessToken(token);
      }
    } finally {
      setConnectingInstagram(false);
    }
  };

  // const handleConnectTiktok = async () => {
  //   setConnectingTiktok(true);
  //   try {
  //     const token = await connectTiktok();
  //     if (token) {
  //       setTiktokAccessToken(token);
  //     }
  //   } finally {
  //     setConnectingTiktok(false);
  //   }
  // };

  // const handleClearTiktokToken = () => {
  //   setClearingToken(true);
  //   try {
  //     clearTiktokToken();
  //     setTiktokAccessToken('');
  //   } finally {
  //     setClearingToken(false);
  //   }
  // };

  const handleConnectGmail = async () => {
    setConnectingGmail(true);
    try {
      const token = await connectGmail();
      if (token) {
        setGmailAccessToken(token);
      }
    } finally {
      setConnectingGmail(false);
    }
  };

  const handleConnectLinkedIn = async () => {
    setConnectingLinkedIn(true);
    try {
      const token = await connectLinkedIn();
      if (token) {
        setLinkedinAccessToken(token);
      }
    } finally {
      setConnectingLinkedIn(false);
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
      if (normalizedPlatform === 'github' && !githubAccessToken) {
        throw new Error('Connect GitHub to generate proof');
      }
      if (normalizedPlatform === 'instagram' && !instagramAccessToken) {
        throw new Error('Connect Instagram to generate proof');
      }
      // if (normalizedPlatform === 'tiktok' && !tiktokAccessToken) {
      //   throw new Error('Connect TikTok to generate proof');
      // }
      if (normalizedPlatform === 'linkedin' && !linkedinAccessToken) {
        throw new Error('Connect LinkedIn to generate proof');
      }

      setClaimingId(paymentId);
      await web3Service.initialize(walletClient, address);

      if (
        normalizedPlatform !== 'twitter' &&
        normalizedPlatform !== 'twitch' &&
        normalizedPlatform !== 'github' &&
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
      const isTwitch = normalizedPlatform === 'twitch';
      const isGithub = normalizedPlatform === 'github';
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
        regexPattern = '"login":"(?<username>[^"]+)"';
      } else if (isGithub) {
        requestUrl = 'https://api.github.com/user';
        accessTokenToUse = githubAccessToken;
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

      const proveUrl = `${reclaimApiBaseUrl.replace(/\/$/, '')}/api/reclaim/zkfetch/prove`;
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
          username: u,
          paymentId,
          recipient: address,
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
        <CardTitle>Receive</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">


        {platform === 'twitter' ? (
          <div className="space-y-3">
            <Button
              type="button"
              size="lg"
              onClick={handleConnectTwitter}
              disabled={connectingTwitter || !isIdentityValid}
              className="w-full"
            >
              {connectingTwitter
                ? 'Connecting...'
                : oauth1Token || accessToken
                  ? 'Reconnect Twitter / X'
                  : 'Connect Twitter / X'}
            </Button>
          </div>
        ) : platform === 'twitch' ? (
          <div className="space-y-3">
            <Button
              type="button"
              size="lg"
              onClick={handleConnectTwitch}
              disabled={connectingTwitch || !isIdentityValid}
              className="w-full"
            >
              {connectingTwitch ? 'Connecting...' : twitchAccessToken ? 'Reconnect Twitch' : 'Connect Twitch'}
            </Button>
          </div>
        ) : platform === 'github' ? (
          <div className="space-y-3">
            <Button
              type="button"
              size="lg"
              onClick={handleConnectGithub}
              disabled={connectingGithub || !isIdentityValid}
              className="w-full"
            >
              {connectingGithub ? 'Connecting...' : githubAccessToken ? 'Reconnect GitHub' : 'Connect GitHub'}
            </Button>
          </div>
        ) : platform === 'instagram' ? (
          <div className="space-y-3">
            <Button
              type="button"
              size="lg"
              onClick={handleConnectInstagram}
              disabled={connectingInstagram || !isIdentityValid}
              className="w-full"
            >
              {connectingInstagram ? 'Connecting...' : instagramAccessToken ? 'Reconnect Instagram' : 'Connect Instagram'}
            </Button>
          </div>
        ) : platform === 'gmail' ? (
          <div className="space-y-3">
            <Button
              type="button"
              size="lg"
              onClick={handleConnectGmail}
              disabled={connectingGmail || !isIdentityValid}
              className="w-full"
            >
              {connectingGmail ? 'Connecting...' : gmailAccessToken ? 'Reconnect Gmail' : 'Connect Gmail'}
            </Button>
          </div>
        ) : platform === 'linkedin' ? (
          <div className="space-y-3">
            <Button
              type="button"
              size="lg"
              onClick={handleConnectLinkedIn}
              disabled={connectingLinkedIn || !isIdentityValid}
              className="w-full"
            >
              {connectingLinkedIn ? 'Connecting...' : linkedinAccessToken ? 'Reconnect LinkedIn' : 'Connect LinkedIn'}
            </Button>
          </div>
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
          <div className="text-xs text-muted-foreground">
            {isActive ? 'Pending payments auto-load when this tab opens.' : 'Open this tab to auto-load pending payments.'}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={loadPending}
            disabled={loadingList || !isIdentityValid}
            className="w-full sm:w-auto"
          >
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
                  {claimingId === p.paymentId ? 'Claiming...' : 'Claim'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

