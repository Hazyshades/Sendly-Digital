import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fetchActiveIssueBounties,
  fetchPrPayoutPolicies,
  formatUsdcAmount,
  shortenAddress,
  SPONSOR_WALLET_ADDRESS,
  type IssueBounty,
  type PrPayoutPolicy,
} from '@/lib/paywall/prPayoutAPI';
import { ARC_CHAIN_ID, getExplorerAddressUrl } from '@/lib/web3/constants';

function splitModeLabel(mode: string | undefined): string {
  if (mode === 'weighted_by_prs') return 'Proportional to merged PR count';
  return 'Equal split among contributors';
}

function payoutEnabled(policy: PrPayoutPolicy, amount: string | number | undefined): boolean {
  if (!policy.active) return false;
  const n = typeof amount === 'number' ? amount : parseFloat(String(amount ?? '0'));
  return Number.isFinite(n) && n > 0;
}

function HowToEarnSummary({ policy }: { policy: PrPayoutPolicy }) {
  const lines: string[] = [];

  if (payoutEnabled(policy, policy.perPrAmountUsdc)) {
    lines.push(
      `Merge a pull request → ${formatUsdcAmount(policy.perPrAmountUsdc)} to the PR author`,
    );
  }
  if (policy.bountyEnabled !== false) {
    lines.push(
      'Close an issue with a `bounty:<amount>` label → that amount to the author of the merging PR',
    );
  }
  if (payoutEnabled(policy, policy.releasePoolUsdc)) {
    lines.push(
      `Land in a published release → share of ${formatUsdcAmount(policy.releasePoolUsdc)} release pool (${splitModeLabel(policy.splitMode).toLowerCase()})`,
    );
  }
  if (payoutEnabled(policy, policy.reviewAmountUsdc)) {
    const max = policy.maxReviewersPerPr ?? 2;
    lines.push(
      `Review a PR (approve or request changes) → ${formatUsdcAmount(policy.reviewAmountUsdc)} when it merges (up to ${max} reviewers per PR)`,
    );
  }

  if (lines.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No active earning paths - policy is inactive or all amounts are zero.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5 text-sm text-muted-foreground">
      {lines.map((line) => (
        <li key={line} className="flex gap-2">
          <span className="text-indigo-600">•</span>
          <span>{line}</span>
        </li>
      ))}
      <li className="pt-1 text-xs text-muted-foreground">
        No wallet required upfront - payouts are tied to your GitHub login on Arc.
      </li>
    </ul>
  );
}

