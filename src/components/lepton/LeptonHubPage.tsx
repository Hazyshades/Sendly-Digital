import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  CreditCard,
  Eye,
  GitPullRequest,
  PenLine,
  Plug,
  Receipt,
  Rocket,
  Settings,
  Tag,
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

const DEMO_ARTICLE_PATH = '/pay/leonissx/lepton-agents-hackathon';

type PayoutKindCardConfig = {
  kind: PayoutKind;
  title: string;
  icon: LucideIcon;
  defaultRule: string;
};

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

function PayoutKindCard({
  config,
  rule,
  paidCount,
  style,
}: {
  config: PayoutKindCardConfig;
  rule: string;
  paidCount: number;
  style?: React.CSSProperties;
}) {
  const Icon = config.icon;
  return (
    <Link
      to={`/lepton/receipts?kind=${config.kind}`}
      style={style}
      className="lepton-reveal group flex flex-col justify-between rounded-2xl border bg-card p-4 shadow-circle-card transition duration-200 [transition-timing-function:var(--ease-out)] hover:border-indigo-200 hover:shadow-md motion-safe:hover:-translate-y-0.5 active:scale-[0.99]"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Icon className="size-4" />
          </div>
          {paidCount > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {paidCount} paid
            </Badge>
          )}
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">{config.title}</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">{rule}</p>
        </div>
      </div>
      <div className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-indigo-600">
        View receipts
        <ArrowRight className="size-3 transition-transform duration-200 [transition-timing-function:var(--ease-out)] group-hover:translate-x-0.5" />
      </div>
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
  catalogAction?: boolean;
  badgeLoader?: () => Promise<string | null>;
};

const SECONDARY_MODULES: SecondaryModule[] = [
  {
    id: 'repo-settings',
    title: 'Repo Settings',
    description:
      'All payout rules for a repo - merge PR, issue bounties, release pool, review rewards.',
    actor: 'maintainer',
    icon: Settings,
    to: '/lepton/repo-settings',
  },
  {
    id: 'citation',
    title: 'Citation Agent',
    description: 'An AI agent pays for paywall slugs, then returns a cited answer - real Arc txs.',
    actor: 'agent',
    icon: Bot,
    to: '/lepton/citation',
    badgeLoader: async () => {
      const sources = await fetchCitationSources();
      return sources.length > 0 ? `${sources.length} sources` : null;
    },
  },
  {
    id: 'human-paywall',
    title: 'Human Paywall',
    description: 'HTTP 402 unlock - a reader pays the creator by social identity.',
    actor: 'human',
    icon: CreditCard,
    to: '/creator',
    footnote: { label: 'Open demo article', to: DEMO_ARTICLE_PATH },
  },
  {
    id: 'creator',
    title: 'Creator Studio',
    description: 'Write paid articles and manage your creator storefront.',
    actor: 'human',
    icon: PenLine,
    to: '/creator',
  },
  {
    id: 'agent-api',
    title: 'Agent API',
    description: 'Machine-readable catalog: llms.txt, OpenAPI, webhooks, settlement.',
    actor: 'agent',
    icon: Plug,
    catalogAction: true,
  },
];

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
    </div>
  );
}

export function LeptonHubPage() {
  const [badges, setBadges] = useState<Record<string, string | null>>({});
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [receiptsBadge, setReceiptsBadge] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<PrPayoutReceipt[]>([]);
  const [policy, setPolicy] = useState<PrPayoutPolicy | null>(null);

  const paidByKind = countPaidByKind(receipts);

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

    void fetchPrPayoutPolicies()
      .then((policies) => {
        if (policies.length > 0) setPolicy(policies[0]);
      })
      .catch(() => {
        /* silent fallback */
      });

    for (const mod of SECONDARY_MODULES) {
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
          Sendly × Lepton
        </h1>
        <p className="max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          One sponsor pool, GitHub repo treasury with four payout mechanics - merge, bounty, release,
          and review - plus AI citation tolls and human paywall unlocks on Arc.
        </p>
      </header>

      {/* Hero: two feature panels */}
      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Link
          to="/lepton/pr-bounty"
          style={{ animationDelay: '60ms' }}
          className="lepton-reveal group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-card p-6 shadow-circle-card transition duration-200 [transition-timing-function:var(--ease-out)] hover:border-indigo-200 hover:shadow-md motion-safe:hover:-translate-y-0.5 active:scale-[0.99]"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
                <GitPullRequest className="size-6" />
              </div>
              <ActorTag actor="maintainer" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                PR Payout Agent
              </h2>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
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
          to="/lepton/receipts"
          style={{ animationDelay: '120ms' }}
          className="lepton-reveal group flex flex-col justify-between rounded-2xl border bg-card p-6 shadow-circle-card transition duration-200 [transition-timing-function:var(--ease-out)] hover:border-indigo-200 hover:shadow-md motion-safe:hover:-translate-y-0.5 active:scale-[0.99]"
        >
          <div className="space-y-4">
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
            <div className="space-y-1.5">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Receipts</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                On-chain proof of every payout - repo, author, tx hash, and claim status.
              </p>
            </div>
          </div>
          <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600">
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
              config={config}
              rule={ruleForKind(policy, config.kind)}
              paidCount={paidByKind[config.kind]}
              style={{ animationDelay: `${150 + i * 60}ms` }}
            />
          ))}
        </div>
      </section>

      {/* Secondary modules */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium text-foreground">More modules</h2>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="space-y-3">
          {SECONDARY_MODULES.map((mod, i) => (
            <SecondaryRow
              key={mod.id}
              module={mod}
              statusBadge={badges[mod.id] ?? null}
              onCatalogOpen={() => setCatalogOpen(true)}
              style={{ animationDelay: `${180 + i * 60}ms` }}
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
