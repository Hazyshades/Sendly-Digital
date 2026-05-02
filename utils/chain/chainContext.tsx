/**
 * ChainContext - React Context for managing the selected chain
 * Allows components to read the current chain and switch between chains
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAccount, useChainId, useSwitchChain, useWalletClient } from 'wagmi';
import { getChainConfigByChainId, getDefaultChainId, type ChainConfig } from './chainConfig';

interface ChainContextType {
  selectedChainId: number;
  selectedChain: ChainConfig | undefined;
  setSelectedChainId: (chainId: number) => void;
  switchWalletToSelectedChain: () => Promise<boolean>;
  isSwitching: boolean;
}

const ChainContext = createContext<ChainContextType | undefined>(undefined);

const STORAGE_KEY = 'selectedChainId';

interface ChainProviderProps {
  children: ReactNode;
}

export function ChainProvider({ children }: ChainProviderProps) {
  const { isConnected } = useAccount();
  const connectedChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: walletClient } = useWalletClient();

  // Load saved chain from localStorage or default to ARC
  const [selectedChainId, setSelectedChainIdState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    }
    return getDefaultChainId();
  });

  const [isSwitching, setIsSwitching] = useState(false);

  const selectedChain = getChainConfigByChainId(selectedChainId);

  // Optional: sync with the wallet's currently connected chain (if wallet is connected)
  useEffect(() => {
    if (isConnected && connectedChainId) {
      // If wallet is connected to a supported chain, we could update selectedChainId
      const chainConfig = getChainConfigByChainId(connectedChainId);
      if (chainConfig && connectedChainId !== selectedChainId) {
        // Optional: auto-sync with wallet. Uncomment if desired:
        // setSelectedChainIdState(connectedChainId);
      }
    }
  }, [isConnected, connectedChainId, selectedChainId]);

  // Persist selected chain to localStorage
  const setSelectedChainId = useCallback((chainId: number) => {
    setSelectedChainIdState(chainId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, chainId.toString());
    }
  }, []);

  // Switch wallet to selected chain (EIP-1193)
  const switchWalletToSelectedChain = useCallback(async (): Promise<boolean> => {
    if (!walletClient || !isConnected) {
      // If wallet is not connected, we only persist the selection
      return true;
    }

    if (connectedChainId === selectedChainId) {
      // Already on the desired chain
      return true;
    }

    setIsSwitching(true);

    try {
      // First try wagmi switchChain
      if (switchChain) {
        await switchChain({ chainId: selectedChainId });
        return true;
      }

      // Fallback: direct EIP-1193 request
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${selectedChainId.toString(16)}` }],
          });
          return true;
        } catch (switchError: any) {
          // If the chain is not added to the wallet, add it
          if (switchError.code === 4902 && selectedChain) {
            try {
              await (window as any).ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: `0x${selectedChainId.toString(16)}`,
                    chainName: selectedChain.name,
                    nativeCurrency: {
                      name: selectedChain.nativeSymbol,
                      symbol: selectedChain.nativeSymbol,
                      decimals: 18,
                    },
                    rpcUrls: selectedChain.rpcUrls,
                    blockExplorerUrls: [selectedChain.explorerUrl],
                  },
                ],
              });
              // After adding, try switching again
              await (window as any).ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${selectedChainId.toString(16)}` }],
              });
              return true;
            } catch (addError) {
              console.error('Failed to add chain:', addError);
              return false;
            }
          }
          console.error('Failed to switch chain:', switchError);
          return false;
        }
      }

      return false;
    } catch (error) {
      console.error('Error switching chain:', error);
      return false;
    } finally {
      setIsSwitching(false);
    }
  }, [walletClient, isConnected, connectedChainId, selectedChainId, selectedChain, switchChain]);

  const value: ChainContextType = {
    selectedChainId,
    selectedChain,
    setSelectedChainId,
    switchWalletToSelectedChain,
    isSwitching,
  };

  return <ChainContext.Provider value={value}>{children}</ChainContext.Provider>;
}

/**
 * Hook for consuming ChainContext
 */
export function useChain(): ChainContextType {
  const context = useContext(ChainContext);
  if (context === undefined) {
    throw new Error('useChain must be used within a ChainProvider');
  }
  return context;
}