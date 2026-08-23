type GiftCardClaimLinkPreviewProps = {
  compact?: boolean;
};

export function GiftCardClaimLinkPreview({ compact }: GiftCardClaimLinkPreviewProps) {
  return (
    <div className={`pointer-events-none select-none ${compact ? 'p-2' : 'p-4'}`}>
      <div className="rounded-2xl bg-black text-white overflow-hidden border border-white/10">
        <div className={`flex gap-3 ${compact ? 'p-3' : 'p-4'}`}>
          <div
            className={`shrink-0 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 ${
              compact ? 'h-8 w-8' : 'h-10 w-10'
            }`}
          />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className={`font-semibold truncate ${compact ? 'text-xs' : 'text-sm'}`}>Leo</div>
                <div className={`text-gray-500 truncate ${compact ? 'text-[10px]' : 'text-xs'}`}>
                  @Leonissx
                </div>
              </div>
              <div
                className={`shrink-0 rounded-full border border-white/20 px-2 py-0.5 text-gray-300 ${
                  compact ? 'text-[9px]' : 'text-[11px]'
                }`}
              >
                Boost
              </div>
            </div>

            <p className={`leading-snug ${compact ? 'text-xs' : 'text-sm'}`}>
              🎁 Receive a Sendly gift card for $20 USDC!
            </p>

            <div className="overflow-hidden rounded-xl border border-white/15 bg-[#16181c]">
              <div className={`flex gap-3 ${compact ? 'p-2.5' : 'p-3'}`}>
                <div
                  className={`shrink-0 rounded-lg bg-zinc-700/80 ${
                    compact ? 'h-10 w-10' : 'h-14 w-14'
                  }`}
                />
                <div className="min-w-0 space-y-0.5">
                  <div className={`text-gray-500 ${compact ? 'text-[9px]' : 'text-[11px]'}`}>
                    sendly.digital
                  </div>
                  <div className={`font-semibold leading-snug ${compact ? 'text-[11px]' : 'text-sm'}`}>
                    Sendly – Social Layer for Crypto Fund Control
                  </div>
                  {!compact && (
                    <div className="text-xs text-gray-400 line-clamp-2">
                      A social layer that binds a crypto wallet to a social identity.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
