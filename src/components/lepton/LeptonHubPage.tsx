import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  CreditCard,
  Eye,
  Film,
  GitPullRequest,
  PenLine,
  Plug,
  Receipt,
  Rocket,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  Tag,
  Target,
  Radio,
  Tv,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { LeptonCatalogView } from '@/components/lepton/LeptonCatalogView';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fetchCitationSources } from '@/lib/paywall/citationAPI';
import {
  fetchPrPayoutPolicies,
  fetchPrPayoutReceipts,
  formatUsdcAmount,
  type PayoutKind,
  type PrPayoutPolicy,
  type PrPayoutReceipt,
} from '@/lib/paywall/prPayoutAPI';
import {
  fetchTwitchPayoutPolicies,
  fetchTwitchPayoutReceipts,
  type TwitchPayoutReceipt,
  type TwitchRaidPolicy,
} from '@/lib/paywall/twitchPayoutAPI';

const DEMO_ARTICLE_PATH = '/pay/leonissx/lepton-agents-hackathon';

type PayoutKindCardConfig = {
  kind: PayoutKind;
  title: string;
  icon: LucideIcon;
  defaultRule: string;
};

type TwitchPayoutKind =
  | 'raid'
  | 'session'
  | 'modpay'
  | 'mission'
  | 'clip'
  | 'split'
  | 'cheer_match';

type TwitchPayoutKindCardConfig = {
  kind: TwitchPayoutKind;
  title: string;
  icon: LucideIcon;
  defaultRule: string;
  soon?: boolean;
};

const TWITCH_PAYOUT_KIND_CARDS: TwitchPayoutKindCardConfig[] = [
  {
    kind: 'raid',
    title: 'Raid-to-Pay',
    icon: Users,
    defaultRule: 'Pay raiding streamers: min(viewers) × rate USDC, capped per event',
  },
  {
    kind: 'session',
    title: 'Stream Sponsorship',
    icon: Tv,
    defaultRule: 'Sponsor pays per verified live minute, cap per stream session',
    soon: true,
  },
  {
    kind: 'modpay',
    title: 'ModPay',
    icon: ShieldCheck,
    defaultRule: 'Fixed USDC per mod shift - not per ban or timeout',
    soon: true,
  },
  {
    kind: 'mission',
    title: 'Channel Points Missions',
    icon: Target,
    defaultRule: 'Channel Points redemption triggers a task → payout on completion',
    soon: true,
  },
  {
    kind: 'clip',
    title: 'Clip Bounties',
    icon: Film,
    defaultRule: 'Streamer approves best clip → USDC to clipper',
    soon: true,
  },
  {
    kind: 'split',
    title: 'Co-stream Split',
    icon: Share2,
    defaultRule: 'Auto split host / guest / mod after collaboration stream',
    soon: true,
  },
  {
    kind: 'cheer_match',
    title: 'Cheer Matching',
    icon: Sparkles,
    defaultRule: 'Sponsor matches Bits with USDC - additive, not replacing Twitch',
    soon: true,
  },
];

const PAYOUT_KIND_CARDS: PayoutKindCardConfig[] = [
  {
    kind: 'merge',
    title: 'Merge PR',
    icon: GitPullRequest,
    defaultRule: 'Flat USDC per merged pull request',
  },
  {
    kind: 'bounty',
    title: 'Issue Bounty',
    icon: Tag,
    defaultRule: 'Label issue bounty:<amount> on GitHub',
  },
  {
    kind: 'release',
    title: 'Release Dividend',
    icon: Rocket,
    defaultRule: 'Pool split among release contributors',
  },
  {
    kind: 'review',
    title: 'Review to Earn',
    icon: Eye,
    defaultRule: 'USDC when a reviewed PR merges',
  },
];

function ruleForKind(policy: PrPayoutPolicy | null, kind: PayoutKind): string {
  if (!policy) {
    return PAYOUT_KIND_CARDS.find((c) => c.kind === kind)?.defaultRule ?? '';
  }
  switch (kind) {
    case 'merge':
      return `${formatUsdcAmount(policy.perPrAmountUsdc)} per merged PR`;
    case 'bounty':
      return policy.bountyEnabled === false ? 'Disabled' : 'bounty:<amount> label on issue';
    case 'release':
      return policy.releasePoolUsdc
        ? `${formatUsdcAmount(policy.releasePoolUsdc)} release pool`
        : 'Release pool (see repo settings)';
    case 'review':
      return policy.reviewAmountUsdc
        ? `${formatUsdcAmount(policy.reviewAmountUsdc)} per reviewer`
        : 'Per meaningful review on merge';
    default:
      return '';
  }
}

