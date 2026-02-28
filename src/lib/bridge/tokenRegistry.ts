import { SUPPORTED_CHAINS } from './chainRegistry';

export interface TokenConfig {
  symbol: string;
  name: string;
  decimals: number;
  addresses: Record<number, string>;
  supportedChainIds: number[];
}

export const TOKENS: Record<string, TokenConfig> = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    addresses: {
      // Mainnet
      1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      43114: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
      10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      1243: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      59144: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
      87173: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      146: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      480: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      1329: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      50: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      998: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      57073: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      161221135: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      
      // Testnet
      11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      43113: '0x5425890298aed601595a70AB815c96711a31Bc65',
      11155420: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
      421614: '0x75faf114eafb1BDbe2F0316DF893fd58Ce51AA87',
      84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      80002: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
      1244: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      59141: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
      87174: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      64165: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      481: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      1328: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      713715: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      51: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      999: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      161221136: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      5042002: '0x3600000000000000000000000000000000000000'
    },
    supportedChainIds: SUPPORTED_CHAINS
      .filter(chain => chain.chainId !== 56 && chain.chainId !== 97)
      .map(chain => chain.chainId)
  },
  EURC: {
    symbol: 'EURC',
    name: 'Euro Coin',
    decimals: 6,
    addresses: {
      // Mainnet
      1: '0x1aBaEA1f7C829bD88f5cE0fF5Cb0B4e6D5B0e5C',
      43114: '0xc891eb4cbdeff6e073e859e987815ed1505c2ACD',
      10: '0x6959c69e8f2dE2b8B7B58B0D8d6b7Dd7B7D8B7d8',
      42161: '0xC315fCfAF3F3f4bCf0C276F36C5327C82B33E5D8',
      8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      137: '0xE6469Ba6D2fD6130788E0eA9C0a0515900563b59',
      59144: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
      146: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      
      // Testnet
      11155111: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      43113: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      11155420: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      421614: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      84532: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      80002: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      59141: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
      5042002: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a'
    },
    supportedChainIds: [
      1, 11155111,
      43114, 43113,
      10, 11155420,
      42161, 421614,
      8453, 84532,
      137, 80002,
      59144, 59141,
      146, 64165,
      5042002
    ]
  },
  USYC: {
    symbol: 'USYC',
    name: 'US Yield Coin',
    decimals: 6,
    addresses: {
      5042002: '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C'
    },
    supportedChainIds: [
      5042002
    ]
  }
};

export function getTokenAddress(tokenSymbol: string, chainId: number): string | undefined {
  const token = TOKENS[tokenSymbol.toUpperCase()];
  if (!token) {
    return undefined;
  }
  return token.addresses[chainId];
}

export function isTokenSupported(tokenSymbol: string, chainId: number): boolean {
  const token = TOKENS[tokenSymbol.toUpperCase()];
  if (!token) {
    return false;
  }
  return token.supportedChainIds.includes(chainId);
}

export function getSupportedTokensForChain(chainId: number): TokenConfig[] {
  return Object.values(TOKENS).filter(token => 
    token.supportedChainIds.includes(chainId)
  );
}

export function getTokenByAddress(address: string, chainId: number): TokenConfig | undefined {
  const normalizedAddress = address.toLowerCase();
  if (normalizedAddress === '0x0000000000000000000000000000000000000000' || 
      normalizedAddress === 'native') {
    return undefined;
  }
  return Object.values(TOKENS).find(token => {
    const tokenAddress = token.addresses[chainId];
    return tokenAddress && tokenAddress.toLowerCase() === normalizedAddress;
  });
}
