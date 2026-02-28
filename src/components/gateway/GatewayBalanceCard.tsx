import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, Plus, ArrowRightLeft } from 'lucide-react';
import { useAccount } from 'wagmi';
import { gatewayService } from '@/lib/circle/gateway/gatewayService';
import { GatewayDepositDialog } from './GatewayDepositDialog';
import { GatewayTransferDialog } from './GatewayTransferDialog';

export function GatewayBalanceCard() {
  const { address } = useAccount();
  const [totalBalance, setTotalBalance] = useState<string>('0');
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositOpen, setDepositOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  useEffect(() => {
    if (address) {
      loadBalances();
    }
  }, [address]);

  const loadBalances = async () => {
    if (!address) return;
    setLoading(true);
    try {
      const balances = await gatewayService.getBalances(address as `0x${string}`);
      const total = balances.reduce((sum, b) => sum + parseFloat(b.balance || '0'), 0);
      setTotalBalance(total.toFixed(2));
      setBalances(balances);
    } catch (error) {
      console.error('Failed to load Gateway balances:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Unified USDC Balance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {loading ? '...' : `$${totalBalance}`}
            </div>
            <p className="text-sm text-gray-600">
              Available instantly on all chains
            </p>
          </div>

          {balances.length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <p className="text-xs font-medium text-gray-500 uppercase">
                By Chain
              </p>
              {balances.map((balance) => (
                <div
                  key={balance.domain}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-gray-700">{balance.chain}</span>
                  <span className="font-medium">
                    ${parseFloat(balance.balance || '0').toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => setDepositOpen(true)}
              className="flex-1"
              variant="default"
            >
              <Plus className="w-4 h-4 mr-2" />
              Deposit
            </Button>
            <Button
              onClick={() => setTransferOpen(true)}
              className="flex-1"
              variant="outline"
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Transfer
            </Button>
          </div>
        </CardContent>
      </Card>

      <GatewayDepositDialog
        open={depositOpen}
        onOpenChange={setDepositOpen}
        onDepositComplete={loadBalances}
      />

      <GatewayTransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        onTransferComplete={loadBalances}
      />
    </>
  );
}

