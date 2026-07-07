import { CreatorLayout } from '@/pages/CreatorLayout';
import { PaywallView } from '@/components/paywall/PaywallView';

export function PaywallRoute() {
  return (
    <CreatorLayout>
      <PaywallView />
    </CreatorLayout>
  );
}
