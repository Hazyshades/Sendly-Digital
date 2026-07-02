import { CreatorLayout } from '@/pages/CreatorLayout';
import { CreatorProfilePage } from '@/components/creator/CreatorProfilePage';

export function CreatorProfileRoute() {
  return (
    <CreatorLayout>
      <CreatorProfilePage />
    </CreatorLayout>
  );
}
