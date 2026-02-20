import { useState, useEffect } from 'react';
import { Camera, Gift, Lock, Clock, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from './ui/empty';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';
import { createWalletClient, custom } from 'viem';
import { useNavigate } from 'react-router-dom';
import { arcTestnet } from '../utils/web3/wagmiConfig';
import web3Service from '../utils/web3/web3Service';
import { GiftCardsService } from '../utils/supabase/giftCards';
import { USDC_ADDRESS, EURC_ADDRESS, USYC_ADDRESS, CONTRACT_ADDRESS, GiftCardABI } from '../utils/web3/constants';
import BridgeDialog from './BridgeDialog';
import { usePrivySafe } from '../utils/privy/usePrivySafe';
import { DeveloperWalletService } from '../utils/circle/developerWalletService';

interface RedeemableCard {
  tokenId: string;
  amount: string;
  currency: 'USDC' | 'EURC' | 'USYC';
  design: string;
  message: string;
  secretMessage?: string;
  sender: string;
  hasPassword: boolean;
  hasTimer: boolean;
  timerEndsAt?: string;
  expiresAt?: string;
  status: 'valid' | 'expired' | 'redeemed' | 'locked';
  metadataUri?: string;
}

interface SpendCardProps {
  selectedTokenId?: string;
}

const TECH_GIANT_SERVICES = ['airbnb', 'amazon', 'apple'] as const;
const USD_WITHDRAW_SERVICES = ['visa', 'circle'] as const;
type TechGiantService = (typeof TECH_GIANT_SERVICES)[number];
type UsdWithdrawService = (typeof USD_WITHDRAW_SERVICES)[number];

const SERVICE_DISPLAY_NAMES: Record<string, string> = {
  amazon: 'Amazon',
  apple: 'Apple',
  airbnb: 'Airbnb',
  stripe: 'Stripe',
  visa: 'Visa',
  circle: 'Circle',
  'usdc-withdraw': 'USDC Withdraw'
};

export function SpendCard({ selectedTokenId = '' }: SpendCardProps) {
  const { address, isConnected } = useAccount();
  const { authenticated, user: privyUser } = usePrivySafe();
  const navigate = useNavigate();
  const [hasDeveloperWallet, setHasDeveloperWallet] = useState(false);
  const [developerWallet, setDeveloperWallet] = useState<any>(null);
  const [checkingWallet, setCheckingWallet] = useState(true);
  const [cardInput, setCardInput] = useState('');
  const [password, setPassword] = useState('');
  const [currentCard, setCurrentCard] = useState<RedeemableCard | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [isTechGiantsOpen, setIsTechGiantsOpen] = useState(false);

  const [redeemStep, setRedeemStep] = useState<'input' | 'verify' | 'redeem' | 'success'>('input');
  const [error, setError] = useState('');
  const [isBridgeDialogOpen, setIsBridgeDialogOpen] = useState(false);
  const [isBridgeComplete, setIsBridgeComplete] = useState(false);
  const [bridgeAmount, setBridgeAmount] = useState<string>('');

  const isTechGiantsSelected =
    selectedService !== null
      ? TECH_GIANT_SERVICES.includes(selectedService as TechGiantService)
      : false;
  const isUsdWithdrawSelected =
    selectedService !== null
      ? USD_WITHDRAW_SERVICES.includes(selectedService as UsdWithdrawService)
      : false;
  const selectedServiceLabel = selectedService
    ? SERVICE_DISPLAY_NAMES[selectedService] ??
      `${selectedService.charAt(0).toUpperCase()}${selectedService.slice(1)}`
    : '';

  // Service URLs for redirect
  const serviceUrls = {
    amazon: "https://www.amazon.com/gift-cards/",
    apple: "https://www.apple.com/uk/shop/gift-cards",
    airbnb: "https://www.airbnb.com/giftcards",
    stripe: "https://buy.stripe.com/test_28o4ig0SY9Xq8co3cc",
    visa: "https://www.visa.com/en-us",
    circle: "/Circle-Mint"
  };

  // Checking for a Internal wallet for social networks
  useEffect(() => {
    const checkSocialWallet = async () => {
      // If MetaMask is connected - no need to check a social wallet
      if (isConnected) {
        setHasDeveloperWallet(false);
        setDeveloperWallet(null);
        setCheckingWallet(false);
        return;
      }

      // If no social network is linked - do not check
      if (!authenticated || !privyUser) {
        setHasDeveloperWallet(false);
        setDeveloperWallet(null);
        setCheckingWallet(false);
        return;
      }

      try {
        setCheckingWallet(true);
        // Check for a Internal wallet for linked social networks
        const socialPlatforms = ['twitter', 'twitch', 'telegram', 'tiktok', 'instagram'];
        const blockchain = 'ARC-TESTNET';
        
        for (const platform of socialPlatforms) {
          let socialUserId: string | null = null;
          
          if (platform === 'twitter' && privyUser.twitter) {
            socialUserId = (privyUser.twitter as any).subject;
          } else if (platform === 'twitch' && privyUser.twitch) {
            socialUserId = (privyUser.twitch as any).subject;
          } else if (platform === 'telegram' && privyUser.telegram) {
            socialUserId = privyUser.telegram.telegramUserId || (privyUser.telegram as any).subject;
          } else if (platform === 'tiktok' && privyUser.tiktok) {
            socialUserId = (privyUser.tiktok as any).subject;
          } else if (platform === 'instagram' && (privyUser as any).instagram) {
            socialUserId = ((privyUser as any).instagram as any).subject;
          }

          if (socialUserId) {
            const foundWallet = await DeveloperWalletService.getWalletBySocial(
              platform as 'twitter' | 'twitch' | 'telegram' | 'tiktok' | 'instagram',
              socialUserId,
              blockchain
            );
            
            if (foundWallet) {
              setHasDeveloperWallet(true);
              setDeveloperWallet(foundWallet);
              break;
            }
          }
        }
      } catch (error) {
        console.error('Error checking social wallet:', error);
        setHasDeveloperWallet(false);
        setDeveloperWallet(null);
      } finally {
        setCheckingWallet(false);
      }
    };

    checkSocialWallet();
  }, [isConnected, authenticated, privyUser]);

  // Auto-fill Token ID if provided from MyCards
  useEffect(() => {
    if (selectedTokenId && selectedTokenId !== cardInput) {
      setCardInput(selectedTokenId);
    }
  }, [selectedTokenId, cardInput]);

  // Auto-lookup when cardInput changes and is not empty
  useEffect(() => {
    // Do not perform lookup while wallet is being checked
    if (checkingWallet) {
      return;
    }
    
    // Do not perform lookup if neither MetaMask nor Internal wallet is available
    if (!isConnected && !hasDeveloperWallet) {
      return;
    }
    
    if (cardInput && cardInput.trim() !== '' && redeemStep === 'input') {
      handleCardLookup();
    }
  }, [cardInput, isConnected, hasDeveloperWallet, checkingWallet, redeemStep]); // eslint-disable-line react-hooks/exhaustive-deps

  const lookupCard = async (tokenId: string): Promise<RedeemableCard | null> => {
    // Determine address to check card ownership
    let checkAddress: string;
    
    if (isConnected && address) {
      checkAddress = address;
    } else if (hasDeveloperWallet && developerWallet) {
      checkAddress = developerWallet.wallet_address;
    } else {
      throw new Error('Wallet not connected');
    }

    try {
      let giftCardInfo: any;
      let owner: string;
      let creator: string;
      
      // If MetaMask is connected - use web3Service
      if (isConnected && address) {
        // Initialize web3 service
        const walletClient = createWalletClient({
          chain: arcTestnet,
          transport: custom(window.ethereum)
        });

        await web3Service.initialize(walletClient, address as string);

        // Get gift card info from blockchain
        giftCardInfo = await web3Service.getGiftCardInfo(tokenId);
        
        if (!giftCardInfo) {
          return null;
        }

        // Check if user owns this card
        owner = await web3Service.getCardOwner(tokenId);
        if (owner.toLowerCase() !== address.toLowerCase()) {
          throw new Error('You do not own this gift card');
        }

        // Get the original creator of the card
        creator = await web3Service.getCardCreator(tokenId);
      } else {
        // For Internal wallet use a public RPC for reading
        const { createPublicClient, http } = await import('viem');
        const publicClient = createPublicClient({
          chain: arcTestnet,
          transport: http()
        });

        // Read card data directly from the contract
        // Use the correct ABI from GiftCardABI
        const [contractData, ownerData, creatorData] = await Promise.all([
          publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: GiftCardABI,
            functionName: 'getGiftCardInfo',
            args: [BigInt(tokenId)]
          }),
          publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: [
              {
                inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
                name: 'ownerOf',
                outputs: [{ internalType: 'address', name: '', type: 'address' }],
                stateMutability: 'view',
                type: 'function'
              }
            ],
            functionName: 'ownerOf',
            args: [BigInt(tokenId)]
          }),
          publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: [
              {
                inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
                name: 'getGiftCardCreator',
                outputs: [{ internalType: 'address', name: '', type: 'address' }],
                stateMutability: 'view',
                type: 'function'
              }
            ],
            functionName: 'getGiftCardCreator',
            args: [BigInt(tokenId)]
          }).catch(() => '0x0000000000000000000000000000000000000000')
        ]) as any;

        // contractData is the GiftCardInfo structure: { amount, token, redeemed, message }
        if (!contractData || (contractData as any).redeemed) {
          return null;
        }

        owner = ownerData;
        creator = creatorData && creatorData !== '0x0000000000000000000000000000000000000000' 
          ? creatorData 
          : '0x0000000000000000000000000000000000000000';

        // Check if user owns this card
        if (owner.toLowerCase() !== checkAddress.toLowerCase()) {
          throw new Error('You do not own this gift card');
        }

        // Convert contract data to giftCardInfo format
        // contractData already is structure { amount, token, redeemed, message }
        giftCardInfo = {
          amount: (contractData as any).amount.toString(),
          token: (contractData as any).token,
          redeemed: (contractData as any).redeemed,
          message: (contractData as any).message || ''
        };
      }

      // Common formatting logic for both cases
      // Format amount properly 
      const formattedAmount = (Number(giftCardInfo.amount) / 1000000).toString();
      
      // Determine token symbol from address
      const tokenAddress = giftCardInfo.token.toLowerCase();
      const tokenSymbol: RedeemableCard['currency'] = 
        tokenAddress === USDC_ADDRESS.toLowerCase() ? 'USDC' :
        tokenAddress === EURC_ADDRESS.toLowerCase() ? 'EURC' :
        tokenAddress === USYC_ADDRESS.toLowerCase() ? 'USYC' :
        'USDC';

      // Format creator address (show first 6 and last 4 characters)
      const formattedCreator = creator && creator !== '0x0000000000000000000000000000000000000000' 
        ? `${creator.slice(0, 6)}...${creator.slice(-4)}` 
        : 'Unknown';

      return {
        tokenId,
        amount: formattedAmount,
        currency: tokenSymbol,
        design: 'pink', // Default design, could be extracted from metadata
        message: giftCardInfo.message || '',
        sender: formattedCreator,
        hasPassword: false, // Not implemented in current contract
        hasTimer: false, // Not implemented in current contract
        status: giftCardInfo.redeemed ? 'redeemed' : 'valid'
      };
    } catch (error) {
      console.error('Error looking up card:', error);
      throw error;
    }
  };

  const handleCardLookup = async () => {
    setError('');

    // Don't lookup if we're not in input step (to prevent unnecessary lookups)
    if (redeemStep !== 'input') {
      return;
    }
    
    try {
      const card = await lookupCard(cardInput);
      
      if (!card) {
        setError('Gift card not found. Please check the token ID and try again.');
        setCurrentCard(null);
        return;
      }

      if (card.status === 'redeemed') {
        setError('This gift card has already been redeemed.');
        setCurrentCard(card); // Set card so user can see it was redeemed
        setRedeemStep('input'); // Stay on input step
        return;
      }

      if (card.status === 'expired') {
        setError('This gift card has expired.');
        setCurrentCard(null);
        return;
      }

      if (card.status === 'locked' && card.hasTimer) {
        setError('This gift card is still locked. Please wait for the timer to expire.');
        setCurrentCard(null);
        return;
      }

      setCurrentCard(card);
      setRedeemStep(card.hasPassword ? 'verify' : 'redeem');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error looking up gift card. Please try again.');
      setCurrentCard(null);
    }
  };

  const handlePasswordVerification = () => {
    if (!password) {
      setError('Please enter the password.');
      return;
    }

    // For testing, use simple password
    if (password === '1234') {
      setError('');
      setRedeemStep('redeem');
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  const handleRedeem = async () => {
    // Recognize address and type of execute tx
    let redeemAddress: string;
    let useDeveloperWallet = false;
    
    if (isConnected && address) {
      redeemAddress = address;
    } else if (hasDeveloperWallet && developerWallet) {
      redeemAddress = developerWallet.wallet_address;
      useDeveloperWallet = true;
    } else {
      setError('Wallet not connected');
      return;
    }
    
    if (!currentCard) return;
    
    if (!selectedService) {
      setError('Please select a service to spend your gift card on.');
      return;
    }

    if (selectedService === 'stripe' && currentCard.currency !== 'USDC') {
      setError('Stripe only supports USDC. Please use a USDC gift card.');
      return;
    }

    try {
      // Check card status before redeem
      let giftCardInfo: any;
      let owner: string;
      
      if (useDeveloperWallet) {
        // For Internal wallet use public RPC for reading
        const { createPublicClient, http } = await import('viem');
        const publicClient = createPublicClient({
          chain: arcTestnet,
          transport: http()
        });

        [giftCardInfo, owner] = await Promise.all([
          publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: GiftCardABI,
            functionName: 'getGiftCardInfo',
            args: [BigInt(currentCard.tokenId)]
          }),
          publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: [
              {
                inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
                name: 'ownerOf',
                outputs: [{ internalType: 'address', name: '', type: 'address' }],
                stateMutability: 'view',
                type: 'function'
              }
            ],
            functionName: 'ownerOf',
            args: [BigInt(currentCard.tokenId)]
          })
        ]);
        
        // giftCardInfo is structure { amount, token, redeemed, message }
        giftCardInfo = {
          redeemed: giftCardInfo.redeemed,
          amount: giftCardInfo.amount.toString(),
          token: giftCardInfo.token,
          message: giftCardInfo.message || ''
        };
      } else {
        // For MetaMask use web3Service
        const walletClient = createWalletClient({
          chain: arcTestnet,
          transport: custom(window.ethereum)
        });

        await web3Service.initialize(walletClient, address as string);

        giftCardInfo = await web3Service.getGiftCardInfo(currentCard.tokenId);
        owner = await web3Service.getCardOwner(currentCard.tokenId);
      }
      
      if (!giftCardInfo) {
        setError('Gift card not found. It may have been removed.');
        setCurrentCard(null);
        setRedeemStep('input');
        return;
      }

      // Check that the card has not been redeemed yet
      if (giftCardInfo.redeemed) {
        setError('This gift card has already been redeemed and cannot be used again.');
        setCurrentCard(prev => prev ? { ...prev, status: 'redeemed' } : null);
        setRedeemStep('input');
        if (cardInput === currentCard.tokenId) {
          setCardInput('');
        }
        return;
      }

      // Check that user is still the owner of the card
      if (owner && owner.toLowerCase() !== redeemAddress.toLowerCase()) {
        setError('You are no longer the owner of this gift card.');
        setCurrentCard(null);
        setRedeemStep('input');
        if (cardInput === currentCard.tokenId) {
          setCardInput('');
        }
        return;
      }

      // Redeem gift card on blockchain
      if (useDeveloperWallet) {
        // Use Internal wallet to redeem
        // Determine privyUserId - if wallet was created with user_id = MetaMask address (and no privy_user_id),
        // use MetaMask address instead of Privy ID for verification
        let privyUserId: string | undefined = undefined;
        
        // Check if wallet was created with user_id = address (no privy_user_id in DB)
        const walletCreatedWithAddress = developerWallet && 
          developerWallet.user_id && 
          developerWallet.user_id.startsWith('0x') && 
          !developerWallet.privy_user_id &&
          isConnected && 
          address &&
          developerWallet.user_id.toLowerCase() === address.toLowerCase();
        
        if (walletCreatedWithAddress) {
          // Wallet was created with user_id = MetaMask address, use address for verification
          privyUserId = address.toLowerCase();
        } else if (privyUser?.id) {
          // Use Privy ID as normal
          privyUserId = privyUser.id.startsWith('did:privy:') 
            ? privyUser.id.replace('did:privy:', '') 
            : privyUser.id;
        } else {
          throw new Error('Privy user ID not found');
        }

        // Determine the social network for the Internal wallet
        let socialPlatform: string | null = null;
        let socialUserId: string | null = null;
        
        const socialPlatforms = ['twitter', 'twitch', 'telegram', 'tiktok', 'instagram'];
        for (const platform of socialPlatforms) {
          if (platform === 'twitter' && privyUser?.twitter) {
            socialPlatform = 'twitter';
            socialUserId = (privyUser.twitter as any).subject;
            break;
          } else if (platform === 'twitch' && privyUser?.twitch) {
            socialPlatform = 'twitch';
            socialUserId = (privyUser.twitch as any).subject;
            break;
          } else if (platform === 'telegram' && privyUser?.telegram) {
            socialPlatform = 'telegram';
            socialUserId = privyUser.telegram.telegramUserId || (privyUser.telegram as any).subject;
            break;
          } else if (platform === 'tiktok' && privyUser?.tiktok) {
            socialPlatform = 'tiktok';
            socialUserId = (privyUser.tiktok as any).subject;
            break;
          } else if (platform === 'instagram' && (privyUser as any)?.instagram) {
            socialPlatform = 'instagram';
            socialUserId = ((privyUser as any).instagram as any).subject;
            break;
          }
        }

        const txResult = await DeveloperWalletService.sendTransaction({
          walletId: developerWallet.circle_wallet_id,
          walletAddress: developerWallet.wallet_address,
          contractAddress: CONTRACT_ADDRESS,
          functionName: 'redeemGiftCard',
          args: [BigInt(currentCard.tokenId)],
          blockchain: 'ARC-TESTNET',
          privyUserId: privyUserId,
          socialPlatform: socialPlatform || undefined,
          socialUserId: socialUserId || undefined
        });

        if (!txResult.success) {
          throw new Error(txResult.error || 'Failed to redeem gift card');
        }
      } else {
        // Use MetaMask to redeem
        await web3Service.redeemGiftCard(currentCard.tokenId);
      }
      
      // Update Supabase cache
      try {
        await GiftCardsService.updateCardRedeemedStatus(currentCard.tokenId, true);
        console.log('Card redeemed status updated in Supabase');
      } catch (error) {
        console.error('Error updating card status in Supabase:', error);
      }
      
      setRedeemStep('success');
      toast.success(`Gift card redeemed successfully for ${selectedService.charAt(0).toUpperCase() + selectedService.slice(1)}!`);
      
      // Update card status
      setCurrentCard(prev => prev ? { ...prev, status: 'redeemed' } : null);
      
      // For Stripe: don't do automatic redirect, show bridge button
      if (selectedService === 'stripe') {
        setBridgeAmount(currentCard.amount);
        setIsBridgeComplete(false);
      } else {
        // For other services: standard redirect
        setTimeout(() => {
          if (!selectedService) return;
          const url = serviceUrls[selectedService as keyof typeof serviceUrls];
          if (!url) return;
          if (url.startsWith('/')) {
            if (selectedService === 'circle' && currentCard) {
              const params = new URLSearchParams({
                tokenId: currentCard.tokenId,
                amount: currentCard.amount,
                autoConnect: '1'
              }).toString();
              navigate(`/Circle-Mint?${params}`);
            } else {
              navigate(url);
            }
          }
          else window.open(url, '_blank');
        }, 2000);
      }
      

    } catch (error) {
      console.error('Error redeeming card:', error);
      
      // Check if error is user rejection
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as any)?.code;
      
      // Check for user rejection patterns
      if (
        errorCode === 4001 ||
        errorMessage.toLowerCase().includes('user rejected') ||
        errorMessage.toLowerCase().includes('user denied') ||
        errorMessage.toLowerCase().includes('rejected the request') ||
        errorMessage.toLowerCase().includes('denied transaction')
      ) {
        setError('User rejected the action');
      } else {
        setError(errorMessage || 'Failed to redeem gift card. Please try again.');
      }
    }
  };



  const getCardColor = (design: string) => {
    switch (design) {
      case 'pink': return 'from-pink-400 to-purple-500';
      case 'blue': return 'from-blue-400 to-cyan-500';
      case 'green': return 'from-green-400 to-emerald-500';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const resetForm = () => {
    // Navigate to My Cards page and clear URL parameters
    navigate('/my');
  };

  // Show the message only if there is neither MetaMask nor a social Internal wallet
  if (!isConnected && !hasDeveloperWallet) {
    if (checkingWallet) {
      return (
        <div className="p-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-600">Checking wallet...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Gift className="w-12 h-12 opacity-50" />
            </EmptyMedia>
            <EmptyTitle>Connect your wallet</EmptyTitle>
            <EmptyDescription>
              Please connect your wallet or social account to redeem gift cards
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Spend a gift card</h2>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Enter manually</TabsTrigger>
          <TabsTrigger value="scan" disabled>
            Scan QR code
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4">
          {redeemStep === 'input' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="cardId">Gift card token ID</Label>
                <Input
                  id="cardId"
                  placeholder="Enter gift card token ID"
                  value={cardInput}
                  onChange={(e) => setCardInput(e.target.value)}
                />
              </div>
              <Button onClick={handleCardLookup} className="w-full">
                Look up card
              </Button>
            </div>
          )}

          {redeemStep === 'verify' && currentCard && (
            <div className="space-y-4">
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  This gift card is password protected. Please enter the password to continue.
                </AlertDescription>
              </Alert>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handlePasswordVerification} className="flex-1">
                  Verify password
                </Button>
                <Button variant="outline" onClick={() => setRedeemStep('input')}>
                  Back
                </Button>
              </div>
            </div>
          )}

          {redeemStep === 'redeem' && currentCard && (
            <div className="space-y-4">
              <Card className={`bg-gradient-to-br ${getCardColor(currentCard.design)} text-white border-0`}>
                <CardContent className="p-6 text-center">
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <Gift className="w-6 h-6" />
                      <span className="text-lg font-medium">Gift Card</span>
                    </div>
                    
                    <div className="text-4xl font-bold">
                      ${currentCard.amount}
                    </div>
                    
                    <div className="text-sm opacity-90">
                      {currentCard.currency}
                    </div>
                    
                    <div className="text-sm bg-white/20 rounded-lg p-3">
                      "{currentCard.message}"
                    </div>

                    <div className="flex flex-wrap gap-2 justify-center">
                      {currentCard.hasTimer && (
                        <Badge variant="secondary" className="bg-white/20 text-white">
                          <Clock className="w-3 h-3 mr-1" />
                          Timer
                        </Badge>
                      )}
                      {currentCard.hasPassword && (
                        <Badge variant="secondary" className="bg-white/20 text-white">
                          <Lock className="w-3 h-3 mr-1" />
                          Protected
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Service Selection */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700 text-center">Choose where to spend your gift card:</h4>

                <div className="flex flex-wrap justify-center gap-4">
                  {/* Web2 (Tech Giants) hidden */}
                  {false && (
                    <Popover
                      open={isTechGiantsOpen}
                      onOpenChange={(open) => {
                        setIsTechGiantsOpen(open);
                      }}
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={`flex flex-col items-center transition-all duration-200 focus:outline-none ${
                            isTechGiantsSelected ? 'scale-110' : 'hover:scale-105'
                          }`}
                          aria-label="Open Tech Giants options"
                        >
                          <div
                            className={`w-16 h-16 rounded-lg overflow-hidden shadow-sm mb-2 border-2 transition-all duration-200 ${
                              isTechGiantsSelected
                                ? 'border-sky-500 shadow-lg'
                                : 'border-gray-200 hover:border-sky-300'
                            }`}
                          >
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-500 to-blue-600">
                              <span className="text-xs font-semibold text-white">Apple</span>
                            </div>
                          </div>
                          <span
                            className={`text-xs font-medium transition-colors ${
                              isTechGiantsSelected ? 'text-sky-600' : 'text-gray-600'
                            }`}
                          >
                            Web 2
                          </span>
                        </button>
                      </PopoverTrigger>

                      <PopoverContent className="w-80 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Tech Giants</span>
                          <ChevronDown
                            className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                              isTechGiantsOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          {/* Airbnb */}
                          <button
                            type="button"
                            className={`flex flex-col items-center transition-all duration-200 focus:outline-none ${
                              selectedService === 'airbnb' ? 'scale-110' : 'hover:scale-105'
                            }`}
                            onClick={() => {
                              setSelectedService('airbnb');
                              setIsTechGiantsOpen(false);
                            }}
                          >
                            <div
                              className={`w-16 h-16 rounded-lg overflow-hidden shadow-sm mb-2 border-2 transition-all duration-200 ${
                                selectedService === 'airbnb'
                                  ? 'border-blue-500 shadow-lg'
                                  : 'border-gray-200 hover:border-blue-300'
                              }`}
                            >
                              <img
                                src="/airbnb.jpg"
                                alt="Airbnb"
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <span
                              className={`text-xs font-medium transition-colors ${
                                selectedService === 'airbnb' ? 'text-blue-600' : 'text-gray-600'
                              }`}
                            >
                              Airbnb
                            </span>
                          </button>

                          {/* Amazon */}
                          <button
                            type="button"
                            className={`flex flex-col items-center transition-all duration-200 focus:outline-none ${
                              selectedService === 'amazon' ? 'scale-110' : 'hover:scale-105'
                            }`}
                            onClick={() => {
                              setSelectedService('amazon');
                              setIsTechGiantsOpen(false);
                            }}
                          >
                            <div
                              className={`w-16 h-16 rounded-lg overflow-hidden shadow-sm mb-2 border-2 transition-all duration-200 ${
                                selectedService === 'amazon'
                                  ? 'border-orange-500 shadow-lg'
                                  : 'border-gray-200 hover:border-orange-300'
                              }`}
                            >
                              <img
                                src="/amazon.jpg"
                                alt="Amazon"
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <span
                              className={`text-xs font-medium transition-colors ${
                                selectedService === 'amazon' ? 'text-orange-600' : 'text-gray-600'
                              }`}
                            >
                              Amazon
                            </span>
                          </button>

                          {/* Apple */}
                          <button
                            type="button"
                            className={`flex flex-col items-center transition-all duration-200 focus:outline-none ${
                              selectedService === 'apple' ? 'scale-110' : 'hover:scale-105'
                            }`}
                            onClick={() => {
                              setSelectedService('apple');
                              setIsTechGiantsOpen(false);
                            }}
                          >
                            <div
                              className={`w-16 h-16 rounded-lg overflow-hidden shadow-sm mb-2 border-2 transition-all duration-200 ${
                                selectedService === 'apple'
                                  ? 'border-gray-500 shadow-lg'
                                  : 'border-gray-200 hover:border-gray-400'
                              }`}
                            >
                              <img
                                src="/apple.jpg"
                                alt="Apple"
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <span
                              className={`text-xs font-medium transition-colors ${
                                selectedService === 'apple' ? 'text-gray-800' : 'text-gray-600'
                              }`}
                            >
                              Apple
                            </span>
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}

                  {/* USDC Withdraw */}
                  <div
                    className={`flex flex-col items-center cursor-pointer transition-all duration-200 ${
                      selectedService === 'usdc-withdraw' ? 'scale-110' : 'hover:scale-105'
                    }`}
                    onClick={() => setSelectedService('usdc-withdraw')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        setSelectedService('usdc-withdraw');
                      }
                    }}
                  >
                    <div
                      className={`w-16 h-16 rounded-lg overflow-hidden shadow-sm mb-2 border-2 transition-all duration-200 ${
                        selectedService === 'usdc-withdraw'
                          ? 'border-cyan-500 shadow-lg'
                          : 'border-gray-200 hover:border-cyan-300'
                      }`}
                    >
                      <div className="w-full h-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
                        <span className="text-white font-bold text-[10px] leading-tight text-center px-1">
                          USDC
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-medium transition-colors ${
                        selectedService === 'usdc-withdraw' ? 'text-cyan-600' : 'text-gray-600'
                      }`}
                    >
                      USDC Withdraw
                    </span>
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <button
                          type="button"
                          disabled
                          className={`flex flex-col items-center transition-all duration-200 focus:outline-none ${
                            isUsdWithdrawSelected ? 'scale-110' : 'hover:scale-105'
                          } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                          aria-label="Open USD Withdraw options"
                        >
                          <div
                            className={`w-16 h-16 rounded-lg overflow-hidden shadow-sm mb-2 border-2 transition-all duration-200 ${
                              isUsdWithdrawSelected
                                ? 'border-emerald-500 shadow-lg'
                                : 'border-gray-200 hover:border-emerald-300'
                            }`}
                          >
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500 to-lime-500">
                              <span className="text-xs font-semibold text-white">USD</span>
                            </div>
                          </div>
                          <span
                            className={`text-xs font-medium transition-colors ${
                              isUsdWithdrawSelected ? 'text-emerald-600' : 'text-gray-600'
                            }`}
                          >
                            USD Withdraw
                          </span>
                        </button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>On/off-ramp for USDC will be available in Mainnet</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Stripe */}
                  <div 
                    className={`flex flex-col items-center cursor-pointer transition-all duration-200 ${
                      selectedService === 'stripe' ? 'scale-110' : 'hover:scale-105'
                    }`}
                    onClick={() => setSelectedService('stripe')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        setSelectedService('stripe');
                      }
                    }}
                  >
                    <div className={`w-16 h-16 rounded-lg overflow-hidden shadow-sm mb-2 border-2 transition-all duration-200 ${
                      selectedService === 'stripe' ? 'border-purple-500 shadow-lg' : 'border-gray-200 hover:border-purple-300'
                    }`}>
                      <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                        <span className="text-white font-bold text-xs">Stripe</span>
                      </div>
                    </div>
                    <span className={`text-xs font-medium transition-colors ${
                      selectedService === 'stripe' ? 'text-purple-600' : 'text-gray-600'
                    }`}>
                      Stripe
                    </span>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleRedeem} 
                className="w-full" 
                size="lg"
                disabled={!selectedService}
              >
                {selectedService 
                  ? `Redeem for ${selectedServiceLabel}` 
                  : 'Select a service first'
                }
              </Button>
            </div>
          )}

          {redeemStep === 'success' && currentCard && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Gift card redeemed successfully! You have received ${currentCard.amount} {currentCard.currency}.
                </AlertDescription>
              </Alert>

              {selectedService === 'stripe' && currentCard.currency === 'USDC' ? (
                <>
                  {!isBridgeComplete ? (
                    <>
                      <Alert className="border-blue-200 bg-blue-50">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800">
                          Stripe requires USDC on Base Sepolia network. Please bridge your funds first.
                        </AlertDescription>
                      </Alert>
                      <Button 
                        onClick={() => setIsBridgeDialogOpen(true)} 
                        className="w-full" 
                        size="lg"
                      >
                        Bridge to Base
                      </Button>
                    </>
                  ) : (
                    <>
                      <Alert className="border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">
                          Bridge completed successfully! You can now proceed to Stripe checkout.
                        </AlertDescription>
                      </Alert>
                      <Button 
                        onClick={() => window.open(serviceUrls.stripe, '_blank')} 
                        className="w-full" 
                        size="lg"
                      >
                        Pay with Stripe
                      </Button>
                    </>
                  )}
                </>
              ) : selectedService && serviceUrls[selectedService as keyof typeof serviceUrls] ? (
                <>
                {/* <Alert className="border-blue-200 bg-blue-50">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      Redirecting to {selectedService.charAt(0).toUpperCase() + selectedService.slice(1)} in a few seconds...
                    </AlertDescription>
                  </Alert> */}
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      If the redirect doesn't happen, please follow this link manually:{" "}
                      <a 
                        href={serviceUrls[selectedService as keyof typeof serviceUrls]} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="underline font-medium hover:text-amber-900"
                      >
                        {serviceUrls[selectedService as keyof typeof serviceUrls]}
                      </a>
                    </AlertDescription>
                  </Alert>
                </>
              ) : null}

              {currentCard.secretMessage && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Secret Message</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{currentCard.secretMessage}</p>
                  </CardContent>
                </Card>
              )}

              <Button onClick={resetForm} className="w-full">
                Redeem another card
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="scan" className="space-y-4">
          <div className="text-center space-y-4">
            <div className="w-64 h-64 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
              <Camera className="w-16 h-16 text-gray-400" />
            </div>
            <p className="text-gray-600">Point your camera at the QR code</p>

          </div>
        </TabsContent>
      </Tabs>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <BridgeDialog
        open={isBridgeDialogOpen}
        onOpenChange={setIsBridgeDialogOpen}
        onBridgeComplete={() => {
          setIsBridgeComplete(true);
          setIsBridgeDialogOpen(false);
          toast.success('Bridge completed! You can now proceed to Stripe checkout.');
        }}
        initialAmount={bridgeAmount}
      />
    </div>
  );
}