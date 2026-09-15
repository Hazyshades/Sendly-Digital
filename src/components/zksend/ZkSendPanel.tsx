import { useEffect, useMemo, useRef, useState } from 'react';
import { useChainId } from 'wagmi';
import { useSearchParams } from 'react-router-dom';

import { PendingPayments } from './PendingPayments';
import { SendPaymentForm, type SendPaymentPreviewValues } from './SendPaymentForm';
import { IdentitySelector } from './IdentitySelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PaymentsOnboarding } from '@/components/onboarding/PaymentsOnboarding';
import { isSocialRecipientValid } from '@/lib/reclaim/identity';
import { useCircleWallet } from '@/hooks/useCircleWallet';
import { useZkPlatformConnections } from '@/hooks/useZkPlatformConnections';
import { useZkOAuthIdentity } from '@/lib/zk-oauth/useZkOAuthIdentity';
import { useWalletSourcePreference } from '@/hooks/useWalletSourcePreference';
import { ARC_CHAIN_ID, BASE_SEPOLIA_CHAIN_ID, TEMPO_CHAIN_ID } from '@/lib/web3/constants';

export type ZkSendPlatform = 'twitter' | 'twitch' | 'github' | 'telegram' | 'instagram' /* | 'tiktok' */ | 'gmail' | 'linkedin';

export type SendRecipientType = ZkSendPlatform | 'address';

type ZkSendPanelProps = {
  /** When embedding (e.g. in blog), open this tab by default. */
  initialTab?: 'send' | 'receive';
  /** Read-only preview with fixed values (same look, no disabled styling). */
  preview?: boolean;
  previewValues?: SendPaymentPreviewValues;
};

function seedUsernameFromIdentity(username: string): string {
  return username.replace(/^@/, '');
}

