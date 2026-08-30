import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fetchTwitchPayoutReceipts,
  type TwitchPayoutReceipt,
} from '@/lib/paywall/twitchPayoutAPI';
import { ARC_CHAIN_ID, getExplorerTxUrl } from '@/lib/web3/constants';

const linkClass = 'text-primary underline-offset-2 hover:underline';

type TwitchReceiptKindFilter = 'all' | 'raid';

const FILTER_OPTIONS: Array<{ value: TwitchReceiptKindFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'raid', label: 'Raid-to-Pay' },
];

function parseTwitchKindFilter(raw: string | null): TwitchReceiptKindFilter {
  return raw === 'raid' ? 'raid' : 'all';
}

function statusClass(status: string): string {
  if (status === 'paid') return 'text-emerald-600';
  if (status.startsWith('skipped')) return 'text-amber-600';
  if (status === 'failed') return 'text-red-600';
  return 'text-muted-foreground';
}

export function LeptonTwitchReceiptsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [receipts, setReceipts] = useState<TwitchPayoutReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  const activeFilter = parseTwitchKindFilter(searchParams.get('kind'));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReceipts(await fetchTwitchPayoutReceipts());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load Twitch receipts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredReceipts = useMemo(() => {
    if (activeFilter === 'all') return receipts;
    // All Twitch receipts are raid today; filter reserved for future kinds
    return receipts;
  }, [receipts, activeFilter]);

  const setFilter = (kind: TwitchReceiptKindFilter) => {
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
          <h1 className="text-2xl font-semibold">Twitch Raid Receipts</h1>
          <p className="text-sm text-muted-foreground">
            On-chain proof for raid-to-pay events - raider, viewers, tx hash, claim status.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/agent/twitch/campaign">Campaign setup</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={activeFilter === opt.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {activeFilter === 'raid' ? 'Raid payouts' : 'All Twitch payouts'}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : filteredReceipts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No raid payouts yet. Trigger a <code className="text-xs">channel.raid</code> EventSub
              event or use Twitch CLI mock against the webhook.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 pr-3">Raider</th>
                  <th className="py-2 pr-3">User id</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Claim</th>
                  <th className="py-2">Tx</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.map((r) => (
                  <tr
                    key={`${r.campaignId}-${r.recipientUserId}-${r.createdAt}`}
                    className="border-b border-border/50"
                  >
                    <td className="py-2 pr-3">
                      {r.recipientLogin ? (
                        <a
                          href={`https://twitch.tv/${r.recipientLogin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={linkClass}
                        >
                          {r.recipientLogin}
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">{r.recipientUserId}</td>
                    <td className="py-2 pr-3">{r.amount} USDC</td>
                    <td className={`py-2 pr-3 ${statusClass(r.status)}`}>
                      {r.skipReason ? (
                        <span title={r.skipReason}>
                          {r.status}
                          <Badge variant="outline" className="ml-1 text-[10px]">
                            {r.skipReason}
                          </Badge>
                        </span>
                      ) : (
                        r.status
                      )}
                    </td>
                    <td className="py-2 pr-3">{r.claimStatus}</td>
                    <td className="py-2 font-mono text-xs">
                      {r.txHash ? (
                        <a
                          href={getExplorerTxUrl(ARC_CHAIN_ID, r.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={linkClass}
                          title={r.txHash}
                        >
                          {r.txHash.slice(0, 10)}…
                        </a>
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
