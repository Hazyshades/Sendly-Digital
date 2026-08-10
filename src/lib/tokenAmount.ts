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

const MICRO_BI = 10n ** BigInt(STABLECOIN_DECIMALS);

/**
 * Convert a human-decimal USDC amount string to micro-units (6 decimals) with
 * string math only — no floating point. Extra fractional digits are truncated.
 */
export function toMicro(human: string): bigint {
  if (typeof human !== 'string') {
    throw new Error(`Invalid token amount: expected string, got ${typeof human}`);
  }

  const trimmed = human.trim();
  if (!trimmed) {
    throw new Error('Invalid token amount: empty string');
  }

  let sign = 1n;
  let body = trimmed;
  if (body[0] === '-') {
    sign = -1n;
    body = body.slice(1);
  } else if (body[0] === '+') {
    body = body.slice(1);
  }

  if (!/^\d+(\.\d+)?$/.test(body)) {
    throw new Error(`Invalid token amount: ${JSON.stringify(human)}`);
  }

  const [intPart, fracPart = ''] = body.split('.');
  // Deterministic truncate (not round) beyond 6 fractional digits.
  const fracMicro = (fracPart + '0'.repeat(STABLECOIN_DECIMALS)).slice(
    0,
    STABLECOIN_DECIMALS
  );
  const micro = BigInt(intPart) * MICRO_BI + BigInt(fracMicro);
  return sign * micro;
}

/**
 * Convert micro-units to an exact human-decimal string (trailing zeros stripped).
 */
export function fromMicro(micro: bigint): string {
  if (typeof micro !== 'bigint') {
    throw new Error(`Invalid micro amount: expected bigint, got ${typeof micro}`);
  }

  const negative = micro < 0n;
  const abs = negative ? -micro : micro;
  const intPart = abs / MICRO_BI;
  const fracPart = abs % MICRO_BI;

  if (fracPart === 0n) {
    return `${negative ? '-' : ''}${intPart.toString()}`;
  }

  const fracStr = fracPart
    .toString()
    .padStart(STABLECOIN_DECIMALS, '0')
    .replace(/0+$/, '');
  return `${negative ? '-' : ''}${intPart.toString()}.${fracStr}`;
}
