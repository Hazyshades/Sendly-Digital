import { getCreatorPaywallBase } from '@/lib/paywall/prPayoutAPI';
import { publicAnonKey } from '@/lib/supabase/info';

export type LeptonCatalogResource = {
  type: string;
  url: string;
  method: string;
  description: string;
};

export type LeptonCatalogSettlement = {
  chainId: string;
  contractAddress: string | null;
  usdcAddress: string;
  method: string;
  platformSource?: string;
  supportedPlatforms?: string[];
  minPriceUsdc?: string;
};

export type LeptonCatalogExample = {
  slug: string;
  url: string;
  method: string;
  description: string;
};

export type LeptonCatalogResponse = {
  service: string;
  description: string;
  hackathon: string;
  hero: string;
  auth: string;
  resources: LeptonCatalogResource[];
  settlement: LeptonCatalogSettlement;
  example?: LeptonCatalogExample;
};

async function catalogFetch(path: string): Promise<LeptonCatalogResponse> {
  const base = getCreatorPaywallBase();
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${publicAnonKey}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return data as LeptonCatalogResponse;
}

export async function fetchLeptonCatalog(): Promise<LeptonCatalogResponse> {
  return catalogFetch('/lepton-hackathon');
}