export function ZkSendPanel({ initialTab = 'send', preview = false, previewValues }: ZkSendPanelProps = {}) {
  const [searchParams] = useSearchParams();
  const claimPlatform = searchParams.get('platform') === 'twitter' ? 'twitter' : null;
  const claimUsername = claimPlatform ? searchParams.get('username')?.replace(/^@/, '') ?? '' : '';
  const claimPaymentId = claimPlatform ? searchParams.get('paymentId') : null;
  const claimTab = claimPlatform && claimUsername && searchParams.get('tab') === 'receive' ? 'receive' : null;
  const claimFlow = Boolean(claimPaymentId || (claimPlatform && claimUsername));
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>(claimTab ?? initialTab);

  // Send tab: manual, except clear/autofill on platform switch and clear on full disconnect.
  const [sendPlatform, setSendPlatform] = useState<SendRecipientType>(preview && previewValues ? previewValues.platform : 'twitter');
  const [sendUsername, setSendUsername] = useState(preview && previewValues ? previewValues.username : '');

  // Receive tab: follows Primary identity; claim deep-links keep URL values.
  const [receivePlatform, setReceivePlatform] = useState<SendRecipientType>(
    preview && previewValues ? previewValues.platform : claimPlatform ?? 'twitter'
  );
  const [receiveUsername, setReceiveUsername] = useState(
    preview && previewValues ? previewValues.username : claimUsername
  );

  const { identity, loading: identityLoading } = useZkOAuthIdentity();
  const { platforms } = useZkPlatformConnections();
  const { developerWallet, hasDeveloperWallet } = useCircleWallet();
  const { walletSource, setWalletSource } = useWalletSourcePreference();
  const connectedChainId = useChainId();
  const activeChainId = connectedChainId || ARC_CHAIN_ID;
  const isInternalWalletDisabled =
    activeChainId === BASE_SEPOLIA_CHAIN_ID || activeChainId === TEMPO_CHAIN_ID;
  const internalWalletUnavailableNetwork =
    activeChainId === BASE_SEPOLIA_CHAIN_ID ? 'Base Sepolia' : 'Tempo Testnet';
  const canUseInternalWallet = hasDeveloperWallet && !isInternalWalletDisabled;
  const lastSeededIdentityKeyRef = useRef<string | null>(
    claimPlatform && claimUsername ? `claim:${claimPlatform}:${claimUsername}` : null,
  );

  const ownHandleForPlatform = (platform: SendRecipientType): string | null => {
    if (platform === 'address' || platform === 'instagram') return null;
    const row = platforms.find((p) => p.id === platform);
    if (!row?.isConnected || !row.displayName) return null;
    return seedUsernameFromIdentity(row.displayName);
  };

  useEffect(() => {
    if (preview || !claimTab || !claimPlatform || !claimUsername) return;
    lastSeededIdentityKeyRef.current = `claim:${claimPlatform}:${claimUsername}`;
    setActiveTab('receive');
    setReceivePlatform(claimPlatform);
    setReceiveUsername(claimUsername);
  }, [claimPlatform, claimTab, claimUsername, preview]);

  useEffect(() => {
    if (preview || identityLoading) return;

    if (!identity) {
      if (claimTab) return;
      lastSeededIdentityKeyRef.current = null;
      setReceivePlatform('twitter');
      setReceiveUsername('');
      setSendUsername('');
      return;
    }

    if (claimTab) return;

    const key = `${identity.platform}:${identity.username}`;
    if (lastSeededIdentityKeyRef.current === key) return;
    lastSeededIdentityKeyRef.current = key;
    setReceivePlatform(identity.platform);
    setReceiveUsername(seedUsernameFromIdentity(identity.username));
  }, [identity, identityLoading, preview, claimTab]);

  const applyPlatformChange = (
    next: SendRecipientType,
    setPlatform: (p: SendRecipientType) => void,
    setUsername: (u: string) => void,
  ) => {
    setPlatform(next);
    setUsername(ownHandleForPlatform(next) ?? '');
  };

  const handleSendPlatformChange = (next: SendRecipientType) => {
    applyPlatformChange(next, setSendPlatform, setSendUsername);
  };

  const handleReceivePlatformChange = (next: SendRecipientType) => {
    applyPlatformChange(next, setReceivePlatform, setReceiveUsername);
  };

  const handleReceiveUsernameChange = (value: string) => {
    if (value.trim() === '' && identity && !preview && !claimTab) {
      setReceivePlatform(identity.platform);
      setReceiveUsername(seedUsernameFromIdentity(identity.username));
      return;
    }
    setReceiveUsername(value);
  };

  // Autofill own handle when display name arrives after a platform switch left the field empty.
  useEffect(() => {
    if (preview || sendUsername.trim() !== '') return;
    const handle = ownHandleForPlatform(sendPlatform);
    if (handle) setSendUsername(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to platform row display names
  }, [platforms, preview, sendPlatform, sendUsername]);

  useEffect(() => {
    if (preview || claimTab || !identity || receiveUsername.trim() !== '') return;
    const handle = ownHandleForPlatform(receivePlatform);
    if (handle) setReceiveUsername(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to platform row display names
  }, [platforms, preview, claimTab, identity, receivePlatform, receiveUsername]);

  const isSendIdentityValid = useMemo(
    () => isSocialRecipientValid(sendPlatform, sendUsername),
    [sendPlatform, sendUsername],
  );

  const isReceiveIdentityValid = useMemo(
    () => isSocialRecipientValid(receivePlatform, receiveUsername),
    [receivePlatform, receiveUsername],
  );

  return (
    <div className="space-y-6">
      <PaymentsOnboarding activeTab={activeTab} preview={preview} claimFlow={claimFlow} />
      {isInternalWalletDisabled ? (
        <p
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          Internal Wallet is unavailable on {internalWalletUnavailableNetwork}. Switch to Arc Testnet to create or use it.
        </p>
      ) : null}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
        <TabsList data-tour="payments-tabs" className="grid w-full grid-cols-2">
          <TabsTrigger data-tour="payments-send-tab" value="send">
            Send
          </TabsTrigger>
          <TabsTrigger data-tour="payments-receive-tab" value="receive">
            Receive
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="mt-4 space-y-6">
          <SendPaymentForm
            platform={sendPlatform}
            onPlatformChange={handleSendPlatformChange}
            username={sendUsername}
            onUsernameChange={setSendUsername}
            isIdentityValid={isSendIdentityValid}
            onGoToPending={() => setActiveTab('receive')}
            preview={preview}
            previewValues={previewValues}
            walletSource={walletSource}
            onWalletSourceChange={setWalletSource}
            developerWallet={developerWallet}
            hasDeveloperWallet={canUseInternalWallet}
          />
        </TabsContent>

        <TabsContent value="receive" className="mt-4 space-y-6">
          <IdentitySelector
            platform={receivePlatform}
            onPlatformChange={handleReceivePlatformChange}
            username={receiveUsername}
            onUsernameChange={handleReceiveUsernameChange}
            isConnected={false}
            readOnly={preview}
            previewSuggestionLabel={preview ? previewValues?.suggestionLabel : undefined}
            previewProfileImageUrl={preview ? previewValues?.profileImageUrl : undefined}
          />
          <PendingPayments
            platform={receivePlatform}
            username={receiveUsername}
            isActive={activeTab === 'receive'}
            isIdentityValid={isReceiveIdentityValid}
            truncateAddresses={preview}
            walletSource={walletSource}
            onWalletSourceChange={setWalletSource}
            developerWallet={developerWallet}
            hasDeveloperWallet={canUseInternalWallet}
            highlightPaymentId={claimPaymentId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
