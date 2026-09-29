import { useState } from 'react';

import {
  readZkAccountsPanelExpanded,
  writeZkAccountsPanelExpanded,
} from '@/hooks/useZkAccountsPanelLayout';

export function useZkSocialPanelState() {
  const [expanded, setExpandedInternal] = useState(readZkAccountsPanelExpanded);

  const setExpanded = (value: boolean) => {
    setExpandedInternal(value);
    writeZkAccountsPanelExpanded(value);
  };

  return {
    expanded,
    setExpanded,
    toggleExpanded: () => setExpanded(!expanded),
  };
}
