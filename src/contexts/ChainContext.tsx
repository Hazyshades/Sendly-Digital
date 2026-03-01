import { createContext, useContext, useState, useMemo, useEffect, ReactNode } from 'react';
import { chains } from '@/lib/web3/wagmiConfig';
import { getContractsForChain, type ChainContracts } from '@/lib/web3/constants';
import type { Chain } from 'viem';

const ARC_CHAIN_ID = Number(import.meta.env.VITE_ARC_CHAIN_ID || 5042002);
const STORAGE_KEY = 'sendly_active_chain_id';

type ChainContextType = {
  activeChainId: number;
  switchChain: (chainId: number) => void;
  activeChain: Chain;
  contracts: ChainContracts;
  isSupportedChain: (chainId: number) => boolean;
};

const ChainContext = createContext<ChainContextType | undefined>(undefined);

function getStoredChainId(): number {
  if (typeof window === 'undefined') return ARC_CHAIN_ID;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const id = parseInt(stored, 10);
      if (chains.some((c) => c.id === id)) return id;
    }
  } catch (_) {}
  return ARC_CHAIN_ID;
}

export function ChainProvider({ children }: { children: ReactNode }) {
  const [activeChainId, setActiveChainId] = useState<number>(getStoredChainId);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(activeChainId));
    } catch (_) {}
  }, [activeChainId]);

  const switchChain = (chainId: number) => {
    if (chains.some((c) => c.id === chainId)) {
      setActiveChainId(chainId);
    }
  };

  const activeChain = useMemo(
    () => chains.find((c) => c.id === activeChainId) ?? chains[0],
    [activeChainId]
  );

  const contracts = useMemo(() => getContractsForChain(activeChainId), [activeChainId]);

  const isSupportedChain = (chainId: number) => chains.some((c) => c.id === chainId);

  const value = useMemo(
    () => ({
      activeChainId,
      switchChain,
      activeChain,
      contracts,
      isSupportedChain,
    }),
    [activeChainId, activeChain, contracts]
  );

  return <ChainContext.Provider value={value}>{children}</ChainContext.Provider>;
}

export function useChain() {
  const context = useContext(ChainContext);
  if (!context) {
    throw new Error('useChain must be used within ChainProvider');
  }
  return context;
}
