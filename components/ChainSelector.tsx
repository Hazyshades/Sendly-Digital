/**
 * ChainSelector - UI component for selecting a network (ARC / Tempo / Base)
 */

import { useChain } from '../utils/chain/chainContext';
import { SUPPORTED_CHAIN_CONFIGS } from '../utils/chain/chainConfig';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function ChainSelector() {
  const { selectedChainId, selectedChain, setSelectedChainId, switchWalletToSelectedChain, isSwitching } = useChain();
  const [isOpen, setIsOpen] = useState(false);

  const handleChainChange = async (chainId: number) => {
    setSelectedChainId(chainId);
    setIsOpen(false);
    
    // Attempt to switch the wallet to the selected network
    if (chainId !== selectedChainId) {
      await switchWalletToSelectedChain();
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className="bg-white/90 backdrop-blur-sm border border-gray-200 text-gray-900 hover:bg-white px-4 py-2 rounded-2xl transition-all duration-200 flex items-center gap-2 shadow-circle-card font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span>{selectedChain?.name || 'Select Network'}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-lg border border-gray-200 z-20 overflow-hidden">
            {SUPPORTED_CHAIN_CONFIGS.map((chain) => (
              <button
                key={chain.chainId}
                onClick={() => handleChainChange(chain.chainId)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                  chain.chainId === selectedChainId ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{chain.name}</span>
                  {chain.chainId === selectedChainId && (
                    <span className="text-blue-600">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}