function ruleForTwitchKind(policy: TwitchRaidPolicy | null, kind: TwitchPayoutKind): string {
  const fallback =
    TWITCH_PAYOUT_KIND_CARDS.find((c) => c.kind === kind)?.defaultRule ?? '';
  if (kind !== 'raid' || !policy) return fallback;
  return `≥${policy.minViewers} viewers · ${formatUsdcAmount(policy.ratePerViewerUsdc)}/viewer · cap ${formatUsdcAmount(policy.maxPerEventUsdc)}/event`;
}

function countPaidTwitchRaids(receipts: TwitchPayoutReceipt[]): number {
  return receipts.filter((r) => r.status === 'paid').length;
}

function countPaidByKind(receipts: PrPayoutReceipt[]): Record<PayoutKind, number> {
  const counts: Record<PayoutKind, number> = {
    merge: 0,
    bounty: 0,
    release: 0,
    review: 0,
  };
  for (const r of receipts) {
    if (r.status !== 'paid' || !r.kind) continue;
    if (r.kind in counts) counts[r.kind as PayoutKind]++;
  }
  return counts;
}

const PAYOUT_KIND_VARIANT = {
  github: {
    cardHover: 'hover:border-indigo-200',
    iconBox: 'bg-indigo-50 text-indigo-600',
    linkText: 'text-indigo-600',
  },
  twitch: {
    cardHover: 'hover:border-violet-200',
    iconBox: 'bg-violet-50 text-violet-600',
    linkText: 'text-violet-600',
  },
} as const;

function PayoutKindCard({
  title,
  icon: Icon,
  rule,
  paidCount = 0,
  variant,
  soon = false,
  linkTo,
  style,
}: {
  title: string;
  icon: LucideIcon;
  rule: string;
  paidCount?: number;
  variant: keyof typeof PAYOUT_KIND_VARIANT;
  soon?: boolean;
  linkTo?: string;
  style?: React.CSSProperties;
}) {
  const colors = PAYOUT_KIND_VARIANT[variant];
  const cardClass = [
    'lepton-reveal group flex flex-col justify-between rounded-2xl border bg-card p-4 shadow-circle-card transition duration-200 [transition-timing-function:var(--ease-out)] hover:shadow-md motion-safe:hover:-translate-y-0.5',
    soon ? 'opacity-75' : 'active:scale-[0.99]',
    colors.cardHover,
  ].join(' ');

  const inner = (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div
            className={`flex size-9 items-center justify-center rounded-xl ${colors.iconBox}`}
          >
            <Icon className="size-4" />
          </div>
          {soon ? (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              Soon
            </Badge>
          ) : (
            paidCount > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {paidCount} paid
              </Badge>
            )
          )}
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">{rule}</p>
        </div>
      </div>
      {!soon && linkTo && (
        <div
          className={`mt-4 inline-flex items-center gap-1 text-xs font-medium ${colors.linkText}`}
        >
          View receipts
          <ArrowRight className="size-3 transition-transform duration-200 [transition-timing-function:var(--ease-out)] group-hover:translate-x-0.5" />
        </div>
      )}
    </>
  );

  if (soon || !linkTo) {
    return (
      <div style={style} className={cardClass}>
        {inner}
      </div>
    );
  }

  return (
    <Link to={linkTo} style={style} className={cardClass}>
      {inner}
    </Link>
  );
}

type ModuleActor = 'human' | 'agent' | 'maintainer';

const ACTOR_META: Record<ModuleActor, { label: string; dot: string }> = {
  human: { label: 'Human', dot: 'bg-emerald-500' },
  agent: { label: 'Agent', dot: 'bg-indigo-500' },
  maintainer: { label: 'Maintainer', dot: 'bg-violet-500' },
};

type SecondaryModule = {
  id: string;
  title: string;
  description: string;
  actor: ModuleActor;
  icon: LucideIcon;
  to?: string;
  footnote?: { label: string; to: string };
  links?: Array<{ label: string; href: string }>;
  catalogAction?: boolean;
  badgeLoader?: () => Promise<string | null>;
};

