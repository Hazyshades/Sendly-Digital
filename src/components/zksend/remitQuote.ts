import { formatUsdcAmount, getZkSendFeeBreakdown } from './socialPaymentAction';

export const REMIT_RATE_USDC_PER_AED = 0.2723;
export const REMIT_FEE_AED = 1.5;

export type RemitQuote = {
  isValid: boolean;
  aedAmount: string;
  recipientUsdc: string;
  protocolFeeUsdc: string;
  totalDebitUsdc: string;
};

function parseAedCents(value: string): bigint | null {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

export function getRemitQuote(value: string): RemitQuote {
  const aedCents = parseAedCents(value);
  const feeCents = 150n;
  if (aedCents === null || aedCents <= feeCents) {
    return { isValid: false, aedAmount: value, recipientUsdc: '0', protocolFeeUsdc: '0', totalDebitUsdc: '0' };
  }

  // 1 AED = 0.2723 USDC. One AED cent therefore equals 2,723 USDC base units.
  const recipientWei = (aedCents - feeCents) * 2723n;
  const recipientUsdc = formatUsdcAmount(recipientWei);
  const fees = getZkSendFeeBreakdown(recipientUsdc);
  return {
    isValid: true,
    aedAmount: value,
    recipientUsdc,
    protocolFeeUsdc: fees.protocolFeeUsdc,
    totalDebitUsdc: fees.totalDebitUsdc,
  };
}
