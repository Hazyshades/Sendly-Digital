export interface ChainConfig {
  chainId: number;
  name: string;
  slug: string;
  domain: number;
  bridgeKitId: string;
  rpcUrl?: string;
  blockExplorer?: string;
  isTestnet: boolean;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    chainId: 1,
    name: 'Ethereum',
    slug: 'ethereum',
    domain: 0,
    bridgeKitId: 'Ethereum',
    blockExplorer: 'https://etherscan.io',
    isTestnet: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    slug: 'ethereum-sepolia',
    domain: 0,
    bridgeKitId: 'Ethereum_Sepolia',
    blockExplorer: 'https://sepolia.etherscan.io',
    isTestnet: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 43114,
    name: 'Avalanche',
    slug: 'avalanche',
    domain: 1,
    bridgeKitId: 'Avalanche',
    blockExplorer: 'https://snowtrace.io',
    isTestnet: false,
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 }
  },
  {
    chainId: 43113,
    name: 'Avalanche Fuji',
    slug: 'avalanche-fuji',
    domain: 1,
    bridgeKitId: 'Avalanche_Fuji',
    blockExplorer: 'https://testnet.snowtrace.io',
    isTestnet: true,
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 }
  },
  {
    chainId: 10,
    name: 'OP Mainnet',
    slug: 'optimism',
    domain: 2,
    bridgeKitId: 'Optimism',
    blockExplorer: 'https://optimistic.etherscan.io',
    isTestnet: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 11155420,
    name: 'OP Sepolia',
    slug: 'optimism-sepolia',
    domain: 2,
    bridgeKitId: 'Optimism_Sepolia',
    blockExplorer: 'https://sepolia-optimism.etherscan.io',
    isTestnet: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 42161,
    name: 'Arbitrum',
    slug: 'arbitrum',
    domain: 3,
    bridgeKitId: 'Arbitrum',
    blockExplorer: 'https://arbiscan.io',
    isTestnet: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    slug: 'arbitrum-sepolia',
    domain: 3,
    bridgeKitId: 'Arbitrum_Sepolia',
    blockExplorer: 'https://sepolia.arbiscan.io',
    isTestnet: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 8453,
    name: 'Base',
    slug: 'base',
    domain: 6,
    bridgeKitId: 'Base',
    blockExplorer: 'https://basescan.org',
    isTestnet: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 84532,
    name: 'Base Sepolia',
    slug: 'base-sepolia',
    domain: 6,
    bridgeKitId: 'Base_Sepolia',
    blockExplorer: 'https://base-sepolia.blockscout.com',
    isTestnet: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 137,
    name: 'Polygon PoS',
    slug: 'polygon',
    domain: 7,
    bridgeKitId: 'Polygon',
    blockExplorer: 'https://polygonscan.com',
    isTestnet: false,
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }
  },
  {
    chainId: 80002,
    name: 'Polygon PoS Amoy',
    slug: 'polygon-amoy',
    domain: 7,
    bridgeKitId: 'Polygon_Amoy',
    blockExplorer: 'https://amoy.polygonscan.com',
    isTestnet: true,
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }
  },
  {
    chainId: 1243,
    name: 'Unichain',
    slug: 'unichain',
    domain: 10,
    bridgeKitId: 'Unichain',
    blockExplorer: 'https://unichain.blockscout.com',
    isTestnet: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 1244,
    name: 'Unichain Sepolia',
    slug: 'unichain-sepolia',
    domain: 10,
    bridgeKitId: 'Unichain_Sepolia',
    blockExplorer: 'https://unichain-sepolia.blockscout.com',
    isTestnet: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 59144,
    name: 'Linea',
    slug: 'linea',
    domain: 11,
    bridgeKitId: 'Linea',
    blockExplorer: 'https://lineascan.build',
    isTestnet: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 59141,
    name: 'Linea Sepolia',
    slug: 'linea-sepolia',
    domain: 11,
    bridgeKitId: 'Linea_Sepolia',
    blockExplorer: 'https://sepolia.lineascan.build',
    isTestnet: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 87173,
    name: 'Codex',
    slug: 'codex',
    domain: 12,
    bridgeKitId: 'Codex',
    blockExplorer: 'https://codex-explorer.blockscout.com',
    isTestnet: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 87174,
    name: 'Codex Testnet',
    slug: 'codex-testnet',
    domain: 12,
    bridgeKitId: 'Codex_Testnet',
    blockExplorer: 'https://codex-testnet-explorer.blockscout.com',
    isTestnet: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 146,
    name: 'Sonic',
    slug: 'sonic',
    domain: 13,
    bridgeKitId: 'Sonic',
    blockExplorer: 'https://sonicscan.org',
    isTestnet: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 64165,
    name: 'Sonic Testnet',
    slug: 'sonic-testnet',
    domain: 13,
    bridgeKitId: 'Sonic_Testnet',
    blockExplorer: 'https://testnet.sonicscan.org',
    isTestnet: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 480,
    name: 'World Chain',
    slug: 'world-chain',
    domain: 14,
    bridgeKitId: 'World_Chain',
    blockExplorer: 'https://explorer.worldchain.com',
    isTestnet: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 481,
    name: 'World Chain Sepolia',
    slug: 'world-chain-sepolia',
    domain: 14,
    bridgeKitId: 'World_Chain_Sepolia',
    blockExplorer: 'https://sepolia-explorer.worldchain.com',
    isTestnet: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 1328,
    name: 'Monad Testnet',
    slug: 'monad-testnet',
    domain: 15,
    bridgeKitId: 'Monad_Testnet',
    blockExplorer: 'https://monad.blockscout.com',
    isTestnet: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 1329,
    name: 'Sei',
    slug: 'sei',
    domain: 16,
    bridgeKitId: 'Sei',
    blockExplorer: 'https://seitrace.com',
    isTestnet: false,
    nativeCurrency: { name: 'Sei', symbol: 'SEI', decimals: 18 }
  },
  {
    chainId: 713715,
    name: 'Sei Testnet',
    slug: 'sei-testnet',
    domain: 16,
    bridgeKitId: 'Sei_Testnet',
    blockExplorer: 'https://seitrace.com',
    isTestnet: true,
    nativeCurrency: { name: 'Sei', symbol: 'SEI', decimals: 18 }
  },
  {
    chainId: 56,
    name: 'BNB Smart Chain',
    slug: 'bsc',
    domain: 17,
    bridgeKitId: 'BNB_Smart_Chain',
    blockExplorer: 'https://bscscan.com',
    isTestnet: false,
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }
  },
  {
    chainId: 97,
    name: 'BNB Smart Chain Testnet',
    slug: 'bsc-testnet',
    domain: 17,
    bridgeKitId: 'BNB_Smart_Chain_Testnet',
    blockExplorer: 'https://testnet.bscscan.com',
    isTestnet: true,
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }
  },
  {
    chainId: 50,
    name: 'XDC',
    slug: 'xdc',
    domain: 18,
    bridgeKitId: 'XDC',
    blockExplorer: 'https://xdcscan.com',
    isTestnet: false,
    nativeCurrency: { name: 'XDC', symbol: 'XDC', decimals: 18 }
  },
  {
    chainId: 51,
    name: 'XDC Apothem',
    slug: 'xdc-apothem',
    domain: 18,
    bridgeKitId: 'XDC_Apothem',
    blockExplorer: 'https://apothem.xdcscan.com',
    isTestnet: true,
    nativeCurrency: { name: 'XDC', symbol: 'XDC', decimals: 18 }
  },
  {
    chainId: 998,
    name: 'HyperEVM',
    slug: 'hyperevm',
    domain: 19,
    bridgeKitId: 'HyperEVM',
    blockExplorer: 'https://hyperevm-explorer.blockscout.com',
    isTestnet: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 999,
    name: 'HyperEVM Testnet',
    slug: 'hyperevm-testnet',
    domain: 19,
    bridgeKitId: 'HyperEVM_Testnet',
    blockExplorer: 'https://hyperevm-testnet-explorer.blockscout.com',
    isTestnet: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 57073,
    name: 'Ink',
    slug: 'ink',
    domain: 21,
    bridgeKitId: 'Ink',
    blockExplorer: 'https://explorer.ink.wtf',
    isTestnet: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 57073,
    name: 'Ink Testnet',
    slug: 'ink-testnet',
    domain: 21,
    bridgeKitId: 'Ink_Testnet',
    blockExplorer: 'https://testnet.explorer.ink.wtf',
    isTestnet: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 161221135,
    name: 'Plume',
    slug: 'plume',
    domain: 22,
    bridgeKitId: 'Plume',
    blockExplorer: 'https://plume-explorer.blockscout.com',
    isTestnet: false,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 161221136,
    name: 'Plume Testnet',
    slug: 'plume-testnet',
    domain: 22,
    bridgeKitId: 'Plume_Testnet',
    blockExplorer: 'https://plume-testnet-explorer.blockscout.com',
    isTestnet: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  },
  {
    chainId: 5042002,
    name: 'Arc Testnet',
    slug: 'arc-testnet',
    domain: 26,
    bridgeKitId: 'Arc_Testnet',
    blockExplorer: 'https://testnet.arcscan.app',
    isTestnet: true,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
  }
];

export function getChainByChainId(chainId: number): ChainConfig | undefined {
  return SUPPORTED_CHAINS.find(chain => chain.chainId === chainId);
}

export function getChainBySlug(slug: string): ChainConfig | undefined {
  return SUPPORTED_CHAINS.find(chain => chain.slug === slug);
}

export function getChainByDomain(domain: number): ChainConfig | undefined {
  return SUPPORTED_CHAINS.find(chain => chain.domain === domain);
}

export function getChainByBridgeKitId(bridgeKitId: string): ChainConfig | undefined {
  return SUPPORTED_CHAINS.find(chain => chain.bridgeKitId === bridgeKitId);
}

