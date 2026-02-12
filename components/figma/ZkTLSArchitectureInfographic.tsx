
interface NodeData {
  title: string;
  subtitle: string;
  description: string;
}

const nodes: NodeData[] = [
  {
    title: 'User Device',
    subtitle: 'Prover',
    description: 'Initiates request & holds private data',
  },
  {
    title: 'Attestor',
    subtitle: 'Opaque Proxy',
    description: 'Verifies TLS session without seeing data',
  },
  {
    title: 'Social Platform',
    subtitle: 'Data Source',
    description: 'Twitter / GitHub / Twitch',
  },
  {
    title: 'Smart Contract',
    subtitle: 'Verifier',
    description: 'Verifies signature & executes logic',
  },
  {
    title: 'Blockchain',
    subtitle: 'Settlement',
    description: 'Final state & fund transfer',
  },
];

function NodeCard({ data, index }: { data: NodeData; index: number }) {
  const isAttestor = index === 1;
  const isContract = index === 3;
  const isBlockchain = index === 4;

  // Attestor gets special styling (teal/cyan)
  if (isAttestor) {
    return (
      <div
        className="rounded-2xl px-6 py-5 shadow-md"
        style={{ backgroundColor: '#14b8a6' }}
      >
        <h3 className="text-lg font-medium text-white">{data.title}</h3>
        <p className="text-xs font-mono uppercase tracking-wider text-white/80 mt-1">
          {data.subtitle}
        </p>
        <p className="mt-2 text-sm font-normal text-white/70">{data.description}</p>
      </div>
    );
  }

  // Smart Contract and Blockchain get violet/amber
  if (isContract) {
    return (
      <div
        className="rounded-2xl px-6 py-5 shadow-md"
        style={{ backgroundColor: '#8b5cf6' }}
      >
        <h3 className="text-lg font-medium text-white">{data.title}</h3>
        <p className="text-xs font-mono uppercase tracking-wider text-white/80 mt-1">
          {data.subtitle}
        </p>
        <p className="mt-2 text-sm font-normal text-white/70">{data.description}</p>
      </div>
    );
  }

  if (isBlockchain) {
    return (
      <div
        className="rounded-2xl px-6 py-5 shadow-md"
        style={{ backgroundColor: '#f59e0b' }}
      >
        <h3 className="text-lg font-medium text-white">{data.title}</h3>
        <p className="text-xs font-mono uppercase tracking-wider text-white/80 mt-1">
          {data.subtitle}
        </p>
        <p className="mt-2 text-sm font-normal text-white/70">{data.description}</p>
      </div>
    );
  }

  // User Device and Social Platform get standard indigo
  return (
    <div
      className="rounded-2xl px-6 py-5 shadow-md"
      style={{ backgroundColor: '#6366f1' }}
    >
      <h3 className="text-lg font-medium text-white">{data.title}</h3>
      <p className="text-xs font-mono uppercase tracking-wider text-white/80 mt-1">
        {data.subtitle}
      </p>
      <p className="mt-2 text-sm font-normal text-white/70">{data.description}</p>
    </div>
  );
}

function ConnectionLine({ label, color }: { label: string; color: string }) {
  const colorMap: Record<string, string> = {
    cyan: '#22d3ee',
    teal: '#14b8a6',
    violet: '#8b5cf6',
    amber: '#f59e0b',
  };
  const strokeColor = colorMap[color] || '#6366f1';

  return (
    <div className="flex flex-col items-center justify-center gap-1" style={{ height: '100%' }}>
      <svg width="60" height="24" viewBox="0 0 60 24" fill="none" style={{ display: 'block', flexShrink: 0 }}>
        <path d="M0 12H50" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" />
        <path
          d="M46 6L52 12L46 18"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <span
        className="text-xs font-mono uppercase tracking-wider whitespace-nowrap text-center"
        style={{ color: strokeColor }}
      >
        {label}
      </span>
    </div>
  );
}

interface ZkTLSArchitectureInfographicProps {
  compact?: boolean;
  /** When true, omit min-h-screen (e.g. for modal embedding) */
  embedded?: boolean;
}

