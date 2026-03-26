import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccount, useWalletClient } from 'wagmi';
import { gatewayService } from '@/lib/circle/gateway/gatewayService';
import { isGatewaySupported } from '@/lib/circle/gateway/gatewayConfig';
import { SUPPORTED_CHAINS } from '@/lib/bridge/chainRegistry';

interface GatewayDepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDepositComplete?: () => void;
}

export function GatewayDepositDialog({
  open,
  onOpenChange,
  onDepositComplete,
}: GatewayDepositDialogProps) {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [amount, setAmount] = useState('');
  const [selectedChainId, setSelectedChainId] = useState<number | undefined>(chainId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [supportedChains, setSupportedChains] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      loadSupportedChains();
      setSelectedChainId(chainId);
    }
  }, [open, chainId]);

  const loadSupportedChains = async () => {
    try {
      const info = await gatewayService.getInfo();
      const chains = SUPPORTED_CHAINS.filter(chain =>
        info.supportedChains.some((sc: any) => sc.chainId === chain.chainId)
      );
      setSupportedChains(chains);
    } catch (error) {
      console.error('Failed to load supported chains:', error);
    }
  };

  const handleDeposit = async () => {
    if (!address || !selectedChainId || !amount) {
      setError('Please fill all fields');
      return;
    }

    if (!walletClient) {
      setError('Wallet not connected');
      return;
    }

    const supported = await isGatewaySupported(selectedChainId);
    if (!supported) {
      setError('Gateway not supported on selected network');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await gatewayService.deposit({
        chainId: selectedChainId,
        amount,
        walletClient,
      });

      onDepositComplete?.();
      onOpenChange(false);
      setAmount('');
    } catch (err: any) {
      setError(err.message || 'Deposit failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deposit USDC to Gateway</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="chain">Network</Label>
            <Select
              value={selectedChainId?.toString() || ''}
              onValueChange={(value) => setSelectedChainId(Number(value))}
            >
              <SelectTrigger id="chain">
                <SelectValue placeholder="Select network" />
              </SelectTrigger>
              <SelectContent>
                {supportedChains.map((chain) => (
                  <SelectItem key={chain.chainId} value={chain.chainId.toString()}>
                    {chain.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Amount (USDC)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10.00"
              step="0.01"
              min="0"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleDeposit} disabled={loading}>
            {loading ? 'Depositing...' : 'Deposit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

