const ZERO = '0x0000000000000000000000000000000000000000';

/** True when address is a non-empty, non-zero hex address. */
export function isConfiguredContractAddress(address: string | undefined | null): boolean {
  if (!address) return false;
  const a = address.trim();
  if (!a) return false;
  if (a.toLowerCase() === ZERO) return false;
  return /^0x[a-fA-F0-9]{40}$/.test(a);
}

/**
 * Require a configured contract address or throw a clear config error.
 * Used to refuse mainnet (and other) submits when env wiring is incomplete.
 */
export function requireConfiguredContract(
  address: string | undefined | null,
  label: string
): string {
  if (!isConfiguredContractAddress(address)) {
    throw new Error(`${label} is not configured for this network`);
  }
  return address!.trim();
}
