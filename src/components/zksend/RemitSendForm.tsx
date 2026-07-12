import { useEffect, useMemo, useState } from 'react';
import { useAccount, useChainId, useSwitchChain, useWalletClient } from 'wagmi';
import { toast } from 'sonner';
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Globe2,
  Landmark,
  Loader2,
  Send,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';

import { useCircleWallet } from '@/hooks/useCircleWallet';
import { usePrivySafe } from '@/lib/privy/usePrivySafe';
import { ARC_CHAIN_ID, getExplorerTxUrl } from '@/lib/web3/constants';
import { isSocialRecipientValid, normalizeSocialUsername } from '@/lib/reclaim/identity';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { PlatformUsernameInput } from './PlatformUsernameInput';
import { getRemitQuote, REMIT_FEE_AED, REMIT_RATE_USDC_PER_AED } from './remitQuote';
import { submitSocialZkSendPayment, type SocialPaymentOutcome } from './socialPaymentAction';
import type { WalletSource } from './WalletSourceToggle';

type FundingSource = 'circle' | 'external' | 'card';

const DESTINATIONS = ['India', 'Philippines', 'Pakistan', 'Egypt', 'United Kingdom'] as const;

function formatAed(value: string): string {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number.toFixed(2) : '0.00';
}

function claimLink(username: string, paymentId: string | null): string {
  const url = new URL('/payments', window.location.origin);
  url.searchParams.set('tab', 'receive');
  url.searchParams.set('platform', 'twitter');
  url.searchParams.set('username', username);
  if (paymentId) url.searchParams.set('paymentId', paymentId);
  return url.toString();
}

