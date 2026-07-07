import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  fetchLeptonCatalog,
  type LeptonCatalogResource,
  type LeptonCatalogResponse,
} from '@/lib/paywall/leptonCatalogAPI';

type LeptonCatalogViewProps = {
  embedded?: boolean;
};

export function LeptonCatalogView({ embedded = false }: LeptonCatalogViewProps) {
  const [catalog, setCatalog] = useState<LeptonCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCatalog(await fetchLeptonCatalog());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load catalog');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${embedded ? 'py-4' : 'p-6'}`}>
        <Loader2 className="size-4 animate-spin" />
        Loading agent catalog…
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-3 text-sm ${embedded ? 'py-2' : 'p-6'}`}>
        <p className="text-destructive">{error}</p>
        <button type="button" className="text-primary underline" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  if (!catalog) return null;

  return (
    <div className={embedded ? 'space-y-4' : 'mx-auto max-w-3xl space-y-6 p-6'}>
      {!embedded && (
        <div>
          <h2 className="text-lg font-semibold">Agent API Catalog</h2>
          <p className="text-sm text-muted-foreground">{catalog.description}</p>
        </div>
      )}

      <div className="rounded-md border p-4 text-sm space-y-2">
        <p className="font-medium">Settlement</p>
        <p>
          <span className="text-muted-foreground">Chain:</span> {catalog.settlement.chainId}
        </p>
        <p>
          <span className="text-muted-foreground">ZkSend:</span>{' '}
          <code className="text-xs break-all">{catalog.settlement.contractAddress ?? '-'}</code>
        </p>
        <p>
          <span className="text-muted-foreground">USDC:</span>{' '}
          <code className="text-xs break-all">{catalog.settlement.usdcAddress}</code>
        </p>
        <p>
          <span className="text-muted-foreground">Method:</span> {catalog.settlement.method}
        </p>
      </div>

      {catalog.example && (
        <div className="rounded-md border border-dashed p-3 text-sm">
          <p className="font-medium mb-1">Example paywall</p>
          <p className="text-muted-foreground text-xs mb-1">{catalog.example.description}</p>
          <code className="text-xs break-all">{catalog.example.url}</code>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-sm font-medium">Resources ({catalog.resources.length})</p>
        {catalog.resources.map((r: LeptonCatalogResource) => (
          <div key={`${r.type}-${r.url}`} className="rounded-md border p-3 text-sm space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{r.type}</Badge>
              <Badge variant="outline">{r.method}</Badge>
            </div>
            <p className="text-muted-foreground">{r.description}</p>
            <code className="text-xs break-all block">{r.url}</code>
          </div>
        ))}
      </div>
    </div>
  );
}
