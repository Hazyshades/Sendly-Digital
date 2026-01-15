import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';

// Get WalletConnect project ID from environment for RainbowKit
const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || 'c4f79f821944d9680842e34466bfbd52';

// Debug: Log environment variables
console.log('Environment variables:', import.meta.env);
console.log('WalletConnect Project ID:', projectId);

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

// Tempo Testnet chain definition
const tempoChainId = Number(import.meta.env.VITE_TEMPO_CHAIN_ID || 42431);
const tempoName = import.meta.env.VITE_TEMPO_NAME || 'Tempo Testnet';
const tempoRpcUrl = import.meta.env.VITE_TEMPO_RPC_URL || 'https://rpc.moderato.tempo.xyz';
const tempoExplorerUrl = import.meta.env.VITE_TEMPO_BLOCK_EXPLORER_URL || 'https://explore.tempo.xyz';
const tempoNativeSymbol = import.meta.env.VITE_TEMPO_SYMBOL || 'USD';
const tempoNativeName = import.meta.env.VITE_TEMPO_CURRENCY_NAME || 'USD';
const tempoNativeDecimals = Number(import.meta.env.VITE_TEMPO_DECIMALS || 18);

export const tempoTestnet = defineChain({
  id: tempoChainId,
  name: tempoName,
  nativeCurrency: {
    name: tempoNativeName,
    symbol: tempoNativeSymbol,
    decimals: tempoNativeDecimals,
  },
  rpcUrls: {
    default: { http: [tempoRpcUrl] },
    public: { http: [tempoRpcUrl] },
  },
  blockExplorers: {
    default: { name: 'Tempo Explorer', url: tempoExplorerUrl },
  },
});

// RainbowKit configuration - getDefaultConfig automatically includes Rainbow Wallet
export const config = getDefaultConfig({
  appName: 'Sendly NFT Gift Cards',
  projectId: projectId,
  chains: [arcTestnet, tempoTestnet], // Добавляем обе сети
  ssr: false,
});

export const chains = [arcTestnet, tempoTestnet];