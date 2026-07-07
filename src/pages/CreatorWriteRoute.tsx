import { CreatorLayout } from '@/pages/CreatorLayout';
import { CreatorWritePage } from '@/components/creator/CreatorWritePage';

export function CreatorWriteRoute() {
  return (
    <CreatorLayout>
      <CreatorWritePage />
    </CreatorLayout>
  );
}
