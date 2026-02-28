import { useAccount } from 'wagmi';

export function AgentSchedulesPanel() {
  const { isConnected } = useAccount();
  if (!isConnected) return null;
  // Feature temporarily disabled to avoid unused imports/vars during build
  return null;
}

