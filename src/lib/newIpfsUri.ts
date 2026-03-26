const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function generateNewIpfsUri(): string {
  let hash = 'Qm';
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < 32; i++) hash += BASE58[bytes[i] % 58];
  for (let i = 0; i < 12; i++) hash += BASE58[Math.floor(Math.random() * 58)];
  return `ipfs://${hash}`;
}
