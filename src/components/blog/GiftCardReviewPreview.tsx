import { Gift } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type GiftCardReviewPreviewProps = {
  compact?: boolean;
};

export function GiftCardReviewPreview({ compact }: GiftCardReviewPreviewProps) {
  return (
    <div className={`pointer-events-none select-none space-y-3 ${compact ? 'p-3' : 'p-5'}`}>
      <Card className="border-0 bg-gradient-to-br from-pink-400 to-purple-500 text-white shadow-lg">
        <CardContent className={`${compact ? 'px-4 py-8' : 'px-6 py-10'} text-center`}>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Gift className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
              <span className={`${compact ? 'text-sm' : 'text-base'} font-medium`}>Gift Card</span>
            </div>
            <div className={`${compact ? 'text-3xl' : 'text-4xl'} font-bold tracking-tight`}>$100</div>
            <div className={`${compact ? 'text-xs' : 'text-sm'} opacity-90`}>USDC</div>
            <div className={`${compact ? 'text-xs' : 'text-sm'} text-white/80`}>To @sama</div>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full rounded-full" size={compact ? 'default' : 'lg'} tabIndex={-1}>
        Create a card
      </Button>
    </div>
  );
}
