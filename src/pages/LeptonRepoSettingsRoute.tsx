import { CreatorLayout } from '@/pages/CreatorLayout';
import { LeptonRepoSettingsPage } from '@/components/lepton/LeptonRepoSettingsPage';

export function LeptonRepoSettingsRoute() {
  return (
    <CreatorLayout>
      <LeptonRepoSettingsPage />
    </CreatorLayout>
  );
}
