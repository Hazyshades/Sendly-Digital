import { defineChain, type Chain } from 'viem';

/** Platform key for social vault contracts. */
export type VaultPlatform =
  | 'twitter'
  | 'twitch'
  | 'telegram'
  | 'tiktok'
  | 'instagram';

export interface ChainContracts {
  chainId: number;
  contractAddress?: string;
  zksend: string;
  usdc: string;
  usdt?: string;
  eurc?: string;
  usyc?: string;
  pathusd?: string;
  alphausd?: string;
  betausd?: string;
  thetausd?: string;
  reclaimVerifier: string;
  vaultContract?: string;
  twitchVault?: string;
  telegramVault?: string;
  tiktokVault?: string;
  instagramVault?: string;
  directSend?: string;
  /** Escrow + claim (EIP-712). See `contracts/hardhat/DirectSendV2.sol`. */
  directSendV2?: string;
  rpcUrls: string[];
  explorerUrl: string;
  explorerApiUrl: string;
}

export interface ChainCapabilities {
  /** Circle developer / internal wallet flows are enabled for this chain. */
  supportsInternalWallet: boolean;
  /** Native currency is a stablecoin (no separate ETH/gas token). */
  noNativeGasToken: boolean;
}

export interface ChainEntry {
  chainId: number;
  name: string;
  viemChain: Chain;
  rpcUrls: string[];
  explorerUrl: string;
  explorerApiUrl: string;
  contracts: {
    usdc?: string;
    usdt?: string;
    eurc?: string;
    usyc?: string;
    pathusd?: string;
    alphausd?: string;
    betausd?: string;
    thetausd?: string;
    zkSend?: string;
    giftCard?: string;
    directSend?: string;
    directSendV2?: string;
    reclaimVerifier?: string;
    vaults?: Partial<Record<VaultPlatform, string>>;
  };
  capabilities: ChainCapabilities;
}

// ---------------------------------------------------------------------------
// Chain IDs (single definition)
// ---------------------------------------------------------------------------

export const ARC_CHAIN_ID = Number(import.meta.env.VITE_ARC_CHAIN_ID || 5042002);
export const TEMPO_CHAIN_ID = Number(import.meta.env.VITE_TEMPO_CHAIN_ID || 42431);
export const BASE_SEPOLIA_CHAIN_ID = Number(import.meta.env.VITE_BASE_CHAIN_ID || 84532);

// ---------------------------------------------------------------------------
// Address / RPC expressions — moved from constants.ts (env-first, same fallbacks)
// ---------------------------------------------------------------------------

const ARC_GIFTCARD =
  import.meta.env.VITE_ARC_CONTRACT_ADDRESS ||
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  '0x7f5c9e8548002134cde6093f2ca3ff5b8bd26982';

const ARC_USDC =
  import.meta.env.VITE_ARC_USDC_ADDRESS ||
  import.meta.env.VITE_USDC_ADDRESS ||
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const ARC_EURC =
  import.meta.env.VITE_ARC_EURC_ADDRESS ||
  '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a';

const ARC_USYC =
  import.meta.env.VITE_ARC_USYC_ADDRESS ||
  '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C';

const ARC_USDT =
  import.meta.env.VITE_USDT_ADDRESS || '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2';

const ARC_TWITTER_VAULT =
  import.meta.env.VITE_ARC_TWITTER_VAULT_ADDRESS ||
  import.meta.env.VITE_ARC_VAULT_CONTRACT_ADDRESS ||
  '0xF8A0870530bb7CD1D658742A079f85E91dFC8E3C';

const ARC_TWITCH_VAULT =
  import.meta.env.VITE_ARC_TWITCH_VAULT_CONTRACT_ADDRESS ||
  import.meta.env.VITE_ARC_TWITCH_VAULT_ADDRESS ||
  '0xA27E6Cef4e9d794EE0356461fe65437Bb5f7cbE3';

const ARC_TELEGRAM_VAULT =
  import.meta.env.VITE_ARC_TELEGRAM_VAULT_CONTRACT_ADDRESS ||
  import.meta.env.VITE_ARC_TELEGRAM_VAULT_ADDRESS ||
  '0x619A49213860A0448736880c4f456bCDfB96D938';

const ARC_TIKTOK_VAULT =
  import.meta.env.VITE_ARC_TIKTOK_VAULT_CONTRACT_ADDRESS ||
  import.meta.env.VITE_ARC_TIKTOK_VAULT_ADDRESS ||
  '0xA4A44F97B8778B4Da8b9562d56A94BfCc0fB9893';