export function ZkTLSArchitectureInfographic({
  compact = false,
  embedded = false,
}: ZkTLSArchitectureInfographicProps) {
  const containerClass = compact
    ? 'flex flex-col items-center justify-center px-2 py-4 rounded-xl overflow-hidden'
    : embedded
      ? 'flex w-full flex-col items-center justify-center px-8 py-12'
      : 'flex min-h-screen w-full flex-col items-center justify-center px-8 py-16';

  const contentStyle = compact
    ? {
        width: 900,
        minWidth: 900,
        transform: 'scale(0.32)',
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
        zkTLS Architecture Overview
      </h1>

      <div
        className="flex flex-col items-center justify-start"
        style={
          compact
            ? {
                width: 288,
                height: 200,
                overflow: 'hidden',
              }
            : undefined
        }
      >
        <div className="flex items-start gap-3" style={contentStyle}>
          {/* Left: Single User Device centered vertically */}
          <div className="flex flex-col items-center justify-center relative" style={{ minHeight: '320px', width: '160px' }}>
            <div className="w-[160px] flex-shrink-0">
              <NodeCard data={nodes[0]} index={0} />
            </div>
          </div>

          {/* Right: Two rows */}
          <div className="flex flex-col gap-1 flex-1">
            {/* Top row: User -> Attestor -> Social Platform */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center justify-center" style={{ minWidth: '80px', height: '100%' }}>
                <ConnectionLine label="TLS Channel" color="cyan" />
              </div>
              <div className="w-[160px] flex-shrink-0">
                <NodeCard data={nodes[1]} index={1} />
              </div>
              <div className="flex flex-col items-center justify-center" style={{ minWidth: '80px', height: '100%' }}>
                <ConnectionLine label="TLS Proxy" color="cyan" />
              </div>
              <div className="w-[160px] flex-shrink-0">
                <NodeCard data={nodes[2]} index={2} />
              </div>
            </div>

            {/* Connection: Attestor -> User (Signed Claim) - smooth symmetric arc */}
            <div className="flex items-center gap-3 relative" style={{ height: '70px' }}>
              <div className="flex flex-col items-center justify-center" style={{ minWidth: '80px', height: '100%' }} />
              <div className="flex flex-col items-center justify-center relative" style={{ width: '160px', height: '100%' }}>
                <svg width="180" height="70" viewBox="0 0 180 140" fill="none" preserveAspectRatio="xMidYMid meet" className="absolute" style={{ left: '-100px', top: 0 }}>
                  <defs>
                    <marker
                      id="arrowhead-teal"
                      markerWidth="10"
                      markerHeight="10"
                      refX="8"
                      refY="5"
                      orient="auto"
                    >
                      <path d="M0,0 L10,5 L0,10" fill="#14b8a6" />
                    </marker>
                  </defs>
                  {/* Smooth symmetric arc from Attestor (center-right, top) to User (left, bottom) */}
                  <path
                    d="M190 30 Q 100 100, 10 100"
                    stroke="#14b8a6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    fill="none"
                    markerEnd="url(#arrowhead-teal)"
                  />
                </svg>
                <span
                  className="text-xs font-mono uppercase tracking-wider absolute z-10 bg-[#FAFAFA] px-2"
                  style={{ color: '#14b8a6', top: '25px', left: '45%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}
                >
                  Signed Claim
                </span>
              </div>
              <div className="w-[160px]" />
              <div className="flex flex-col items-center justify-center" style={{ minWidth: '80px', height: '100%' }} />
            </div>

            {/* Bottom row: User -> Smart Contract -> Blockchain */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center justify-center" style={{ minWidth: '80px', height: '100%' }}>
                <ConnectionLine label="zkTLS Proof" color="violet" />
              </div>
              <div className="w-[160px] flex-shrink-0">
                <NodeCard data={nodes[3]} index={3} />
              </div>
              <div className="flex flex-col items-center justify-center" style={{ minWidth: '80px', height: '100%' }}>
                <ConnectionLine label="Release Funds" color="amber" />
              </div>
              <div className="w-[160px] flex-shrink-0">
                <NodeCard data={nodes[4]} index={4} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
