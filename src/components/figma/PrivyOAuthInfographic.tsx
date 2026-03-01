interface NodeData {
  title: string;
  subtitle: string;
  description: string;
  color: string;
}

const nodes: NodeData[] = [
  {
    title: 'User',
    subtitle: 'Client',
    description: 'Authenticates via Privy',
    color: '#6366f1', // indigo
  },
  {
    title: 'Privy',
    subtitle: 'Identity Provider',
    description: 'Returns JWT with linked accounts & embedded wallet',
    color: '#8b5cf6', // violet
  },
  {
    title: 'Backend',
    subtitle: 'Validator',
    description: 'Validates JWT signature & linked-accounts schema',
    color: '#14b8a6', // teal
  },
  {
    title: 'MPC Key',
    subtitle: 'Split Storage',
    description: 'Privy infrastructure + user device (app never holds full key)',
    color: '#f59e0b', // amber
  },
  {
    title: 'OAuth Gateway',
    subtitle: 'Unified Layer',
    description: 'JWT validation, retry (3x exp backoff), structured logging',
    color: '#ec4899', // pink
  },
  {
    title: 'Provider APIs',
    subtitle: 'Social Platforms',
    description: 'Twitter, Twitch, GitHub (session-scoped tokens, minimal scopes)',
    color: '#10b981', // emerald
  },
];

function NodeCard({ data }: { data: NodeData }) {
  return (
    <div
      className="rounded-2xl px-6 py-5 shadow-md"
      style={{ backgroundColor: data.color }}
    >
      <h3 className="text-lg font-medium text-white">{data.title}</h3>
      <p className="text-xs font-mono uppercase tracking-wider text-white/80 mt-1">
        {data.subtitle}
      </p>
      <p className="mt-2 text-sm font-normal text-white/70">{data.description}</p>
    </div>
  );
}

function CurvedArrow({
  fromX,
  fromY,
  toX,
  toY,
  color,
  label,
  curveOffset = 0,
}: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  label?: string;
  curveOffset?: number;
}) {
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2 + curveOffset;
  const path = `M ${fromX} ${fromY} Q ${midX} ${midY} ${toX} ${toY}`;

  return (
    <g>
      <defs>
        <marker
          id={`arrowhead-${color.replace('#', '')}`}
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="5"
          orient="auto"
        >
          <path d="M0,0 L10,5 L0,10" fill={color} />
        </marker>
      </defs>
      <path
        d={path}
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        markerEnd={`url(#arrowhead-${color.replace('#', '')})`}
      />
      {label && (
        <text
          x={midX}
          y={midY - 8}
          fill={color}
          fontSize="11"
          fontFamily="monospace"
          textAnchor="middle"
          className="font-mono uppercase tracking-wider"
        >
          {label}
        </text>
      )}
    </g>
  );
}

function StraightArrow({
  fromX,
  fromY,
  toX,
  toY,
  color,
  label,
  horizontal = true,
}: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  label?: string;
  horizontal?: boolean;
}) {
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;

  return (
    <g>
      <defs>
        <marker
          id={`arrowhead-straight-${color.replace('#', '')}`}
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="5"
          orient="auto"
        >
          <path d="M0,0 L10,5 L0,10" fill={color} />
        </marker>
      </defs>
      <line
        x1={fromX}
        y1={fromY}
        x2={toX}
        y2={toY}
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        markerEnd={`url(#arrowhead-straight-${color.replace('#', '')})`}
      />
      {label && (
        <text
          x={horizontal ? midX : midX + 10}
          y={horizontal ? midY - 8 : midY}
          fill={color}
          fontSize="11"
          fontFamily="monospace"
          textAnchor="middle"
          className="font-mono uppercase tracking-wider"
        >
          {label}
        </text>
      )}
    </g>
  );
}

interface PrivyOAuthInfographicProps {
  compact?: boolean;
  /** When true, omit min-h-screen (e.g. for modal embedding) */
  embedded?: boolean;
}

