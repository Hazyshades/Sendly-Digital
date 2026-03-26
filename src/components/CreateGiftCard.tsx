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
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useAccount, useWalletClient } from 'wagmi';
import { createWalletClient, custom, createPublicClient, http } from 'viem';
import web3Service from '@/lib/web3/web3Service';
import { arcTestnet, tempoTestnet } from '@/lib/web3/wagmiConfig';
import { ERC20ABI, getExplorerTxUrl, getContractsForChain, ARC_CHAIN_ID } from '@/lib/web3/constants';
import { generateNewIpfsUri } from '@/lib/newIpfsUri';
// import { insertFakeUri } from '@/lib/supabase/uriService';
import { createTwitterCardMapping } from '@/lib/twitter';
import { createTwitchCardMapping } from '@/lib/twitch';
import { createTelegramCardMapping } from '@/lib/telegram';
import { createTikTokCardMapping } from '@/lib/tiktok';
import { createInstagramCardMapping } from '@/lib/instagram';
import BridgeDialog from '@/components/BridgeDialog';
import { GiftCardsService } from '@/lib/supabase/giftCards';
import { useNavigate } from 'react-router-dom';
import { generateBridgeUrlFromArc } from '@/lib/bridge/bridgeUrlHelper';
import { usePrivySafe } from '@/lib/privy/usePrivySafe';
import { DeveloperWalletService } from '@/lib/circle/developerWalletService';
import { apiCall } from '@/lib/supabase/client';

interface GiftCardData {
  recipientType: 'address' | 'twitter' | 'twitch' | 'telegram' | 'tiktok' | 'instagram';
  recipientAddress: string;
  recipientUsername: string;
  amount: string;
  currency: 'USDC' | 'EURC' | 'PATHUSD' | 'ALPHAUSD' | 'BETAUSD' | 'THETAUSD';
  design: 'pink' | 'blue' | 'green' | 'custom';
  message: string;
  secretMessage: string;
  hasTimer: boolean;
  timerHours: number;
  hasPassword: boolean;
  password: string;
  expiryDays: number;
  customImage: string;
  nftCover: string;
}

type PlatformIcon = 'wallet' | 'twitter' | 'twitch' | 'telegram' | 'tiktok' | 'instagram';

const RECIPIENT_OPTIONS: Array<{
  value: 'address' | 'twitter' | 'twitch' | 'telegram' | 'tiktok' | 'instagram';
  label: string;
  icon: PlatformIcon;
}> = [
  { value: 'address', label: 'Wallet address', icon: 'wallet' },
  { value: 'twitter', label: 'Twitter', icon: 'twitter' },
  { value: 'twitch', label: 'Twitch', icon: 'twitch' },
  { value: 'telegram', label: 'Telegram', icon: 'telegram' },
  { value: 'tiktok', label: 'TikTok', icon: 'tiktok' },
  { value: 'instagram', label: 'Instagram', icon: 'instagram' }
];

// Helper function to render platform icons
const renderPlatformIcon = (platform: PlatformIcon, className: string = "w-4 h-4") => {
  switch (platform) {
    case 'wallet':
      return <Wallet className={className} />;
    case 'twitter':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      );
    case 'twitch':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
        </svg>
      );
    case 'telegram':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M9.50039 15.0005L9.30305 18.7916C9.63343 18.7916 9.77653 18.6502 9.94861 18.4803L11.4982 16.9898L15.251 19.7367C15.9373 20.1197 16.4205 19.9285 16.6027 19.0304L18.9395 7.42573L18.9402 7.42504C19.1555 6.32428 18.5201 5.86444 17.851 6.13415L4.90234 11.1053C3.84037 11.5206 3.85629 12.1181 4.7964 12.3878L8.10118 13.3485L15.8533 8.52547C16.2199 8.28796 16.5538 8.42039 16.2799 8.6579L9.50039 15.0005Z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      );
    case 'instagram':
      return (
        <svg className={className} viewBox="0 0 512 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M349.33 69.33a93.62 93.62 0 0193.34 93.34v186.66a93.62 93.62 0 01-93.34 93.34H162.67a93.62 93.62 0 01-93.34-93.34V162.67a93.62 93.62 0 0193.34-93.34h186.66m0-37.33H162.67C90.8 32 32 90.8 32 162.67v186.66C32 421.2 90.8 480 162.67 480h186.66C421.2 480 480 421.2 480 349.33V162.67C480 90.8 421.2 32 349.33 32z"/>
          <path d="M377.33 162.67a28 28 0 1128-28 27.94 27.94 0 01-28 28zM256 181.33A74.67 74.67 0 11181.33 256 74.75 74.75 0 01256 181.33m0-37.33a112 112 0 10112 112 112 112 0 00-112-112z"/>
        </svg>
      );
    default:
      return null;
  }
};

