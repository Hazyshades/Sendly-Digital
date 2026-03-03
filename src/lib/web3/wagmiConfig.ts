import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain, http, type Chain } from 'viem';
import { createConfig } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { isZkLocalhost } from '@/lib/runtime/zkHost';

// Get WalletConnect project ID from environment for RainbowKit
const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || 'c4f79f821944d9680842e34466bfbd52';

// Arc Testnet chain definition driven by env variables
const arcChainId = Number(import.meta.env.VITE_ARC_CHAIN_ID || 5042002);
const arcName = import.meta.env.VITE_ARC_NAME || 'Arc Testnet';
const arcRpcUrl = import.meta.env.VITE_ARC_RPC_URL || 'https://rpc.testnet.arc.network';
const arcExplorerUrl = import.meta.env.VITE_ARC_BLOCK_EXPLORER_URL || 'https://testnet.arcscan.app';
const arcNativeSymbol = import.meta.env.VITE_ARC_SYMBOL || 'USDC';
const arcNativeName = import.meta.env.VITE_ARC_CURRENCY_NAME || 'USD Coin';
const arcNativeDecimals = Number(import.meta.env.VITE_ARC_DECIMALS || 18);

export const arcTestnet = defineChain({
  id: arcChainId,
  name: arcName,
  nativeCurrency: {
    name: arcNativeName,
    symbol: arcNativeSymbol,
    decimals: arcNativeDecimals,
  },
  rpcUrls: {
    default: { http: [arcRpcUrl] },
    public: { http: [arcRpcUrl] },
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: arcExplorerUrl },
  },
});

// Avalanche Fuji Testnet chain definition
const avaxChainId = Number(import.meta.env.VITE_AVAX_CHAIN_ID || 43113);
const avaxRpcUrl = import.meta.env.VITE_AVAX_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc';
const avaxExplorerUrl = import.meta.env.VITE_AVAX_BLOCK_EXPLORER_URL || 'https://testnet.snowtrace.io';

export const avalancheFuji = defineChain({
  id: avaxChainId,
  name: 'Avalanche Fuji',
  nativeCurrency: {
    name: 'Avalanche',
    symbol: 'AVAX',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [avaxRpcUrl] },
    public: { http: [avaxRpcUrl, 'https://avalanche-fuji-c-chain-rpc.publicnode.com'] },
  },
  blockExplorers: {
    default: { name: 'Snowtrace', url: avaxExplorerUrl },
  },
});

// Base Sepolia Testnet chain definition
const baseSepoliaChainId = Number(import.meta.env.VITE_BASE_CHAIN_ID || 84532);
const baseSepoliaRpcUrl = import.meta.env.VITE_BASE_RPC_URL || 'https://sepolia.base.org';
const baseSepoliaRpcFallback = import.meta.env.VITE_BASE_RPC_FALLBACK_URL || 'https://base-sepolia-rpc.publicnode.com';
const baseSepoliaExplorerUrl = import.meta.env.VITE_BASE_BLOCK_EXPLORER_URL || 'https://sepolia.basescan.org';

export const baseSepolia = defineChain({
  id: baseSepoliaChainId,
  name: 'Base Sepolia',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [baseSepoliaRpcUrl] },
    public: { http: [baseSepoliaRpcUrl, baseSepoliaRpcFallback] },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: baseSepoliaExplorerUrl },
  },
});

// RainbowKit configuration - getDefaultConfig automatically includes Rainbow Wallet
const allChains: [Chain, ...Chain[]] = [arcTestnet, avalancheFuji, baseSepolia];

export const config = isZkLocalhost()
  ? createConfig({
      chains: allChains,
      connectors: [injected()],
      transports: {
        [arcTestnet.id]: http(arcRpcUrl),
        [avalancheFuji.id]: http(avaxRpcUrl),
        [baseSepolia.id]: http(baseSepoliaRpcUrl),
      },
      ssr: false,
    })
  : getDefaultConfig({
      appName: 'Sendly NFT Gift Cards',
      projectId: projectId,
      chains: allChains,
      ssr: false,
    });

export const chains = allChains;