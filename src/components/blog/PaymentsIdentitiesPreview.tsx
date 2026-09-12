import { Button } from '@/components/ui/button';
import {
  TelegramIcon,
  TwitchIcon,
} from '@/components/blog/giftCardPreviewIcons';

type PaymentsIdentitiesPreviewProps = {
  compact?: boolean;
  /** Twitter/Supabase avatar URL — same source as Send tab preview. */
  profileImageUrl?: string | null;
};

const AVAILABLE = [
  { id: 'twitch', label: 'Twitch', hint: 'Receive by username', icon: TwitchIcon, color: 'text-purple-600' },
  { id: 'github', label: 'GitHub', hint: 'Receive by username', icon: null, color: 'text-gray-900' },
  { id: 'telegram', label: 'Telegram', hint: 'Receive by username', icon: TelegramIcon, color: 'text-sky-500' },
  { id: 'gmail', label: 'Gmail', hint: 'Receive by email', icon: null, color: 'text-red-500' },
  { id: 'linkedin', label: 'LinkedIn', hint: 'Professional identity', icon: null, color: 'text-blue-700' },
] as const;

/** Static preview of the Payment identities panel on /payments. */
export function PaymentsIdentitiesPreview({
  compact,
  profileImageUrl,
}: PaymentsIdentitiesPreviewProps) {
  const available = compact ? AVAILABLE.slice(0, 3) : AVAILABLE;
  const avatarSrc = profileImageUrl || '/circle-avatar.svg';

  return (
    <div className={`pointer-events-none select-none ${compact ? 'p-2' : 'p-3'}`}>
      <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
        <div className={`border-b border-gray-200/60 ${compact ? 'px-3 py-2' : 'px-3.5 py-2.5'}`}>
          <div className={`font-semibold text-gray-900 ${compact ? 'text-xs' : 'text-sm'}`}>
            Payment identities
          </div>
          <div className={`text-gray-600 leading-relaxed ${compact ? 'text-[10px]' : 'text-xs'}`}>
            Link accounts to receive USDC by username or email.
          </div>
        </div>

        <div className={`space-y-2 ${compact ? 'p-2' : 'p-2.5'}`}>
          <div className={`uppercase tracking-wide text-gray-400 font-semibold ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
            Connected identities
          </div>
          <div
            className={`flex items-center gap-2 rounded-xl border border-gray-200 bg-white ${
              compact ? 'p-2' : 'p-2.5'
            }`}
          >
            <img
              src={avatarSrc}
              alt=""
              className={`shrink-0 rounded-full object-cover bg-gray-100 ${compact ? 'h-7 w-7' : 'h-8 w-8'}`}
            />
            <div className="min-w-0 flex-1">
              <div className={`font-medium text-gray-900 ${compact ? 'text-[11px]' : 'text-xs'}`}>
                Twitter
              </div>
              <div className={`text-gray-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>@circle</div>
            </div>
            <span
              className={`rounded-md bg-blue-50 text-blue-700 font-semibold uppercase ${
                compact ? 'px-1.5 py-0.5 text-[8px]' : 'px-1.5 py-0.5 text-[9px]'
              }`}
            >
              Primary
            </span>
            <span className={`inline-flex items-center gap-1 text-emerald-600 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Connected
            </span>
          </div>

          <div className={`uppercase tracking-wide text-gray-400 font-semibold ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
            Available to connect
          </div>
          <div className="space-y-0.5">
            {available.map((row) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.id}
                  className={`flex items-center gap-2 rounded-lg ${compact ? 'px-1.5 py-1.5' : 'px-2 py-2'}`}
                >
                  <div className={`flex items-center justify-center rounded-full bg-gray-100 ${compact ? 'h-6 w-6' : 'h-7 w-7'} ${row.color}`}>
                    {Icon ? (
                      <Icon className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
                    ) : (
                      <span className={`font-bold ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
                        {row.label.slice(0, 1)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`font-medium text-gray-900 ${compact ? 'text-[11px]' : 'text-xs'}`}>
                      {row.label}
                    </div>
                    <div className={`text-gray-500 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>{row.hint}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    tabIndex={-1}
                    className={`rounded-full ${compact ? 'h-6 px-2 text-[9px]' : 'h-7 px-2.5 text-[10px]'}`}
                  >
                    Connect
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