const ARC_INSTAGRAM_VAULT =
  import.meta.env.VITE_ARC_INSTAGRAM_VAULT_CONTRACT_ADDRESS ||
  import.meta.env.VITE_ARC_INSTAGRAM_VAULT_ADDRESS ||
  '0x3332dEf130Ea17C69B9dFe8F06be1162526873df';

const ARC_ZKSEND =
  import.meta.env.VITE_ARC_ZKSEND_CONTRACT_ADDRESS ||
  '0x30bbcCBB38B8C99A36c93BC36dcE2F9831FEFa4D';

const ARC_DIRECT_SEND =
  import.meta.env.VITE_ARC_DIRECT_SEND_CONTRACT_ADDRESS ||
  '0x0000000000000000000000000000000000000000';

const ARC_DIRECT_SEND_V2 =
  import.meta.env.VITE_ARC_DIRECT_SEND_V2_CONTRACT_ADDRESS ||
  '0x55c1AaE779c774c5bB622045CC30278F64E90AAf';

const ARC_RECLAIM =
  import.meta.env.VITE_RECLAIM_VERIFIER_CONTRACT_ADDRESS ||
  import.meta.env.VITE_ARC_ZKTLS_VERIFIER_ADDRESS ||
  '0xfDd1D064529aA8c8058CDD574452c3FF9d6256a7';

const ARC_RPC_URLS: string[] = (
  import.meta.env.VITE_ARC_RPC_URLS?.split(',').map((s: string) => s.trim()).filter(Boolean) ||
  []
)
  .concat([import.meta.env.VITE_ARC_RPC_URL || 'https://rpc.testnet.arc.network'])
  .filter(Boolean);

const ARC_EXPLORER_URL =
  import.meta.env.VITE_ARC_BLOCK_EXPLORER_URL || 'https://testnet.arcscan.app';
const ARC_EXPLORER_API_URL = 'https://testnet.arcscan.app/api/v2';

const BASE_SEPOLIA_RPC_URLS: string[] = (
  import.meta.env.VITE_BASE_RPC_URLS?.split(',').map((s: string) => s.trim()).filter(Boolean) ||
  []
)
  .concat([
    import.meta.env.VITE_BASE_RPC_URL || 'https://sepolia.base.org',
    import.meta.env.VITE_BASE_RPC_FALLBACK_URL || 'https://base-sepolia-rpc.publicnode.com',
  ])
  .filter(Boolean);

const BASE_SEPOLIA_EXPLORER_URL =
  import.meta.env.VITE_BASE_BLOCK_EXPLORER_URL || 'https://sepolia.basescan.org';
const BASE_SEPOLIA_EXPLORER_API_URL = 'https://api-sepolia.basescan.org/api';

const BASE_SEPOLIA_ZKSEND = import.meta.env.VITE_BASE_ZKSEND_CONTRACT_ADDRESS || '';
const BASE_SEPOLIA_USDC =
  import.meta.env.VITE_BASE_USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const BASE_SEPOLIA_USDT = import.meta.env.VITE_BASE_USDT_ADDRESS || '';
const BASE_SEPOLIA_RECLAIM = import.meta.env.VITE_BASE_RECLAIM_VERIFIER_ADDRESS || '';
const BASE_SEPOLIA_DIRECT_SEND = import.meta.env.VITE_BASE_DIRECT_SEND_CONTRACT_ADDRESS || '';
const BASE_SEPOLIA_DIRECT_SEND_V2 =
  import.meta.env.VITE_BASE_DIRECT_SEND_V2_CONTRACT_ADDRESS ||
  '0x85a8A0cb107b03bc7a25DD54fF76cA2719B6F0be';

const TEMPO_RPC_URLS: string[] = (
  import.meta.env.VITE_TEMPO_RPC_URLS?.split(',').map((s: string) => s.trim()).filter(Boolean) ||
  []
)
  .concat([import.meta.env.VITE_TEMPO_RPC_URL || 'https://rpc.moderato.tempo.xyz'])
  .filter(Boolean);

const TEMPO_EXPLORER_URL =
  import.meta.env.VITE_TEMPO_BLOCK_EXPLORER_URL || 'https://explore.tempo.xyz';
const TEMPO_EXPLORER_API_URL =
  import.meta.env.VITE_TEMPO_BLOCK_EXPLORER_API_URL || 'https://explore.tempo.xyz/api';

