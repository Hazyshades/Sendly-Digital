import { GatewayBalanceCard } from '@/components/gateway/GatewayBalanceCard';
import { Layout } from '@/pages/Layout';

export function GatewayRoute() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Gateway Balance</h1>
        <p className="text-gray-600 mb-6">
          One balance of USDC on all supported blockchains. Use funds instantly on any network.
        </p>
        <GatewayBalanceCard />
      </div>
    </Layout>
  );
}

