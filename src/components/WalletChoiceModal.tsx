import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Wallet, Plus } from 'lucide-react';
import { useConnectModal } from '@rainbow-me/rainbowkit';

interface WalletChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateWallet: () => void;
}

export function WalletChoiceModal({ isOpen, onClose, onCreateWallet }: WalletChoiceModalProps) {
  const { openConnectModal } = useConnectModal();

  const handleConnectExisting = () => {
    onClose();
    if (openConnectModal) {
      openConnectModal();
    }
  };

  const handleCreateNew = () => {
    onClose();
    onCreateWallet();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-center">
            Choose Wallet Option
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600 mt-2">
            Connect an existing wallet or create a new internal wallet to claim your gift card
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-6">
          <Button
            onClick={handleConnectExisting}
            className="w-full h-14 text-lg flex items-center justify-center gap-3"
            variant="outline"
          >
            <Wallet className="w-5 h-5" />
            Connect Existing Wallet
          </Button>
          
          <Button
            onClick={handleCreateNew}
            className="w-full h-14 text-lg flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            <Plus className="w-5 h-5" />
            Create New Wallet
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 text-center mt-4">
          Internal wallets are managed by Sendly and allow you to receive gifts without a web3 wallet
        </p>
      </DialogContent>
    </Dialog>
  );
}


