import { useEffect, useMemo, useRef, useState } from 'react';
import { useChainId } from 'wagmi';

import { PendingPayments } from './PendingPayments';
import { SendPaymentForm, type SendPaymentPreviewValues } from './SendPaymentForm';
import { IdentitySelector } from './IdentitySelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { normalizeSocialUsername } from '@/lib/reclaim/identity';
import { useCircleWallet } from '@/hooks/useCircleWallet';
import { useZkOAuthIdentity } from '@/lib/zk-oauth/useZkOAuthIdentity';
import type { WalletSource } from './WalletSourceToggle';
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
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>(initialTab);

  // Send tab: always manual, never seeded from the connected identity.
  const [sendPlatform, setSendPlatform] = useState<SendRecipientType>(preview && previewValues ? previewValues.platform : 'twitter');
  const [sendUsername, setSendUsername] = useState(preview && previewValues ? previewValues.username : '');

  // Receive tab: auto-filled from the primary identity unless manually edited.
  const [receivePlatform, setReceivePlatform] = useState<SendRecipientType>(preview && previewValues ? previewValues.platform : 'twitter');
  const [receiveUsername, setReceiveUsername] = useState(preview && previewValues ? previewValues.username : '');
  const receiveEditedRef = useRef(false);

  const { identity } = useZkOAuthIdentity();
  const { developerWallet, hasDeveloperWallet } = useCircleWallet();
  const [walletSource, setWalletSource] = useState<WalletSource>('external');
  const connectedChainId = useChainId();
  const activeChainId = connectedChainId || ARC_CHAIN_ID;
  const isInternalWalletDisabled =
    activeChainId === BASE_SEPOLIA_CHAIN_ID || activeChainId === TEMPO_CHAIN_ID;
  const canUseInternalWallet = hasDeveloperWallet && !isInternalWalletDisabled;

  useEffect(() => {
    if (preview || !identity || receiveEditedRef.current) return;
    setReceivePlatform(identity.platform);
    setReceiveUsername(seedUsernameFromIdentity(identity.username));
  }, [identity, preview]);

  const handleReceivePlatformChange = (next: SendRecipientType) => {
    receiveEditedRef.current = true;
    setReceivePlatform(next);
  };

  const handleReceiveUsernameChange = (value: string) => {
    if (value.trim() === '') {
      receiveEditedRef.current = false;
      if (identity && !preview) {
        setReceivePlatform(identity.platform);
        setReceiveUsername(seedUsernameFromIdentity(identity.username));
        return;
      }
    } else {
      receiveEditedRef.current = true;
    }
    setReceiveUsername(value);
  };

  const isSendIdentityValid = useMemo(() => {
    if (sendPlatform === 'address') return /^0x[a-fA-F0-9]{40}$/.test(sendUsername.trim());
    return !!normalizeSocialUsername(sendUsername.replace(/^@/, ''));
  }, [sendPlatform, sendUsername]);

  const isReceiveIdentityValid = useMemo(() => {
    if (receivePlatform === 'address') return /^0x[a-fA-F0-9]{40}$/.test(receiveUsername.trim());
    return !!normalizeSocialUsername(receiveUsername.replace(/^@/, ''));
  }, [receivePlatform, receiveUsername]);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="send">Send</TabsTrigger>
          <TabsTrigger value="receive">Receive</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="mt-4 space-y-6">
          <SendPaymentForm
            platform={sendPlatform}
            onPlatformChange={setSendPlatform}
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
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
