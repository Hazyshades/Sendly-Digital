interface CardData {
  step: number;
  title: string;
  description: string;
}

const topCards: CardData[] = [
  { step: 1, title: 'Privy consistency', description: 'linked accounts, wallet schema' },
  { step: 2, title: 'On-chain reconciliation', description: 'cards, txs, index/subgraph' },
  { step: 3, title: 'OAuth checks', description: 'provider API spot checks' },
];

const bottomCard: CardData = {
  step: 4,
  title: 'Logging & metrics',
  description: 'discrepancies, quality metrics, manual review',
};

function TopCard({ data }: { data: CardData }) {
  return (
    <div
      className="rounded-2xl px-6 py-5 shadow-md"
      style={{ backgroundColor: '#6366f1' }}
    >
      <h3 className="text-lg font-medium text-white">
        {data.step}. {data.title}
      </h3>
      <p className="mt-1 text-sm font-normal text-white/70">{data.description}</p>
    </div>
  );
}

function BottomCard({ data }: { data: CardData }) {
  return (
    <div
      className="rounded-2xl px-6 py-5 shadow-md"
      style={{ backgroundColor: '#e0e7ff' }}
    >
      <h3 className="text-lg font-medium" style={{ color: '#312e81' }}>
        {data.step}. {data.title}
      </h3>
      <p className="mt-1 text-sm font-normal" style={{ color: '#312e81', opacity: 0.7 }}>
        {data.description}
      </p>
    </div>
  );
}

function HorizontalArrow() {
  return (
    <svg width="40" height="24" viewBox="0 0 40 24" fill="none" className="flex-shrink-0">
      <path d="M0 12H32" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M28 6L34 12L28 18"
        stroke="#6366f1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function VerticalArrow() {
  return (
    <svg width="24" height="50" viewBox="0 0 24 50" fill="none">
      <path d="M12 0V42" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M6 38L12 44L18 38"
        stroke="#6366f1"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

interface VerificationInfographicProps {
  compact?: boolean;
  /** When true, omit min-h-screen (e.g. for modal embedding) */
  embedded?: boolean;
}

export function VerificationInfographic({
  compact = false,
  embedded = false,
}: VerificationInfographicProps) {
  const containerClass = compact
    ? 'flex flex-col items-center justify-center px-2 py-4 rounded-xl overflow-hidden'
    : embedded
      ? 'flex w-full flex-col items-center justify-center px-8 py-12'
      : 'flex min-h-screen w-full flex-col items-center justify-center px-8 py-16';

  const contentStyle = compact
    ? {
        width: 720,
        minWidth: 720,
        transform: 'scale(0.39)',
        transformOrigin: 'center top',
      }
    : undefined;
  const titleClass = compact
    ? 'mb-3 text-base font-semibold'
    : 'mb-12 text-3xl font-semibold';

  return (
    <div
      className={containerClass}
      style={{
        backgroundColor: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <h1 className={titleClass} style={{ color: '#1e1b4b' }}>
        Verification methodology
      </h1>

      <div
        className="flex flex-col items-center justify-start"
        style={
          compact
            ? {
                width: 280,
                height: 115,
                overflow: 'hidden',
              }
            : undefined
        }
      >
        <div className="flex flex-col items-center" style={contentStyle}>
          <div className="flex items-center gap-4">
            <div className="w-[200px] flex-shrink-0">
              <TopCard data={topCards[0]} />
            </div>
            <HorizontalArrow />
            <div className="w-[200px] flex-shrink-0">
              <TopCard data={topCards[1]} />
            </div>
            <HorizontalArrow />
            <div className="w-[200px] flex-shrink-0">
              <TopCard data={topCards[2]} />
            </div>
          </div>

          {!compact && (
            <>
              <div className="my-2">
                <VerticalArrow />
              </div>

              <div className="w-[420px] flex-shrink-0">
                <BottomCard data={bottomCard} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