export function PrivyOAuthInfographic({
  compact = false,
  embedded = false,
}: PrivyOAuthInfographicProps) {
  const containerClass = compact
    ? 'flex flex-col items-center justify-center px-2 py-4 rounded-xl overflow-hidden'
    : embedded
      ? 'flex w-full flex-col items-center justify-center px-8 py-12'
      : 'flex min-h-screen w-full flex-col items-center justify-center px-8 py-16';

  const contentStyle = compact
    ? {
        width: 800,
        minWidth: 800,
        transform: 'scale(0.4)',
        transformOrigin: 'center top',
      }
    : undefined;
  const titleClass = compact
    ? 'mb-3 text-base font-semibold'
    : 'mb-12 text-3xl font-semibold';

  // SVG dimensions for positioning
  const svgWidth = compact ? 800 : 900;
  const svgHeight = compact ? 380 : 600;

  // Node positions (centers)
  // Row 0 (top): MPC Key (only non-compact, centered above Privy)
  // Row 1 (middle): User -> Privy -> Backend
  // Row 2 (bottom): OAuth Gateway -> Provider APIs
  const positions = compact
    ? {
        user:      { x: 130, y: 100 },
        privy:     { x: 400, y: 100 },
        backend:   { x: 670, y: 100 },
        mpc:       { x: 400, y: 10 },
        gateway:   { x: 270, y: 280 },
        providers: { x: 530, y: 280 },
      }
    : {
        user:      { x: 150, y: 230 },
        privy:     { x: 450, y: 230 },
        backend:   { x: 750, y: 230 },
        mpc:       { x: 450, y: 60 },
        gateway:   { x: 300, y: 470 },
        providers: { x: 600, y: 470 },
      };

  return (
    <div
      className={containerClass}
      style={{
        backgroundColor: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <h1 className={titleClass} style={{ color: '#1e1b4b' }}>
        Privy + OAuth Pipeline
      </h1>

      <div
        className="flex flex-col items-center justify-start"
        style={
          compact
            ? {
                width: 320,
                height: 160,
                overflow: 'hidden',
              }
            : {
                width: '100%',
                maxWidth: 900,
              }
        }
      >
        <div className="flex flex-col items-center relative" style={contentStyle}>
          {/* SVG for arrows */}
          <svg
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="absolute"
            style={{ pointerEvents: 'none' }}
          >
            {/* Row 1: User -> Privy -> Backend */}
            <StraightArrow
              fromX={positions.user.x + 80}
              fromY={positions.user.y}
              toX={positions.privy.x - 80}
              toY={positions.privy.y}
              color="#6366f1"
              label="Authenticate"
              horizontal={true}
            />

            <StraightArrow
              fromX={positions.privy.x + 80}
              fromY={positions.privy.y}
              toX={positions.backend.x - 80}
              toY={positions.backend.y}
              color="#8b5cf6"
              label="JWT"
              horizontal={true}
            />

            {/* Row 2: Privy -> MPC (vertical, curved) */}
            {!compact && (
              <CurvedArrow
                fromX={positions.privy.x}
                fromY={positions.privy.y - 60}
                toX={positions.mpc.x}
                toY={positions.mpc.y + 60}
                color="#f59e0b"
                label="MPC Split"
                curveOffset={-20}
              />
            )}

            {/* Row 1 -> Row 3: Backend -> Gateway (vertical down, then horizontal) */}
            <CurvedArrow
              fromX={positions.backend.x}
              fromY={positions.backend.y + 60}
              toX={positions.gateway.x}
              toY={positions.gateway.y - 60}
              color="#14b8a6"
              label="Validated"
              curveOffset={compact ? 60 : 80}
            />

            {/* Row 3: Gateway -> Providers */}
            <StraightArrow
              fromX={positions.gateway.x + 80}
              fromY={positions.gateway.y}
              toX={positions.providers.x - 80}
              toY={positions.providers.y}
              color="#ec4899"
              label="OAuth Tokens"
              horizontal={true}
            />

            {/* Gateway -> Backend (feedback loop, curved) */}
            {!compact && (
              <CurvedArrow
                fromX={positions.gateway.x}
                fromY={positions.gateway.y - 30}
                toX={positions.backend.x}
                toY={positions.backend.y + 30}
                color="#ec4899"
                label="Retry & Log"
                curveOffset={-100}
              />
            )}
          </svg>

          {/* Node cards */}
          <div className="relative flex items-start" style={{ width: svgWidth, height: svgHeight }}>
            {/* User */}
            <div
              className="absolute"
              style={{
                left: positions.user.x - 80,
                top: positions.user.y - 60,
                width: 160,
              }}
            >
              <NodeCard data={nodes[0]} />
            </div>

            {/* Privy */}
            <div
              className="absolute"
              style={{
                left: positions.privy.x - 80,
                top: positions.privy.y - 60,
                width: 160,
              }}
            >
              <NodeCard data={nodes[1]} />
            </div>

            {/* MPC Key (above Privy) */}
            {!compact && (
              <div
                className="absolute"
                style={{
                  left: positions.mpc.x - 80,
                  top: positions.mpc.y - 60,
                  width: 160,
                }}
              >
                <NodeCard data={nodes[3]} />
              </div>
            )}

            {/* Backend */}
            <div
              className="absolute"
              style={{
                left: positions.backend.x - 80,
                top: positions.backend.y - 60,
                width: 160,
              }}
            >
              <NodeCard data={nodes[2]} />
            </div>

            {/* Gateway */}
            <div
              className="absolute"
              style={{
                left: positions.gateway.x - 80,
                top: positions.gateway.y - 60,
                width: 160,
              }}
            >
              <NodeCard data={nodes[4]} />
            </div>

            {/* Providers */}
            <div
              className="absolute"
              style={{
                left: positions.providers.x - 80,
                top: positions.providers.y - 60,
                width: 160,
              }}
            >
              <NodeCard data={nodes[5]} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
