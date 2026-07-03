import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fetchPrPayoutPolicies,
  shortenAddress,
  SPONSOR_WALLET_ADDRESS,
  type PrPayoutPolicy,
} from '@/lib/paywall/prPayoutAPI';
import { ARC_CHAIN_ID, getExplorerAddressUrl } from '@/lib/web3/constants';

const captionClass = 'text-[11px] font-medium uppercase tracking-wider text-muted-foreground';

export function LeptonPrBountyPage() {
  const [policies, setPolicies] = useState<PrPayoutPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPolicies(await fetchPrPayoutPolicies());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load policy');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-space text-2xl font-semibold tracking-tight">PR Bounty Policy</h1>
          <p className="text-sm text-muted-foreground">
            Flat USDC per merged PR from sponsor pool (Circle Agent Wallet).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/lepton/repo-settings">Repo settings</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/lepton/receipts">Receipts</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : policies.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No policy configured. POST <code className="text-xs">/pr-payout-policy</code> with your
            demo repo id and webhook secret env vars.
          </CardContent>
        </Card>
      ) : (
        policies.map((p) => (
          <Card key={p.repoId}>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className={captionClass}>Repository</p>
                  <CardTitle className="font-mono text-sm font-medium tracking-tight text-foreground">
                    {p.repoFullName}
                  </CardTitle>
                </div>
                <Badge
                  variant={p.active ? 'default' : 'secondary'}
                  className="shrink-0 text-[11px]"
                >
                  {p.active ? 'Active' : 'Paused'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <p className={captionClass}>Per merged PR</p>
                <p className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="font-space text-3xl font-semibold leading-none tracking-tight tabular-nums text-foreground">
                    {p.perPrAmountUsdc}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">USDC</span>
                  <span className="text-xs text-muted-foreground">· flat</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border/60 pt-4">
                <div>
                  <p className={captionClass}>Daily cap</p>
                  <p className="mt-1 font-mono text-sm tabular-nums text-foreground">
                    {p.dailyCapUsdc}{' '}
                    <span className="text-muted-foreground">USDC</span>
                  </p>
                </div>
                <div>
                  <p className={captionClass}>Budget remaining</p>
                  <p className="mt-1 font-mono text-sm tabular-nums text-foreground">
                    {p.budgetRemainingUsdc}{' '}
                    <span className="text-muted-foreground">USDC</span>
                  </p>
                </div>
              </div>

              <div className="border-t border-border/60 pt-4">
                <p className={captionClass}>Sponsor wallet</p>
                <a
                  href={getExplorerAddressUrl(ARC_CHAIN_ID, SPONSOR_WALLET_ADDRESS)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block font-mono text-xs text-primary underline-offset-2 hover:underline"
                  title={SPONSOR_WALLET_ADDRESS}
                >
                  {shortenAddress(SPONSOR_WALLET_ADDRESS)}
                </a>
              </div>
            </CardContent>
          </Card>
        ))
      )}
{/* 
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Anti-abuse</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• Skip bot authors ([bot] logins)</p>
          <p>• Skip self-merge (author == merged_by)</p>
          <p>• Idempotent per (repo_id, pr_number)</p>
          <p>• DB daily cap + Circle Agent Wallet spending policy</p>
        </CardContent>
      </Card>
      */}
    </div>
  );
}
