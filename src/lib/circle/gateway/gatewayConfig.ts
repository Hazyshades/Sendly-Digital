import { GatewayClient } from './gatewayClient';

export interface GatewayContractConfig {
  wallet: string;  // Gateway Wallet contract address
  minter: string;    // Gateway Minter contract address
  usdc: string;      // USDC token address
  domain: number;     // Domain ID for this network
}

// Cache for contract addresses (updated via API)
let contractsCache: Map<number, GatewayContractConfig> = new Map();
let contractsCacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get contract configuration for network
 * First tries to get from cache, then from API
 */
export async function getGatewayConfig(
  chainId: number,
  client?: GatewayClient
): Promise<GatewayContractConfig | null> {
  // Check cache
  const now = Date.now();
  if (contractsCache.has(chainId) && (now - contractsCacheTimestamp) < CACHE_TTL) {
    return contractsCache.get(chainId)!;
  }

  // Get from API
  if (!client) {
    client = new GatewayClient();
  }

  try {
    const info = await client.info();
    const chainInfo = info.supportedChains.find(c => c.chainId === chainId);
    
    if (!chainInfo) {
      return null;
    }

    const config: GatewayContractConfig = {
      wallet: chainInfo.gatewayWallet,
      minter: chainInfo.gatewayMinter,
      usdc: chainInfo.usdc,
      domain: chainInfo.domain,
    };

    // Update cache
    contractsCache.set(chainId, config);
    contractsCacheTimestamp = now;

    return config;
  } catch (error) {
    console.error('Failed to fetch Gateway config from API:', error);
    // Fallback to static addresses (if known)
    return getStaticGatewayConfig(chainId);
  }
}

/**
 * Static contract addresses (fallback)
 * IMPORTANT: These addresses may become outdated, always prefer API
 */
function getStaticGatewayConfig(chainId: number): GatewayContractConfig | null {
  // These addresses need to be obtained from Circle documentation or quickstart example
  // Leaving empty for now, as addresses should be obtained via API
  const staticConfigs: Record<number, GatewayContractConfig> = {
    // Testnet
    11155111: { // Sepolia
      wallet: '', // Get from quickstart or documentation
      minter: '',
      usdc: '',
      domain: 0,
    },
    43113: { // Avalanche Fuji
      wallet: '',
      minter: '',
      usdc: '',
      domain: 1,
    },
    84532: { // Base Sepolia
      wallet: '',
      minter: '',
      usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      domain: 6,
    },
    // Mainnet
    1: { // Ethereum
      wallet: '',
      minter: '',
      usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      domain: 0,
    },
    // ... other networks
  };

  return staticConfigs[chainId] || null;
}

/**
 * Check if network is supported by Gateway
 */
export async function isGatewaySupported(
  chainId: number,
  client?: GatewayClient
): Promise<boolean> {
  const config = await getGatewayConfig(chainId, client);
  return config !== null;
}

