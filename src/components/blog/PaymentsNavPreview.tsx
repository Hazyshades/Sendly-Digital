type PaymentsNavPreviewProps = {
  compact?: boolean;
  activeTab?: 'send' | 'receive';
};

export function PaymentsNavPreview({
  compact,
  activeTab = 'send',
}: PaymentsNavPreviewProps) {
  const tabs = [
    { id: 'send' as const, label: 'Send' },
    { id: 'receive' as const, label: 'Receive' },
  ];

  return (
    <div className={`pointer-events-none select-none ${compact ? 'p-3' : 'p-5'}`}>
      <div className="rounded-lg bg-slate-100 p-1 grid grid-cols-2 gap-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`rounded-md text-center font-medium ${
              compact ? 'px-2 py-2 text-xs' : 'px-3 py-2.5 text-sm'
            } ${
              tab.id === activeTab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            {tab.label}
          </div>
        ))}
      </div>
      <div className={`mt-3 text-gray-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>
        zk.sendly.digital → Payments
      </div>
    </div>
  );
}

export function PaymentsSendNavPreview({ compact }: { compact?: boolean }) {
  return <PaymentsNavPreview compact={compact} activeTab="send" />;
}

export function PaymentsReceiveNavPreview({ compact }: { compact?: boolean }) {
  return <PaymentsNavPreview compact={compact} activeTab="receive" />;
}
