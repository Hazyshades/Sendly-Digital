/**
 * Arc Mainnet CCTP / Bridge config.
 * Do not fall back to testnet messenger addresses for mainnet burns.
 * See openspec/changes/prepare-arc-mainnet/SPIKE.md
 */

import { ARC_MAINNET_CHAIN_ID, ARC_TESTNET_CHAIN_ID } from '@/lib/web3/chains';

export type ArcCctpConfig = {
  domain: number;
  tokenMessenger: string;
  messageTransmitter: string;
};

function readMainnetCctp(): ArcCctpConfig | null {
  const domainRaw = import.meta.env.VITE_ARC_MAINNET_CCTP_DOMAIN;
  const tokenMessenger = (import.meta.env.VITE_ARC_MAINNET_TOKEN_MESSENGER || '').trim();
  const messageTransmitter = (import.meta.env.VITE_ARC_MAINNET_MESSAGE_TRANSMITTER || '').trim();
  const domain = Number(domainRaw);
  if (!Number.isFinite(domain) || domain <= 0) return null;
  if (!tokenMessenger || !messageTransmitter) return null;
  return { domain, tokenMessenger, messageTransmitter };
}

/** Testnet CCTP (documented on Circle Arc docs; domain historically 26). */
function readTestnetCctp(): ArcCctpConfig {
  return {
    domain: Number(import.meta.env.VITE_ARC_TESTNET_CCTP_DOMAIN || 26),
    tokenMessenger:
      import.meta.env.VITE_ARC_TESTNET_TOKEN_MESSENGER ||
      '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',
    messageTransmitter:
      import.meta.env.VITE_ARC_TESTNET_MESSAGE_TRANSMITTER ||
      '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
  };
}

/**
 * Returns CCTP config for the Arc network, or null when mainnet is not yet configured.
 * Callers MUST refuse to bridge when null.
 */
export function getArcCctpConfig(chainId: number): ArcCctpConfig | null {
  if (chainId === ARC_TESTNET_CHAIN_ID) return readTestnetCctp();
  if (chainId === ARC_MAINNET_CHAIN_ID) return readMainnetCctp();
  return null;
}

export function assertArcCctpConfigured(chainId: number): ArcCctpConfig {
  const cfg = getArcCctpConfig(chainId);
  if (!cfg) {
    throw new Error(
      chainId === ARC_MAINNET_CHAIN_ID
        ? 'Arc Mainnet CCTP is not configured. Set VITE_ARC_MAINNET_CCTP_DOMAIN and messenger addresses after verifying Circle docs.'
        : `CCTP is not configured for chain ${chainId}`
    );
  }
  return cfg;
}
