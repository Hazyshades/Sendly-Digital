import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowUpDown } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import bridgeService, { BridgeError } from '@/lib/bridge/bridgeService';
import { 
  SUPPORTED_CHAINS, 
  getChainByChainId, 
  getTokenAddress,
  getSupportedTokensForChain,
  validateBridgeRoute
} from '@/lib/bridge/bridgeConfig';
import { useAccount } from 'wagmi';

interface BridgeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBridgeComplete?: () => void;
  initialAmount?: string;
  fromChainId?: number;
  toChainId?: number;
  fromCurrency?: string;
  toCurrency?: string;
  tokenSymbol?: 'USDC' | 'EURC' | 'USYC';
}

export default function BridgeDialog({ 
  open, 
  onOpenChange, 
  onBridgeComplete,
  initialAmount,
  fromChainId,
  toChainId,
  fromCurrency: _fromCurrency,
  toCurrency: _toCurrency,
  tokenSymbol
}: BridgeDialogProps) {
  const { address, chainId: connectedChainId } = useAccount();
  
  const [amount, setAmount] = useState(initialAmount || '10.00');
  const [selectedFromChainId, setSelectedFromChainId] = useState<number | undefined>(fromChainId || connectedChainId);
  const [selectedToChainId, setSelectedToChainId] = useState<number | undefined>(toChainId);
  const [selectedTokenSymbol, setSelectedTokenSymbol] = useState<'USDC' | 'EURC' | 'USYC'>(tokenSymbol || 'USDC');
  const [isBridging, setIsBridging] = useState(false);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [statusUrl, setStatusUrl] = useState<string | undefined>();
  const [txFrom, setTxFrom] = useState<string | undefined>();
  const [txTo, setTxTo] = useState<string | undefined>();

  useEffect(() => {
    if (initialAmount) {
      setAmount(initialAmount);
    }
    if (fromChainId) {
      setSelectedFromChainId(fromChainId);
    }
    if (toChainId) {
      setSelectedToChainId(toChainId);
    }
    if (tokenSymbol) {
      setSelectedTokenSymbol(tokenSymbol);
    }
  }, [initialAmount, fromChainId, toChainId, tokenSymbol]);

  useEffect(() => {
    if (selectedFromChainId && selectedToChainId) {
      const fromChain = getChainByChainId(selectedFromChainId);
      const toChain = getChainByChainId(selectedToChainId);
      
      if (fromChain && toChain && fromChain.isTestnet !== toChain.isTestnet) {
        setSelectedToChainId(undefined);
      }
    }
  }, [selectedFromChainId]);

  useEffect(() => {
    if (!selectedFromChainId || !selectedToChainId || !selectedTokenSymbol) {
      setValidationError('');
      return;
    }

    try {
      const validation = validateBridgeRoute(
        selectedFromChainId,
        selectedToChainId,
        selectedTokenSymbol
      );

      if (!validation.isValid) {
        console.log('[BridgeDialog] Validation failed:', {
          fromChainId: selectedFromChainId,
          toChainId: selectedToChainId,
          tokenSymbol: selectedTokenSymbol,
          error: validation.error
        });
        setValidationError(validation.error || 'Route unavailable');
      } else {
        console.log('[BridgeDialog] Validation passed:', {
          fromChain: validation.fromChain?.name,
          toChain: validation.toChain?.name,
          token: validation.token?.symbol
        });
        setValidationError('');
      }
    } catch (error) {
      console.error('[BridgeDialog] Validation error:', error);
      setValidationError('Route validation error');
    }
  }, [selectedFromChainId, selectedToChainId, selectedTokenSymbol]);

  const handleSwapChains = () => {
    if (selectedFromChainId && selectedToChainId) {
      const temp = selectedFromChainId;
      setSelectedFromChainId(selectedToChainId);
      setSelectedToChainId(temp);
      setError('');
    }
  };

  const handleBridge = async () => {
    if (!selectedFromChainId || !selectedToChainId) {
      setError('Please select source and destination networks');
      return;
    }

    const fromTokenAddress = getTokenAddress(selectedTokenSymbol, selectedFromChainId);
    const toTokenAddress = getTokenAddress(selectedTokenSymbol, selectedToChainId);

    if (!fromTokenAddress || !toTokenAddress) {
      setError(`Token ${selectedTokenSymbol} is not supported on selected networks`);
      return;
    }

    setIsBridging(true);
    setError('');
    setStatusUrl(undefined);
    setTxFrom(undefined);
    setTxTo(undefined);

    try {
      console.log('[BridgeDialog] Starting bridge with params:', {
        fromChainId: selectedFromChainId,
        toChainId: selectedToChainId,
        fromCurrency: fromTokenAddress,
        toCurrency: toTokenAddress,
        amount
      });

      const res = await bridgeService.bridge({
        fromChainId: selectedFromChainId,
        toChainId: selectedToChainId,
        fromCurrency: fromTokenAddress,
        toCurrency: toTokenAddress,
        amount
      });

      console.log('[BridgeDialog] Bridge finished:', res);
      setStatusUrl(res.statusUrl);
      setTxFrom(res.fromTxHash);
      setTxTo(res.toTxHash);
      
      if (res.toTxHash) {
        onBridgeComplete?.();
      }
    } catch (e: any) {
      console.error('[BridgeDialog] Bridge error:', e);
      
      if (e instanceof BridgeError) {
        setError(e.message);
      } else {
        setError(e?.message || 'Bridge operation failed');
      }
    } finally {
      setIsBridging(false);
    }
  };

  const fromChain = selectedFromChainId ? getChainByChainId(selectedFromChainId) : null;
  const toChain = selectedToChainId ? getChainByChainId(selectedToChainId) : null;
  const availableTokens = selectedFromChainId && selectedToChainId 
    ? getSupportedTokensForChain(selectedFromChainId).filter(token => 
        getSupportedTokensForChain(selectedToChainId).some(t => t.symbol === token.symbol)
      )
    : [];

  const fromExplorerUrl = fromChain?.blockExplorer;
  const toExplorerUrl = toChain?.blockExplorer;

  const isFormValid = 
    selectedFromChainId && 
    selectedToChainId && 
    selectedFromChainId !== selectedToChainId &&
    !validationError &&
    amount && 
    parseFloat(amount) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bridge tokens</DialogTitle>
          <DialogDescription>
            Transfer {selectedTokenSymbol} between supported networks via{' '}
            <a
              href="https://www.circle.com/cross-chain-transfer-protocol"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              Circle CCTP
            </a>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Token</label>
            <div className="flex gap-2">
              {['USDC', 'EURC', 'USYC'].map(symbol => {
                const isAvailable = availableTokens.length === 0 || 
                  availableTokens.some(t => t.symbol === symbol);
                return (
                  <Button
                    key={symbol}
                    variant={selectedTokenSymbol === symbol ? 'default' : 'outline'}
                    onClick={() => {
                      if (isAvailable) {
                        setSelectedTokenSymbol(symbol as 'USDC' | 'EURC' | 'USYC');
                        setError('');
                      }
                    }}
                    disabled={!isAvailable}
                    className="flex-1"
                  >
                    {symbol}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">From network</label>
            <select
              className="w-full p-2 border rounded-md"
              value={selectedFromChainId || ''}
              onChange={(e) => {
                setSelectedFromChainId(Number(e.target.value));
                setError('');
              }}
            >
              <option value="">Select network</option>
              {SUPPORTED_CHAINS
                .filter(chain => {
                  const tokens = getSupportedTokensForChain(chain.chainId);
                  return tokens.some(t => t.symbol === selectedTokenSymbol);
                })
                .sort((a, b) => {
                  const priorityA = a.chainId === 5042002 ? 0 : a.chainId === 84532 ? 1 : 2;
                  const priorityB = b.chainId === 5042002 ? 0 : b.chainId === 84532 ? 1 : 2;
                  return priorityA - priorityB;
                })
                .map(chain => (
                  <option key={chain.chainId} value={chain.chainId}>
                    {chain.name} {chain.isTestnet ? '(Testnet)' : ''}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center justify-center -my-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleSwapChains}
              disabled={!selectedFromChainId || !selectedToChainId}
              className="rounded-full"
              title="Swap networks"
            >
              <ArrowUpDown className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">To network</label>
            <select
              className="w-full p-2 border rounded-md"
              value={selectedToChainId || ''}
              onChange={(e) => {
                setSelectedToChainId(Number(e.target.value));
                setError('');
              }}
            >
              <option value="">Select network</option>
              {SUPPORTED_CHAINS
                .filter(chain => {
                  const isTokenSupported = getSupportedTokensForChain(chain.chainId).some(t => t.symbol === selectedTokenSymbol);
                  const isDifferentChain = chain.chainId !== selectedFromChainId;
                  
                  if (!selectedFromChainId) {
                    return isTokenSupported && isDifferentChain;
                  }
                  
                  const fromChain = getChainByChainId(selectedFromChainId);
                  const isSameType = fromChain ? chain.isTestnet === fromChain.isTestnet : true;
                  
                  return isTokenSupported && isDifferentChain && isSameType;
                })
                .sort((a, b) => {
                  const priorityA = a.chainId === 5042002 ? 0 : a.chainId === 84532 ? 1 : 2;
                  const priorityB = b.chainId === 5042002 ? 0 : b.chainId === 84532 ? 1 : 2;
                  return priorityA - priorityB;
                })
                .map(chain => (
                  <option key={chain.chainId} value={chain.chainId}>
                    {chain.name} {chain.isTestnet ? '(Testnet)' : ''}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Amount ({selectedTokenSymbol})</label>
            <Input 
              type="number" 
              value={amount} 
              onChange={(e) => {
                setAmount(e.target.value);
                setError('');
              }} 
              placeholder="10.00"
              step="0.01"
              min="0"
            />
          </div>

          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {statusUrl && (
            <Alert>
              <AlertDescription>
                Transfer sent. Track status:{' '}
                <a className="text-blue-600 underline" href={statusUrl} target="_blank" rel="noreferrer">
                  open
                </a>
              </AlertDescription>
            </Alert>
          )}

          {txFrom && fromExplorerUrl && (
            <div className="text-sm space-y-1">
              <div>
                Send transaction:{' '}
                <a
                  href={`${fromExplorerUrl}/tx/${txFrom}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline break-all"
                >
                  {txFrom.slice(0, 10)}...{txFrom.slice(-8)}
                </a>
              </div>
            </div>
          )}

          {txTo && toExplorerUrl && (
            <div className="text-sm space-y-1">
              <div>
                Receive transaction:{' '}
                <a
                  href={`${toExplorerUrl}/tx/${txTo}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline break-all"
                >
                  {txTo.slice(0, 10)}...{txTo.slice(-8)}
                </a>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isBridging}>
            Cancel
          </Button>
          <Button 
            onClick={handleBridge} 
            disabled={isBridging || !isFormValid || !address}
          >
            {isBridging ? (
              <span className="flex items-center gap-2">
                <Spinner className="w-4 h-4" /> 
                Bridging...
              </span>
            ) : (
              'Start transfer'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
