import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  fetchCitationSources,
  runCitationDemo,
  seedCitationFromPaywalls,
  type CitationRunResult,
  type CitationSource,
} from '@/lib/paywall/citationAPI';

export function LeptonCitationPage() {
  const [sources, setSources] = useState<CitationSource[]>([]);
  const [question, setQuestion] = useState(
    'How does Sendly route Arc USDC to social identities?',
  );
  const [result, setResult] = useState<CitationRunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const loadSources = useCallback(async () => {
    try {
      setSources(await fetchCitationSources());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load sources');
    }
  }, []);

  useEffect(() => {
    void loadSources();
  }, [loadSources]);

  const onSeed = async () => {
    setSeeding(true);
    try {
      const n = await seedCitationFromPaywalls();
      toast.success(`Seeded ${n} source(s) from paywalls`);
      await loadSources();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Seed failed');
    } finally {
      setSeeding(false);
    }
  };

  const onRun = async () => {
    setLoading(true);
    setResult(null);
    try {
      const data = await runCitationDemo(question);
      setResult(data);
      toast.success(`Paid ${data.citations.length} source(s) on Arc`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Demo agent failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Citation Demo Agent</h1>
          <p className="text-sm text-muted-foreground">
            Real ZkSend payments for registered paywall slugs - not scripted self-payment.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/lepton/receipts">Receipts</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => void onSeed()} disabled={seeding}>
              Seed from paywalls
            </Button>
            <Button variant="outline" size="sm" onClick={() => void loadSources()}>
              Refresh
            </Button>
          </div>
          {sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sources - seed from LEPTON_DEMO_SLUG paywall.</p>
          ) : (
            <ul className="text-sm space-y-1">
              {sources.map((s) => (
                <li key={s.id} className="font-mono text-xs">
                  {s.source_type}:{s.source_ref} → {s.platform}:{s.handle} ({s.price_usdc} USDC)
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Research question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} />
          <Button onClick={() => void onRun()} disabled={loading || sources.length === 0}>
            {loading ? 'Running…' : 'Run demo agent'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Answer + citations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="whitespace-pre-wrap text-sm">{result.answer}</pre>
            <div className="space-y-2">
              {result.citations.map((c) => (
                <div key={c.paymentId} className="rounded-md border p-3 text-xs font-mono">
                  <p>
                    {c.title} - {c.amountUsdc} USDC → {c.platform}:{c.handle}
                  </p>
                  <p className="text-muted-foreground">paymentId: {c.paymentId}</p>
                  <p className="text-muted-foreground break-all">tx: {c.txHash}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
