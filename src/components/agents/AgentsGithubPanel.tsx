import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCircleWallet } from '@/hooks/useCircleWallet';
import {
  fetchGithubAppInstallUrl,
  fetchGithubAppStatus,
  fetchMyPrPayoutPolicies,
  fetchMyPrPayoutReceipts,
  isValidRepoFullName,
  normalizeRepoFullName,
  upsertMyPrPayoutPolicy,
  type AgentsPrPayoutPolicy,
  type GithubAppConnectionStatus,
} from '@/lib/paywall/agentsPayoutAPI';
import {
  formatUsdcAmount,
  shortenAddress,
  type PrPayoutReceipt,
} from '@/lib/paywall/prPayoutAPI';

function walletLabel(address: string | undefined): string {
  if (!address) return 'No Internal Wallet';
  return shortenAddress(address);
}

export function AgentsGithubPanel() {
  const { developerWallet, hasDeveloperWallet, checkingWallet } = useCircleWallet();
  const walletId = developerWallet?.circle_wallet_id;
  const walletAddress = developerWallet?.wallet_address;

  const [policies, setPolicies] = useState<AgentsPrPayoutPolicy[]>([]);
  const [receipts, setReceipts] = useState<PrPayoutReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [appStatus, setAppStatus] = useState<GithubAppConnectionStatus | null>(null);
  const [appStatusLoading, setAppStatusLoading] = useState(false);

  const [repoFullName, setRepoFullName] = useState('');
  const [perPrAmount, setPerPrAmount] = useState('5');
  const [dailyCap, setDailyCap] = useState('50');
  const [budgetRemaining, setBudgetRemaining] = useState('100');
  const [active, setActive] = useState(true);

  const load = useCallback(async () => {
    if (!walletId) {
      setPolicies([]);
      setReceipts([]);
      setLoading(false);
      setLoadError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [policyRows, receiptRows] = await Promise.all([
        fetchMyPrPayoutPolicies(walletId),
        fetchMyPrPayoutReceipts(walletId),
      ]);
      setPolicies(policyRows);
      setReceipts(receiptRows.slice(0, 20));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load GitHub agent data';
      setLoadError(msg);
      setPolicies([]);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  }, [walletId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshAppStatus = async (repo: string) => {
    if (!isValidRepoFullName(repo)) {
      setAppStatus(null);
      return;
    }
    setAppStatusLoading(true);
    try {
      const status = await fetchGithubAppStatus(repo);
      setAppStatus(status);
    } catch {
      setAppStatus({
        repoFullName: normalizeRepoFullName(repo),
        connected: false,
        message: 'Could not check App status. Backend Agents endpoints may not be deployed yet.',
      });
    } finally {
      setAppStatusLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isValidRepoFullName(repoFullName)) {
      toast.error('Enter a repository as owner/repo');
      return;
    }
    if (!walletId) {
      toast.error('Create an Internal Wallet on Dashboard before saving a policy');
      return;
    }
    setSaving(true);
    try {
      await upsertMyPrPayoutPolicy({
        repoFullName,
        perPrAmountUsdc: parseFloat(perPrAmount) || 0,
        dailyCapUsdc: parseFloat(dailyCap) || 0,
        budgetRemainingUsdc: parseFloat(budgetRemaining) || 0,
        active,
        sponsorCircleWalletId: walletId,
      });
      toast.success('GitHub payout policy saved');
      await load();
      await refreshAppStatus(repoFullName);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  const handleInstallApp = async () => {
    try {
      const { installUrl } = await fetchGithubAppInstallUrl(repoFullName || undefined);
      window.open(installUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : 'Install URL unavailable. Set VITE_GITHUB_APP_INSTALL_URL or deploy Agents App API.',
      );
    }
  };

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
        <h2 className="text-sm font-medium text-gray-900">Funding wallet</h2>
        {checkingWallet ? (
          <p className="text-sm text-gray-600">Checking Internal Wallet…</p>
        ) : hasDeveloperWallet && walletAddress ? (
          <p className="text-sm text-gray-700">
            Pays from <span className="font-mono text-xs">{walletLabel(walletAddress)}</span>
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">No Internal Wallet yet. Create one on Dashboard.</p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard">Open Dashboard</Link>
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-gray-900">Repository policy</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="agents-repo">Repository</Label>
            <Input
              id="agents-repo"
              value={repoFullName}
              onChange={(e) => setRepoFullName(e.target.value)}
              onBlur={() => void refreshAppStatus(repoFullName)}
              placeholder="owner/repo"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agents-per-pr">Per merged PR (USDC)</Label>
            <Input
              id="agents-per-pr"
              type="number"
              min="0"
              step="0.1"
              value={perPrAmount}
              onChange={(e) => setPerPrAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agents-daily-cap">Daily cap (USDC)</Label>
            <Input
              id="agents-daily-cap"
              type="number"
              min="0"
              step="0.1"
              value={dailyCap}
              onChange={(e) => setDailyCap(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agents-budget">Budget remaining (USDC)</Label>
            <Input
              id="agents-budget"
              type="number"
              min="0"
              step="0.1"
              value={budgetRemaining}
              onChange={(e) => setBudgetRemaining(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2 pb-1">
            <label className="flex items-center gap-2 text-sm text-gray-700 min-h-11 cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Policy active
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || checkingWallet || !hasDeveloperWallet}
            className="min-h-11"
          >
            {saving ? 'Saving…' : 'Save policy'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleInstallApp()}
            className="min-h-11"
          >
            Connect GitHub App
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => void refreshAppStatus(repoFullName)}
            disabled={appStatusLoading || !repoFullName.trim()}
            className="min-h-11"
          >
            {appStatusLoading ? 'Checking…' : 'Check events'}
          </Button>
        </div>

        {appStatus ? (
          <p className="text-sm text-gray-600">
            Events for <span className="font-mono text-xs">{appStatus.repoFullName}</span>:{' '}
            {appStatus.connected ? (
              <Badge className="align-middle">Connected</Badge>
            ) : (
              <Badge variant="secondary" className="align-middle">
                Not connected
              </Badge>
            )}
            {appStatus.message ? (
              <span className="block mt-1 text-xs text-gray-500">{appStatus.message}</span>
            ) : null}
          </p>
        ) : null}

        <p className="text-xs text-gray-500">
          Recipients claim with GitHub ownership proof on Payments. They do not need a wallet when
          the PR merges.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-900">Your policies</h2>
        {loading ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : loadError ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            {loadError}. Save still works once Agents write APIs are live.
          </p>
        ) : policies.length === 0 ? (
          <p className="text-sm text-gray-600">No policies yet. Enter a repo above and save.</p>
        ) : (
          <ul className="space-y-2">
            {policies.map((p) => (
              <li
                key={`${p.repoId}-${p.repoFullName}`}
                className="rounded-xl border border-gray-100 px-3 py-2.5 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs">{p.repoFullName}</span>
                  <Badge variant={p.active ? 'default' : 'secondary'}>
                    {p.active ? 'Active' : 'Off'}
                  </Badge>
                </div>
                <p className="mt-1 text-gray-600">
                  {formatUsdcAmount(p.perPrAmountUsdc)} / PR · budget{' '}
                  {formatUsdcAmount(p.budgetRemainingUsdc)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-900">Recent receipts</h2>
        {loading ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : receipts.length === 0 ? (
          <p className="text-sm text-gray-600">No payouts yet for your policies.</p>
        ) : (
          <ul className="space-y-2">
            {receipts.map((r, i) => (
              <li
                key={`${r.repo}-${r.prNumber}-${r.createdAt}-${i}`}
                className="rounded-xl border border-gray-100 px-3 py-2.5 text-sm text-gray-700"
              >
                <span className="font-mono text-xs">{r.repo}</span>
                {r.prNumber != null ? ` #${r.prNumber}` : ''} · @{r.author} ·{' '}
                {formatUsdcAmount(r.amount)} · {r.status}
                {r.skipReason ? (
                  <span className="block text-xs text-gray-500 mt-0.5">{r.skipReason}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
