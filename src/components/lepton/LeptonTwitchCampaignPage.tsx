import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createTwitchCampaign,
  fetchTwitchCampaigns,
  fetchTwitchPayoutPolicies,
  upsertTwitchRaidPolicy,
  type TwitchCampaign,
  type TwitchRaidPolicy,
} from '@/lib/paywall/twitchPayoutAPI';
import { formatUsdcAmount } from '@/lib/paywall/prPayoutAPI';

function CampaignCard({
  campaign,
  policy,
}: {
  campaign: TwitchCampaign;
  policy: TwitchRaidPolicy | undefined;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{campaign.name}</CardTitle>
          <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'} className="capitalize">
            {campaign.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          <span className="text-muted-foreground">Broadcaster:</span>{' '}
          <span className="font-mono text-xs">
            {campaign.broadcasterLoginSnapshot ?? campaign.broadcasterUserId}
          </span>
        </p>
        <p>
          <span className="text-muted-foreground">Budget:</span>{' '}
          <strong>{formatUsdcAmount(campaign.remainingBudgetUsdc)}</strong> /{' '}
          {formatUsdcAmount(campaign.totalBudgetUsdc)}
        </p>
        {policy ? (
          <p className="text-muted-foreground">
            Raid: min {policy.minViewers} viewers · {formatUsdcAmount(policy.ratePerViewerUsdc)}/viewer · cap{' '}
            {formatUsdcAmount(policy.maxPerEventUsdc)}/event
          </p>
        ) : (
          <p className="text-muted-foreground">No raid policy yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function LeptonTwitchCampaignPage() {
  const [campaigns, setCampaigns] = useState<TwitchCampaign[]>([]);
  const [policies, setPolicies] = useState<TwitchRaidPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [sponsorId, setSponsorId] = useState('lepton-demo');
  const [broadcasterUserId, setBroadcasterUserId] = useState('');
  const [broadcasterLogin, setBroadcasterLogin] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [totalBudget, setTotalBudget] = useState('10');
  const [minViewers, setMinViewers] = useState('5');
  const [ratePerViewer, setRatePerViewer] = useState('0.01');
  const [maxPerEvent, setMaxPerEvent] = useState('2');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [campaignRows, policyRows] = await Promise.all([
        fetchTwitchCampaigns(),
        fetchTwitchPayoutPolicies(),
      ]);
      setCampaigns(campaignRows);
      setPolicies(policyRows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load Twitch campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const policyByCampaign = (id: string) => policies.find((p) => p.campaignId === id);

  const handleCreate = async () => {
    if (!broadcasterUserId.trim() || !campaignName.trim()) {
      toast.error('Broadcaster user id and campaign name are required');
      return;
    }
    setSaving(true);
    try {
      const campaign = await createTwitchCampaign({
        sponsorId: sponsorId.trim() || 'lepton-demo',
        broadcasterUserId: broadcasterUserId.trim(),
        broadcasterLoginSnapshot: broadcasterLogin.trim() || undefined,
        name: campaignName.trim(),
        totalBudgetUsdc: parseFloat(totalBudget) || 10,
        status: 'active',
      });
      await upsertTwitchRaidPolicy({
        campaignId: campaign.id,
        minViewers: parseInt(minViewers, 10) || 0,
        ratePerViewerUsdc: parseFloat(ratePerViewer) || 0.01,
        maxPerEventUsdc: parseFloat(maxPerEvent) || 2,
      });
      toast.success('Twitch campaign and raid policy created');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create campaign');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Twitch Raid Campaign</h1>
          <p className="text-sm text-muted-foreground">
            Create a raid-to-pay campaign — incoming raids on the target channel pay the raiding
            streamer in USDC on Arc.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/lepton/twitch/receipts">Receipts</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/lepton">Hub</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New campaign + raid policy</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sponsorId">Sponsor id</Label>
            <Input id="sponsorId" value={sponsorId} onChange={(e) => setSponsorId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaignName">Campaign name</Label>
            <Input
              id="campaignName"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Hackathon raid pool"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="broadcasterUserId">Broadcaster Twitch user id</Label>
            <Input
              id="broadcasterUserId"
              value={broadcasterUserId}
              onChange={(e) => setBroadcasterUserId(e.target.value)}
              placeholder="12345678"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="broadcasterLogin">Broadcaster login (snapshot)</Label>
            <Input
              id="broadcasterLogin"
              value={broadcasterLogin}
              onChange={(e) => setBroadcasterLogin(e.target.value)}
              placeholder="channel_login"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="totalBudget">Total budget (USDC)</Label>
            <Input
              id="totalBudget"
              type="number"
              min="0.5"
              step="0.1"
              value={totalBudget}
              onChange={(e) => setTotalBudget(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minViewers">Min viewers</Label>
            <Input
              id="minViewers"
              type="number"
              min="0"
              value={minViewers}
              onChange={(e) => setMinViewers(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ratePerViewer">Rate per viewer (USDC)</Label>
            <Input
              id="ratePerViewer"
              type="number"
              min="0"
              step="0.001"
              value={ratePerViewer}
              onChange={(e) => setRatePerViewer(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxPerEvent">Max per raid (USDC)</Label>
            <Input
              id="maxPerEvent"
              type="number"
              min="0.5"
              step="0.1"
              value={maxPerEvent}
              onChange={(e) => setMaxPerEvent(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="button" onClick={() => void handleCreate()} disabled={saving}>
              {saving ? 'Creating…' : 'Create active campaign'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Existing campaigns</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : campaigns.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No campaigns yet. Create one above or via{' '}
            <code className="text-xs">POST /twitch/campaigns</code>.
          </p>
        ) : (
          campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} policy={policyByCampaign(c.id)} />
          ))
        )}
      </section>
    </div>
  );
}