const TEMPO_GIFTCARD = import.meta.env.VITE_TEMPO_GIFTCARD_CONTRACT_ADDRESS || '';
const TEMPO_ZKSEND = import.meta.env.VITE_TEMPO_ZKSEND_CONTRACT_ADDRESS || '';
const TEMPO_DIRECT_SEND = import.meta.env.VITE_TEMPO_DIRECT_SEND_CONTRACT_ADDRESS || '';
const TEMPO_DIRECT_SEND_V2 =
  import.meta.env.VITE_TEMPO_DIRECT_SEND_V2_CONTRACT_ADDRESS ||
  '0x7B46C6f4dcDF763608F2FA2652754E819d3c6E14';
const TEMPO_PATHUSD =
  import.meta.env.VITE_TEMPO_PATHUSD_ADDRESS || '0x20c0000000000000000000000000000000000000';
const TEMPO_ALPHAUSD =
  import.meta.env.VITE_TEMPO_ALPHAUSD_ADDRESS || '0x20c0000000000000000000000000000000000001';
const TEMPO_BETAUSD =
  import.meta.env.VITE_TEMPO_BETAUSD_ADDRESS || '0x20c0000000000000000000000000000000000002';
const TEMPO_THETAUSD =
  import.meta.env.VITE_TEMPO_THETAUSD_ADDRESS || '0x20c0000000000000000000000000000000000003';
const TEMPO_TWITTER_VAULT =
  import.meta.env.VITE_TEMPO_TWITTER_VAULT_ADDRESS ||
  import.meta.env.VITE_TEMPO_TWITTER_VAULT_CONTRACT_ADDRESS ||
  '';
const TEMPO_TWITCH_VAULT =
  import.meta.env.VITE_TEMPO_TWITCH_VAULT_ADDRESS ||
  import.meta.env.VITE_TEMPO_TWITCH_VAULT_CONTRACT_ADDRESS ||
  '';
const TEMPO_TELEGRAM_VAULT =
  import.meta.env.VITE_TEMPO_TELEGRAM_VAULT_ADDRESS ||
  import.meta.env.VITE_TEMPO_TELEGRAM_VAULT_CONTRACT_ADDRESS ||
  '';
const TEMPO_TIKTOK_VAULT =
  import.meta.env.VITE_TEMPO_TIKTOK_VAULT_ADDRESS ||
  import.meta.env.VITE_TEMPO_TIKTOK_VAULT_CONTRACT_ADDRESS ||
  '';
const TEMPO_INSTAGRAM_VAULT =
  import.meta.env.VITE_TEMPO_INSTAGRAM_VAULT_ADDRESS ||
  import.meta.env.VITE_TEMPO_INSTAGRAM_VAULT_CONTRACT_ADDRESS ||
  '';

// ---------------------------------------------------------------------------
// viem chain definitions (same env expressions as former wagmiConfig.ts)
// ---------------------------------------------------------------------------

const arcViemChain = defineChain({
  id: ARC_CHAIN_ID,
  name: import.meta.env.VITE_ARC_NAME || 'Arc Testnet',
  nativeCurrency: {
    name: import.meta.env.VITE_ARC_CURRENCY_NAME || 'USD Coin',
    symbol: import.meta.env.VITE_ARC_SYMBOL || 'USDC',
    decimals: Number(import.meta.env.VITE_ARC_DECIMALS || 18),
  },
  rpcUrls: {
    default: { http: [ARC_RPC_URLS[0]] },
    public: { http: [ARC_RPC_URLS[0]] },
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: ARC_EXPLORER_URL },
  },
});

const tempoViemChain = defineChain({
  id: TEMPO_CHAIN_ID,
  name: import.meta.env.VITE_TEMPO_NAME || 'Tempo Testnet',
  nativeCurrency: {
    name: import.meta.env.VITE_TEMPO_CURRENCY_NAME || 'USD',
    symbol: import.meta.env.VITE_TEMPO_SYMBOL || 'USD',
    decimals: Number(import.meta.env.VITE_TEMPO_DECIMALS || 18),
  },
  rpcUrls: {
    default: { http: [TEMPO_RPC_URLS[0]] },
    public: { http: [TEMPO_RPC_URLS[0]] },
  },
  blockExplorers: {
    default: { name: 'Tempo Explorer', url: TEMPO_EXPLORER_URL },
  },
});

const baseSepoliaViemChain = defineChain({
  id: BASE_SEPOLIA_CHAIN_ID,
  name: 'Base Sepolia',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [BASE_SEPOLIA_RPC_URLS[0]] },
    public: { http: [...BASE_SEPOLIA_RPC_URLS] },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: BASE_SEPOLIA_EXPLORER_URL },
  },
});

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

