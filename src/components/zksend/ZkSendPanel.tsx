import { useMemo, useState } from 'react';
import { useChainId } from 'wagmi';

import { PendingPayments } from './PendingPayments';
import { SendPaymentForm, type SendPaymentPreviewValues } from './SendPaymentForm';
import { IdentitySelector } from './IdentitySelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { normalizeSocialUsername } from '@/lib/reclaim/identity';
import { useCircleWallet } from '@/hooks/useCircleWallet';
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

export function ZkSendPanel({ initialTab = 'send', preview = false, previewValues }: ZkSendPanelProps = {}) {
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>(initialTab);
  const [platform, setPlatform] = useState<SendRecipientType>(preview && previewValues ? previewValues.platform : 'twitter');
  const [username, setUsername] = useState(preview && previewValues ? previewValues.username : '');

  const { developerWallet, hasDeveloperWallet } = useCircleWallet();
  const [walletSource, setWalletSource] = useState<WalletSource>('external');
  const connectedChainId = useChainId();
  const activeChainId = connectedChainId || ARC_CHAIN_ID;
  const isInternalWalletDisabled =
    activeChainId === BASE_SEPOLIA_CHAIN_ID || activeChainId === TEMPO_CHAIN_ID;
  const canUseInternalWallet = hasDeveloperWallet && !isInternalWalletDisabled;

  const normalizedUsername = useMemo(() => normalizeSocialUsername(username.replace(/^@/, '')), [username]);
  const isIdentityValid = platform === 'address' ? /^0x[a-fA-F0-9]{40}$/.test(username.trim()) : !!normalizedUsername;

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="send">Send</TabsTrigger>
          <TabsTrigger value="receive">Receive</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="mt-4 space-y-6">
          <SendPaymentForm
            platform={platform}
            onPlatformChange={setPlatform}
            username={username}
            onUsernameChange={setUsername}
            isIdentityValid={isIdentityValid}
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
            platform={platform}
            onPlatformChange={(p) => setPlatform(p)}
            username={username}
            onUsernameChange={setUsername}
            isConnected={false}
            readOnly={preview}
            previewSuggestionLabel={preview ? previewValues?.suggestionLabel : undefined}
            previewProfileImageUrl={preview ? previewValues?.profileImageUrl : undefined}
          />
          <PendingPayments
            platform={platform}
            username={username}
            isActive={activeTab === 'receive'}
            isIdentityValid={isIdentityValid}
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

