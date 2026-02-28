import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import bridgeService from '@/lib/bridge/bridgeService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBridgeComplete?: () => void;
  initialAmount?: string;
}

export default function BridgeUsdcDialog({ open, onOpenChange, onBridgeComplete, initialAmount }: Props) {
  const [amount, setAmount] = useState(initialAmount || '10.00');
  const [isBridging, setIsBridging] = useState(false);
  const [error, setError] = useState('');
  const [statusUrl, setStatusUrl] = useState<string | undefined>();
  const [txFrom, setTxFrom] = useState<string | undefined>();
  const [txTo, setTxTo] = useState<string | undefined>();

  useEffect(() => {
    if (initialAmount) {
      setAmount(initialAmount);
    }
  }, [initialAmount]);

  const handleBridge = async () => {
    setIsBridging(true);
    setError('');
    setStatusUrl(undefined);
    setTxFrom(undefined);
    setTxTo(undefined);
    try {
      console.log('[UI] Start bridge with amount:', amount);
      const res = await bridgeService.bridgeArcToBase(amount);
      console.log('[UI] Bridge finished:', res);
      setStatusUrl(res.statusUrl);
      setTxFrom(res.fromTxHash);
      setTxTo(res.toTxHash);
      
      if (res.toTxHash) {
        onBridgeComplete?.();
      }
    } catch (e: any) {
      console.error('[UI] Bridge error:', e);
      setError(e?.message || 'Bridge failed');
    } finally {
      setIsBridging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bridge USDC: Arc Testnet → Base Sepolia</DialogTitle>
          <DialogDescription>
            Transfer USDC from Arc Testnet to Base Sepolia via CCTP.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm">Amount (USDC)</label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10.00" />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {statusUrl && (
            <Alert>
              <AlertDescription>
                Transfer submitted. Track status: <a className="text-blue-600 underline" href={statusUrl} target="_blank" rel="noreferrer">open</a>
              </AlertDescription>
            </Alert>
          )}
          {txFrom && (
            <div className="text-sm">
              Burn tx:{' '}
              <a
                href={`${import.meta.env.VITE_ARC_BLOCK_EXPLORER_URL || 'https://testnet.arcscan.app'}/tx/${txFrom}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-800 underline break-all"
              >
                {txFrom}
              </a>
            </div>
          )}
          {txTo && (
            <div className="text-sm">
              Mint tx:{' '}
              <a
                href={`https://base-sepolia.blockscout.com/tx/${txTo}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-800 underline break-all"
              >
                {txTo}
              </a>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isBridging}>Cancel</Button>
          <Button onClick={handleBridge} disabled={isBridging || !amount || parseFloat(amount) <= 0}>
            {isBridging ? (<span className="flex items-center gap-2"><Spinner className="w-4 h-4" /> Bridging...</span>) : 'Start bridge'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