const SETTINGS_MODULES: SecondaryModule[] = [
  {
    id: 'repo-settings',
    title: 'Repo Settings',
    description:
      'All payout rules for a repo - merge PR, issue bounties, release pool, review rewards.',
    actor: 'maintainer',
    icon: Settings,
    to: '/agent/repo-settings',
  },
  {
    id: 'agent-api',
    title: 'Agent API',
    description: 'Machine-readable catalog: llms.txt, OpenAPI, webhooks, settlement.',
    actor: 'agent',
    icon: Plug,
    catalogAction: true,
    links: [
      { label: 'llm.txt', href: '/llm.txt' },
      { label: 'OpenAPI', href: '/openapi.json' },
    ],
  },
];

const PAYWALL_MODULES: SecondaryModule[] = [
  {
    id: 'creator',
    title: 'Creator Studio',
    description: 'Write paid articles and manage your creator storefront.',
    actor: 'human',
    icon: PenLine,
    to: '/creator',
  },
  {
    id: 'human-paywall',
    title: 'Paywall',
    description: 'A reader pays the creator for the content.',
    actor: 'human',
    icon: CreditCard,
    to: '/creator',
    footnote: { label: 'Open demo article', to: DEMO_ARTICLE_PATH },
  },
  {
    id: 'citation',
    title: 'Citation Agent',
    description: 'An AI agent pays for paywall slugs, then returns a cited answer - real Arc txs.',
    actor: 'agent',
    icon: Bot,
    to: '/agent/citation',
    badgeLoader: async () => {
      const sources = await fetchCitationSources();
      return sources.length > 0 ? `${sources.length} sources` : null;
    },
  },
];

const ALL_SECONDARY_MODULES = [...SETTINGS_MODULES, ...PAYWALL_MODULES];

