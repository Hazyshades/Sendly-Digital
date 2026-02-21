import { useState } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { Twitter, Twitch, Github, MessageCircle, Instagram, Linkedin, Mail, Settings } from 'lucide-react';
import { ReclaimProofRequest } from '@reclaimprotocol/js-sdk';

import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useZkSendContext } from '../../contexts/ZkSendContext';
import { useTwitterConnection } from '../../hooks/useTwitterConnection';
import { useTwitchConnection } from '../../hooks/useTwitchConnection';
import { useGmailConnection } from '../../hooks/useGmailConnection';
import { fetchReclaimProofRequestConfig } from '../../utils/reclaim/api';
import { normalizeSocialUsername } from '../../utils/reclaim/identity';
import { PlatformSelectModal } from './PlatformSelectModal';

import type { ZkSendPlatform } from './ZkSendPanel';
import type { ReclaimProof } from '../../utils/reclaim/types';

const platformIcons: Record<ZkSendPlatform, typeof Twitter> = {
  twitter: Twitter,
  twitch: Twitch,
  github: Github,
  telegram: MessageCircle,
  instagram: Instagram,
  linkedin: Linkedin,
  gmail: Mail,
};

const platformLabels: Record<ZkSendPlatform, string> = {
  twitter: 'Twitter / X',
  twitch: 'Twitch',
  github: 'GitHub',
  telegram: 'Telegram',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  gmail: 'Gmail',
};

const platformsRequiringOAuth: ZkSendPlatform[] = ['twitter', 'twitch', 'gmail'];

function normalizeProofs(proof: unknown): ReclaimProof[] {
  if (typeof proof === 'string') {
    const parsed = JSON.parse(proof) as { proofs?: ReclaimProof[]; proof?: ReclaimProof | ReclaimProof[] };
    const raw = parsed?.proofs ?? parsed?.proof ?? parsed;
    return Array.isArray(raw) ? (raw as ReclaimProof[]) : [raw as ReclaimProof];
  }
  if (Array.isArray(proof)) {
    return proof as ReclaimProof[];
  }
  return [proof as ReclaimProof];
}

type Props = {
  username: string;
  isIdentityValid: boolean;
};

export function ConnectionsTab({ username, isIdentityValid }: Props) {
  const { platform, setPlatform, reclaimProofs, setReclaimProofs, proofError, setProofError } = useZkSendContext();
  const { address } = useAccount();
  const { isConnected: isTwitterConnected, connecting: connectingTwitter, clearing: clearingTwitter, connect: connectTwitter, disconnect: disconnectTwitter } = useTwitterConnection();
  const { isConnected: isTwitchConnected, connecting: connectingTwitch, clearing: clearingTwitch, connect: connectTwitch, disconnect: disconnectTwitch } = useTwitchConnection();
  const { isConnected: isGmailConnected, connecting: connectingGmail, clearing: clearingGmail, connect: connectGmail, disconnect: disconnectGmail } = useGmailConnection();
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [proofLoading, setProofLoading] = useState(false);

  const isConnected = platform === 'twitter' ? isTwitterConnected : platform === 'twitch' ? isTwitchConnected : platform === 'gmail' ? isGmailConnected : true;
  const needsOAuth = platformsRequiringOAuth.includes(platform);
  const PlatformIcon = platformIcons[platform];
  const platformLabel = platformLabels[platform];
  const connecting = platform === 'twitter' ? connectingTwitter : platform === 'twitch' ? connectingTwitch : platform === 'gmail' ? connectingGmail : false;
  const clearing = platform === 'twitter' ? clearingTwitter : platform === 'twitch' ? clearingTwitch : platform === 'gmail' ? clearingGmail : false;

  const handleConnect = async () => {
    try {
      if (platform === 'twitter') {
        await connectTwitter();
      } else if (platform === 'twitch') {
        await connectTwitch();
      } else if (platform === 'gmail') {
        await connectGmail();
      }
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refresh-pending-payments'));
        window.dispatchEvent(new CustomEvent('identity-updated'));
      }, 500);
    } catch {
      // Error already handled in connect()
    }
  };

  const handleDisconnect = () => {
    if (platform === 'twitter') {
      disconnectTwitter();
    } else if (platform === 'twitch') {
      disconnectTwitch();
    } else if (platform === 'gmail') {
      disconnectGmail();
    }
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('identity-updated'));
    }, 300);
  };

  const handlePlatformChange = (p: ZkSendPlatform) => {
    setPlatform(p);
    setShowPlatformModal(false);
  };

  const startReclaimFlow = async () => {
    const u = normalizeSocialUsername(username.replace(/^@/, ''));
    if (!u) {
      toast.error('Enter username above to generate proof');
      return;
    }
    if (!address) {
      toast.error('Connect wallet to generate proof');
      return;
    }

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
          const proofsArray = normalizeProofs(proof ?? []);
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
          setProofError(error.message ?? 'Failed to generate proof');
          setReclaimProofs(null);
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to generate proof';
      setProofError(msg);
      toast.error(msg);
    } finally {
      setProofLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Connections</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowPlatformModal(true)} className="gap-1.5">
            <Settings className="h-4 w-4" />
            Change platform
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background border">
              <PlatformIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="text-sm font-medium">{platformLabel}</div>
              <div className="text-xs text-muted-foreground">
                {needsOAuth
                  ? isConnected
                    ? 'Account connected'
                    : 'Connect your account to create and claim payments'
                  : 'Use Reclaim proof (no OAuth)'}
              </div>
            </div>
          </div>

          {needsOAuth ? (
            <div className="space-y-3">
              <Button
                type="button"
                size="lg"
                onClick={handleConnect}
                disabled={connecting || clearing}
                className="w-full"
              >
                {connecting ? 'Connecting...' : clearing ? 'Disconnecting...' : isConnected ? 'Reconnect' : `Connect ${platformLabel}`}
              </Button>
              {isConnected && (
                <Button type="button" variant="ghost" onClick={handleDisconnect} disabled={clearing} className="w-full text-red-600 hover:text-red-700 hover:bg-red-50">
                  {clearing ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2 rounded-xl border bg-background p-4">
              <div className="text-sm font-medium">Reclaim proof</div>
              <div className="text-xs text-muted-foreground">
                Generate a proof for your username. Required to claim payments on this platform.
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={startReclaimFlow}
                  disabled={proofLoading || !isIdentityValid}
                  className="w-full sm:w-auto"
                >
                  {proofLoading ? 'Generating...' : reclaimProofs?.length ? 'Regenerate proof' : 'Generate proof'}
                </Button>
                {reclaimProofs?.length ? (
                  <span className="text-xs text-emerald-600 font-medium">Proof ready</span>
                ) : null}
              </div>
              {proofError ? <div className="text-xs text-red-500">{proofError}</div> : null}
            </div>
          )}
        </CardContent>
      </Card>

      <PlatformSelectModal open={showPlatformModal} onClose={() => setShowPlatformModal(false)} onSelect={handlePlatformChange} currentPlatform={platform} />
    </>
  );
}