export function RemitSendForm() {
  const { address, isConnected } = useAccount();
  const connectedChainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const { developerWallet, hasDeveloperWallet } = useCircleWallet();
  const { user: privyUser } = usePrivySafe();

  const [aedAmount, setAedAmount] = useState('100');
  const [username, setUsername] = useState('');
  const [destination, setDestination] = useState<(typeof DESTINATIONS)[number]>('India');
  const [fundingSource, setFundingSource] = useState<FundingSource>('external');
  const [cardSettlementWallet, setCardSettlementWallet] = useState<WalletSource>('circle');
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<SocialPaymentOutcome | null>(null);

  useEffect(() => {
    if (hasDeveloperWallet || fundingSource !== 'circle') return;
    setFundingSource('external');
  }, [fundingSource, hasDeveloperWallet]);

  useEffect(() => {
    if (hasDeveloperWallet || cardSettlementWallet !== 'circle') return;
    setCardSettlementWallet('external');
  }, [cardSettlementWallet, hasDeveloperWallet]);

  const quote = useMemo(() => getRemitQuote(aedAmount), [aedAmount]);
  const normalizedUsername = useMemo(() => normalizeSocialUsername(username.replace(/^@/, '')), [username]);
  const usernameIsValid = isSocialRecipientValid('twitter', username);
  const settlementWallet: WalletSource = fundingSource === 'card' ? cardSettlementWallet : fundingSource;
  const externalReady = isConnected && !!address && !!walletClient && connectedChainId === ARC_CHAIN_ID;
  const circleReady = hasDeveloperWallet && !!developerWallet;
  const walletReady = settlementWallet === 'circle' ? circleReady : externalReady;
  const showNetworkSwitch = settlementWallet === 'external' && isConnected && connectedChainId !== ARC_CHAIN_ID;
  const canSubmit = quote.isValid && usernameIsValid && walletReady && !loading;

  const handleSwitchNetwork = async () => {
    try {
      await switchChainAsync({ chainId: ARC_CHAIN_ID });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to switch to Arc Testnet');
    }
  };

  const handleSubmit = async () => {
    if (showNetworkSwitch) {
      await handleSwitchNetwork();
      return;
    }
    if (!canSubmit || !normalizedUsername) return;
    setLoading(true);
    try {
      const result = await submitSocialZkSendPayment({
        amount: quote.recipientUsdc,
        tokenType: 'USDC',
        platform: 'twitter',
        username: normalizedUsername,
        walletSource: settlementWallet,
        chainId: settlementWallet === 'circle' ? ARC_CHAIN_ID : connectedChainId,
        isConnected,
        address,
        walletClient,
        developerWallet,
        hasDeveloperWallet,
        privyUserId: privyUser?.id,
        requireArc: true,
      });
      setOutcome(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send remittance');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyClaimLink = async () => {
    if (!outcome) return;
    try {
      await navigator.clipboard.writeText(claimLink(outcome.normalizedUsername, outcome.paymentId));
      toast.success('Claim link copied');
    } catch {
      toast.error('Unable to copy the claim link');
    }
  };

  const reset = () => {
    setOutcome(null);
    setAedAmount('100');
    setUsername('');
    setDestination('India');
  };

  if (outcome) {
    return (
      <Card className="overflow-hidden border-emerald-100 bg-white/95 shadow-[0_24px_80px_-32px_rgba(16,185,129,0.45)]">
        <CardContent className="space-y-7 p-6 sm:p-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <p className="remit-kicker text-emerald-700">Arc testnet settlement confirmed</p>
            <h2 className="remit-section-title mt-2 text-3xl text-slate-950">Payment sent</h2>
            <p className="remit-lede mt-2 text-slate-600">
              <span className="remit-quote-value">{formatAed(aedAmount)}</span> AED sent to @{outcome.normalizedUsername}.
            </p>
            <p className="mt-1 text-sm text-slate-500">The recipient can claim USDC after verifying Twitter/X ownership.</p>
          </div>
          <div className="grid gap-3 rounded-2xl bg-emerald-50/80 p-4 text-sm sm:grid-cols-3">
            <div>
              <p className="remit-label text-slate-500">Recipient gets</p>
              <p className="remit-quote-value mt-1 text-base text-slate-950">{quote.recipientUsdc} USDC</p>
            </div>
            <div>
              <p className="remit-label text-slate-500">Total wallet debit</p>
              <p className="remit-quote-value mt-1 text-base text-slate-950">{outcome.totalDebitUsdc} USDC</p>
            </div>
            <div>
              <p className="remit-label text-slate-500">Remittance fee</p>
              <p className="remit-quote-value mt-1 text-base text-slate-950">{REMIT_FEE_AED.toFixed(2)} AED</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleCopyClaimLink} className="flex-1 bg-slate-950 text-white hover:bg-slate-800"><Copy className="mr-2 h-4 w-4" />Copy claim link</Button>
            {outcome.txHash ? <Button asChild variant="outline" className="flex-1"><a href={getExplorerTxUrl(outcome.chainId, outcome.txHash)} target="_blank" rel="noreferrer">View transaction<ExternalLink className="ml-2 h-4 w-4" /></a></Button> : null}
          </div>
          <Button variant="ghost" onClick={reset} className="w-full">Send another payment</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-white/90 bg-white/95 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.38)]">
      <CardContent className="space-y-6 p-5 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <Landmark className="h-3.5 w-3.5" />
              UAE origin
            </div>
            <h2 className="remit-section-title mt-3 text-slate-950">Your remittance</h2>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <span className="rounded-full bg-slate-100 px-2.5 py-1">UAE</span>
            <ArrowRight className="h-4 w-4" />
            <Globe2 className="h-4 w-4 text-emerald-600" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="remit-amount" className="remit-label">You send</Label>
          <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-emerald-500/30">
            <Input
              id="remit-amount"
              inputMode="decimal"
              value={aedAmount}
              onChange={(event) => setAedAmount(event.target.value)}
              className="remit-amount-input h-13 border-0 shadow-none focus-visible:ring-0"
              aria-label="Amount in AED"
            />
            <div className="remit-currency flex items-center bg-slate-50 px-4 text-slate-700">AED</div>
          </div>
          {!quote.isValid && aedAmount ? (
            <p className="text-xs text-rose-600">Enter more than {REMIT_FEE_AED.toFixed(2)} AED to cover the remittance fee.</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="remit-label">From</Label>
            <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
              UAE <span aria-hidden>AE</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="destination-country" className="remit-label">Destination country</Label>
            <Select value={destination} onValueChange={(value) => setDestination(value as typeof destination)}>
              <SelectTrigger id="destination-country" className="h-10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DESTINATIONS.map((country) => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <PlatformUsernameInput
          platform="twitter"
          onPlatformChange={() => {}}
          username={username}
          onUsernameChange={setUsername}
          label="Recipient"
          inputId="remit-recipient"
          ariaLabel="Twitter username"
          lockPlatform
        />
        {username && !usernameIsValid ? (
          <p className="text-xs text-rose-600">Enter a valid Twitter/X username.</p>
        ) : null}

        <div className="space-y-3">
          <Label className="remit-label">Funding source</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {([
              ['circle', 'Internal Wallet', WalletCards, circleReady],
              ['external', 'External Wallet', WalletCards, isConnected],
              ['card', 'UAE Bank Card', CreditCard, true],
            ] as const).map(([value, label, Icon, available]) => (
              <button
                key={value}
                type="button"
                onClick={() => available && setFundingSource(value)}
                disabled={!available}
                className={`rounded-xl border p-3 text-left transition ${
                  fundingSource === value
                    ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                } disabled:cursor-not-allowed disabled:opacity-45`}
              >
                <Icon className="h-4 w-4 text-emerald-700" />
                <p className="remit-funding-label mt-2 text-slate-900">{label}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {value === 'card' ? 'Demo' : available ? 'Available' : 'Unavailable'}
                </p>
              </button>
            ))}
          </div>
          {fundingSource === 'card' ? (
            <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
              <div className="flex items-start justify-between rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 p-4 text-white">
                <div>
                  <p className="text-xs text-slate-300">VISA</p>
                  <p className="mt-5 font-mono tracking-[0.18em]">**** 4242</p>
                  <p className="mt-2 text-xs text-slate-300">LEO K.</p>
                </div>
                <span className="rounded-full bg-amber-300 px-2 py-1 text-xs font-semibold text-amber-950">Demo only</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="card-settlement-wallet" className="remit-label">Settle demo pay-in with</Label>
                <Select value={cardSettlementWallet} onValueChange={(value) => setCardSettlementWallet(value as WalletSource)}>
                  <SelectTrigger id="card-settlement-wallet" className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="circle" disabled={!circleReady}>Internal Wallet</SelectItem>
                    <SelectItem value="external" disabled={!isConnected}>External Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs leading-5 text-amber-900">
                This card is a conceptual AED pay-in. No card is charged; the selected wallet supplies testnet USDC settlement.
              </p>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl bg-slate-950 p-5 text-white">
          <div className="flex items-center justify-between">
            <p className="remit-label text-slate-300">Recipient gets</p>
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
          </div>
          <p className="remit-quote-total mt-2">
            {quote.recipientUsdc} <span className="remit-currency text-base text-slate-300">USDC</span>
          </p>
          <div className="mt-5 space-y-2.5 border-t border-white/10 pt-4 text-sm">
            <div className="flex justify-between text-slate-300">
              <span>FX rate</span>
              <span className="remit-quote-value">1 AED = {REMIT_RATE_USDC_PER_AED} USDC</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Remittance fee</span>
              <span className="remit-quote-value">{REMIT_FEE_AED.toFixed(2)} AED</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>zkSend protocol fee</span>
              <span className="remit-quote-value">{quote.protocolFeeUsdc} USDC</span>
            </div>
            <div className="flex justify-between font-semibold text-white">
              <span>Total wallet debit</span>
              <span className="remit-quote-value text-sm">{quote.totalDebitUsdc} USDC</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Delivery target</span>
              <span>Under 10 seconds</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Identity</span>
              {normalizedUsername ? (
                <a
                  href={`https://x.com/${normalizedUsername}`}
                  target="_blank"
                  rel="noreferrer"
                  className="remit-quote-value text-emerald-300 underline-offset-2 hover:text-emerald-200 hover:underline"
                >
                  twitter:@{normalizedUsername}
                </a>
              ) : (
                <span className="remit-quote-value">social:@username</span>
              )}
            </div>
          </div>
        </div>

        {showNetworkSwitch ? (
          <Button onClick={handleSwitchNetwork} className="w-full bg-amber-500 text-amber-950 hover:bg-amber-400">
            Switch to Arc Testnet
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating settlement...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send remittance
              </>
            )}
          </Button>
        )}
        {!walletReady && !showNetworkSwitch ? (
          <p className="text-center text-xs text-slate-500">
            Connect an Arc wallet or create an Internal Wallet to complete settlement.
          </p>
        ) : null}

      </CardContent>
    </Card>
  );
}
