type GiftCardNavPreviewProps = {
  compact?: boolean;
};

const NAV_ITEMS = [
  { label: 'Dashboard', active: false },
  { label: 'Create', active: true },
  { label: 'Cards', active: false },
  { label: 'Spend', active: false },
] as const;

export function GiftCardNavPreview({ compact }: GiftCardNavPreviewProps) {
  return (
    <div className={`pointer-events-none select-none ${compact ? 'p-3' : 'p-5'}`}>
      <div className="flex gap-2">
        {NAV_ITEMS.map((item) => (
          <div
            key={item.label}
            className={`flex-1 rounded-2xl text-center font-medium shadow-circle-card transition-colors ${
              compact ? 'px-2 py-2 text-[11px]' : 'px-3 py-2.5 text-sm'
            } ${
              item.active
                ? 'bg-white text-blue-600'
                : 'bg-white/70 text-gray-700 backdrop-blur-sm'
            }`}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
