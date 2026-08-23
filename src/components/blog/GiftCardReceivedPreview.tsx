import { CheckCircle, Gift } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

type GiftCardReceivedPreviewProps = {
  compact?: boolean;
};

const RECEIVED_CARDS = [
  { tokenId: '33452', amount: '19', currency: 'USDC', from: '0x7e5f…acca', date: '7/4/2026' },
  { tokenId: '10438', amount: '3', currency: 'EURC', from: '0xe947…d438', date: '1/13/2026' },
] as const;

const NAV = ['Dashboard', 'Create', 'My Cards', 'Spend'] as const;

export function GiftCardReceivedPreview({ compact }: GiftCardReceivedPreviewProps) {
  const cards = compact ? RECEIVED_CARDS.slice(0, 1) : RECEIVED_CARDS;

  return (
    <div className={`pointer-events-none select-none ${compact ? 'p-2' : 'p-4'}`}>
      <div className="space-y-2">
        {!compact && (
          <div className="flex gap-1.5 mb-1">
            {NAV.map((item) => (
              <div
                key={item}
                className={`flex-1 rounded-2xl text-center text-[10px] font-medium px-1.5 py-1.5 ${
                  item === 'My Cards'
                    ? 'bg-white text-blue-600 shadow-sm ring-1 ring-blue-100'
                    : 'bg-white/70 text-gray-600'
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        )}

        <div className={`font-semibold text-gray-900 ${compact ? 'text-xs' : 'text-sm'}`}>
          My gift cards
        </div>

        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {['Sent (17)', 'Received (21)'].map((tab, i) => (
            <div
              key={tab}
              className={`flex-1 rounded-md text-center font-medium ${
                compact ? 'px-1 py-1 text-[9px]' : 'px-2 py-1.5 text-[11px]'
              } ${i === 1 ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              {tab}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {cards.map((card) => (
            <div
              key={card.tokenId}
              className={`rounded-xl border border-gray-200 bg-white ${
                compact ? 'p-2.5' : 'p-3'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`shrink-0 rounded-lg bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center ${
                      compact ? 'h-8 w-8' : 'h-10 w-10'
                    }`}
                  >
                    <Gift className={`text-white ${compact ? 'h-4 w-4' : 'h-5 w-5'}`} />
                  </div>
                  <div className="min-w-0">
                    <div className={`font-semibold text-gray-900 ${compact ? 'text-xs' : 'text-sm'}`}>
                      ${card.amount} {card.currency}
                    </div>
                    <div className={`text-gray-500 truncate ${compact ? 'text-[10px]' : 'text-xs'}`}>
                      From: {card.from}
                    </div>
                    <div className={`text-gray-400 ${compact ? 'text-[9px]' : 'text-[11px]'}`}>
                      Token ID: {card.tokenId}
                    </div>
                  </div>
                </div>
                <Badge
                  className={`shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200 ${
                    compact ? 'text-[9px] px-1.5 py-0' : 'text-[10px]'
                  }`}
                >
                  <CheckCircle className={`${compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} mr-0.5`} />
                  active
                </Badge>
              </div>
              <div className={`mt-2 text-gray-400 ${compact ? 'text-[9px]' : 'text-[11px]'}`}>
                Received: {card.date}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
