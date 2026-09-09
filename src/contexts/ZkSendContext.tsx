import { createContext, useContext, useState, ReactNode } from 'react';

import type { ZkSendPlatform } from '@/components/zksend/ZkSendPanel';

export type ZkSendActiveTab = 'create' | 'connections' | 'pending';

type ZkSendContextType = {
  platform: ZkSendPlatform;
  setPlatform: (platform: ZkSendPlatform) => void;
  activeTab: ZkSendActiveTab;
  setActiveTab: (tab: ZkSendActiveTab) => void;
};

const ZkSendContext = createContext<ZkSendContextType | undefined>(undefined);

export function ZkSendProvider({ children }: { children: ReactNode }) {
  const [platform, setPlatform] = useState<ZkSendPlatform>('twitter');
  const [activeTab, setActiveTab] = useState<ZkSendActiveTab>('create');

  return (
    <ZkSendContext.Provider
      value={{
        platform,
        setPlatform,
        activeTab,
        setActiveTab,
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
