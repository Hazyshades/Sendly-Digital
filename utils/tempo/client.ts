import { createPublicClient, http, defineChain } from 'viem';

// Tempo Testnet chain definition
export const tempoTestnet = defineChain({
  id: 42431,
  name: 'Tempo Testnet',
  nativeCurrency: {
    name: 'USD',
    symbol: 'USD',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.moderato.tempo.xyz'],
    },
    public: {
      http: ['https://rpc.moderato.tempo.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Tempo Explorer',
      url: 'https://explore.tempo.xyz',
    },
  },
});

// Public client for Tempo
export const tempoClient = createPublicClient({
  chain: tempoTestnet,
  transport: http(),
});

// Predeployed contract addresses
export const TEMPO_CONTRACTS = {
  TIP20_FACTORY: '0x20fc000000000000000000000000000000000000' as const,
  FEE_MANAGER: '0xfeec000000000000000000000000000000000000' as const,
  STABLECOIN_DEX: '0xdec0000000000000000000000000000000000000' as const,
  TIP403_REGISTRY: '0x403c000000000000000000000000000000000000' as const,
  PATHUSD: '0x20c0000000000000000000000000000000000000' as const,
  ALPHAUSD: '0x20c0000000000000000000000000000000000001' as const,
  BETAUSD: '0x20c0000000000000000000000000000000000002' as const,
  THETAUSD: '0x20c0000000000000000000000000000000000003' as const,
} as const;
