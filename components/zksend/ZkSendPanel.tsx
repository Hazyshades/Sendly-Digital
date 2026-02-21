import { useMemo, useState } from 'react';

import { PendingPayments } from './PendingPayments';
import { SendPaymentForm } from './SendPaymentForm';
import { IdentitySelector } from './IdentitySelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { normalizeSocialUsername } from '../../utils/reclaim/identity';

export type ZkSendPlatform = 'twitter' | 'twitch' | 'github' | 'telegram' | 'instagram' /* | 'tiktok' */ | 'gmail' | 'linkedin';

export function ZkSendPanel() {
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>('send');
  const [platform, setPlatform] = useState<ZkSendPlatform>('twitter');
  const [username, setUsername] = useState('');

  const normalizedUsername = useMemo(() => normalizeSocialUsername(username.replace(/^@/, '')), [username]);
  const isIdentityValid = !!normalizedUsername;

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
          />
        </TabsContent>

        <TabsContent value="receive" className="mt-4 space-y-6">
          <IdentitySelector
            platform={platform}
            onPlatformChange={setPlatform}
            username={username}
            onUsernameChange={setUsername}
            isConnected={false}
          />
          <PendingPayments
            platform={platform}
            username={username}
            isActive={activeTab === 'receive'}
            isIdentityValid={isIdentityValid}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