/**
 * Capabilities inferred from current app branching (conservative):
 * - supportsInternalWallet: only Arc (DeveloperWallet / ZkSendPanel disable Base+Tempo)
 * - noNativeGasToken: Arc (USDC native) and Tempo (USD native); Base Sepolia uses ETH
 */
const CHAIN_REGISTRY: Record<number, ChainEntry> = {
  [ARC_CHAIN_ID]: {
    chainId: ARC_CHAIN_ID,
    name: arcViemChain.name,
    viemChain: arcViemChain,
    rpcUrls: ARC_RPC_URLS,
    explorerUrl: ARC_EXPLORER_URL,
    explorerApiUrl: ARC_EXPLORER_API_URL,
    contracts: {
      usdc: ARC_USDC,
      usdt: ARC_USDT,
      eurc: ARC_EURC,
      usyc: ARC_USYC,
      zkSend: ARC_ZKSEND,
      giftCard: ARC_GIFTCARD,
      directSend: ARC_DIRECT_SEND,
      directSendV2: ARC_DIRECT_SEND_V2,
      reclaimVerifier: ARC_RECLAIM,
      vaults: {
        twitter: ARC_TWITTER_VAULT,
        twitch: ARC_TWITCH_VAULT,
        telegram: ARC_TELEGRAM_VAULT,
        tiktok: ARC_TIKTOK_VAULT,
        instagram: ARC_INSTAGRAM_VAULT,
      },
    },
    capabilities: {
      supportsInternalWallet: true,
      noNativeGasToken: true,
    },
  },
  [TEMPO_CHAIN_ID]: {
    chainId: TEMPO_CHAIN_ID,
    name: tempoViemChain.name,
    viemChain: tempoViemChain,
    rpcUrls: TEMPO_RPC_URLS,
    explorerUrl: TEMPO_EXPLORER_URL,
    explorerApiUrl: TEMPO_EXPLORER_API_URL,
    contracts: {
      usdc: TEMPO_PATHUSD,
      pathusd: TEMPO_PATHUSD,
      alphausd: TEMPO_ALPHAUSD,
      betausd: TEMPO_BETAUSD,
      thetausd: TEMPO_THETAUSD,
      zkSend: TEMPO_ZKSEND,
      giftCard: TEMPO_GIFTCARD,
      directSend: TEMPO_DIRECT_SEND,
      directSendV2: TEMPO_DIRECT_SEND_V2,
      reclaimVerifier: ARC_RECLAIM,
      vaults: {
        twitter: TEMPO_TWITTER_VAULT,
        twitch: TEMPO_TWITCH_VAULT,
        telegram: TEMPO_TELEGRAM_VAULT,
        tiktok: TEMPO_TIKTOK_VAULT,
        instagram: TEMPO_INSTAGRAM_VAULT,
      },
    },
    capabilities: {
      supportsInternalWallet: false,
      noNativeGasToken: true,
    },
  },
  [BASE_SEPOLIA_CHAIN_ID]: {
    chainId: BASE_SEPOLIA_CHAIN_ID,
    name: baseSepoliaViemChain.name,
    viemChain: baseSepoliaViemChain,
    rpcUrls: BASE_SEPOLIA_RPC_URLS,
    explorerUrl: BASE_SEPOLIA_EXPLORER_URL,
    explorerApiUrl: BASE_SEPOLIA_EXPLORER_API_URL,
    contracts: {
      usdc: BASE_SEPOLIA_USDC,
      usdt: BASE_SEPOLIA_USDT,
      zkSend: BASE_SEPOLIA_ZKSEND,
      directSend: BASE_SEPOLIA_DIRECT_SEND,
      directSendV2: BASE_SEPOLIA_DIRECT_SEND_V2,
      reclaimVerifier: BASE_SEPOLIA_RECLAIM,
    },
    capabilities: {
      supportsInternalWallet: false,
      noNativeGasToken: false,
    },
  },
};

/** Resolve a registered chain; unknown ids fall back to Arc (legacy getContractsForChain default). */
export function getChain(chainId: number): ChainEntry {
  return CHAIN_REGISTRY[chainId] ?? CHAIN_REGISTRY[ARC_CHAIN_ID];
}

export function getAllChains(): ChainEntry[] {
  return [CHAIN_REGISTRY[ARC_CHAIN_ID], CHAIN_REGISTRY[TEMPO_CHAIN_ID], CHAIN_REGISTRY[BASE_SEPOLIA_CHAIN_ID]];
}

/**
 * Mirrors former constants.ts getContractsForChain return shape exactly
 * (including Tempo vault/giftCard fallbacks onto Arc addresses).
 */
