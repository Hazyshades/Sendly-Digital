import { Layout } from '@/pages/Layout';
import { PaywallView } from '@/components/paywall/PaywallView';

export function PaywallRoute() {
  return (
    <Layout>
      <div className="p-6">
        <PaywallView />
      </div>
    </Layout>
  );
}