function ActorTag({ actor }: { actor: ModuleActor }) {
  const meta = ACTOR_META[actor];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`size-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function SecondaryRow({
  module,
  statusBadge,
  onCatalogOpen,
  style,
}: {
  module: SecondaryModule;
  statusBadge: string | null;
  onCatalogOpen: () => void;
  style?: React.CSSProperties;
}) {
  const Icon = module.icon;

  const inner = (
    <div className="flex items-center gap-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[15px] font-semibold text-foreground">{module.title}</h3>
          {statusBadge && (
            <Badge variant="secondary" className="text-[10px]">
              {statusBadge}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{module.description}</p>
      </div>
      <div className="hidden shrink-0 sm:block">
        <ActorTag actor={module.actor} />
      </div>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 [transition-timing-function:var(--ease-out)] group-hover:translate-x-0.5 group-hover:text-foreground" />
    </div>
  );

  const cardClass =
    'lepton-reveal group block rounded-2xl border bg-card p-4 text-left shadow-circle-card transition duration-200 [transition-timing-function:var(--ease-out)] hover:border-indigo-200 hover:shadow-md motion-safe:hover:-translate-y-0.5 active:scale-[0.99]';

  return (
    <div style={style} className="space-y-1.5">
      {module.catalogAction ? (
        <button type="button" onClick={onCatalogOpen} className={`${cardClass} w-full`}>
          {inner}
        </button>
      ) : (
        <Link to={module.to ?? '#'} className={cardClass}>
          {inner}
        </Link>
      )}
      {module.footnote && (
        <p className="pl-14 text-xs text-muted-foreground">
          <Link
            to={module.footnote.to}
            className="font-medium text-indigo-600 underline-offset-2 hover:underline"
          >
            {module.footnote.label}
          </Link>{' '}
          <code className="text-[11px] text-muted-foreground">
            leonissx/lepton-agents-hackathon
          </code>
        </p>
      )}
      {module.links && module.links.length > 0 && (
        <p className="pl-14 text-xs text-muted-foreground">
          {module.links.map((link, i) => (
            <span key={link.label}>
              {i > 0 && <span className="mx-1.5 text-muted-foreground/50">·</span>}
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-indigo-600 underline-offset-2 hover:underline"
              >
                {link.label}
              </a>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

export function LeptonHubPage() {
  const [badges, setBadges] = useState<Record<string, string | null>>({});
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [receiptsBadge, setReceiptsBadge] = useState<string | null>(null);
  const [twitchReceiptsBadge, setTwitchReceiptsBadge] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<PrPayoutReceipt[]>([]);
  const [twitchReceipts, setTwitchReceipts] = useState<TwitchPayoutReceipt[]>([]);
  const [policy, setPolicy] = useState<PrPayoutPolicy | null>(null);
  const [twitchRaidPolicy, setTwitchRaidPolicy] = useState<TwitchRaidPolicy | null>(null);

  const paidByKind = countPaidByKind(receipts);
  const paidTwitchRaids = countPaidTwitchRaids(twitchReceipts);

  useEffect(() => {
    void fetchPrPayoutReceipts()
      .then((rows) => {
        setReceipts(rows);
        const paid = rows.filter((r) => r.status === 'paid').length;
        const label = paid > 0 ? `${paid} paid` : rows.length > 0 ? `${rows.length} events` : null;
        if (label) setReceiptsBadge(label);
      })
      .catch(() => {
        /* silent fallback */
      });

    void fetchTwitchPayoutReceipts()
      .then((rows) => {
        setTwitchReceipts(rows);
        const paid = rows.filter((r) => r.status === 'paid').length;
        const label = paid > 0 ? `${paid} raids paid` : rows.length > 0 ? `${rows.length} events` : null;
        if (label) setTwitchReceiptsBadge(label);
      })
      .catch(() => {
        /* silent fallback */
      });

    void fetchTwitchPayoutPolicies()
      .then((policies) => {
        const raid = policies.find((p) => p.payoutKind === 'raid') ?? policies[0] ?? null;
        if (raid) setTwitchRaidPolicy(raid);
      })
      .catch(() => {
        /* silent fallback */
      });

    void fetchPrPayoutPolicies()
      .then((policies) => {
        if (policies.length > 0) setPolicy(policies[0]);
      })
      .catch(() => {
        /* silent fallback */
      });

    for (const mod of ALL_SECONDARY_MODULES) {
      if (!mod.badgeLoader) continue;
      void mod
        .badgeLoader()
        .then((label) => {
          if (label) setBadges((prev) => ({ ...prev, [mod.id]: label }));
        })
        .catch(() => {
          /* silent fallback */
        });
    }
  }, []);

  return (
    <div className="space-y-10 py-2">
      <header className="lepton-reveal space-y-3">
       
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Sendly and agents
        </h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
        GitHub pool (merge, bounty, release, review) and Twitch pool (raid-to-pay and others) 
        </p>
      </header>

      {/* Hero modules - uniform 2×2 grid */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/agent/pr-bounty"
          style={{ animationDelay: '60ms' }}
          className="lepton-reveal group flex h-full min-h-[13.5rem] flex-col justify-between rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-card p-6 shadow-circle-card transition duration-200 [transition-timing-function:var(--ease-out)] hover:border-indigo-200 hover:shadow-md motion-safe:hover:-translate-y-0.5 active:scale-[0.99]"
        >
          <div className="flex flex-1 flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
                <GitPullRequest className="size-6" />
              </div>
              <ActorTag actor="maintainer" />
            </div>
            <div className="flex flex-1 flex-col space-y-1.5">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                PR Payout Agent
              </h2>
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                Flat USDC per merged pull request, paid from the sponsor pool. Policy-driven with
                built-in anti-abuse - contributors need no wallet upfront.
              </p>
            </div>
          </div>
          <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600">
            View policy
            <ArrowRight className="size-4 transition-transform duration-200 [transition-timing-function:var(--ease-out)] group-hover:translate-x-0.5" />
          </div>
        </Link>

        <Link
          to="/agent/receipts"
          style={{ animationDelay: '120ms' }}
          className="lepton-reveal group flex h-full min-h-[13.5rem] flex-col justify-between rounded-2xl border bg-card p-6 shadow-circle-card transition duration-200 [transition-timing-function:var(--ease-out)] hover:border-indigo-200 hover:shadow-md motion-safe:hover:-translate-y-0.5 active:scale-[0.99]"
        >
          <div className="flex flex-1 flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Receipt className="size-6" />
              </div>
              {receiptsBadge && (
                <Badge variant="secondary" className="text-[10px]">
                  {receiptsBadge}
                </Badge>
              )}
            </div>
            <div className="flex flex-1 flex-col space-y-1.5">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Receipts</h2>
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                On-chain proof of every payout - repo, author, tx hash, and claim status.
              </p>
            </div>
          </div>
          <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600">
            View receipts
            <ArrowRight className="size-4 transition-transform duration-200 [transition-timing-function:var(--ease-out)] group-hover:translate-x-0.5" />
          </div>
        </Link>

        <Link
          to="/agent/twitch/campaign"
          style={{ animationDelay: '180ms' }}
          className="lepton-reveal group flex h-full min-h-[13.5rem] flex-col justify-between rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-card p-6 shadow-circle-card transition duration-200 [transition-timing-function:var(--ease-out)] hover:border-violet-200 hover:shadow-md motion-safe:hover:-translate-y-0.5 active:scale-[0.99]"
        >
          <div className="flex flex-1 flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-sm">
                <Radio className="size-6" />
              </div>
              <ActorTag actor="maintainer" />
            </div>
            <div className="flex flex-1 flex-col space-y-1.5">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Twitch Raid-to-Pay
              </h2>
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                Pay raiding streamers when they raid your channel - campaign budget, EventSub
                webhooks, uid-canonical claims on Arc.
              </p>
            </div>
          </div>
          <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-violet-600">
            Campaign setup
            <ArrowRight className="size-4 transition-transform duration-200 [transition-timing-function:var(--ease-out)] group-hover:translate-x-0.5" />
          </div>
        </Link>

        <Link
          to="/agent/twitch/receipts"
          style={{ animationDelay: '240ms' }}
          className="lepton-reveal group flex h-full min-h-[13.5rem] flex-col justify-between rounded-2xl border bg-card p-6 shadow-circle-card transition duration-200 [transition-timing-function:var(--ease-out)] hover:border-violet-200 hover:shadow-md motion-safe:hover:-translate-y-0.5 active:scale-[0.99]"
        >
          <div className="flex flex-1 flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <Receipt className="size-6" />
              </div>
              {twitchReceiptsBadge && (
                <Badge variant="secondary" className="text-[10px]">
                  {twitchReceiptsBadge}
                </Badge>
              )}
            </div>
            <div className="flex flex-1 flex-col space-y-1.5">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Twitch receipts
              </h2>
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                Raid payout ledger - raider id, viewers, skip reasons, tx hash, claim status.
              </p>
            </div>
          </div>
          <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-violet-600">
            View receipts
            <ArrowRight className="size-4 transition-transform duration-200 [transition-timing-function:var(--ease-out)] group-hover:translate-x-0.5" />
          </div>
        </Link>
      </section>

      {/* GitHub payout kinds */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-foreground">GitHub payout kinds</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PAYOUT_KIND_CARDS.map((config, i) => (
            <PayoutKindCard
              key={config.kind}
              title={config.title}
              icon={config.icon}
              rule={ruleForKind(policy, config.kind)}
              paidCount={paidByKind[config.kind]}
              variant="github"
              linkTo={`/agent/receipts?kind=${config.kind}`}
              style={{ animationDelay: `${150 + i * 60}ms` }}
            />
          ))}
        </div>
      </section>


      {/* Twitch payout kinds */}
      <section className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium text-foreground">Twitch payout kinds</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TWITCH_PAYOUT_KIND_CARDS.map((config, i) => (
            <PayoutKindCard
              key={config.kind}
              title={config.title}
              icon={config.icon}
              rule={ruleForTwitchKind(twitchRaidPolicy, config.kind)}
              paidCount={config.kind === 'raid' ? paidTwitchRaids : 0}
              variant="twitch"
              soon={config.soon}
              linkTo={
                config.soon ? undefined : `/agent/twitch/receipts?kind=${config.kind}`
              }
              style={{ animationDelay: `${300 + i * 60}ms` }}
            />
          ))}
        </div>
      </section>


      {/* Settings */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-foreground">Settings</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="space-y-3">
          {SETTINGS_MODULES.map((mod, i) => (
            <SecondaryRow
              key={mod.id}
              module={mod}
              statusBadge={badges[mod.id] ?? null}
              onCatalogOpen={() => setCatalogOpen(true)}
              style={{ animationDelay: `${420 + i * 60}ms` }}
            />
          ))}
        </div>
      </section>

      {/* Others → Paywall */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-foreground">Others</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Paywall</p>
        </div>
        <div className="space-y-3">
          {PAYWALL_MODULES.map((mod, i) => (
            <SecondaryRow
              key={mod.id}
              module={mod}
              statusBadge={badges[mod.id] ?? null}
              onCatalogOpen={() => setCatalogOpen(true)}
              style={{ animationDelay: `${540 + i * 60}ms` }}
            />
          ))}
        </div>
      </section>

      <Dialog open={catalogOpen} onOpenChange={setCatalogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agent API Catalog</DialogTitle>
          </DialogHeader>
          <LeptonCatalogView embedded />
        </DialogContent>
      </Dialog>
    </div>
  );
}
