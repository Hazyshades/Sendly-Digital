import { Layout } from '@/pages/Layout';
import { CreatePaywallForm } from '@/components/paywall/CreatePaywallForm';

export function CreatePaywallRoute() {
  return (
    <Layout>
      <div className="p-6">
        <CreatePaywallForm />
      </div>
    </Layout>
  );
}