export function getContractsForChain(chainId: number): ChainContracts {
  if (chainId === BASE_SEPOLIA_CHAIN_ID) {
    const c = CHAIN_REGISTRY[BASE_SEPOLIA_CHAIN_ID];
    return {
      chainId: BASE_SEPOLIA_CHAIN_ID,
      contractAddress: undefined,
      zksend: c.contracts.zkSend ?? '',
      usdc: c.contracts.usdc!,
      usdt: c.contracts.usdt || undefined,
      reclaimVerifier: c.contracts.reclaimVerifier ?? '',
      directSend: c.contracts.directSend || undefined,
      directSendV2: c.contracts.directSendV2 || undefined,
      rpcUrls: [...c.rpcUrls],
      explorerUrl: c.explorerUrl,
      explorerApiUrl: c.explorerApiUrl,
    };
  }

  if (chainId === TEMPO_CHAIN_ID) {
    const c = CHAIN_REGISTRY[TEMPO_CHAIN_ID];
    const arc = CHAIN_REGISTRY[ARC_CHAIN_ID];
    return {
      chainId: TEMPO_CHAIN_ID,
      contractAddress: c.contracts.giftCard || arc.contracts.giftCard,
      zksend: c.contracts.zkSend ?? '',
      usdc: c.contracts.pathusd!,
      pathusd: c.contracts.pathusd,
      alphausd: c.contracts.alphausd,
      betausd: c.contracts.betausd,
      thetausd: c.contracts.thetausd,
      reclaimVerifier: arc.contracts.reclaimVerifier!,
      vaultContract: c.contracts.vaults?.twitter || arc.contracts.vaults?.twitter,
      twitchVault: c.contracts.vaults?.twitch || arc.contracts.vaults?.twitch,
      telegramVault: c.contracts.vaults?.telegram || arc.contracts.vaults?.telegram,
      tiktokVault: c.contracts.vaults?.tiktok || arc.contracts.vaults?.tiktok,
      instagramVault: c.contracts.vaults?.instagram || arc.contracts.vaults?.instagram,
      directSend: c.contracts.directSend || undefined,
      directSendV2: c.contracts.directSendV2 || undefined,
      rpcUrls: [...c.rpcUrls],
      explorerUrl: c.explorerUrl,
      explorerApiUrl: c.explorerApiUrl,
    };
  }

  // Default: Arc Testnet
  const c = CHAIN_REGISTRY[ARC_CHAIN_ID];
  return {
    chainId: ARC_CHAIN_ID,
    contractAddress: c.contracts.giftCard,
    zksend: c.contracts.zkSend!,
    usdc: c.contracts.usdc!,
    usdt: c.contracts.usdt,
    eurc: c.contracts.eurc,
    usyc: c.contracts.usyc,
    reclaimVerifier: c.contracts.reclaimVerifier!,
    vaultContract: c.contracts.vaults?.twitter,
    twitchVault: c.contracts.vaults?.twitch,
    telegramVault: c.contracts.vaults?.telegram,
    tiktokVault: c.contracts.vaults?.tiktok,
    instagramVault: c.contracts.vaults?.instagram,
    directSend: c.contracts.directSend,
    directSendV2: c.contracts.directSendV2 || undefined,
    rpcUrls: [...c.rpcUrls],
    explorerUrl: c.explorerUrl,
    explorerApiUrl: c.explorerApiUrl,
  };
}

/**
 * Map a token contract address to its symbol using the chain registry.
 * Unknown addresses fall back to USDC (legacy SpendCard / web3Service behavior).
 */
export function tokenSymbolForAddress(chainId: number, address: string): string {
  const c = getContractsForChain(chainId);
  const normalized = address.toLowerCase();

  if (c.usdc && normalized === c.usdc.toLowerCase()) return 'USDC';
  if (c.eurc && normalized === c.eurc.toLowerCase()) return 'EURC';
  if (c.usyc && normalized === c.usyc.toLowerCase()) return 'USYC';
  if (c.pathusd && normalized === c.pathusd.toLowerCase()) return 'PATHUSD';
  if (c.alphausd && normalized === c.alphausd.toLowerCase()) return 'ALPHAUSD';
  if (c.betausd && normalized === c.betausd.toLowerCase()) return 'BETAUSD';
  if (c.thetausd && normalized === c.thetausd.toLowerCase()) return 'THETAUSD';
  if (c.usdt && normalized === c.usdt.toLowerCase()) return 'USDC';

  return 'USDC';
}

/** Named viem chains for wagmi / importers (stable identity). */
export const arcTestnet = arcViemChain;
export const tempoTestnet = tempoViemChain;
export const baseSepolia = baseSepoliaViemChain;
