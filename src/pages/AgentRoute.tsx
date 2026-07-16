import { VoicePaymentAgent } from '@/components/VoicePaymentAgent';
import { DeveloperWalletComponent } from '@/components/DeveloperWallet';
import { AgentSchedulesPanel } from '@/components/AgentSchedulesPanel';
import { Layout } from '@/pages/Layout';

export function AgentRoute() {
  return (
    <Layout>
      <div className="space-y-6">
        <DeveloperWalletComponent blockchain="ARC-TESTNET" />
        <AgentSchedulesPanel />
        <VoicePaymentAgent />
      </div>
    </Layout>
  );
}

