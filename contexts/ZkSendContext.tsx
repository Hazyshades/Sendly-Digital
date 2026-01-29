import { createContext, useContext, useState, ReactNode } from 'react';

import type { ZkSendPlatform } from '../components/zksend/ZkSendPanel';
import type { ReclaimProof } from '../utils/reclaim/types';

export type ZkSendActiveTab = 'create' | 'connections' | 'pending';

type ZkSendContextType = {
  platform: ZkSendPlatform;
  setPlatform: (platform: ZkSendPlatform) => void;
  activeTab: ZkSendActiveTab;
  setActiveTab: (tab: ZkSendActiveTab) => void;
  reclaimProofs: ReclaimProof[] | null;
  setReclaimProofs: (proofs: ReclaimProof[] | null) => void;
  proofError: string | null;
  setProofError: (err: string | null) => void;
};

const ZkSendContext = createContext<ZkSendContextType | undefined>(undefined);

export function ZkSendProvider({ children }: { children: ReactNode }) {
  const [platform, setPlatform] = useState<ZkSendPlatform>('twitter');
  const [activeTab, setActiveTab] = useState<ZkSendActiveTab>('create');
  const [reclaimProofs, setReclaimProofs] = useState<ReclaimProof[] | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);

  return (
    <ZkSendContext.Provider
      value={{
        platform,
        setPlatform,
        activeTab,
        setActiveTab,
        reclaimProofs,
        setReclaimProofs,
        proofError,
        setProofError,
      }}
    >
      {children}
    </ZkSendContext.Provider>
  );
}

export function useZkSendContext() {
  const context = useContext(ZkSendContext);
  if (!context) {
    throw new Error('useZkSendContext must be used within ZkSendProvider');
  }
  return context;
}