// Helper function to detect wallet name
function getWalletName(): string {
  if (typeof window === 'undefined' || !window.ethereum) {
    return 'Web3 Wallet';
  }

  const ethereum = window.ethereum as any;

  // IMPORTANT: Check Rabby BEFORE MetaMask, but verify it's actually Rabby
  // Rabby is based on MetaMask, so it may have isMetaMask = true
  // But if ONLY isMetaMask is true (without isRabby), it's MetaMask
  if (ethereum.isRabby === true) {
    // Double-check: Rabby should have isRabby explicitly set to true
    return 'Rabby Wallet';
  }
  
  // If isMetaMask is true but isRabby is not explicitly true, it's MetaMask
  if (ethereum.isMetaMask === true && ethereum.isRabby !== true) {
    return 'MetaMask';
  }
  
  // Fallback: if isMetaMask is true (even if isRabby might be undefined)
  if (ethereum.isMetaMask === true) {
    return 'MetaMask';
  }
  if (ethereum.isCoinbaseWallet) {
    return 'Coinbase Wallet';
  }
  if (ethereum.isTrust) {
    return 'Trust Wallet';
  }
  if (ethereum.isBraveWallet) {
    return 'Brave Wallet';
  }
  if (ethereum.isTokenPocket) {
    return 'TokenPocket';
  }
  if (ethereum.isImToken) {
    return 'imToken';
  }
  if (ethereum.isOKExWallet) {
    return 'OKX Wallet';
  }
  if (ethereum.isBitKeep) {
    return 'BitKeep';
  }
  if (ethereum.isFrame) {
    return 'Frame';
  }
  if (ethereum.isPhantom) {
    return 'Phantom';
  }
  if (ethereum.isAvalanche) {
    return 'Avalanche Wallet';
  }
  if (ethereum.isZeppelin) {
    return 'Zeppelin';
  }
  
  // Check for Rainbow Wallet (via RainbowKit)
  if (ethereum.isRainbow) {
    return 'Rainbow Wallet';
  }
  
  // Check provider name if available (some wallets set this)
  // But be careful - only use this if we haven't identified the wallet yet
  // and only if it's an exact match
  if (ethereum.providerName && !ethereum.isMetaMask && !ethereum.isRabby) {
    const providerName = String(ethereum.providerName).toLowerCase().trim();
    // Only trust exact matches
    if (providerName === 'rabby' || providerName === 'rabby wallet') {
      return 'Rabby Wallet';
    }
    if (providerName === 'metamask') {
      return 'MetaMask';
    }
  }

  // Default fallback
  return 'Web3 Wallet';
}

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
  const [walletName, setWalletName] = useState<string>('Web3 Wallet');
  const navigate = useNavigate();
  const [hasDeveloperWallet, setHasDeveloperWallet] = useState(false);
  const [developerWallet, setDeveloperWallet] = useState<any>(null);
  const [checkingWallet, setCheckingWallet] = useState(true);
  const [walletSource, setWalletSource] = useState<'metamask' | 'developer'>('metamask');
  const [formData, setFormData] = useState<GiftCardData>({
    recipientType: 'address',
    recipientAddress: '',
    recipientUsername: '',
    amount: '1',
    currency: 'USDC',
    design: 'pink',
    message: '',
    secretMessage: '',
    hasTimer: false,
    timerHours: 24,
    hasPassword: false,
    password: '',
    expiryDays: 365,
    customImage: '',
    nftCover: ''
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createdCard, setCreatedCard] = useState<any>(null);
  const [error, setError] = useState('');
  const [errorTxHash, setErrorTxHash] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'generating' | 'uploading' | 'creating' | 'success'>('form');
  const [isBridgeDialogOpen, setIsBridgeDialogOpen] = useState(false);
  const [highlightField, setHighlightField] = useState<'twitch' | 'twitter' | 'telegram' | 'tiktok' | 'instagram' | null>(null);

  // Load selected recipient from localStorage on mount
  useEffect(() => {
    const selectedRecipient = localStorage.getItem('selectedGiftCardRecipient');
    if (selectedRecipient) {
      try {
        const recipient = JSON.parse(selectedRecipient);
        if (recipient.type === 'twitch' && recipient.username) {
          setFormData(prev => ({
            ...prev,
            recipientType: 'twitch',
            recipientUsername: recipient.username
          }));
          // Highlight the field
          setHighlightField('twitch');
          toast.success(`Selected ${recipient.displayName || recipient.username} for gift card`);
          // Clear the stored recipient after using it
          localStorage.removeItem('selectedGiftCardRecipient');
          // Remove highlight after animation
          setTimeout(() => setHighlightField(null), 2000);
        } else if (recipient.type === 'twitter' && recipient.username) {
          setFormData(prev => ({
            ...prev,
            recipientType: 'twitter',
            recipientUsername: recipient.username
          }));
          // Highlight the field
          setHighlightField('twitter');
          toast.success(`Selected ${recipient.displayName || recipient.username} for gift card`);
          localStorage.removeItem('selectedGiftCardRecipient');
          // Remove highlight after animation
          setTimeout(() => setHighlightField(null), 2000);
        } else if (recipient.type === 'telegram' && recipient.username) {
          setFormData(prev => ({
            ...prev,
            recipientType: 'telegram',
            recipientUsername: recipient.username.replace(/^@/, '')
          }));
          setHighlightField('telegram');
          toast.success(`Selected ${recipient.displayName || recipient.username} for gift card`);
          localStorage.removeItem('selectedGiftCardRecipient');
          setTimeout(() => setHighlightField(null), 2000);
        } else if (recipient.type === 'tiktok' && recipient.username) {
          setFormData(prev => ({
            ...prev,
            recipientType: 'tiktok',
            recipientUsername: recipient.username.replace(/^@/, '')
          }));
          setHighlightField('tiktok');
          toast.success(`Selected ${recipient.displayName || recipient.username} for gift card`);
          localStorage.removeItem('selectedGiftCardRecipient');
          setTimeout(() => setHighlightField(null), 2000);
        } else if (recipient.type === 'instagram' && recipient.username) {
          setFormData(prev => ({
            ...prev,
            recipientType: 'instagram',
            recipientUsername: recipient.username.replace(/^@/, '')
          }));
          setHighlightField('instagram');
          toast.success(`Selected ${recipient.displayName || recipient.username} for gift card`);
          localStorage.removeItem('selectedGiftCardRecipient');
          setTimeout(() => setHighlightField(null), 2000);
        } else if (recipient.type === 'address' && recipient.address) {
          setFormData(prev => ({
            ...prev,
            recipientType: 'address',
            recipientAddress: recipient.address
          }));
          toast.success(`Selected ${recipient.displayName || recipient.address.slice(0, 6) + '...' + recipient.address.slice(-4)} for gift card`);
          localStorage.removeItem('selectedGiftCardRecipient');
        }
      } catch (error) {
        console.error('Error parsing selected recipient:', error);
        localStorage.removeItem('selectedGiftCardRecipient');
      }
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


  // Checking for the presence of a Internal wallet for social networks
  useEffect(() => {
    const checkSocialWallet = async () => {
      // If MetaMask is connected, ALWAYS check for developer wallet by address
      // This allows finding wallets created with user_id = MetaMask address
      // Even if user is not authenticated via Privy
      if (!isConnected && (!authenticated || !privyUser)) {
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
        let foundWallet: any = null;
        
        // If MetaMask is connected, first try to find wallet by MetaMask address
        // (Developer Wallet can be created with user_id = MetaMask address)
        if (isConnected && address) {
          const normalizedAddress = address.toLowerCase().trim();
          try {
            const wallets = await DeveloperWalletService.getWallets(normalizedAddress);
            
            // Find wallet for ARC-TESTNET blockchain
            foundWallet = wallets.find((w: any) => w.blockchain === blockchain) || wallets[0] || null;
          } catch (error) {
            // Error fetching wallets by MetaMask address
          }
        }
        
        // If no wallet found by MetaMask address, try to find by social platforms
        if (!foundWallet && privyUser) {
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
              const wallet = await DeveloperWalletService.getWalletBySocial(
                platform as 'twitter' | 'twitch' | 'telegram' | 'tiktok' | 'instagram',
                socialUserId,
                blockchain
              );
              
              if (wallet) {
                foundWallet = wallet;
                break;
              }
            }
          }
        }
        
        // If no wallet found by social platforms, try to find by Privy User ID
        if (!foundWallet && privyUser?.id) {
          try {
            // Normalize Privy User ID (remove 'did:privy:' prefix if present)
            const normalizedPrivyUserId = privyUser.id.startsWith('did:privy:') 
              ? privyUser.id.replace('did:privy:', '') 
              : privyUser.id;
            
            const wallets = await DeveloperWalletService.getWallets(normalizedPrivyUserId);
            
            // Find wallet for ARC-TESTNET blockchain
            foundWallet = wallets.find((w: any) => w.blockchain === blockchain) || wallets[0] || null;
          } catch (error) {
            // Error fetching wallets by Privy User ID
          }
        }
        
        // Update state based on found wallet
        if (foundWallet) {
          setHasDeveloperWallet(true);
          setDeveloperWallet(foundWallet);
          // If MetaMask is also connected, default to MetaMask but allow choice
          if (isConnected) {
            setWalletSource('metamask');
          } else {
            setWalletSource('developer');
          }
        } else {
          setHasDeveloperWallet(false);
          setDeveloperWallet(null);
          // If no developer wallet found and MetaMask is connected, use MetaMask
          if (isConnected) {
            setWalletSource('metamask');
          }
        }
      } catch (error) {
        console.error('Error checking social wallet:', error);
        setHasDeveloperWallet(false);
        setDeveloperWallet(null);
        if (isConnected) {
          setWalletSource('metamask');
        }
      } finally {
        setCheckingWallet(false);
      }
    };

    checkSocialWallet();
  }, [isConnected, authenticated, privyUser]);

  // Detect wallet name when connected
  useEffect(() => {
    if (isConnected && typeof window !== 'undefined' && window.ethereum) {
      // First, try to use connector name from wagmi (most reliable)
      let detectedName = 'Web3 Wallet';
      
      if (connector?.name) {
        const connectorName = connector.name.toLowerCase();
        if (connectorName.includes('rabby')) {
          detectedName = 'Rabby Wallet';
        } else if (connectorName.includes('metamask')) {
          detectedName = 'MetaMask';
        } else if (connectorName.includes('coinbase')) {
          detectedName = 'Coinbase Wallet';
        } else if (connectorName.includes('trust')) {
          detectedName = 'Trust Wallet';
        } else if (connectorName.includes('rainbow')) {
          detectedName = 'Rainbow Wallet';
        } else {
          // Use connector name as-is if it's a known format
          detectedName = connector.name;
        }
      } else {
        // Fallback to ethereum properties if connector name is not available
        detectedName = getWalletName();
      }
      
      setWalletName(detectedName);
    } else {
      setWalletName('Web3 Wallet');
    }
  }, [isConnected, connector]);

  const handleCreateCard = async () => {
    // Check for a wallet (MetaMask or Internal wallet)
    if (!isConnected && !hasDeveloperWallet) {
      setError('Please connect your wallet first');
      return;
    }
    
    // Determine the wallet address to create the card from based on selected source
    let createAddress: string;
    let useDeveloperWallet = false;
    
    if (walletSource === 'developer' && hasDeveloperWallet && developerWallet) {
      // Use Developer wallet
      createAddress = developerWallet.wallet_address;
      useDeveloperWallet = true;
    } else if (walletSource === 'metamask' && isConnected && address) {
      // Use MetaMask
      createAddress = address;
      useDeveloperWallet = false;
    } else if (isConnected && address) {
      // Fallback to MetaMask if available
      createAddress = address;
      useDeveloperWallet = false;
    } else if (hasDeveloperWallet && developerWallet) {
      // Fallback to Developer wallet if available
      createAddress = developerWallet.wallet_address;
      useDeveloperWallet = true;
    } else {
      setError('Wallet not connected');
      return;
    }
    
    if (!createAddress) {
      setError('Wallet address not found');
      return;
    }

    if (!contracts.contractAddress) {
      setError('GiftCard contract is not configured for this network. Set VITE_AVAX_CONTRACT_ADDRESS in .env.');
      return;
    }

    // Validate based on recipient type
    if (formData.recipientType === 'address') {
      if (!formData.recipientAddress || !formData.recipientAddress.startsWith('0x')) {
        setError('Please enter a valid recipient address');
        return;
      }
    } else if (formData.recipientType === 'twitter') {
      if (!formData.recipientUsername || formData.recipientUsername.trim() === '') {
        setError('Please enter a Twitter username');
        return;
      }
    } else if (formData.recipientType === 'twitch') {
      if (!formData.recipientUsername || formData.recipientUsername.trim() === '') {
        setError('Please enter a Twitch username');
        return;
      }
    } else if (formData.recipientType === 'telegram') {
      if (!formData.recipientUsername || formData.recipientUsername.trim() === '') {
        setError('Please enter a Telegram username');
        return;
      }
    } else if (formData.recipientType === 'tiktok') {
      if (!formData.recipientUsername || formData.recipientUsername.trim() === '') {
        setError('Please enter a TikTok username');
        return;
      }
    } else if (formData.recipientType === 'instagram') {
      if (!formData.recipientUsername || formData.recipientUsername.trim() === '') {
        setError('Please enter an Instagram username');
        return;
      }
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsCreating(true);
    setError('');
    setErrorTxHash(null);

    try {
      // Step 1: Generate fake IPFS URI (без Pinata)
      setStep('uploading');
      toast.info('Preparing metadata...');
      
      const metadataUri = generateNewIpfsUri();

      // Step 2: Check token balance and prepare for creation
      const tokenAddress =
        formData.currency === 'USDC'
          ? contracts.usdc
          : formData.currency === 'EURC'
            ? (contracts.eurc ?? contracts.usdc)
            : formData.currency === 'PATHUSD'
              ? (contracts.pathusd ?? contracts.usdc)
              : formData.currency === 'ALPHAUSD'
                ? (contracts.alphausd ?? contracts.usdc)
                : formData.currency === 'BETAUSD'
                  ? (contracts.betausd ?? contracts.usdc)
                  : (contracts.thetausd ?? contracts.usdc);
      
      const amountWei = (parseFloat(formData.amount) * 1000000).toString(); // 6 decimals for USDC/EURC
      
      // Check balance for Internal wallet
      if (useDeveloperWallet) {
        const publicClient = createPublicClient({
          chain: activeChain,
          transport: http()
        });
        
        const balance = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'balanceOf',
          args: [createAddress as `0x${string}`]
        }) as bigint;
        
        const balanceFormatted = (Number(balance) / 1000000).toFixed(6);
        
        if (BigInt(balance) < BigInt(amountWei)) {
          const errorMsg = `Insufficient ${formData.currency} balance. You have ${balanceFormatted} ${formData.currency}, but need ${formData.amount} ${formData.currency}. Wallet: ${createAddress?.slice(0, 6)}...${createAddress?.slice(-4)}`;
          setError(errorMsg);
          setIsCreating(false);
          return;
        }

        // check allowance if need make approve
        // For social usernames, the card creation functions are in the main CONTRACT_ADDRESS, not in vault contracts
        // Vault contracts are only used for storing cards, not for creating them
        // For address recipients, also use CONTRACT_ADDRESS
        const spenderAddress = contracts.contractAddress!;

        const currentAllowance = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'allowance',
          args: [createAddress as `0x${string}`, spenderAddress as `0x${string}`]
        }) as bigint;

        if (currentAllowance < BigInt(amountWei)) {
          toast.info(`Approving ${formData.currency} for contract...`);

        // Determine privyUserId - if wallet was created with user_id = MetaMask address (and no privy_user_id),
        // use MetaMask address instead of Privy ID for verification
        let privyUserIdForTx: string | undefined = undefined;
        
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
          privyUserIdForTx = address.toLowerCase();
        } else if (privyUser?.id) {
          // Use Privy ID as normal
          privyUserIdForTx = privyUser.id.startsWith('did:privy:') 
            ? privyUser.id.replace('did:privy:', '') 
            : privyUser.id;
        } else if (isConnected && address) {
          // If no Privy auth but MetaMask is connected, use MetaMask address
          privyUserIdForTx = address.toLowerCase();
        }
        // Note: If user is authenticated only via social account (no MetaMask),
        // privyUserId may be undefined, but socialPlatform/socialUserId will be used for verification

          // Send approve via Internal wallet
          const approveTx = await DeveloperWalletService.sendTransaction({
            walletId: developerWallet.circle_wallet_id,
            walletAddress: developerWallet.wallet_address,
            contractAddress: tokenAddress,
            functionName: 'approve',
            args: [spenderAddress, BigInt(amountWei)],
            blockchain: 'ARC-TESTNET',
            privyUserId: privyUserIdForTx,
            socialPlatform: developerWallet.social_platform || undefined,
            socialUserId: developerWallet.social_user_id || undefined
          });

          if (!approveTx.success) {
            throw new Error(approveTx.error || 'Approve failed');
          }

          // Wait for approve confirmation (by transactionId)
          if (approveTx.transactionId) {
            const maxAttemptsApprove = 30;
            const pollIntervalApprove = 1000;
            for (let attempt = 0; attempt < maxAttemptsApprove; attempt++) {
              await new Promise(resolve => setTimeout(resolve, pollIntervalApprove));
              try {
                const approveStatus = await apiCall(`/wallets/transaction-status?transactionId=${encodeURIComponent(approveTx.transactionId)}`, { method: 'GET' });
                if (approveStatus?.transactionState === 'COMPLETE') {
                  break;
                }
                if (approveStatus?.transactionState === 'FAILED') {
                  throw new Error(approveStatus?.error || approveStatus?.transaction?.errorDetails || 'Approve transaction failed');
                }
              } catch (pollError) {
                console.warn('Error polling approve status:', pollError);
              }
            }
          }
        }
      }

      // Step 4: Create gift card on blockchain
      setStep('creating');
      toast.info('Creating gift card on blockchain...');
      
      let result;
      
      // Use different methods based on wallet type and recipient type
      if (useDeveloperWallet) {
        // Create card via Internal wallet
        const normalizedUsername = formData.recipientType !== 'address' 
          ? formData.recipientUsername.toLowerCase().replace(/^@/, '').trim()
          : '';
        
        let functionName: string;
        let args: any[];
        
        if (formData.recipientType === 'twitter') {
          functionName = 'createGiftCardForTwitter';
          args = [normalizedUsername, BigInt(amountWei), tokenAddress, metadataUri, formData.message];
        } else if (formData.recipientType === 'twitch') {
          functionName = 'createGiftCardForTwitch';
          args = [normalizedUsername, BigInt(amountWei), tokenAddress, metadataUri, formData.message];
        } else if (formData.recipientType === 'telegram') {
          functionName = 'createGiftCardForTelegram';
          args = [normalizedUsername, BigInt(amountWei), tokenAddress, metadataUri, formData.message];
        } else if (formData.recipientType === 'tiktok') {
          functionName = 'createGiftCardForTikTok';
          args = [normalizedUsername, BigInt(amountWei), tokenAddress, metadataUri, formData.message];
        } else if (formData.recipientType === 'instagram') {
          functionName = 'createGiftCardForInstagram';
          args = [normalizedUsername, BigInt(amountWei), tokenAddress, metadataUri, formData.message];
        } else {
          // Address recipient
          functionName = 'createGiftCard';
          args = [formData.recipientAddress, BigInt(amountWei), tokenAddress, metadataUri, formData.message];
        }
        
        // Get social platform info for transaction
        let socialPlatform: string | undefined;
        let socialUserId: string | undefined;
        if (developerWallet) {
          socialPlatform = developerWallet.social_platform || undefined;
          socialUserId = developerWallet.social_user_id || undefined;
        }
        
        // Determine privyUserId - if wallet was created with user_id = MetaMask address (and no privy_user_id),
        // use MetaMask address instead of Privy ID for verification
        let privyUserIdForTx: string | undefined = undefined;
        
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
          privyUserIdForTx = address.toLowerCase();
        } else if (privyUser?.id) {
          // Use Privy ID as normal
          privyUserIdForTx = privyUser.id.startsWith('did:privy:') 
            ? privyUser.id.replace('did:privy:', '') 
            : privyUser.id;
        } else if (isConnected && address) {
          // If no Privy auth but MetaMask is connected, use MetaMask address
          privyUserIdForTx = address.toLowerCase();
        }
        // Note: If user is authenticated only via social account (no MetaMask),
        // privyUserId may be undefined, but socialPlatform/socialUserId will be used for verification
        
        // Send transaction via Internal wallet
        const txResult = await DeveloperWalletService.sendTransaction({
          walletId: developerWallet.circle_wallet_id,
          walletAddress: developerWallet.wallet_address,
          contractAddress: contracts.contractAddress!,
          functionName: functionName,
          args: args,
          blockchain: 'ARC-TESTNET',
          privyUserId: privyUserIdForTx,
          socialPlatform: socialPlatform,
          socialUserId: socialUserId
        });
        
        if (!txResult.success) {
          // Provide more specific error message
          const errorMessage = txResult.error || 'Failed to create gift card';
          // Error details logged on backend only
          
          // Check for common error patterns
          if (errorMessage.includes('balance') || errorMessage.includes('insufficient')) {
            throw new Error(`Insufficient ${formData.currency} balance. Please ensure you have enough tokens to create this gift card.`);
          } else if (errorMessage.includes('allowance') || errorMessage.includes('approve')) {
            throw new Error('Token approval failed. Please try again.');
          } else if (errorMessage.includes('Vault not set') || errorMessage.includes('vault')) {
            throw new Error('Vault contract not configured. Please contact support.');
          } else if (errorMessage.includes('Username required') || errorMessage.includes('username')) {
            throw new Error('Invalid username. Please check the username and try again.');
          }
          
          throw new Error(errorMessage);
        }
        
        // If txHash is not yet available, poll the transaction status until txHash is received
        let finalTxHash = txResult.txHash;
        if (!finalTxHash && txResult.transactionId) {
          toast.info('Waiting for transaction to be processed...');
          
          // Poll transaction status via Circle API
          const maxAttempts = 30; // Maximum 30 attempts (~30 seconds)
          const pollInterval = 1000; // 1 second between attempts
          
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            
              try {
                // Use common apiCall helper to set Authorization
              const statusData = await apiCall(`/wallets/transaction-status?transactionId=${encodeURIComponent(txResult.transactionId)}`, {
                method: 'GET'
              });
              
              if (statusData) {
                if (statusData.txHash) {
                  finalTxHash = statusData.txHash;
                  break;
                }
                // If the transaction failed
                if (statusData.transactionState === 'FAILED') {
                  // Get more detailed error information
                  const errorDetails = statusData.transaction?.errorDetails || 
                                     statusData.transaction?.error || 
                                     statusData.error || 
                                     'Transaction failed';
                  const errorMessage = typeof errorDetails === 'string' 
                    ? errorDetails 
                    : JSON.stringify(errorDetails);
                  
                  // Transaction failure details logged on backend only
                  
                  // Provide more specific error message
                  let userFriendlyError = 'Transaction failed';
                  if (errorMessage.includes('transfer amount exceeds balance') || 
                      errorMessage.includes('insufficient balance') ||
                      errorMessage.includes('ERC20')) {
                    userFriendlyError = `Insufficient ${formData.currency} balance. Please ensure you have enough tokens to create this gift card.`;
                  } else if (errorMessage.includes('allowance')) {
                    userFriendlyError = 'Token approval failed. Please try again.';
                  } else if (errorMessage.includes('Vault not set') || errorMessage.includes('vault')) {
                    userFriendlyError = 'Vault contract not configured. Please contact support.';
                  } else if (errorMessage.includes('Username required') || errorMessage.includes('username')) {
                    userFriendlyError = 'Invalid username. Please check the username and try again.';
                  }
                  
                  throw new Error(userFriendlyError);
                }
                // If transaction is completed but no txHash yet, continue polling
                if (statusData.transactionState === 'COMPLETE' && !statusData.txHash) {
                  // Wait a bit more for txHash to appear
                  await new Promise(resolve => setTimeout(resolve, 2000));
                  // Try one more time
                  const retryStatusData = await apiCall(`/wallets/transaction-status?transactionId=${encodeURIComponent(txResult.transactionId)}`, {
                    method: 'GET'
                  });
                  if (retryStatusData?.txHash) {
                    finalTxHash = retryStatusData.txHash;
                    break;
                  }
                }
              }
            } catch (pollError) {
              // If it's a transaction failure error, re-throw it
              if (pollError instanceof Error && pollError.message !== 'Transaction failed') {
                throw pollError;
              }
              console.warn('Error polling transaction status:', pollError);
              // Continue polling only if it's not a transaction failure
              if (pollError instanceof Error && pollError.message.includes('Transaction failed')) {
                throw pollError;
              }
            }
          }
          
          if (!finalTxHash) {
            // If there is still no txHash, use transactionId for display
            // and show a message to the user
            toast.warning('Transaction is being processed. Please check status later.');
            // Use transactionId as a temporary identifier
            finalTxHash = txResult.transactionId || 'pending';
          }
        }
        
        if (!finalTxHash) {
          throw new Error('Failed to get transaction hash');
        }
        
        // If txHash is not ready yet (pending), do not wait for receipt
        if (finalTxHash === 'pending' || finalTxHash === txResult.transactionId) {
          // Use transactionId to store the card
          result = {
            tokenId: 'pending', // Will be updated later
            txHash: txResult.transactionId || 'pending'
          };
        } else {
          // Wait for transaction receipt and extract tokenId
          const publicClient = createPublicClient({
            chain: activeChain,
            transport: http()
          });
          
          const receipt = await publicClient.waitForTransactionReceipt({
            hash: finalTxHash as `0x${string}`
          });
          
          // Check transaction status - if it failed, throw an error
          if (receipt.status === 'reverted' || (typeof receipt.status === 'number' && receipt.status === 0)) {
            throw new Error(`Transaction failed: ERC20 transfer amount exceeds balance or other contract error. Transaction hash: ${finalTxHash}`);
          }
          
          // Extract tokenId from Transfer event
          const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
          const zeroAddress = '0x0000000000000000000000000000000000000000';
          const zeroAddressTopic = '0x' + zeroAddress.slice(2).padStart(64, '0');
          
          let tokenId = '1'; // Default fallback
          const transferEvent = receipt.logs.find((log: any) => 
            log.topics[0] === transferEventSignature &&
            log.topics[1]?.toLowerCase() === zeroAddressTopic.toLowerCase() &&
            (log.address.toLowerCase() === contracts.contractAddress!.toLowerCase() ||
             log.address.toLowerCase() === (formData.recipientType === 'twitter' ? contracts.vaultContract! :
                                          formData.recipientType === 'twitch' ? contracts.twitchVault! :
                                          formData.recipientType === 'telegram' ? contracts.telegramVault! :
                                          formData.recipientType === 'tiktok' ? contracts.tiktokVault! :
                                          formData.recipientType === 'instagram' ? contracts.instagramVault! :
                                          contracts.contractAddress!).toLowerCase())
          );
          
          if (transferEvent && transferEvent.topics[3]) {
            tokenId = BigInt(transferEvent.topics[3]).toString();
          }
          
          result = {
            tokenId: tokenId,
            txHash: finalTxHash
          };
        }
      } else {
        // Create card via MetaMask (existing logic)
        // Initialize web3 service
        let clientToUse = walletClient;
        if (!clientToUse) {
          // Creating manual wallet client
          clientToUse = createWalletClient({
            chain: activeChain,
            transport: custom(window.ethereum)
          });
        }

        await web3Service.initialize(clientToUse, createAddress, activeChainId);
        
        // Use different methods based on recipient type
        if (formData.recipientType === 'twitter') {
          // Normalize username for consistency (createCardForTwitter also normalizes)
          const normalizedUsername = formData.recipientUsername.toLowerCase().replace(/^@/, '').trim();
          // Creating Twitter card
          
          // Use new Vault flow for Twitter cards
          result = await web3Service.createCardForTwitter(
            normalizedUsername, // Using normalized username
            formData.amount,
            formData.currency,
            metadataUri,
            formData.message
          );
          
          // Still save metadata to KV for additional info (using normalized username)
          try {
            await createTwitterCardMapping({
              tokenId: result.tokenId,
              username: normalizedUsername, // Saving normalized username
              temporaryOwner: '', // No longer needed with Vault
              senderAddress: createAddress,
              amount: formData.amount,
              currency: formData.currency,
              message: formData.message,
              metadataUri: metadataUri
            });
          } catch (error) {
            console.error('Error saving Twitter card metadata:', error);
            // Non-critical error, card is already created on blockchain
          }
        } else if (formData.recipientType === 'twitch') {
          const normalizedUsername = formData.recipientUsername.toLowerCase().trim();
          // Creating Twitch card
          
          result = await web3Service.createCardForTwitch(
            normalizedUsername,
            formData.amount,
            formData.currency,
            metadataUri,
            formData.message
          );
          
          try {
            await createTwitchCardMapping({
              tokenId: result.tokenId,
              username: normalizedUsername,
              temporaryOwner: '',
              senderAddress: createAddress,
              amount: formData.amount,
              currency: formData.currency,
              message: formData.message,
              metadataUri: metadataUri
            });
          } catch (error) {
            console.error('Error saving Twitch card metadata:', error);
          }
        } else if (formData.recipientType === 'telegram') {
          const normalizedUsername = formData.recipientUsername.toLowerCase().replace(/^@/, '').trim();
          // Creating Telegram card

          result = await web3Service.createCardForTelegram(
            normalizedUsername,
            formData.amount,
            formData.currency,
            metadataUri,
            formData.message
          );

          try {
            await createTelegramCardMapping({
              tokenId: result.tokenId,
              username: normalizedUsername,
              temporaryOwner: '',
              senderAddress: createAddress,
              amount: formData.amount,
              currency: formData.currency,
              message: formData.message,
              metadataUri: metadataUri
            });
          } catch (error) {
            console.error('Error saving Telegram card metadata:', error);
          }
        } else if (formData.recipientType === 'tiktok') {
          const normalizedUsername = formData.recipientUsername.toLowerCase().replace(/^@/, '').trim();
          // Creating TikTok card

          result = await web3Service.createCardForTikTok(
            normalizedUsername,
            formData.amount,
            formData.currency,
            metadataUri,
            formData.message
          );

          try {
            await createTikTokCardMapping({
              tokenId: result.tokenId,
              username: normalizedUsername,
              temporaryOwner: '',
              senderAddress: createAddress,
              amount: formData.amount,
              currency: formData.currency,
              message: formData.message,
              metadataUri: metadataUri
            });
          } catch (error) {
            console.error('Error saving TikTok card metadata:', error);
          }
        } else if (formData.recipientType === 'instagram') {
          const normalizedUsername = formData.recipientUsername.toLowerCase().replace(/^@/, '').trim();
          // Creating Instagram card

          result = await web3Service.createCardForInstagram(
            normalizedUsername,
            formData.amount,
            formData.currency,
            metadataUri,
            formData.message
          );

          try {
            await createInstagramCardMapping({
              tokenId: result.tokenId,
              username: normalizedUsername,
              temporaryOwner: '',
              senderAddress: createAddress,
              amount: formData.amount,
              currency: formData.currency,
              message: formData.message,
              metadataUri: metadataUri
            });
          } catch (error) {
            console.error('Error saving Instagram card metadata:', error);
          }
        } else {
          // Standard flow for address recipients
          result = await web3Service.createGiftCard(
            formData.recipientAddress,
            formData.amount,
            formData.currency,
            metadataUri,
            formData.message
          );
        }
      }

      setStep('success');
      setErrorTxHash(null); // Clear any previous error hash on success
      
      const createdCardData = {
        id: result.tokenId,
        recipientAddress: formData.recipientAddress,
        amount: formData.amount,
        currency: formData.currency,
        design: formData.design,
        message: formData.message,
        secretMessage: formData.secretMessage,
        hasTimer: formData.hasTimer,
        timerHours: formData.timerHours,
        hasPassword: formData.hasPassword,
        expiryDays: formData.expiryDays,
        customImage: formData.customImage,
        nftCover: formData.nftCover,
        status: 'active',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + formData.expiryDays * 24 * 60 * 60 * 1000).toISOString(),
        qr_code: `/spend?tokenId=${result.tokenId}`,
        tx_hash: result.txHash,
        metadata_uri: metadataUri
      };

      setCreatedCard(createdCardData);
      toast.success(`Gift card created successfully! Token ID: ${result.tokenId}`);
      toast.success(`Gift card created successfully! TX: ${result.txHash.slice(0, 10)}...${result.txHash.slice(-8)}`);
      
      // Save to Supabase for caching
      try {
        const recipientUsernameForStorage =
          formData.recipientType === 'address'
            ? null
            : formData.recipientUsername.replace(/^@/, '').trim();
        
        // Determine event_type based on recipient type
        let eventType: string | null = null;
        if (formData.recipientType === 'twitter') {
          eventType = 'GiftCardCreatedForTwitter';
        } else if (formData.recipientType === 'twitch') {
          eventType = 'GiftCardCreatedForTwitch';
        } else if (formData.recipientType === 'telegram') {
          eventType = 'GiftCardCreatedForTelegram';
        } else if (formData.recipientType === 'tiktok') {
          eventType = 'GiftCardCreatedForTikTok';
        } else if (formData.recipientType === 'instagram') {
          eventType = 'GiftCardCreatedForInstagram';
        } else {
          eventType = 'GiftCardCreated';
        }

        // Save to gift_cards table
        await GiftCardsService.upsertCard({
          token_id: result.tokenId,
          chain_id: activeChainId,
          sender_address: (createAddress || '').toLowerCase(),
          recipient_address: formData.recipientType === 'address' ? formData.recipientAddress.toLowerCase() : null,
          recipient_username: recipientUsernameForStorage,
          recipient_type: formData.recipientType,
          amount: formData.amount,
          currency: formData.currency,
          message: formData.message,
          redeemed: false,
          tx_hash: result.txHash,
        }, activeChainId);

        // Save new IPFS URI to uri table (commented out -  only saving in gift_cards_graph)
        // await insertFakeUri(metadataUri, result.tokenId);

        // Also save to gift_cards_graph table for leaderboard calculations
        await GiftCardsService.upsertCardGraph({
          token_id: result.tokenId,
          chain_id: activeChainId,
          sender_address: (createAddress || '').toLowerCase(),
          recipient_address: formData.recipientType === 'address' ? formData.recipientAddress.toLowerCase() : null,
          recipient_username: recipientUsernameForStorage,
          recipient_type: formData.recipientType,
          amount: formData.amount,
          currency: formData.currency,
          message: formData.message,
          redeemed: false,
          tx_hash: result.txHash,
          event_type: eventType,
          uri: metadataUri,
          block_number: null,
          block_timestamp: null,
        }, activeChainId);
        
        // Card saved to Supabase cache and graph table
      } catch (error) {
        console.error('Error saving card to Supabase:', error);
      }
      
      // Reset form
      setFormData({
        recipientType: 'address',
        recipientAddress: '',
        recipientUsername: '',
        amount: '1',
        currency: 'USDC',
        design: 'pink',
        message: '',
        secretMessage: '',
        hasTimer: false,
        timerHours: 24,
        hasPassword: false,
        password: '',
        expiryDays: 7,
        customImage: '',
        nftCover: ''
      });
    } catch (error) {
      console.error('Error creating gift card:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to create gift card';
      const errorCode = (error as any)?.code;
      const txHashMatch = errorMessage.match(/0x[a-fA-F0-9]{64}/);
      const txHash = txHashMatch ? txHashMatch[0] : null;
      setErrorTxHash(txHash);

      // User rejected transaction -  short popup message
      const isUserRejected =
        errorCode === 4001 ||
        errorMessage.toLowerCase().includes('user rejected') ||
        errorMessage.toLowerCase().includes('rejected the request') ||
        errorMessage.toLowerCase().includes('user denied') ||
        errorMessage.toLowerCase().includes('denied transaction');
      if (isUserRejected) {
        setError('');
        setErrorTxHash(null);
        toast('Canceled', { duration: 2000 });
        return;
      }
      
      // Check if it's a chain ID error with Coinbase Wallet
      if (errorMessage.includes('invalid chain ID') && typeof window !== 'undefined' && (window as any).ethereum?.isCoinbaseWallet) {
        setError('Coinbase Wallet has issues with Arc Testnet. Please use MetaMask or Rainbow Wallet to work with Arc Testnet.');
        setErrorTxHash(null);
        toast.error('Error: use MetaMask or Rainbow Wallet', {
          description: 'Coinbase Wallet is not supported for Arc Testnet'
        });
      } else if (errorMessage.includes('ERC20') || errorMessage.includes('transfer amount exceeds balance') || errorMessage.includes('Insufficient') || errorMessage.includes('balance')) {
        // More specific error for balance/transfer issues
        const baseMessage = errorMessage.includes('Insufficient') 
          ? errorMessage
          : `Insufficient ${formData.currency} balance. Please ensure you have enough tokens to create this gift card.`;
        setError(baseMessage);
        
        // Show toast with transaction hash if available
        const toastDescription = txHash 
          ? `${baseMessage}\nTX: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`
          : baseMessage;
        toast.error('Transaction failed', {
          description: toastDescription
        });
      } else if (errorMessage.includes('Transaction failed')) {
        // Handle generic transaction failed errors
        setError(errorMessage);
        toast.error('Transaction failed', {
          description: errorMessage
        });
      } else if (errorMessage.includes('Vault not configured') || errorMessage.includes('Vault contract')) {
        // Handle vault configuration errors
        setError(errorMessage);
        toast.error('Configuration error', {
          description: errorMessage
        });
      } else if (errorMessage.includes('Invalid username') || errorMessage.includes('username')) {
        // Handle username validation errors
        setError(errorMessage);
        toast.error('Invalid username', {
          description: errorMessage
        });
      } else {
        setError(errorMessage);
        toast.error('Failed to create gift card', {
          description: errorMessage
        });
      }
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
              onValueChange={(value: 'metamask' | 'developer') => setWalletSource(value)}
              className="mt-2 space-y-2 rounded-lg border border-gray-200 bg-gray-50/50 p-3"
            >
              <div className={`flex items-center space-x-3 rounded-md p-2.5 transition-all duration-200 ${
                walletSource === 'metamask' 
                  ? 'bg-white shadow-sm border border-gray-300' 
                  : 'hover:bg-white/60'
              } ${!isConnected ? 'opacity-60' : ''}`}>
                <RadioGroupItem 
                  value="metamask" 
                  id="wallet-metamask" 
                  className="mt-0" 
                  disabled={!isConnected}
                />
                <div className="flex items-center space-x-2.5 flex-1">
                  <Wallet className="w-5 h-5 text-blue-600" />
                  <Label htmlFor="wallet-metamask" className="cursor-pointer font-normal flex-1">
                    {isConnected && address 
                      ? `${walletName} (${address.slice(0, 6)}...${address.slice(-4)})`
                      : `${walletName} (Not connected)`
                    }
                  </Label>
                </div>
              </div>
              <div className={`flex items-center space-x-3 rounded-md p-2.5 transition-all duration-200 ${
                walletSource === 'developer' 
                  ? 'bg-white shadow-sm border border-gray-300' 
                  : 'hover:bg-white/60'
              } ${!hasDeveloperWallet || !developerWallet ? 'opacity-60' : ''}`}>
                <RadioGroupItem 
                  value="developer" 
                  id="wallet-developer" 
                  className="mt-0" 
                  disabled={!hasDeveloperWallet || !developerWallet}
                />
                <div className="flex items-center space-x-2.5 flex-1">
                  <Wallet className="w-5 h-5 text-purple-600" />
                  <Label htmlFor="wallet-developer" className="cursor-pointer font-normal flex-1">
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
              {RECIPIENT_OPTIONS.filter(option => option.value !== 'tiktok' && option.value !== 'instagram').map((option) => {
                const isReceivingDisabled = option.value === 'tiktok' || option.value === 'instagram';
                const isSelected = formData.recipientType === option.value;
                
                const content = (
                  <div 
                    className={`flex items-center space-x-3 rounded-md p-2.5 transition-all duration-200 ${
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
                        option.icon === 'wallet' ? 'text-blue-600' :
                        option.icon === 'twitter' ? 'text-gray-900' :
                        option.icon === 'twitch' ? 'text-purple-600' :
                        option.icon === 'telegram' ? 'text-sky-500' :
                        option.icon === 'tiktok' ? 'text-gray-900' :
                        option.icon === 'instagram' ? 'text-pink-600' :
                        'text-gray-700'
                      }`}>
                        {renderPlatformIcon(option.icon, "w-5 h-5")}
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
                className={`mt-2 transition-all duration-500 ${
                  highlightField === 'twitter' 
                    ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300 shadow-md' 
                    : ''
                }`}
              />
             {/* <p className="text-xs text-gray-500 mt-1">
                The recipient will need to login via Privy with Twitter to claim the card.
              </p> */}
                  <p className="text-xs text-gray-500 mt-1">
If recipient never log in on Sendly with this social, please, DONT'T SEND the funds. Privy testnet is over.              </p> 
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
                className={`mt-2 transition-all duration-500 ${
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
                className={`mt-2 transition-all duration-500 ${
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
                className={`mt-2 transition-all duration-500 ${
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
                className={`mt-2 transition-all duration-500 ${
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
                <div>Gift card created successfully! Token ID: {createdCard.id}</div>
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
              <p>Sorry, this feature is temporarily unavailable</p>
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