import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCircleWallet } from '@/hooks/useCircleWallet';
import {
  createMyTwitchCampaign,
  fetchMyTwitchCampaigns,
  fetchMyTwitchPayoutPolicies,
  upsertMyTwitchRaidPolicy,
} from '@/lib/paywall/agentsPayoutAPI';
import { formatUsdcAmount, shortenAddress } from '@/lib/paywall/prPayoutAPI';
import type { TwitchCampaign, TwitchRaidPolicy } from '@/lib/paywall/twitchPayoutAPI';

function CampaignRow({
  campaign,
  policy,
}: {
  campaign: TwitchCampaign;
  policy: TwitchRaidPolicy | undefined;
}) {
  return (
    <li className="rounded-xl border border-gray-100 px-3 py-2.5 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-gray-900">{campaign.name}</span>
        <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'} className="capitalize">
          {campaign.status}
        </Badge>
      </div>
      <p className="mt-1 text-gray-600">
        Broadcaster{' '}
        <span className="font-mono text-xs">
          {campaign.broadcasterLoginSnapshot ?? campaign.broadcasterUserId}
        </span>
      </p>
      <p className="text-gray-600">
        Budget {formatUsdcAmount(campaign.remainingBudgetUsdc)} /{' '}
        {formatUsdcAmount(campaign.totalBudgetUsdc)}
      </p>
      {policy ? (
        <p className="text-xs text-gray-500 mt-1">
          Raid: min {policy.minViewers} viewers · {formatUsdcAmount(policy.ratePerViewerUsdc)}
          /viewer · cap {formatUsdcAmount(policy.maxPerEventUsdc)}
        </p>
      ) : (
        <p className="text-xs text-gray-500 mt-1">No raid policy yet.</p>
      )}
    </li>
  );
}

export function AgentsTwitchPanel() {
  const { developerWallet, hasDeveloperWallet, checkingWallet } = useCircleWallet();
  const walletId = developerWallet?.circle_wallet_id;
  const walletAddress = developerWallet?.wallet_address;

  const [campaigns, setCampaigns] = useState<TwitchCampaign[]>([]);
  const [policies, setPolicies] = useState<TwitchRaidPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [campaignName, setCampaignName] = useState('');
  const [broadcasterUserId, setBroadcasterUserId] = useState('');
  const [broadcasterLogin, setBroadcasterLogin] = useState('');
  const [totalBudget, setTotalBudget] = useState('10');
  const [minViewers, setMinViewers] = useState('5');
  const [ratePerViewer, setRatePerViewer] = useState('0.01');
  const [maxPerEvent, setMaxPerEvent] = useState('2');

  const load = useCallback(async () => {
    if (!walletId) {
      setCampaigns([]);
      setPolicies([]);
      setLoading(false);
      setLoadError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [campaignRows, policyRows] = await Promise.all([
        fetchMyTwitchCampaigns(walletId),
        fetchMyTwitchPayoutPolicies(walletId),
      ]);
      setCampaigns(campaignRows);
      setPolicies(policyRows);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load Twitch campaigns');
      setCampaigns([]);
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  }, [walletId]);

  useEffect(() => {
    void load();
  }, [load]);

  const policyByCampaign = (id: string) => policies.find((p) => p.campaignId === id);

  const handleCreate = async () => {
    if (!broadcasterUserId.trim() || !campaignName.trim()) {
      toast.error('Broadcaster user id and campaign name are required');
      return;
    }
    if (!walletId) {
      toast.error('Create an Internal Wallet on Dashboard before creating a campaign');
      return;
    }
    setSaving(true);
    try {
      const campaign = await createMyTwitchCampaign({
        sponsorCircleWalletId: walletId,
        broadcasterUserId: broadcasterUserId.trim(),
        broadcasterLoginSnapshot: broadcasterLogin.trim() || undefined,
        name: campaignName.trim(),
        totalBudgetUsdc: parseFloat(totalBudget) || 10,
        status: 'active',
      });
      await upsertMyTwitchRaidPolicy({
        campaignId: campaign.id,
        minViewers: parseInt(minViewers, 10) || 0,
        ratePerViewerUsdc: parseFloat(ratePerViewer) || 0.01,
        maxPerEventUsdc: parseFloat(maxPerEvent) || 2,
      });
      toast.success('Twitch campaign created');
      setCampaignName('');
      setBroadcasterUserId('');
      setBroadcasterLogin('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create campaign');
    } finally {
      setSaving(false);
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
            Pays from{' '}
            <span className="font-mono text-xs">{shortenAddress(walletAddress)}</span>
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
        <h2 className="text-sm font-medium text-gray-900">New raid campaign</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="twitch-campaign-name">Campaign name</Label>
            <Input
              id="twitch-campaign-name"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Raid pool"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="twitch-broadcaster-id">Broadcaster user id</Label>
            <Input
              id="twitch-broadcaster-id"
              value={broadcasterUserId}
              onChange={(e) => setBroadcasterUserId(e.target.value)}
              placeholder="12345678"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="twitch-broadcaster-login">Broadcaster login</Label>
            <Input
              id="twitch-broadcaster-login"
              value={broadcasterLogin}
              onChange={(e) => setBroadcasterLogin(e.target.value)}
              placeholder="channel_login"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="twitch-budget">Total budget (USDC)</Label>
            <Input
              id="twitch-budget"
              type="number"
              min="0.5"
              step="0.1"
              value={totalBudget}
              onChange={(e) => setTotalBudget(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="twitch-min-viewers">Min viewers</Label>
            <Input
              id="twitch-min-viewers"
              type="number"
              min="0"
              value={minViewers}
              onChange={(e) => setMinViewers(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="twitch-rate">Rate per viewer (USDC)</Label>
            <Input
              id="twitch-rate"
              type="number"
              min="0"
              step="0.001"
              value={ratePerViewer}
              onChange={(e) => setRatePerViewer(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="twitch-max">Max per raid (USDC)</Label>
            <Input
              id="twitch-max"
              type="number"
              min="0.5"
              step="0.1"
              value={maxPerEvent}
              onChange={(e) => setMaxPerEvent(e.target.value)}
            />
          </div>
        </div>
        <Button
          type="button"
          onClick={() => void handleCreate()}
          disabled={saving || checkingWallet || !hasDeveloperWallet}
          className="min-h-11"
        >
          {saving ? 'Creating…' : 'Create active campaign'}
        </Button>
        <p className="text-xs text-gray-500">
          Raid payouts settle to the raider Twitch identity. Claim uses the existing ownership proof
          flow.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-900">Your campaigns</h2>
        {loading ? (
          <p className="text-sm text-gray-600">Loading…</p>
        ) : loadError ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            {loadError}. Create still works once Agents Twitch APIs are live.
          </p>
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-gray-600">No campaigns yet. Create one above.</p>
        ) : (
          <ul className="space-y-2">
            {campaigns.map((c) => (
              <CampaignRow key={c.id} campaign={c} policy={policyByCampaign(c.id)} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
