import { creatorPaywallClient } from '@/lib/paywall/paywallClient';

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

export async function fetchLeptonCatalog(): Promise<LeptonCatalogResponse> {
  return creatorPaywallClient<LeptonCatalogResponse>('/lepton-hackathon');
}
