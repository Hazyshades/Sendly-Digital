import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fetchPrPayoutReceipts,
  formatPayoutKindLabel,
  parsePayoutKindFilter,
  PAYOUT_KINDS,
  type PayoutKind,
  type PrPayoutReceipt,
} from '@/lib/paywall/prPayoutAPI';

const FILTER_OPTIONS: Array<{ value: PayoutKind | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  ...PAYOUT_KINDS.map((kind) => ({ value: kind, label: formatPayoutKindLabel(kind) })),
];

function statusClass(status: string): string {
  if (status === 'paid') return 'text-emerald-600';
  if (status.startsWith('skipped')) return 'text-amber-600';
  if (status === 'failed') return 'text-red-600';
  return 'text-muted-foreground';
}

export function LeptonReceiptsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [receipts, setReceipts] = useState<PrPayoutReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  const activeFilter = parsePayoutKindFilter(searchParams.get('kind'));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReceipts(await fetchPrPayoutReceipts());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load receipts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredReceipts = useMemo(() => {
    if (activeFilter === 'all') return receipts;
    return receipts.filter((r) => r.kind === activeFilter);
  }, [receipts, activeFilter]);

  const setFilter = (kind: PayoutKind | 'all') => {
    if (kind === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ kind });
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Payout Receipts</h1>
          <p className="text-sm text-muted-foreground">
            On-chain proof for every GitHub payout kind — merge, bounty, release, and review.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/lepton/repo-settings">Repo settings</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map(({ value, label }) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={activeFilter === value ? 'default' : 'outline'}
            className="active:scale-[0.97]"
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Events</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filteredReceipts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {activeFilter === 'all'
                ? 'No payout events yet. Trigger a GitHub webhook event on the configured demo repo.'
                : `No ${formatPayoutKindLabel(activeFilter).toLowerCase()} payouts yet.`}
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 pr-3">Kind</th>
                  <th className="py-2 pr-3">Repo</th>
                  <th className="py-2 pr-3">PR</th>
                  <th className="py-2 pr-3">Recipient</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Claim</th>
                  <th className="py-2">Tx</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.map((r) => (
                  <tr
                    key={`${r.kind ?? 'unknown'}-${r.repo}-${r.prNumber ?? 'na'}-${r.author}-${r.createdAt}`}
                    className="border-b border-border/50"
                  >
                    <td className="py-2 pr-3">
                      <Badge variant="secondary" className="text-[10px]">
                        {formatPayoutKindLabel(r.kind)}
                      </Badge>
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">{r.repo}</td>
                    <td className="py-2 pr-3">{r.prNumber != null ? `#${r.prNumber}` : '—'}</td>
                    <td className="py-2 pr-3">github:{r.author}</td>
                    <td className="py-2 pr-3">{r.amount} USDC</td>
                    <td className={`py-2 pr-3 ${statusClass(r.status)}`}>{r.status}</td>
                    <td className="py-2 pr-3">{r.claimStatus}</td>
                    <td className="py-2 font-mono text-xs">
                      {r.txHash ? (
                        <span title={r.txHash}>{r.txHash.slice(0, 10)}…</span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
