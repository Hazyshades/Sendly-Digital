/**
 * Circle Developer-Controlled Wallet `blockchain` values expected by `/wallets/send-transaction`.
 * Testnets align with backend faucet list where possible (see sendly-supabase `testnetBlockchains`).
 */
const CHAIN_ID_TO_BLOCKCHAIN: Record<number, string> = {
  5042002: 'ARC-TESTNET',
  84532: 'BASE-SEPOLIA',
  11155111: 'ETH-SEPOLIA',
  11155420: 'OP-SEPOLIA',
  421614: 'ARB-SEPOLIA',
  80002: 'MATIC-AMOY',
  43113: 'AVAX-FUJI',
  1244: 'UNI-SEPOLIA',
};

export function getCircleBlockchainForChainId(chainId: number): string | undefined {
  return CHAIN_ID_TO_BLOCKCHAIN[chainId];
}
