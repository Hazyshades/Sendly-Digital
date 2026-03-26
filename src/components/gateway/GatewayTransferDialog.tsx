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

interface GatewayTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransferComplete?: () => void;
}

export function GatewayTransferDialog({
  open,
  onOpenChange,
  onTransferComplete,
}: GatewayTransferDialogProps) {
  const { address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [amount, setAmount] = useState('');
  const [fromChainId, setFromChainId] = useState<number | undefined>(chainId);
  const [toChainId, setToChainId] = useState<number | undefined>();
  const [recipient, setRecipient] = useState<string>(address || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [supportedChains, setSupportedChains] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      loadSupportedChains();
      setFromChainId(chainId);
      setRecipient(address || '');
    }
  }, [open, chainId, address]);

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

  const handleTransfer = async () => {
    if (!address || !fromChainId || !toChainId || !amount || !recipient) {
      setError('Please fill all fields');
      return;
    }

    if (fromChainId === toChainId) {
      setError('Source and destination networks must be different');
      return;
    }

    if (!walletClient) {
      setError('Wallet not connected');
      return;
    }

    const fromSupported = await isGatewaySupported(fromChainId);
    const toSupported = await isGatewaySupported(toChainId);
    
    if (!fromSupported || !toSupported) {
      setError('Gateway not supported on selected networks');
      return;
    }

    // Validate recipient address
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      setError('Invalid recipient address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await gatewayService.transfer({
        fromChainId,
        toChainId,
        amount,
        recipient: recipient as `0x${string}`,
        walletClient,
      });

      onTransferComplete?.();
      onOpenChange(false);
      setAmount('');
      setToChainId(undefined);
    } catch (err: any) {
      setError(err.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer USDC via Gateway</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="fromChain">From Network</Label>
            <Select
              value={fromChainId?.toString() || ''}
              onValueChange={(value) => setFromChainId(Number(value))}
            >
              <SelectTrigger id="fromChain">
                <SelectValue placeholder="Select source network" />
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
            <Label htmlFor="toChain">To Network</Label>
            <Select
              value={toChainId?.toString() || ''}
              onValueChange={(value) => setToChainId(Number(value))}
            >
              <SelectTrigger id="toChain">
                <SelectValue placeholder="Select destination network" />
              </SelectTrigger>
              <SelectContent>
                {supportedChains
                  .filter((chain) => chain.chainId !== fromChainId)
                  .map((chain) => (
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

          <div>
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
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
          <Button onClick={handleTransfer} disabled={loading}>
            {loading ? 'Transferring...' : 'Transfer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

