/**
 * ChainConfig - centralized configuration for all supported networks
 * Contains chain metadata, capabilities, quirks, and contract addresses
 */

export interface ChainCapabilities {
  supportsInternalWallet: boolean;
  supportsGiftCards: boolean;
  supportsLeaderboard: boolean;
}

export interface ChainQuirks {
  disableNativeBalanceChecks?: boolean;
  noNativeGasToken?: boolean;
}

export interface ChainContracts {
  giftCard?: string;
  twitterVault?: string;
  twitchVault?: string;
  telegramVault?: string;
  tiktokVault?: string;
  instagramVault?: string;
  usdc?: string;
  eurc?: string;
  usyc?: string;
}

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrls: string[];
  explorerUrl: string;
  nativeSymbol: string;
  contracts: ChainContracts;
  capabilities: ChainCapabilities;
  quirks?: ChainQuirks;
}

// ARC chain ID (from .env)
const ARC_CHAIN_ID = Number(import.meta.env.VITE_ARC_CHAIN_ID || 5042002);
const TEMPO_CHAIN_ID = Number(import.meta.env.VITE_TEMPO_CHAIN_ID || 42431);

export const SUPPORTED_CHAIN_CONFIGS: ChainConfig[] = [
  {
    chainId: ARC_CHAIN_ID,
    name: 'ARC',
    rpcUrls: [import.meta.env.VITE_ARC_RPC_URL || 'https://rpc.testnet.arc.network'],
    explorerUrl: import.meta.env.VITE_ARC_BLOCK_EXPLORER_URL || 'https://testnet.arcscan.app',
    nativeSymbol: import.meta.env.VITE_ARC_SYMBOL || 'USDC',
    contracts: {
      giftCard: import.meta.env.VITE_ARC_CONTRACT_ADDRESS || '0x5743fd9c6372bE37B2CE8884EA9e8bF291132677',
      twitterVault: import.meta.env.VITE_ARC_TWITTER_VAULT_ADDRESS || '0xF8A0870530bb7CD1D658742A079f85E91dFC8E3C',
      twitchVault: import.meta.env.VITE_ARC_TWITCH_VAULT_ADDRESS || '0xA27E6Cef4e9d794EE0356461fe65437Bb5f7cbE3',
      telegramVault: import.meta.env.VITE_ARC_TELEGRAM_VAULT_ADDRESS || '0x619A49213860A0448736880c4f456bCDfB96D938',
      tiktokVault: import.meta.env.VITE_ARC_TIKTOK_VAULT_ADDRESS || '0xA4A44F97B8778B4Da8b9562d56A94BfCc0fB9893',
      instagramVault: import.meta.env.VITE_ARC_INSTAGRAM_VAULT_ADDRESS || '0x3332dEf130Ea17C69B9dFe8F06be1162526873df',
      usdc: import.meta.env.VITE_ARC_USDC_ADDRESS || '0x3600000000000000000000000000000000000000',
      eurc: import.meta.env.VITE_ARC_EURC_ADDRESS || '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a',
      usyc: import.meta.env.VITE_ARC_USYC_ADDRESS || '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C',
    },
    capabilities: {
      supportsInternalWallet: true,
      supportsGiftCards: true,
      supportsLeaderboard: true,
    },
  },
  {
    chainId: TEMPO_CHAIN_ID,
    name: 'TEMPO',
    rpcUrls: [import.meta.env.VITE_TEMPO_RPC_URL || 'https://rpc.moderato.tempo.xyz'],
    explorerUrl: import.meta.env.VITE_TEMPO_BLOCK_EXPLORER_URL || 'https://explore.tempo.xyz',
    nativeSymbol: 'USD',
    contracts: {
      giftCard: import.meta.env.VITE_TEMPO_GIFTCARD_CONTRACT_ADDRESS || '0xFeA4c1C36A51a1278544e8E28DBFe1D6D60fb4FC',
      twitterVault: import.meta.env.VITE_TEMPO_TWITTER_VAULT_ADDRESS || '0xE340c3B67E08cBA1d3e868Bae929c59a325D9d08',
      twitchVault: import.meta.env.VITE_TEMPO_TWITCH_VAULT_ADDRESS || '0x64657047FBe8E834eC8C0e90CE12bA7a9FF28c74',
      telegramVault: import.meta.env.VITE_TEMPO_TELEGRAM_VAULT_ADDRESS || '0x7c35091793f1137450E68a645F00d0e9eDdE00bd',
      usdc: import.meta.env.VITE_TEMPO_PATHUSD_ADDRESS || '0x20c0000000000000000000000000000000000000',
    },
    capabilities: {
      supportsInternalWallet: false, // Internal Wallet is only available on ARC
      supportsGiftCards: true,
      supportsLeaderboard: true,
    },
    quirks: {
      disableNativeBalanceChecks: true, // Tempo has no native gas token
      noNativeGasToken: true,
    },
  },
  // Base will be added later in Phase 3
  // {
  //   chainId: BASE_CHAIN_ID,
  //   name: 'BASE',
  //   ...
  // }
];

/**
 * Get chain configuration by chainId
 */
export function getChainConfigByChainId(chainId: number): ChainConfig | undefined {
  return SUPPORTED_CHAIN_CONFIGS.find((config) => config.chainId === chainId);
}

/**
 * Get chain configuration by name
 */
export function getChainConfigByName(name: string): ChainConfig | undefined {
  return SUPPORTED_CHAIN_CONFIGS.find((config) => config.name.toUpperCase() === name.toUpperCase());
}

/**
 * Get default ARC chainId
 */
export function getDefaultChainId(): number {
  return ARC_CHAIN_ID;
}

/**
 * Check whether the chain supports Internal Wallet
 */
export function supportsInternalWallet(chainId: number): boolean {
  const config = getChainConfigByChainId(chainId);
  return config?.capabilities.supportsInternalWallet ?? false;
}

/**
 * Check whether native balance checks should be disabled
 */
export function shouldDisableNativeBalanceChecks(chainId: number): boolean {
  const config = getChainConfigByChainId(chainId);
  return config?.quirks?.disableNativeBalanceChecks ?? false;
}