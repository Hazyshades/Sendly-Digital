import { useState, useEffect } from 'react';
import { Gift, QrCode, Share2, Clock, Lock, Upload, Palette, CheckCircle, AlertCircle, ExternalLink, Mail, MessageCircle, Copy, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
 
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import WalletIcon from '@/components/ui/icons/wallet-icon';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useAccount, useWalletClient } from 'wagmi';
import { arcTestnet, tempoTestnet } from '@/lib/web3/wagmiConfig';
import { getExplorerTxUrl, getContractsForChain, ARC_CHAIN_ID } from '@/lib/web3/constants';
import { generateNewIpfsUri } from '@/lib/newIpfsUri';
import BridgeDialog from '@/components/BridgeDialog';
import { useNavigate } from 'react-router-dom';
import { generateBridgeUrlFromArc } from '@/lib/bridge/bridgeUrlHelper';
import { usePrivySafe } from '@/lib/privy/usePrivySafe';
import { PlatformIcon } from '@/components/gift-card/PlatformIcon';
import { RECIPIENT_OPTIONS } from '@/components/gift-card/recipientOptions';
import { DEFAULT_WALLET_NAME, detectWalletName } from '@/components/gift-card/walletName';
import { parseSelectedGiftCardRecipient } from '@/components/gift-card/selectedRecipient';
import type { GiftCardData } from '@/components/gift-card/types';
import { useDeveloperWalletLookup } from '@/components/gift-card/useDeveloperWalletLookup';
import {
  INITIAL_GIFT_CARD_DATA,
  RESET_GIFT_CARD_DATA,
  buildCreatedCardData,
  classifyCreateGiftCardError,
  createGiftCardWithConnectedWallet,
  createGiftCardWithDeveloperWallet,
  extractTxHashFromError,
  getTokenAddress,
  resolveCreateWallet,
  saveCreatedGiftCard,
  toTokenUnits,
  validateGiftCardRequest
} from '@/components/gift-card/giftCardFlow';

