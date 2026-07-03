import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fetchPrPayoutReceipts,
  type PrPayoutReceipt,
} from '@/lib/paywall/prPayoutAPI';

function statusClass(status: string): string {
  if (status === 'paid') return 'text-emerald-600';
  if (status.startsWith('skipped')) return 'text-amber-600';
  if (status === 'failed') return 'text-red-600';
  return 'text-muted-foreground';
}

export function LeptonReceiptsPage() {
  const [receipts, setReceipts] = useState<PrPayoutReceipt[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">PR Payout Receipts</h1>
          <p className="text-sm text-muted-foreground">
            Autonomous merged-PR payouts to github:handle - proof for Lepton judges.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/lepton/pr-bounty">Policy</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Events</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : receipts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No payout events yet. Merge a PR on the configured demo repo after webhook setup.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 pr-3">Repo</th>
                  <th className="py-2 pr-3">PR</th>
                  <th className="py-2 pr-3">Author</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Claim</th>
                  <th className="py-2">Tx</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={`${r.repo}-${r.prNumber}-${r.createdAt}`} className="border-b border-border/50">
                    <td className="py-2 pr-3 font-mono text-xs">{r.repo}</td>
                    <td className="py-2 pr-3">#{r.prNumber}</td>
                    <td className="py-2 pr-3">github:{r.author}</td>
                    <td className="py-2 pr-3">{r.amount} USDC</td>
                    <td className={`py-2 pr-3 ${statusClass(r.status)}`}>{r.status}</td>
                    <td className="py-2 pr-3">{r.claimStatus}</td>
                    <td className="py-2 font-mono text-xs">
                      {r.txHash ? (
                        <span title={r.txHash}>{r.txHash.slice(0, 10)}…</span>
                      ) : (
                        '-'
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
