import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  CreditCard,
  FileText,
  GitPullRequest,
  PenLine,
  Plug,
  Receipt,
  type LucideIcon,
} from 'lucide-react';

import { LeptonCatalogView } from '@/components/lepton/LeptonCatalogView';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fetchCitationSources } from '@/lib/paywall/citationAPI';
import { fetchPrPayoutReceipts } from '@/lib/paywall/prPayoutAPI';

const DEMO_ARTICLE_PATH = '/pay/leonissx/lepton-agents-hackathon';

type ModuleGroup = 'hero' | 'proofs' | 'context';
type ModuleActor = 'human' | 'agent' | 'maintainer';

type HubModule = {
  id: string;
  group: ModuleGroup;
  title: string;
  description: string;
  actor: ModuleActor;
  icon: LucideIcon;
  to?: string;
  footnote?: { label: string; to: string };
  catalogAction?: boolean;
  badgeLoader?: () => Promise<string | null>;
};

const GROUP_LABELS: Record<ModuleGroup, string> = {
  hero: 'Hero - autonomous payouts',
  proofs: 'Proofs - two event types',
  context: 'Context - create & discover',
};

const ACTOR_LABELS: Record<ModuleActor, string> = {
  human: 'human',
  agent: 'agent',
  maintainer: 'maintainer',
};

const MODULES: HubModule[] = [
  {
    id: 'pr-bounty',
    group: 'hero',
    title: 'PR Payout Agent',
    description: 'Flat USDC per merged PR from sponsor pool. Policy + anti-abuse.',
    actor: 'maintainer',
    icon: GitPullRequest,
    to: '/lepton/pr-bounty',
  },
  {
    id: 'receipts',
    group: 'hero',
    title: 'Payout Receipts',
    description: 'On-chain proof: repo, author, tx_hash, claim status.',
    actor: 'agent',
    icon: Receipt,
    to: '/lepton/receipts',
    badgeLoader: async () => {
      const receipts = await fetchPrPayoutReceipts();
      const paid = receipts.filter((r) => r.status === 'paid').length;
      return paid > 0 ? `${paid} paid` : receipts.length > 0 ? `${receipts.length} events` : null;
    },
  },
  {
    id: 'citation',
    group: 'proofs',
    title: 'Citation Agent',
    description: 'AI agent pays for paywall slugs, returns cited answer with real Arc txs.',
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
    group: 'proofs',
    title: 'Human Paywall',
    description: 'HTTP 402 unlock - reader pays creator by social identity.',
    actor: 'human',
    icon: CreditCard,
    to: '/creator',
    footnote: { label: 'Demo article →', to: DEMO_ARTICLE_PATH },
  },
  {
    id: 'creator',
    group: 'context',
    title: 'Creator Studio',
    description: 'Create paid articles and manage your creator storefront.',
    actor: 'human',
    icon: PenLine,
    to: '/creator',
  },
  {
    id: 'agent-api',
    group: 'context',
    title: 'Agent API',
    description: 'Machine-readable catalog: llms.txt, OpenAPI, webhooks, settlement.',
    actor: 'agent',
    icon: Plug,
    catalogAction: true,
  },
];

function ModuleCard({
  module,
  statusBadge,
  onCatalogOpen,
}: {
  module: HubModule;
  statusBadge: string | null;
  onCatalogOpen: () => void;
}) {
  const Icon = module.icon;
  const isHero = module.group === 'hero';

  return (
    <Card className={isHero ? 'border-primary/30 bg-primary/5' : undefined}>
      <CardHeader className={isHero ? 'pb-2' : undefined}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className={`shrink-0 text-muted-foreground ${isHero ? 'size-5' : 'size-4'}`} />
            <CardTitle className={isHero ? 'text-lg' : 'text-base'}>{module.title}</CardTitle>
          </div>
          <div className="flex flex-wrap gap-1 justify-end">
            <Badge variant="outline" className="text-[10px] uppercase">
              {ACTOR_LABELS[module.actor]}
            </Badge>
            {statusBadge && (
              <Badge variant="secondary" className="text-[10px]">
                {statusBadge}
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className={isHero ? 'text-sm' : undefined}>{module.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {module.catalogAction ? (
          <Button size="sm" variant="secondary" onClick={onCatalogOpen}>
            <FileText className="size-3.5 mr-1.5" />
            View catalog
          </Button>
        ) : module.to ? (
          <Button size="sm" asChild>
            <Link to={module.to}>Open</Link>
          </Button>
        ) : null}
        {module.footnote && (
          <p className="text-xs text-muted-foreground">
            <Link to={module.footnote.to} className="underline hover:text-foreground">
              {module.footnote.label}
            </Link>{' '}
            <code className="text-[10px]">leonissx/lepton-agents-hackathon</code>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function LeptonHubPage() {
  const [badges, setBadges] = useState<Record<string, string | null>>({});
  const [catalogOpen, setCatalogOpen] = useState(false);

  useEffect(() => {
    for (const mod of MODULES) {
      if (!mod.badgeLoader) continue;
      void mod.badgeLoader()
        .then((label) => {
          if (label) setBadges((prev) => ({ ...prev, [mod.id]: label }));
        })
        .catch(() => {
          /* silent fallback */
        });
    }
  }, []);

  const groups: ModuleGroup[] = ['hero', 'proofs', 'context'];

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Sendly × Lepton</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Demo hub - social-identity USDC settlement on Arc. One sponsor pool, multiple surfaces:
          merged PRs, AI citations, and human paywall unlocks.
        </p>
      </div>

      {groups.map((group) => {
        const items = MODULES.filter((m) => m.group === group);
        return (
          <section key={group} className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {GROUP_LABELS[group]}
            </h2>
            <div
              className={
                group === 'hero'
                  ? 'grid gap-4 sm:grid-cols-2'
                  : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
              }
            >
              {items.map((mod) => (
                <ModuleCard
                  key={mod.id}
                  module={mod}
                  statusBadge={badges[mod.id] ?? null}
                  onCatalogOpen={() => setCatalogOpen(true)}
                />
              ))}
            </div>
          </section>
        );
      })}

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
