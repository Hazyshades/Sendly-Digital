import { CreatorLayout } from '@/pages/CreatorLayout';
import { MyCreatorPage } from '@/components/creator/MyCreatorPage';

export function CreatorHomeRoute() {
  return (
    <CreatorLayout>
      <MyCreatorPage />
    </CreatorLayout>
  );
}
