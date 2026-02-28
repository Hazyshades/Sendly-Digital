import { useSearchParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import BridgeDialog from '@/components/BridgeDialog';
import { getChainBySlug, getChainByChainId, getTokenByAddress } from '@/lib/bridge/bridgeConfig';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
//http://localhost:3000/bridge?toChainSlug=base-sepolia&fromChainId=5042002&fromCurrency=0x3600000000000000000000000000000000000000&toCurrency=0x036CbD53842c5426634e7929541eC2318f3dCF7e
export function BridgeRoute() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(true);

  const toChainSlug = searchParams.get('toChainSlug');
  const toCurrency = searchParams.get('toCurrency');
  const fromChainIdParam = searchParams.get('fromChainId');
  const fromCurrency = searchParams.get('fromCurrency');
  const amount = searchParams.get('amount');

  useEffect(() => {
    // If toChainSlug is specified, validate it
    if (toChainSlug) {
      const toChain = getChainBySlug(toChainSlug);
      if (!toChain) {
        setError(`Network "${toChainSlug}" not found or not supported`);
        return;
      }

      if (fromChainIdParam) {
        const fromChainId = Number(fromChainIdParam);
        if (isNaN(fromChainId)) {
          setError(`Invalid source network chainId: ${fromChainIdParam}`);
          return;
        }

        const fromChain = getChainByChainId(fromChainId);
        if (!fromChain) {
          setError(`Source network with chainId ${fromChainId} is not supported`);
          return;
        }

        if (fromChain.chainId === toChain.chainId) {
          setError('Source and target networks cannot be the same');
          return;
        }
      }

      if (toCurrency && fromCurrency) {
        if (!fromChainIdParam) {
          setError('fromChainId must be specified when using token addresses');
          return;
        }

        const fromChainId = Number(fromChainIdParam);
        const fromToken = getTokenByAddress(fromCurrency, fromChainId);
        const toToken = getTokenByAddress(toCurrency, toChain.chainId);

        if (!fromToken) {
          setError(`Token with address ${fromCurrency} not found in source network`);
          return;
        }

        if (!toToken) {
          setError(`Token with address ${toCurrency} not found in target network`);
          return;
        }

        if (fromToken.symbol !== toToken.symbol) {
          setError(`Tokens do not match: ${fromToken.symbol} ≠ ${toToken.symbol}`);
          return;
        }
      }
    }

    setError(null);
  }, [toChainSlug, fromChainIdParam, fromCurrency, toCurrency]);

  const toChain = toChainSlug ? getChainBySlug(toChainSlug) : null;
  const fromChainId = fromChainIdParam ? Number(fromChainIdParam) : undefined;

  let tokenSymbol: 'USDC' | 'EURC' | 'USYC' | undefined = undefined;
  if (fromCurrency && fromChainId) {
    const fromToken = getTokenByAddress(fromCurrency, fromChainId);
    if (fromToken && (fromToken.symbol === 'USDC' || fromToken.symbol === 'EURC' || fromToken.symbol === 'USYC')) {
      tokenSymbol = fromToken.symbol as 'USDC' | 'EURC' | 'USYC';
    }
  }

  const content = useMemo(() => {
    if (error) {
      return (
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="text-center">
            <Button onClick={() => navigate('/')}>Return to home</Button>
          </div>
        </div>
      );
    }

    // If toChainSlug is specified but chain not found, show error
    if (toChainSlug && !toChain) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Loading...</AlertDescription>
        </Alert>
      );
    }

    return (
      <>
        <BridgeDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onBridgeComplete={() => {
            setIsDialogOpen(false);
            setTimeout(() => navigate('/'), 2000);
          }}
          initialAmount={amount || undefined}
          fromChainId={fromChainId}
          toChainId={toChain?.chainId}
          fromCurrency={fromCurrency || undefined}
          toCurrency={toCurrency || undefined}
          tokenSymbol={tokenSymbol}
        />
        {!isDialogOpen && (
          <div className="text-center mt-4">
            <Button onClick={() => navigate('/')}>Return to home</Button>
          </div>
        )}
      </>
    );
  }, [
    amount,
    error,
    fromChainId,
    fromCurrency,
    isDialogOpen,
    navigate,
    toChain,
    toCurrency,
    tokenSymbol,
  ]);

  return (
    <div className="relative min-h-screen circle-gradient-bg overflow-hidden">
      <div className="abstract-shape pointer-events-none" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          {content}
        </div>
      </div>
    </div>
  );
}
