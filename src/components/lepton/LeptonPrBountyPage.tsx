import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fetchPrPayoutPolicies,
  type PrPayoutPolicy,
} from '@/lib/paywall/prPayoutAPI';

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
          <h1 className="text-2xl font-semibold">PR Bounty Policy</h1>
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
            <CardHeader>
              <CardTitle className="text-base font-mono">{p.repoFullName}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Per merged PR:</span>{' '}
                <strong>{p.perPrAmountUsdc} USDC</strong> (flat)
              </p>
              <p>
                <span className="text-muted-foreground">Sponsor pool:</span>{' '}
                <code className="text-xs">{p.sponsorPoolRef}</code>
              </p>
              <p>
                <span className="text-muted-foreground">Daily cap:</span> {p.dailyCapUsdc} USDC
              </p>
              <p>
                <span className="text-muted-foreground">Budget remaining:</span>{' '}
                {p.budgetRemainingUsdc} USDC
              </p>
              <p>
                <span className="text-muted-foreground">Active:</span>{' '}
                {p.active ? 'yes' : 'no'}
              </p>
            </CardContent>
          </Card>
        ))
      )}

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
    </div>
  );
}
