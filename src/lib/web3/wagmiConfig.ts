import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http, type Chain } from 'viem';
import { createConfig } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { isZkLocalhost } from '@/lib/runtime/zkHost';
import {
  ARC_CHAIN_ID,
  TEMPO_CHAIN_ID,
  BASE_SEPOLIA_CHAIN_ID,
  arcTestnet,
  tempoTestnet,
  baseSepolia,
  getChain,
} from './chains';

export { arcTestnet, tempoTestnet, baseSepolia };

// Get WalletConnect project ID from environment for RainbowKit
const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || 'c4f79f821944d9680842e34466bfbd52';

const arcRpcUrl = getChain(ARC_CHAIN_ID).rpcUrls[0];
const tempoRpcUrl = getChain(TEMPO_CHAIN_ID).rpcUrls[0];
const baseSepoliaRpcUrl = getChain(BASE_SEPOLIA_CHAIN_ID).rpcUrls[0];

// RainbowKit configuration - getDefaultConfig automatically includes Rainbow Wallet
const allChains: [Chain, ...Chain[]] = [arcTestnet, tempoTestnet, baseSepolia];
// The browser suite supplies a deterministic EIP-1193 provider. Keep
// RainbowKit's remote connector discovery out of that test-only runtime.
const isE2E =
  import.meta.env.MODE === 'e2e' &&
  (import.meta.env.VITE_E2E === 'true' || import.meta.env.VITE_E2E === '1');
const useInjectedOnlyConfig = isZkLocalhost() || isE2E;

export const config = useInjectedOnlyConfig
  ? createConfig({
      chains: allChains,
      connectors: [injected()],
      transports: {
        [arcTestnet.id]: http(arcRpcUrl),
        [tempoTestnet.id]: http(tempoRpcUrl),
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