function RepoBountyList({
  repoFullName,
  bounties,
}: {
  repoFullName: string;
  bounties: IssueBounty[];
}) {
  const repoBounties = bounties.filter((b) => b.repoFullName === repoFullName);

  if (repoBounties.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No open issue bounties. Add a <code className="text-xs">bounty:&lt;amount&gt;</code> label on
        GitHub to register one.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border text-sm">
      {repoBounties.map((b) => (
        <li
          key={`${b.repoFullName}#${b.issueNumber}`}
          className="flex items-center justify-between gap-3 px-3 py-2"
        >
          <span className="font-mono text-foreground">#{b.issueNumber}</span>
          <span className="font-medium">{formatUsdcAmount(b.amountUsdc)}</span>
          <Badge variant="secondary" className="text-[10px] capitalize">
            {b.status}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function PayoutModelCard({
  title,
  enabled,
  amount,
  condition,
}: {
  title: string;
  enabled: boolean;
  amount?: string;
  condition: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Badge variant={enabled ? 'default' : 'secondary'} className="text-[10px]">
          {enabled ? 'On' : 'Off'}
        </Badge>
      </div>
      {amount && enabled && <p className="text-lg font-semibold text-indigo-600">{amount}</p>}
      <p className="text-xs leading-relaxed text-muted-foreground">{condition}</p>
    </div>
  );
}

function RepoPolicyBlock({
  policy,
  bounties,
}: {
  policy: PrPayoutPolicy;
  bounties: IssueBounty[];
}) {
  const mergeOn = payoutEnabled(policy, policy.perPrAmountUsdc);
  const bountyOn = policy.bountyEnabled !== false && policy.active;
  const releaseOn = payoutEnabled(policy, policy.releasePoolUsdc);
  const reviewOn = payoutEnabled(policy, policy.reviewAmountUsdc);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-mono text-base">{policy.repoFullName}</CardTitle>
          <Badge variant={policy.active ? 'default' : 'outline'}>
            {policy.active ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Budget & limits</h3>
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <p>
              <span className="text-muted-foreground">Daily cap:</span>{' '}
              <strong>{formatUsdcAmount(policy.dailyCapUsdc)}</strong>
            </p>
            <p>
              <span className="text-muted-foreground">Budget left:</span>{' '}
              <strong>{formatUsdcAmount(policy.budgetRemainingUsdc)}</strong>
            </p>
            <p>
              <span className="text-muted-foreground">Sponsor wallet:</span>{' '}
              <a
                href={getExplorerAddressUrl(ARC_CHAIN_ID, SPONSOR_WALLET_ADDRESS)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-primary underline-offset-2 hover:underline"
                title={SPONSOR_WALLET_ADDRESS}
              >
                {shortenAddress(SPONSOR_WALLET_ADDRESS)}
              </a>
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Payout models</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <PayoutModelCard
              title="Merge PR"
              enabled={mergeOn}
              amount={formatUsdcAmount(policy.perPrAmountUsdc)}
              condition="Flat payout to the PR author when their pull request is merged."
            />
            <PayoutModelCard
              title="Issue bounty"
              enabled={bountyOn}
              condition="Label an issue `bounty:<amount>` on GitHub. When a merged PR closes that issue (Fixes #N / Closes #N), the PR author receives the bounty amount."
            />
            <PayoutModelCard
              title="Release dividend"
              enabled={releaseOn}
              amount={formatUsdcAmount(policy.releasePoolUsdc)}
              condition={`On release publish, the pool is split among contributors with merged PRs since the previous tag. Mode: ${splitModeLabel(policy.splitMode)}.`}
            />
            <PayoutModelCard
              title="Review to earn"
              enabled={reviewOn}
              amount={formatUsdcAmount(policy.reviewAmountUsdc)}
              condition={`Meaningful review (approve or request changes) earns a payout when the PR merges. Up to ${policy.maxReviewersPerPr ?? 2} reviewers per PR; author cannot earn from their own PR.`}
            />
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">How to earn</h3>
          <HowToEarnSummary policy={policy} />
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Open issue bounties</h3>
          <RepoBountyList repoFullName={policy.repoFullName} bounties={bounties} />
        </section>
      </CardContent>
    </Card>
  );
}

export function LeptonRepoSettingsPage() {
  const [policies, setPolicies] = useState<PrPayoutPolicy[]>([]);
  const [bounties, setBounties] = useState<IssueBounty[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [policyRows, bountyRows] = await Promise.all([
        fetchPrPayoutPolicies(),
        fetchActiveIssueBounties(),
      ]);
      setPolicies(policyRows);
      setBounties(bountyRows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load repo settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedPolicies = useMemo(
    () => [...policies].sort((a, b) => a.repoFullName.localeCompare(b.repoFullName)),
    [policies],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Repo Settings</h1>
          <p className="text-sm text-muted-foreground">
            Read-only view of payout rules, amounts, and open issue bounties for contributors and
            reviewers.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/agent/pr-bounty">PR policy</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/agent/receipts">Receipts</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : sortedPolicies.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No repository payout policy configured yet. A maintainer can set one via{' '}
            <code className="text-xs">POST /pr-payout-policy</code> on the creator-paywall API.
          </CardContent>
        </Card>
      ) : (
        sortedPolicies.map((policy) => (
          <RepoPolicyBlock key={policy.repoId} policy={policy} bounties={bounties} />
        ))
      )}
    </div>
  );
}
