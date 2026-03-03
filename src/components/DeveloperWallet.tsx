import { useState, useEffect, useRef } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { toast } from 'sonner';
import { createWalletClient, custom, createPublicClient, http } from 'viem';
import { useChain } from '@/contexts/ChainContext';
import { DeveloperWalletService, DeveloperWallet } from '@/lib/circle/developerWalletService';
import web3Service from '@/lib/web3/web3Service';
import { USDC_ADDRESS, EURC_ADDRESS, ERC20ABI, getExplorerTxUrl, getExplorerAddressUrl } from '@/lib/web3/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Wallet, Copy, Check, ExternalLink, ArrowUpCircle, ChevronUp, ChevronDown, Coins, Send } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePrivySafe } from '@/lib/privy/usePrivySafe';

interface DeveloperWalletProps {
  blockchain?: string;
  onWalletCreated?: (wallet: DeveloperWallet) => void;
}

export function DeveloperWalletComponent({ blockchain = 'ARC-TESTNET', onWalletCreated }: DeveloperWalletProps) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { activeChain, activeChainId } = useChain();
  const { user: privyUser, authenticated } = usePrivySafe();
  const [wallet, setWallet] = useState<DeveloperWallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [copied, setCopied] = useState(false);
  const [topUpToken, setTopUpToken] = useState<'USDC' | 'EURC'>('USDC');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [requestingTokens, setRequestingTokens] = useState(false);
  const [linkingTelegram, setLinkingTelegram] = useState(false);
  const [balances, setBalances] = useState<{ USDC: string; EURC: string } | null>(null);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const isCheckingRef = useRef(false);
  const lastCheckParamsRef = useRef<string>('');
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isValidTelegramId = (value: string | null | undefined) => {
    if (!value) return false;
    return /^-?\d+$/.test(value.trim());
  };

  const resolveTelegramUserId = (): string | null => {
    if (typeof window !== 'undefined') {
      const telegramUser = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user;
      if (telegramUser?.id && isValidTelegramId(String(telegramUser.id))) {
        return String(telegramUser.id);
      }
    }

    const privyTelegramId =
      (privyUser as any)?.telegram?.telegramUserId ||
      (privyUser as any)?.telegram?.id ||
      (privyUser as any)?.telegram?.subject;

    if (isValidTelegramId(privyTelegramId)) {
      return String(privyTelegramId);
    }

    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage?.getItem('sendly:lastTelegramId');
        if (isValidTelegramId(stored)) {
          return stored as string;
        }
      } catch (error) {
        console.warn('Failed to read stored Telegram ID:', error);
      }
    }

    return null;
  };

  const getPrivyUserId = (): string | undefined => {
    const candidate =
      (privyUser as any)?.id ||
      (privyUser as any)?.userId ||
      (privyUser as any)?.subject ||
      (privyUser as any)?.sub;
    return candidate ? String(candidate) : undefined;
  };

  useEffect(() => {
    // Clear previous timer if it exists
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
      checkTimeoutRef.current = null;
    }

    // Create a stable key for checking (use only important data, not the entire privyUser object)
    const privyUserId = privyUser?.id || '';
    const checkKey = `${isConnected}-${address || ''}-${blockchain}-${authenticated}-${privyUserId}`;
    
    // If check is already in progress or parameters haven't changed, skip
    if (isCheckingRef.current) {
      return;
    }

    if (lastCheckParamsRef.current === checkKey) {
      // Parameters haven't changed, no need to check again
      // Make sure checking is set to false if check was already performed
      if (!isCheckingRef.current) {
        setChecking(false);
      }
      return;
    }

    // If there are no conditions for checking, just set checking to false
    // But only if we're sure the data is loaded (not undefined)
    const hasNoConditions = !isConnected && (authenticated === false || (authenticated === true && !privyUser));
    if (hasNoConditions) {
      setChecking(false);
      lastCheckParamsRef.current = checkKey;
      return;
    }

    // If data is still loading (authenticated === undefined), wait
    if (!isConnected && authenticated === undefined) {
      // Don't set checking to false, as data is still loading
      return;
    }

    // Add a small delay for debounce (especially important for React StrictMode)
    checkTimeoutRef.current = setTimeout(() => {
      // Check again if parameters changed during the delay
      const currentCheckKey = `${isConnected}-${address || ''}-${blockchain}-${authenticated}-${privyUser?.id || ''}`;
      if (lastCheckParamsRef.current === currentCheckKey || isCheckingRef.current) {
        // If parameters haven't changed or check is already in progress, reset checking
        if (!isCheckingRef.current) {
          setChecking(false);
        }
        return;
      }

      // Set check flag and save parameters
      isCheckingRef.current = true;
      lastCheckParamsRef.current = currentCheckKey;

      if (isConnected && address) {
        // If MetaMask is connected - check wallet by address
        checkWallet().finally(() => {
          isCheckingRef.current = false;
        });
      } else if (authenticated && privyUser && !isConnected) {
        // If MetaMask is NOT connected, but a social account exists - check Internal wallet for the social account
        checkSocialWallet().finally(() => {
          isCheckingRef.current = false;
        });
      } else {
        setChecking(false);
        isCheckingRef.current = false;
      }
    }, 100); // Small delay for debounce

    // Cleanup function
    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
        checkTimeoutRef.current = null;
      }
    };
  }, [isConnected, address, blockchain, authenticated, privyUser?.id]);

  // Load balances of the wallet
  useEffect(() => {
    if (wallet && wallet.wallet_address && wallet.blockchain === 'ARC-TESTNET') {
      loadWalletBalances();
    } else {
      setBalances(null);
    }
  }, [wallet]);

  const checkWallet = async () => {
    if (!address) {
      setChecking(false);
      return;
    }
    
    try {
      setChecking(true);
      const wallets = await DeveloperWalletService.getWallets(address);
      const existingWallet = wallets.find(w => w.blockchain === blockchain);
      setWallet(existingWallet || null);
    } catch (error) {
      console.error('Error checking wallet:', error);
      toast.error('Failed to check wallet');
    } finally {
      setChecking(false);
    }
  };

  const checkSocialWallet = async () => {
    if (!authenticated || !privyUser) {
      console.log('[DeveloperWallet] No authenticated user or privyUser');
      setChecking(false);
      return;
    }
    
    try {
      setChecking(true);
      console.log('[DeveloperWallet] Checking social wallet for authenticated user');
      // Check for a Internal wallet for linked social networks
      const socialPlatforms = ['twitter', 'twitch', 'telegram', 'tiktok', 'instagram'];
      
      let walletFound = false;
      
      for (const platform of socialPlatforms) {
        let socialUserId: string | null = null;
        
        if (platform === 'twitter' && privyUser.twitter) {
          socialUserId = (privyUser.twitter as any).subject;
          console.log('[DeveloperWallet] Found Twitter account, subject:', socialUserId);
        } else if (platform === 'twitch' && privyUser.twitch) {
          socialUserId = (privyUser.twitch as any).subject;
          console.log('[DeveloperWallet] Found Twitch account, subject:', socialUserId);
        } else if (platform === 'telegram' && privyUser.telegram) {
          socialUserId = privyUser.telegram.telegramUserId || (privyUser.telegram as any).subject;
          console.log('[DeveloperWallet] Found Telegram account, userId:', socialUserId);
        } else if (platform === 'tiktok' && privyUser.tiktok) {
          socialUserId = (privyUser.tiktok as any).subject;
          console.log('[DeveloperWallet] Found TikTok account, subject:', socialUserId);
        } else if (platform === 'instagram' && (privyUser as any).instagram) {
          socialUserId = ((privyUser as any).instagram as any).subject;
          console.log('[DeveloperWallet] Found Instagram account, subject:', socialUserId);
        }

        if (socialUserId) {
          console.log(`[DeveloperWallet] Checking wallet for ${platform} with userId: ${socialUserId}`);
          const foundWallet = await DeveloperWalletService.getWalletBySocial(
            platform as 'twitter' | 'twitch' | 'telegram' | 'tiktok' | 'instagram',
            socialUserId,
            blockchain
          );
          
          console.log(`[DeveloperWallet] Wallet check result for ${platform}:`, foundWallet ? 'FOUND' : 'NOT FOUND');
          
          if (foundWallet) {
            console.log('[DeveloperWallet] Setting wallet:', foundWallet);
            setWallet(foundWallet);
            walletFound = true;
            break;
          }
        }
      }
      
      if (!walletFound) {
        console.log('[DeveloperWallet] No wallet found for any social platform');
      }
    } catch (error) {
      console.error('[DeveloperWallet] Error checking social wallet:', error);
      // Do not show an error to the user; simply treat as no wallet found
    } finally {
      setChecking(false);
    }
  };

  const createWallet = async () => {
    // If MetaMask is connected - create a wallet by address
    if (isConnected && address) {
      try {
        setLoading(true);
        const response = await DeveloperWalletService.createWallet({
          userId: address,
          blockchain: blockchain,
          accountType: 'EOA'
        });

        if (response.success && response.wallet) {
          setWallet(response.wallet);
          toast.success('Wallet created successfully!');
          if (onWalletCreated) {
            onWalletCreated(response.wallet);
          }
        } else {
          toast.error(response.message || 'Failed to create wallet');
        }
      } catch (error: any) {
        console.error('Error creating wallet:', error);
        const errorMessage = error?.message || 'Unknown error';
        toast.error(`Error creating wallet: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
      return;
    }

    // If MetaMask is NOT connected, but a social account exists - create a wallet for the social account
    if (!authenticated || !privyUser) {
      toast.error('Please connect your wallet or social account');
      return;
    }

    try {
      setLoading(true);
      
        // Find the first connected social network
      const socialPlatforms = ['twitter', 'twitch', 'telegram', 'tiktok', 'instagram'];
      let platform: string | null = null;
      let socialUserId: string | null = null;
      let socialUsername: string = '';
      let privyUserId: string | undefined = getPrivyUserId();

      if (!privyUserId) {
        toast.error('Unable to identify user');
        return;
      }

      for (const p of socialPlatforms) {
        if (p === 'twitter' && privyUser.twitter) {
          platform = 'twitter';
          socialUserId = (privyUser.twitter as any).subject;
          socialUsername = privyUser.twitter.username || 'user';
          break;
        } else if (p === 'twitch' && privyUser.twitch) {
          platform = 'twitch';
          socialUserId = (privyUser.twitch as any).subject;
          socialUsername = (privyUser.twitch as any).username || (privyUser.twitch as any).email || 'user';
          break;
        } else if (p === 'telegram' && privyUser.telegram) {
          platform = 'telegram';
          socialUserId = privyUser.telegram.telegramUserId || (privyUser.telegram as any).subject;
          socialUsername = privyUser.telegram.username || privyUser.telegram.firstName || 'user';
          break;
        } else if (p === 'tiktok' && privyUser.tiktok) {
          platform = 'tiktok';
          socialUserId = (privyUser.tiktok as any).subject;
          socialUsername = privyUser.tiktok.username || 'user';
          break;
        } else if (p === 'instagram' && (privyUser as any).instagram) {
          platform = 'instagram';
          socialUserId = ((privyUser as any).instagram as any).subject;
          socialUsername = ((privyUser as any).instagram as any).username || 'user';
          break;
        }
      }

      if (!platform || !socialUserId) {
        toast.error('No social account found. Please connect a social account first.');
        return;
      }

      const response = await DeveloperWalletService.createWalletForSocial(
        platform,
        socialUserId,
        socialUsername,
        privyUserId,
        blockchain
      );

      if (response.success && response.wallet) {
        setWallet(response.wallet);
        toast.success('Internal wallet created successfully!');
        if (onWalletCreated) {
          onWalletCreated(response.wallet);
        }
      } else {
        toast.error(response.message || 'Failed to create wallet');
      }
    } catch (error: any) {
      console.error('Error creating social wallet:', error);
      const errorMessage = error?.message || 'Unknown error';
      toast.error(`Error creating wallet: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const loadWalletBalances = async () => {
    if (!wallet || !wallet.wallet_address) return;

    try {
      setLoadingBalances(true);
      const publicClient = createPublicClient({
        chain: activeChain,
        transport: http()
      });

      const walletAddress = wallet.wallet_address as `0x${string}`;

      // Get balances for all tokens in parallel
      const balanceResults = await Promise.all([
        publicClient.readContract({
          address: USDC_ADDRESS as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'balanceOf',
          args: [walletAddress]
        }),
        publicClient.readContract({
          address: EURC_ADDRESS as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'balanceOf',
          args: [walletAddress]
        })
      ]);

      const usdcBalance = BigInt(balanceResults[0] as string | number | bigint || 0);
      const eurcBalance = BigInt(balanceResults[1] as string | number | bigint || 0);

      // Made format balances (6 decimals for USDC/EURC)
      const formatBalance = (balance: bigint) => {
        const decimals = 6; // USDC, EURC, use 6 decimals
        const divisor = BigInt(10 ** decimals);
        const whole = balance / divisor;
        const fraction = balance % divisor;
        const fractionStr = fraction.toString().padStart(decimals, '0');
        // Remove trailing zeros from the fractional part
        const trimmedFraction = fractionStr.replace(/0+$/, '');
        // If fractional part is zero or becomes empty after trimming, return only the whole part
        return fraction === 0n || trimmedFraction.length === 0
          ? whole.toString()
          : `${whole}.${trimmedFraction}`;
      };

      setBalances({
        USDC: formatBalance(usdcBalance),
        EURC: formatBalance(eurcBalance)
      });
    } catch (error) {
      console.error('Error loading wallet balances:', error);
      setBalances(null);
    } finally {
      setLoadingBalances(false);
    }
  };

  const copyAddress = async () => {
    if (!wallet?.wallet_address) return;
    
    try {
      await navigator.clipboard.writeText(wallet.wallet_address);
      setCopied(true);
      toast.success('Address copied');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy address');
    }
  };

  const getBlockchainName = (blockchain: string) => {
    const names: Record<string, string> = {
      'ARC-TESTNET': 'Arc Testnet',
      'ETH-SEPOLIA': 'Ethereum Sepolia',
      'BASE-SEPOLIA': 'Base Sepolia',
      'MATIC-AMOY': 'Polygon Amoy',
      'SOL-DEVNET': 'Solana Devnet'
    };
    return names[blockchain] || blockchain;
  };

  const blockchainToChainId: Record<string, number> = {
    'ARC-TESTNET': 5042002,
    'ETH-SEPOLIA': 11155111,
    'BASE-SEPOLIA': 84532,
    'MATIC-AMOY': 80002,
  };

  const getExplorerUrl = (blockchain: string, address: string) => {
    if (blockchain === 'SOL-DEVNET') {
      return `https://explorer.solana.com/address/${address}?cluster=devnet`;
    }
    const chainId = blockchainToChainId[blockchain];
    if (chainId != null) return getExplorerAddressUrl(chainId, address);
    return '#';
  };

  const getTransactionUrl = (blockchain: string, txHash: string) => {
    if (blockchain === 'SOL-DEVNET') {
      return `https://explorer.solana.com/tx/${txHash}?cluster=devnet`;
    }
    const chainId = blockchainToChainId[blockchain];
    if (chainId != null) return getExplorerTxUrl(chainId, txHash);
    return '#';
  };

  const handleTopUp = async () => {
    if (!wallet?.wallet_address || !address || !isConnected) {
      toast.error('Wallet not available');
      return;
    }

    if (!topUpAmount || parseFloat(topUpAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setTopUpLoading(true);

      // Initialize web3 service
      let clientToUse = walletClient;
      if (!clientToUse) {
        clientToUse = createWalletClient({
          chain: activeChain,
          transport: custom(window.ethereum)
        });
      }

      await web3Service.initialize(clientToUse, address, activeChainId);

      // Send tokens to Internal wallet
      const txHash = await web3Service.sendToken(
        topUpToken,
        wallet.wallet_address,
        topUpAmount
      );

      toast.success(`Successfully sent ${topUpAmount} ${topUpToken} to Internal wallet!`);
      setTopUpAmount('');
      
      // Open transaction in explorer
      const txUrl = getTransactionUrl(wallet.blockchain, txHash);
      if (txUrl !== '#') {
        window.open(txUrl, '_blank');
      }
    } catch (error: any) {
      console.error('Error topping up wallet:', error);
      toast.error(error?.message || 'Failed to send tokens');
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleRequestTestnetTokens = async () => {
    if (!wallet?.wallet_address) {
      toast.error('Wallet not available');
      return;
    }

    // Check if blockchain is a testnet
    const testnetBlockchains = ['ARC-TESTNET', 'ETH-SEPOLIA', 'BASE-SEPOLIA', 'MATIC-AMOY', 'OP-SEPOLIA', 'ARB-SEPOLIA', 'AVAX-FUJI', 'SOL-DEVNET', 'UNI-SEPOLIA'];
    if (!testnetBlockchains.includes(wallet.blockchain)) {
      toast.error('Testnet tokens can only be requested for testnet blockchains');
      return;
    }

    try {
      setRequestingTokens(true);
      
      const response = await DeveloperWalletService.requestTestnetTokens(
        wallet.wallet_address,
        wallet.blockchain
      );

      if (response.success) {
        toast.success('Testnet tokens requested! USDC and EURC will be sent to your wallet shortly.');
      } else {
        // Check for rate limit error (429)
        const responseAny = response as any;
        const details = responseAny.details || responseAny.message || '';
        const errorText = responseAny.error || '';
        
        if (details.includes('429') || details.includes('API rate limit error') || 
            errorText.includes('429') || errorText.includes('API rate limit error')) {
          toast.error('Limit exceeded. Sorry, you\'ve hit the limit. We\'ll have more test tokens available in 24 hours. Use a default faucet for Internal Wallet');
        } else {
          toast.error(response.message || 'Failed to request testnet tokens');
        }
      }
    } catch (error: any) {
      console.error('Error requesting testnet tokens:', error);
      
      // Check for rate limit error (429) in catch block
      // Check errorData.details, error.details, error.message, and error.error
      const errorData = error?.errorData || {};
      const errorDetails = errorData.details || error?.details || error?.message || '';
      const errorText = errorData.error || error?.error || '';
      
      // Check if any of these fields contain 429 or API rate limit error
      const allErrorText = `${errorDetails} ${errorText} ${error?.message || ''}`;
      
      if (allErrorText.includes('429') || allErrorText.includes('API rate limit error')) {
        toast.error('Limit exceeded. Sorry, you\'ve hit the limit. We\'ll have more test tokens available in 24 hours. Use a default faucet for Internal Wallet');
      } else {
        toast.error(error?.message || 'Failed to request testnet tokens');
      }
    } finally {
      setRequestingTokens(false);
    }
  };

  const handleLinkTelegram = async () => {
    if (!wallet?.wallet_address || !address || !isConnected) {
      toast.error('Wallet not available');
      return;
    }

    let telegramUserId = resolveTelegramUserId();

    if (!telegramUserId) {
      const manualId = typeof window !== 'undefined' ? window.prompt('Enter the Telegram ID from the Telegram WebApp') : null;
      if (!manualId) {
        toast.error('Telegram ID not found');
        return;
      }

      if (!isValidTelegramId(manualId)) {
        toast.error('Please enter a valid numeric Telegram ID');
        return;
      }

      telegramUserId = manualId.trim();
    }

    try {
      setLinkingTelegram(true);

      const timestamp = new Date().toISOString();
      const messageToSign = `I authorize linking my Internal wallet ${wallet.wallet_address.toLowerCase()} to Telegram user ${telegramUserId} at ${timestamp}`;

      let signer = walletClient;
      if (!signer) {
        if (typeof window === 'undefined' || !(window as any).ethereum) {
          toast.error('Ethereum provider not found for signing');
          setLinkingTelegram(false);
          return;
        }
        signer = createWalletClient({
          chain: activeChain,
          transport: custom((window as any).ethereum)
        });
      }

      const signature = await (signer as any).signMessage({
        account: address as `0x${string}`,
        message: messageToSign
      });

      const response = await DeveloperWalletService.linkTelegram({
        walletAddress: wallet.wallet_address,
        blockchain: wallet.blockchain,
        telegramUserId,
        signature,
        message: messageToSign,
        privyUserId: getPrivyUserId(),
        validateTelegram: Boolean((privyUser as any)?.telegram)
      });

      if (response.success && response.wallet) {
        setWallet(response.wallet);
        toast.success('Telegram ID linked to wallet successfully');
        if (typeof window !== 'undefined') {
          try {
            window.localStorage?.setItem('sendly:lastTelegramId', telegramUserId);
          } catch (error) {
            console.warn('Failed to persist Telegram ID:', error);
          }
        }
      } else {
        toast.error(response.error || response.details || response.message || 'Failed to link Telegram ID');
      }
    } catch (error: any) {
      console.error('Error linking Telegram ID:', error);
      const errorMessage = error?.message || 'Failed to link Telegram ID';
      toast.error(errorMessage);
    } finally {
      setLinkingTelegram(false);
    }
  };

  // Component should always be displayed, even if there is no MetaMask (there may be a social network)
  // if (!isConnected || !address) {
  //   return null;
  // }

  if (checking) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-circle-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Checking wallet...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasPrivyTelegram = Boolean((privyUser as any)?.telegram);
  const linkButtonDisabled = linkingTelegram || !hasPrivyTelegram || !isConnected || !address;

  if (wallet) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-circle-card">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between relative" style={{ top: -5 }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50 border border-green-100">
                  <Wallet className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Internal Wallet</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                  Smart wallet for quick receipt and sending of funds                  </CardDescription>
                </div>
              </div>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          
          <CollapsibleContent>
            <CardContent className="space-y-5 pt-0">
              {/* Wallet Address Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Wallet Address</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyAddress}
                    className="h-7 px-2 text-xs"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1.5 text-green-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <div className="bg-gradient-to-r from-gray-50 to-gray-50/50 p-3.5 rounded-lg border border-gray-200 font-mono text-xs break-all leading-relaxed">
                  {wallet.wallet_address}
                </div>
              </div>

              <Separator />

              {/* Wallet Balance Section */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Balance</label>
                {loadingBalances ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="ml-2 text-xs text-gray-500">Loading balances...</span>
                  </div>
                ) : balances ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-3 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-blue-700">USDC</span>
                        <Coins className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <p className="text-sm font-semibold text-blue-900">{balances.USDC}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 p-3 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-purple-700">EURC</span>
                        <Coins className="w-3.5 h-3.5 text-purple-600" />
                      </div>
                      <p className="text-sm font-semibold text-purple-900">{balances.EURC}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 py-2">No balance data</div>
                )}
              </div>

              <Separator />

              {/* Wallet Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Blockchain</p>
                  <Badge variant="outline" className="font-normal">
                    {getBlockchainName(wallet.blockchain)}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Account Type</p>
                  <Badge variant="outline" className="font-normal">
                    {wallet.account_type}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</p>
                  <Badge 
                    variant={wallet.state === 'LIVE' ? 'default' : 'destructive'}
                    className="font-normal"
                  >
                    {wallet.state === 'LIVE' ? 'Active' : 'Frozen'}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created</p>
                  <p className="text-sm font-medium text-gray-900">
                    {wallet.created_at ? new Date(wallet.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) : '-'}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Source</p>
                  <Badge 
                    variant="outline" 
                    className="font-normal"
                  >
                    {wallet.social_platform 
                      ? (() => {
                          const platformNames: Record<string, string> = {
                            'twitter': 'Twitter',
                            'twitch': 'Twitch',
                            'telegram': 'Telegram',
                            'tiktok': 'TikTok',
                            'instagram': 'Instagram'
                          };
                          return platformNames[wallet.social_platform] || wallet.social_platform;
                        })()
                      : (wallet.user_type === 'wallet_address' ? 'MetaMask' : 'Unknown')
                    }
                  </Badge>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Telegram</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={wallet.telegram_user_id ? 'default' : 'outline'}
                      className={wallet.telegram_user_id ? 'font-normal bg-sky-100 text-sky-800 border-sky-200' : 'font-normal'}
                    >
                      {wallet.telegram_user_id ? 'Linked' : 'Not linked'}
                    </Badge>
                    {wallet.telegram_user_id && (
                      <span className="text-xs text-gray-600 break-all">
                        ID: {wallet.telegram_user_id}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(getExplorerUrl(wallet.blockchain, wallet.wallet_address), '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View on Explorer
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex-1">
                      <Button
                        onClick={handleLinkTelegram}
                        disabled={linkButtonDisabled}
                        className="w-full"
                      >
                        {linkingTelegram ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Linking...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            {wallet.telegram_user_id ? 'Relink TG' : 'Link TG'}
                          </>
                        )}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!hasPrivyTelegram && (
                    <TooltipContent>
                      Connect your Telegram
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>

              <Separator />

              {/* Top Up Section - only for wallets created from MetaMask */}
              {!wallet.social_platform && wallet.user_type === 'wallet_address' && (
                <>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Top Up Wallet</h4>
                      <p className="text-xs text-gray-500 mb-3">
                        Fund your wallet with USDC or EURC tokens
                      </p>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Select value={topUpToken} onValueChange={(value) => setTopUpToken(value as 'USDC' | 'EURC')}>
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USDC">USDC</SelectItem>
                              <SelectItem value="EURC">EURC</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={topUpAmount}
                            onChange={(e) => setTopUpAmount(e.target.value)}
                            min="0"
                            step="0.01"
                            className="flex-1"
                          />
                        </div>
                        <Button
                          onClick={handleTopUp}
                          disabled={topUpLoading || !topUpAmount || parseFloat(topUpAmount) <= 0 || !isConnected || !address}
                          className="w-full"
                        >
                          {topUpLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <ArrowUpCircle className="w-4 h-4 mr-2" />
                              Top Up Wallet
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Info Alert */}
                 {/*    <div className="flex gap-3 p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-blue-900 leading-relaxed">
                        This wallet is developer-controlled. You can fund it from your EVM wallet and use it for transactions through the Telegram bot without MetaMask signing.
                      </p> 
                    </div>*/}
                  </div>
                  <Separator />
                </>
              )}

              {/* Request Testnet Tokens - available for all wallets */}
              <div className="space-y-3">
                <Button
                  onClick={handleRequestTestnetTokens}
                  disabled={requestingTokens}
                  variant="outline"
                  className="w-full"
                >
                  {requestingTokens ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    <>
                      <Coins className="w-4 h-4 mr-2" />
                      Request Testnet Tokens
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  }

  // need show message about connect or not connect to wallet or social account
  const shouldShowConnectMessage = !isConnected && (!authenticated || !privyUser);

  return (
    <Card className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-circle-card">
  <CardHeader className="pb-6"> {/* add bottom margin, so the description does not stick to the content below */}
    <div className="grid grid-rows-2 items-start gap-3">
      {/* Title with icon - left */}
      <CardTitle className="flex items-center gap-2">
        <Wallet className="w-5 h-5 text-gray-700" />
        Internal Wallet
      </CardTitle>

      {/* Description - center of the card */}
      <CardDescription className="text-left text-sm text-gray-600 -mt-1">
        {shouldShowConnectMessage
          ? 'Please connect your wallet or social account to use platform functionality.'
          : 'To use Circle functionality, please create an internal wallet.'}
      </CardDescription>
    </div>
  </CardHeader>
      {!shouldShowConnectMessage && (
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Why is this needed?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Send transactions through Circle Wallet</li>
              <li>• No need to sign each transaction</li>
              <li>• Design a flexible flow for your funds</li>
            </ul>
          </div>

         {/* <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Blockchain:</span>
              <span className="font-medium">{getBlockchainName(blockchain)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Account type:</span>
              <span className="font-medium">EOA (Externally Owned Account)</span>
            </div>
          </div> 
*/}
          <Button
            onClick={createWallet}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating wallet...
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 mr-2" />
                Create wallet
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            {isConnected 
              ? `The wallet will be created on Arc Testnet blockchain and linked to your EVM address`
              : `The wallet will be created on Arc Testnet blockchain and linked to your social account`}
          </p>
        </CardContent>
      )}
    </Card>
  );
}

