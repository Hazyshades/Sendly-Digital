import { CreatorLayout } from '@/pages/CreatorLayout';
import { LeptonCitationPage } from '@/components/lepton/LeptonCitationPage';

export function LeptonCitationRoute() {
  return (
    <CreatorLayout>
      <LeptonCitationPage />
    </CreatorLayout>
  );
}
