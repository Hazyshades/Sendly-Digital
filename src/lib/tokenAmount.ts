/** USDC / EURC and other supported stablecoins use 6 decimals in this app. */
export const STABLECOIN_DECIMALS = 6;
export const MICRO = 10 ** STABLECOIN_DECIMALS;

export type TokenAmountUnit = 'human' | 'micro';

export function normalizeTokenAmount(
  raw: string | number | bigint,
  options: { unit?: TokenAmountUnit } = {}
): number {
  const unit = options.unit ?? 'human';
  if (raw === null || raw === undefined) return 0;

  const str = typeof raw === 'bigint' ? raw.toString() : String(raw).trim();
  if (!str) return 0;

  if (str.includes('.')) {
    const n = parseFloat(str);
    return Number.isFinite(n) ? n : 0;
  }

  if (!/^-?\d+$/.test(str)) {
    const n = parseFloat(str);
    return Number.isFinite(n) ? n : 0;
  }

  const asBig = BigInt(str);
  if (unit === 'micro') {
    return Number(asBig) / MICRO;
  }

  const n = Number(asBig);
  return Number.isFinite(n) ? n : 0;
}

export function formatDisplayAmount(n: string | number, decimals = 2): string {
  const num = typeof n === 'string' ? parseFloat(n) : n;
  if (!Number.isFinite(num)) return (0).toFixed(decimals);
  return num.toFixed(decimals);
}

export function formatTokenAmountString(
  raw: string | number | bigint,
  options: { unit?: TokenAmountUnit } = {}
): string {
  const n = normalizeTokenAmount(raw, options);
  if (n === 0) return '0';
  const fixed = n.toFixed(STABLECOIN_DECIMALS);
  return fixed.replace(/\.?0+$/, '');
}
