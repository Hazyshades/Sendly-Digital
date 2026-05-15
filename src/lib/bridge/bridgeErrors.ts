/** Shared bridge errors for bridgeService and Internal Wallet EIP-1193 shim (avoid circular imports). */

export class BridgeError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'BridgeError';
  }
}