export function CreateGiftCard() {
  const { address, isConnected, connector } = useAccount();
  const { data: walletClient } = useWalletClient();
  const connectedChainId = walletClient?.chain?.id ?? ARC_CHAIN_ID;
  const isTempoNetwork = connectedChainId === tempoTestnet.id;
  const activeChain = isTempoNetwork ? tempoTestnet : arcTestnet;
  const activeChainId = connectedChainId;
  const contracts = getContractsForChain(activeChainId);
  const availableCurrencies = isTempoNetwork
    ? (['PATHUSD', 'ALPHAUSD', 'BETAUSD', 'THETAUSD'] as const)
    : (['USDC', 'EURC'] as const);
  const { authenticated, user: privyUser } = usePrivySafe();
  const [walletName, setWalletName] = useState<string>(DEFAULT_WALLET_NAME);
  const navigate = useNavigate();
  const {
    hasDeveloperWallet,
    developerWallet,
    walletSource,
    setWalletSource
  } = useDeveloperWalletLookup({
    isConnected,
    authenticated,
    address,
    privyUser
  });
  const [formData, setFormData] = useState<GiftCardData>(INITIAL_GIFT_CARD_DATA);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createdCard, setCreatedCard] = useState<any>(null);
  const [error, setError] = useState('');
  const [errorTxHash, setErrorTxHash] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'generating' | 'uploading' | 'creating' | 'success'>('form');
  const [isBridgeDialogOpen, setIsBridgeDialogOpen] = useState(false);
  const [highlightField, setHighlightField] = useState<'twitch' | 'twitter' | 'telegram' | 'tiktok' | 'instagram' | null>(null);

  useEffect(() => {
    const selectedRecipient = localStorage.getItem('selectedGiftCardRecipient');
    if (!selectedRecipient) {
      return;
    }

    try {
      const recipient = parseSelectedGiftCardRecipient(selectedRecipient);
      if (!recipient) {
        return;
      }

      setFormData(prev => ({
        ...prev,
        ...recipient.patch
      }));
      setHighlightField(recipient.highlightField);
      toast.success(`Selected ${recipient.toastLabel} for gift card`);

      if (recipient.highlightField) {
        setTimeout(() => setHighlightField(null), 2000);
      }
    } catch (error) {
      console.error('Error parsing selected recipient:', error);
    } finally {
      localStorage.removeItem('selectedGiftCardRecipient');
    }
  }, []);

  const updateFormData = (field: keyof GiftCardData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const allowed: GiftCardData['currency'][] = isTempoNetwork
      ? ['PATHUSD', 'ALPHAUSD', 'BETAUSD', 'THETAUSD']
      : ['USDC', 'EURC'];
    setFormData((prev) => {
      if (allowed.includes(prev.currency)) {
        return prev;
      }
      return { ...prev, currency: isTempoNetwork ? 'PATHUSD' : 'USDC' };
    });
  }, [isTempoNetwork]);

  useEffect(() => {
    if (isConnected && typeof window !== 'undefined' && window.ethereum) {
      setWalletName(detectWalletName(connector?.name));
    } else {
      setWalletName(DEFAULT_WALLET_NAME);
    }
  }, [isConnected, connector]);

  const handleCreateCard = async () => {
    const walletResolution = resolveCreateWallet({
      walletSource,
      isConnected,
      address,
      hasDeveloperWallet,
      developerWallet
    });

    if ('error' in walletResolution) {
      setError(walletResolution.error);
      return;
    }

    const validationError = validateGiftCardRequest(formData, contracts.contractAddress);
    if (validationError) {
      setError(validationError);
      return;
    }

    const { createAddress, useDeveloperWallet } = walletResolution;
    if (!createAddress) {
      setError('Wallet address not found');
      return;
    }

    setIsCreating(true);
    setError('');
    setErrorTxHash(null);

    try {
      setStep('uploading');
      toast.info('Preparing metadata...');
      const metadataUri = generateNewIpfsUri();
      const tokenAddress = getTokenAddress(formData.currency, contracts);
      const amountWei = toTokenUnits(formData.amount);

      setStep('creating');
      toast.info('Creating gift card on blockchain...');

      const result = useDeveloperWallet
        ? await createGiftCardWithDeveloperWallet({
            activeChain,
            contracts,
            formData,
            metadataUri,
            amountWei,
            tokenAddress,
            createAddress,
            developerWallet,
            isConnected,
            address,
            privyUserId: privyUser?.id,
            notifyInfo: toast.info,
            notifyWarning: toast.warning
          })
        : await createGiftCardWithConnectedWallet({
            walletClient,
            activeChain,
            activeChainId,
            createAddress,
            formData,
            metadataUri
          });

      setStep('success');
      setErrorTxHash(null);
      setCreatedCard(buildCreatedCardData({ result, formData, metadataUri }));
      toast.success('Gift card created successfully!');
      toast.success(`Gift card created successfully! TX: ${result.txHash.slice(0, 10)}...${result.txHash.slice(-8)}`);

      try {
        await saveCreatedGiftCard({
          result,
          formData,
          activeChainId,
          createAddress,
          metadataUri
        });
      } catch (error) {
        console.error('Error saving card to Supabase:', error);
      }

      setFormData(RESET_GIFT_CARD_DATA);
    } catch (error) {
      console.error('Error creating gift card:', error);

      const errorMessage = error instanceof Error ? error.message : 'Failed to create gift card';
      const txHash = extractTxHashFromError(errorMessage);
      setErrorTxHash(txHash);

      const errorPresentation = classifyCreateGiftCardError({
        error,
        errorMessage,
        currency: formData.currency,
        txHash,
        isCoinbaseWallet: typeof window !== 'undefined' && (window as any).ethereum?.isCoinbaseWallet
      });

      if (errorPresentation.type === 'canceled') {
        setError('');
        setErrorTxHash(null);
        toast('Canceled', { duration: 2000 });
        return;
      }

      setError(errorPresentation.message);
      if (errorPresentation.clearTxHash) {
        setErrorTxHash(null);
      }
      toast.error(errorPresentation.toastTitle, {
        description: errorPresentation.toastDescription
      });
    } finally {
      setIsCreating(false);
      setStep('form');
    }
  };
  const handleShare = (method?: 'email' | 'x' | 'tiktok' | 'copy') => {
    if (!createdCard) return;
    
    const shareUrl = `${window.location.origin}/spend?tokenId=${createdCard.id}`;
    const shareText = `🎁 Receive a Sendly gift card for $${createdCard.amount} ${createdCard.currency}! ${shareUrl}`;
    
    if (method === 'email') {
      const mailtoLink = `mailto:?subject=🎁 Sendly Gift Card&body=${encodeURIComponent(shareText)}`;
      window.location.href = mailtoLink;
      toast.success('Email app opened');
    } else if (method === 'x') {
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
      window.open(twitterUrl, '_blank');
      toast.success('Twitter opened for posting');
    } else if (method === 'tiktok') {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied! Paste it in TikTok');
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    }
  };

  const getCardColor = () => {
    switch (formData.design) {
      case 'pink': return 'from-pink-400 to-purple-500';
      case 'blue': return 'from-blue-400 to-cyan-500';
      case 'green': return 'from-green-400 to-emerald-500';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getStepText = () => {
    switch (step) {
      case 'generating': return 'Generating image...';
      case 'uploading': return 'Uploading to IPFS...';
      case 'creating': return 'Creating on blockchain...';
      case 'success': return 'Success!';
      default: return 'Create a card';
    }
  };

  const openCircleBridge = () => {
    const baseUrl = import.meta.env.VITE_CIRCLE_BRIDGE_URL || 'https://faucet.circle.com/';
    const url = baseUrl;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Show the message only if there is neither MetaMask nor a social Internal Wallet
  if (!isConnected && !hasDeveloperWallet) {
    return (
      <div className="p-6">
        <Empty className="flex-none gap-4 md:p-6">
          <EmptyHeader>
            <WalletIcon size={40} className="mb-2 text-foreground opacity-70" strokeWidth={1.75} />
            <EmptyTitle>Connect your wallet</EmptyTitle>
            <EmptyDescription>
              Please connect your wallet or social account to create gift cards
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Create a gift card</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Section */}
        <div className="space-y-4">
          {/* Wallet Source Selection - Always visible */}
          <div>
            <Label>Wallet source</Label>
            <RadioGroup
              value={walletSource}
              onValueChange={(value: 'external' | 'circle') => setWalletSource(value)}
              className="mt-2 space-y-2 rounded-lg border border-gray-200 bg-gray-50/50 p-3"
            >
              <div className={`flex items-center space-x-3 rounded-md p-2.5 transition-[background-color,box-shadow,border-color] duration-200 ease-[var(--ease-out)] ${
                walletSource === 'external' 
                  ? 'bg-white shadow-sm border border-gray-300' 
                  : 'hover:bg-white/60'
              } ${!isConnected ? 'opacity-60' : ''}`}>
                <RadioGroupItem 
                  value="external" 
                  id="wallet-external" 
                  className="mt-0" 
                  disabled={!isConnected}
                />
                <div className="flex items-center space-x-2.5 flex-1">
                  <Wallet className="w-5 h-5 text-blue-600" />
                  <Label htmlFor="wallet-external" className="cursor-pointer font-normal flex-1">
                    {isConnected && address 
                      ? `${walletName} (${address.slice(0, 6)}...${address.slice(-4)})`
                      : `${walletName} (Not connected)`
                    }
                  </Label>
                </div>
              </div>
              <div className={`flex items-center space-x-3 rounded-md p-2.5 transition-[background-color,box-shadow,border-color] duration-200 ease-[var(--ease-out)] ${
                walletSource === 'circle' 
                  ? 'bg-white shadow-sm border border-gray-300' 
                  : 'hover:bg-white/60'
              } ${!hasDeveloperWallet || !developerWallet ? 'opacity-60' : ''}`}>
                <RadioGroupItem 
                  value="circle" 
                  id="wallet-circle" 
                  className="mt-0" 
                  disabled={!hasDeveloperWallet || !developerWallet}
                />
                <div className="flex items-center space-x-2.5 flex-1">
                  <Wallet className="w-5 h-5 text-purple-600" />
                  <Label htmlFor="wallet-circle" className="cursor-pointer font-normal flex-1">
                    {hasDeveloperWallet && developerWallet?.wallet_address
                      ? `Internal Wallet (${developerWallet.wallet_address.slice(0, 6)}...${developerWallet.wallet_address.slice(-4)})`
                      : 'Internal Wallet (Not available)'
                    }
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>
          
          <div>
            <Label>Recipient type</Label>
            <RadioGroup
              value={formData.recipientType}
              onValueChange={(value: 'address' | 'twitter' | 'twitch' | 'telegram' | 'tiktok' | 'instagram') => updateFormData('recipientType', value)}
              className="mt-2 space-y-2 rounded-lg border border-gray-200 bg-gray-50/50 p-3"
            >
              {RECIPIENT_OPTIONS.map((option) => {
                const isReceivingDisabled = option.value === 'tiktok' || option.value === 'instagram';
                const isSelected = formData.recipientType === option.value;
                
                const content = (
                  <div 
                    className={`flex items-center space-x-3 rounded-md p-2.5 transition-[background-color,box-shadow,border-color] duration-200 ease-[var(--ease-out)] ${
                      isSelected 
                        ? 'bg-white shadow-sm border border-gray-300' 
                        : 'hover:bg-white/60'
                    } ${isReceivingDisabled ? 'opacity-60' : ''}`}
                  >
                    <RadioGroupItem 
                      value={option.value} 
                      id={option.value} 
                      disabled={isReceivingDisabled}
                      className="mt-0"
                    />
                    <div className="flex items-center space-x-2.5 flex-1">
                      <div className={`flex-shrink-0 ${
                        option.icon === 'address' ? 'text-blue-600' :
                        option.icon === 'twitter' ? 'text-gray-900' :
                        option.icon === 'twitch' ? 'text-purple-600' :
                        option.icon === 'telegram' ? 'text-sky-500' :
                        option.icon === 'tiktok' ? 'text-gray-900' :
                        option.icon === 'instagram' ? 'text-pink-600' :
                        'text-gray-700'
                      }`}>
                        <PlatformIcon platform={option.icon} className="w-5 h-5" />
                      </div>
                      <Label 
                        htmlFor={option.value} 
                        className={`cursor-pointer font-normal flex-1 ${
                          isReceivingDisabled ? 'cursor-not-allowed' : ''
                        }`}
                      >
                        {option.label}
                      </Label>
                    </div>
                  </div>
                );

                if (isReceivingDisabled) {
                  return (
                    <Tooltip key={option.value}>
                      <TooltipTrigger asChild>{content}</TooltipTrigger>
                      <TooltipContent className="max-w-[220px] text-center">
                        Receiving funds is not available yet
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <div key={option.value}>
                    {content}
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {formData.recipientType === 'address' ? (
            <div>
              <Label htmlFor="recipient">Recipient address</Label>
              <Input
                id="recipient"
                placeholder="0x..."
                value={formData.recipientAddress}
                onChange={(e) => updateFormData('recipientAddress', e.target.value)}
                className="mt-2"
              />
            </div>
          ) : formData.recipientType === 'twitter' ? (
            <div>
              <Label htmlFor="username">Twitter username</Label>
              <Input
                id="username"
                placeholder="username"
                value={formData.recipientUsername}
                onChange={(e) => {
                  let username = e.target.value;
                  if (username.startsWith('@')) {
                    username = username.slice(1);
                  }
                  updateFormData('recipientUsername', username);
                }}
                className={`mt-2 transition-[background-color,box-shadow,border-color] duration-200 ease-[var(--ease-out)] ${
                  highlightField === 'twitter' 
                    ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300 shadow-md' 
                    : ''
                }`}
              />
             {/* <p className="text-xs text-gray-500 mt-1">
                The recipient will need to login via Privy with Twitter to claim the card.
              </p> */}
            </div>
          ) : formData.recipientType === 'twitch' ? (
            <div>
              <Label htmlFor="username">Twitch username</Label>
              <Input
                id="username"
                placeholder="username"
                value={formData.recipientUsername}
                onChange={(e) => {
                  const username = e.target.value.trim();
                  updateFormData('recipientUsername', username);
                }}
                className={`mt-2 transition-[background-color,box-shadow,border-color] duration-200 ease-[var(--ease-out)] ${
                  highlightField === 'twitch' 
                    ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-300 shadow-md' 
                    : ''
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">
                The recipient will need to login via Privy with Twitch to claim the card.
              </p>
            </div>
          ) : formData.recipientType === 'telegram' ? (
            <div>
              <Label htmlFor="username">Telegram username</Label>
              <Input
                id="username"
                placeholder="nickname"
                value={formData.recipientUsername}
                onChange={(e) => {
                  let username = e.target.value.trim();
                  if (username.startsWith('@')) {
                    username = username.slice(1);
                  }
                  updateFormData('recipientUsername', username);
                }}
                className={`mt-2 transition-[background-color,box-shadow,border-color] duration-200 ease-[var(--ease-out)] ${
                  highlightField === 'telegram'
                    ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-300 shadow-md'
                    : ''
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">
                The recipient will need to login via Privy with Telegram to claim the card.
              </p>
            </div>
          ) : formData.recipientType === 'tiktok' ? (
            <div>
              <Label htmlFor="username">TikTok username</Label>
              <Input
                id="username"
                placeholder="nickname"
                value={formData.recipientUsername}
                onChange={(e) => {
                  let username = e.target.value.trim();
                  if (username.startsWith('@')) {
                    username = username.slice(1);
                  }
                  updateFormData('recipientUsername', username);
                }}
                className={`mt-2 transition-[background-color,box-shadow,border-color] duration-200 ease-[var(--ease-out)] ${
                  highlightField === 'tiktok'
                    ? 'bg-neutral-900/10 border-black ring-2 ring-neutral-400 shadow-md'
                    : ''
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">
                The recipient will need to login via Privy with TikTok to claim the card.
              </p>
            </div>
          ) : (
            <div>
              <Label htmlFor="username">Instagram username</Label>
              <Input
                id="username"
                placeholder="nickname"
                value={formData.recipientUsername}
                onChange={(e) => {
                  let username = e.target.value.trim();
                  if (username.startsWith('@')) {
                    username = username.slice(1);
                  }
                  updateFormData('recipientUsername', username);
                }}
                className={`mt-2 transition-[background-color,box-shadow,border-color] duration-200 ease-[var(--ease-out)] ${
                  highlightField === 'instagram'
                    ? 'bg-pink-50 border-pink-400 ring-2 ring-pink-300 shadow-md'
                    : ''
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">
                The recipient will need to login via Privy with Instagram to claim the card.
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="amount">Amount (in $)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="10"
              value={formData.amount}
              onChange={(e) => updateFormData('amount', e.target.value)}
              className="mt-2"
            />
          </div>

          <div>
            <Label>Card design</Label>
            <div className="flex gap-2 mt-2">
              {[
                { value: 'pink', label: 'Pink', color: 'bg-pink-400' },
                { value: 'blue', label: 'Blue', color: 'bg-blue-400' },
                { value: 'green', label: 'Green', color: 'bg-green-400' },
              ].map((design) => (
                <Button
                  key={design.value}
                  variant={formData.design === design.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFormData('design', design.value)}
                  className="flex items-center gap-2"
                >
                  <div className={`w-3 h-3 rounded-full ${design.color}`}></div>
                  {design.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value: 'USDC' | 'EURC' | 'PATHUSD' | 'ALPHAUSD' | 'BETAUSD' | 'THETAUSD') => updateFormData('currency', value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="space-y-4">
          <Label>Preview of gift card</Label>
          
          <Card className={`bg-gradient-to-br ${getCardColor()} text-white border-0 shadow-lg`}>
            <CardContent className="p-6 text-center">
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <Gift className="w-6 h-6" />
                  <span className="text-lg font-medium">Gift Card</span>
                </div>
                
                <div className="text-4xl font-bold">
                  ${formData.amount || '0'}
                </div>
                
                <div className="text-sm opacity-90">
                  {formData.currency}
                </div>
                
                {formData.message && (
                  <div className="text-sm bg-white/20 rounded-lg p-3 mt-4">
                    "{formData.message}"
                  </div>
                )}

                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {formData.hasTimer && (
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      <Clock className="w-3 h-3 mr-1" />
                      {formData.timerHours}h delay
                    </Badge>
                  )}
                  {formData.hasPassword && (
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      <Lock className="w-3 h-3 mr-1" />
                      Protected
                    </Badge>
                  )}
                  {formData.expiryDays < 365 && (
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      {formData.expiryDays}d expiry
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-2">
            {!isTempoNetwork && (
              <>
                <Button 
                  variant="outline"
                  className="w-full"
                  size="sm"
                  onClick={openCircleBridge}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Top up {formData.currency} on Arc (Circle Bridge)
                </Button>
                <Button 
                  variant="outline"
                  className="w-full"
                  size="sm"
                  onClick={() => {
                    const bridgeCurrency = formData.currency === 'EURC' ? 'EURC' : 'USDC';
                    const bridgeUrl = generateBridgeUrlFromArc('base-sepolia', bridgeCurrency);
                    navigate(bridgeUrl);
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Bridge {formData.currency} to Base Sepolia
                </Button>
              </>
            )}
            <Button 
              className="w-full" 
              size="lg" 
              onClick={handleCreateCard}
              disabled={isCreating}
            >
              {isCreating ? getStepText() : 'Create a card'}
            </Button>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                disabled={true}
              >
                <QrCode className="w-4 h-4 mr-2" />
                Generate QR
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    disabled={!createdCard}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleShare('email')}>
                    <Mail className="w-4 h-4 mr-2" />
                    Send via Email
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('x')}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Share on X (Twitter)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('tiktok')}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share on TikTok
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('copy')}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* <div className="flex flex-col items-start space-y-1"> 
             {/* <div className="flex items-center space-x-2 text-sm text-gray-600">
                <input type="checkbox" id="paymaster" disabled className="opacity-50 cursor-not-allowed" />
                <Label htmlFor="paymaster" className="opacity-50 cursor-not-allowed">Use paymaster</Label>
              </div>
              <span className="text-gray-500 text-xs ml-5">Coming soon</span>
            </div> */}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <div>{error}</div>
                {errorTxHash && (
                  <div className="text-sm">
                    TX:{' '}
                    <button
                      onClick={() => {
                        window.open(getExplorerTxUrl(activeChainId, errorTxHash), '_blank');
                      }}
                      className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
                      title={`View on Explorer: ${errorTxHash}`}
                    >
                      {errorTxHash.slice(0, 10)}...{errorTxHash.slice(-8)}
                    </button>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Success Display */}
          {createdCard && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <div>Gift card created successfully!</div>
                <div className="text-sm">
                  TX: 
                  <button
                    onClick={() => {
                      window.open(getExplorerTxUrl(activeChainId, createdCard.tx_hash ?? ''), '_blank');
                    }}
                    className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors ml-1"
                    title={`View on Explorer: ${createdCard.tx_hash}`}
                  >
                    {createdCard.tx_hash.slice(0, 10)}...{createdCard.tx_hash.slice(-8)}
                  </button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Message field - spans both columns */}
        <div className="lg:col-span-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="Your message here..."
            value={formData.message}
            onChange={(e) => updateFormData('message', e.target.value)}
            className="mt-2 w-full"
          />
        </div>

        {/* Advanced Features Toggle */}
        <div className="lg:col-span-2 flex items-center space-x-2 -mt-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="advanced"
                  checked={showAdvanced}
                  disabled
                  onCheckedChange={(checked) => {
                    if (typeof checked === 'boolean') {
                      setShowAdvanced(checked);
                    }
                  }}
                />
                <Label htmlFor="advanced" className="cursor-not-allowed opacity-50">Advanced features</Label>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>This feature is temporarily unavailable</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Advanced Features - Full width, below grid */}
      {showAdvanced && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          {/* Secret Message */}
          <div>
            <Label htmlFor="secret" className="text-base font-medium">Secret message (revealed after activation)</Label>
            <Textarea
              id="secret"
              placeholder="A special message or promo code..."
              value={formData.secretMessage}
              onChange={(e) => updateFormData('secretMessage', e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>

          {/* Timer Feature */}
          <div className="flex items-center space-x-2">
            <Switch
              id="timer"
              checked={formData.hasTimer}
              onCheckedChange={(checked) => updateFormData('hasTimer', checked)}
            />
            <Label htmlFor="timer" className="text-base font-medium cursor-pointer">Open later (timer)</Label>
          </div>

          {formData.hasTimer && (
            <div className="pl-6 space-y-1">
              <Label className="text-base">Hours until card can be opened: {formData.timerHours}h</Label>
              <Slider
                value={[formData.timerHours]}
                onValueChange={(value) => updateFormData('timerHours', value[0])}
                max={168}
                min={1}
                step={1}
                className="mt-2 w-full"
              />
            </div>
          )}

          {/* Password Protection */}
          <div className="flex items-center space-x-2">
            <Switch
              id="password"
              checked={formData.hasPassword}
              onCheckedChange={(checked) => updateFormData('hasPassword', checked)}
            />
            <Label htmlFor="password" className="text-base font-medium cursor-pointer">Password protection</Label>
          </div>

          {formData.hasPassword && (
            <div className="pl-6">
              <Input
                placeholder="Enter password"
                type="password"
                value={formData.password}
                onChange={(e) => updateFormData('password', e.target.value)}
                className="mt-2 w-full"
              />
            </div>
          )}

          {/* Expiry */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Card expires in: {formData.expiryDays} days</Label>
            <Slider
              value={[formData.expiryDays]}
              onValueChange={(value) => updateFormData('expiryDays', value[0])}
              max={365}
              min={1}
              step={1}
              className="mt-2 w-full"
            />
          </div>

          {/* Custom Design Upload */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Custom design</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="default" className="flex-1">
                <Upload className="w-4 h-4 mr-2" />
                Upload Image
              </Button>
              <Button variant="outline" size="default" className="flex-1">
                <Palette className="w-4 h-4 mr-2" />
                AI Generate
              </Button>
            </div>
          </div>

          {/* NFT Cover */}
          <div className="space-y-1">
            <Label htmlFor="nft" className="text-base font-medium">NFT Cover (optional)</Label>
            <Input
              id="nft"
              placeholder="NFT contract address or OpenSea URL"
              value={formData.nftCover}
              onChange={(e) => updateFormData('nftCover', e.target.value)}
              className="mt-2 w-full"
            />
          </div>
        </div>
      )}

      <BridgeDialog 
        open={isBridgeDialogOpen} 
        onOpenChange={setIsBridgeDialogOpen} 
      />
    </div>
  );
}
