import { CheckCircle, Clock, Wallet } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TwitterIcon } from '@/components/blog/giftCardPreviewIcons';

type GiftCardPendingClaimPreviewProps = {
  compact?: boolean;
};

const PENDING_CARDS = [
  { tokenId: '20808', amount: '179', currency: 'USDC', from: '0xe947…d438', date: '2/26/2026' },
  { tokenId: '20412', amount: '45', currency: 'USDC', from: '0x7e5f…acca', date: '2/20/2026' },
] as const;

export function GiftCardPendingClaimPreview({ compact }: GiftCardPendingClaimPreviewProps) {
  const cards = compact ? PENDING_CARDS.slice(0, 1) : PENDING_CARDS;

  return (
    <div className={`pointer-events-none select-none ${compact ? 'p-2' : 'p-4'}`}>
      <div className="space-y-2">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {['Sent (39)', 'Received (27)', 'Pending Claims (26)'].map((tab, i) => (
            <div
              key={tab}
              className={`flex-1 rounded-md text-center font-medium ${
                compact ? 'px-1 py-1 text-[8px]' : 'px-2 py-1.5 text-[11px]'
              } ${i === 2 ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              {compact && i === 2 ? 'Pending' : compact ? tab.split(' ')[0] : tab}
            </div>
          ))}
        </div>

        <div>
          <div className={`font-semibold text-gray-900 ${compact ? 'text-xs' : 'text-sm'}`}>
            Pending Gift Cards ({compact ? 1 : 26})
          </div>
          <div className={`text-gray-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>
            Gift cards sent to @leonissx
          </div>
        </div>

        <div className="space-y-2">
          {cards.map((card) => (
            <div
              key={card.tokenId}
              className={`rounded-xl border border-gray-200 bg-white ${
                compact ? 'p-2.5' : 'p-3.5'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Badge
                  variant="outline"
                  className={`bg-yellow-50 text-yellow-700 border-yellow-200 ${
                    compact ? 'text-[9px] px-1.5 py-0' : 'text-[10px]'
                  }`}
                >
                  <Clock className={`${compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} mr-0.5`} />
                  Pending
                </Badge>
                <Badge
                  variant="outline"
                  className={`bg-blue-50 text-blue-700 border-blue-200 gap-0.5 ${
                    compact ? 'text-[9px] px-1.5 py-0' : 'text-[10px]'
                  }`}
                >
                  <TwitterIcon className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                  X.com
                </Badge>
                <span className={`text-gray-400 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
                  Card #{card.tokenId}
                </span>
              </div>

              <div className={`font-bold text-gray-900 ${compact ? 'text-lg' : 'text-2xl'}`}>
                ${card.amount}{' '}
                <span className={`font-medium text-gray-500 ${compact ? 'text-xs' : 'text-sm'}`}>
                  {card.currency}
                </span>
              </div>
              <div className={`text-gray-500 mt-0.5 ${compact ? 'text-[10px]' : 'text-xs'}`}>
                From: {card.from}
              </div>
              <div className={`text-gray-400 ${compact ? 'text-[9px]' : 'text-[11px]'}`}>
                Created: {card.date}
              </div>

              <div className={`flex flex-col gap-1.5 mt-2 ${compact ? '' : 'mt-3'}`}>
                <Button
                  size="sm"
                  className={`w-full ${compact ? 'h-7 text-[10px]' : 'text-xs'}`}
                  tabIndex={-1}
                >
                  <CheckCircle className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} mr-1`} />
                  Claim with MetaMask
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={`w-full ${compact ? 'h-7 text-[10px]' : 'text-xs'}`}
                  tabIndex={-1}
                >
                  <Wallet className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} mr-1`} />
                  Use Internal Wallet
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
