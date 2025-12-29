import { createPublicClient, http } from 'viem';
import { arcTestnet } from './wagmiConfig';
import {
  CONTRACT_ADDRESS,
  VAULT_CONTRACT_ADDRESS,
  TWITCH_VAULT_CONTRACT_ADDRESS,
  TELEGRAM_VAULT_CONTRACT_ADDRESS,
  TIKTOK_VAULT_CONTRACT_ADDRESS,
  INSTAGRAM_VAULT_CONTRACT_ADDRESS,
  USDC_ADDRESS,
  EURC_ADDRESS,
  USYC_ADDRESS,
  GiftCardABI,
  TwitterCardVaultABI,
  TwitchCardVaultABI,
  TelegramCardVaultABI,
  TikTokCardVaultABI,
  InstagramCardVaultABI,
  ERC20ABI,
  ARC_RPC_URLS
} from './constants';

// ArcScan API base URL (Blockscout-based)
const ARCSCAN_API_URL = 'https://testnet.arcscan.app/api/v2';

import type { GiftCardInfo, BlockchainGiftCardInfo } from '../../src/types/web3';

export type { GiftCardInfo, BlockchainGiftCardInfo };

type SupportedTokenSymbol = 'USDC' | 'EURC' | 'USYC';

export class Web3Service {
  private walletClient: any = null;
  private account: string | null = null;
  private publicClient: any = null;
  private currentRpcIndex = 0;
  // private _retryCount = 0; // Will be used in future retry logic
  private maxRetries = 1; // Reduced retries for faster failure
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheExpiry = 300000; // 5 minutes cache

  constructor() {
    this.createPublicClient();
  }

  private getTokenSymbolFromAddress(tokenAddress: string): SupportedTokenSymbol {
    const normalizedAddress = tokenAddress.toLowerCase();
    if (normalizedAddress === USDC_ADDRESS.toLowerCase()) {
      return 'USDC';
    } else if (normalizedAddress === EURC_ADDRESS.toLowerCase()) {
      return 'EURC';
    } else if (normalizedAddress === USYC_ADDRESS.toLowerCase()) {
      return 'USYC';
    }
    return 'USDC'; // Default fallback
  }

  private getTokenAddressFromSymbol(tokenType: SupportedTokenSymbol): string {
    switch (tokenType) {
      case 'USDC':
        return USDC_ADDRESS;
      case 'EURC':
        return EURC_ADDRESS;
      case 'USYC':
        return USYC_ADDRESS;
      default:
        return USDC_ADDRESS;
    }
  }

  private createPublicClient() {
    const rpcUrl = ARC_RPC_URLS[this.currentRpcIndex];
    console.log(`Creating public client with RPC: ${rpcUrl}`);
    
    this.publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http(rpcUrl, {
        retryCount: 1,
        retryDelay: 1000,
        timeout: 8000, // Reduced timeout
      }),
    });
  }

  private async switchToNextRpc() {
    this.currentRpcIndex = (this.currentRpcIndex + 1) % ARC_RPC_URLS.length;
    console.log(`Switching to RPC ${this.currentRpcIndex + 1}/${ARC_RPC_URLS.length}: ${ARC_RPC_URLS[this.currentRpcIndex]}`);
    this.createPublicClient();
  }

  // Cache helper methods
  private getCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async initialize(walletClient: any, account: string) {
    this.walletClient = walletClient;
    this.account = account;
    
    // Ensure we're on the correct chain
    await this.ensureCorrectChain();
  }

  private async ensureCorrectChain(): Promise<void> {
    if (!this.walletClient) return;

    try {
      const currentChain = await this.walletClient.getChainId();
      const targetChainId = arcTestnet.id;

      if (currentChain !== targetChainId) {
        console.log(`Current chain ID: ${currentChain}, switching to Arc Testnet (${targetChainId})...`);
        try {
          await this.walletClient.switchChain({ id: targetChainId });
          console.log('Successfully switched to Arc Testnet');
          
          // Wait for chain switch to be fully processed
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Verify chain switch was successful
          const verifiedChain = await this.walletClient.getChainId();
          if (verifiedChain !== targetChainId) {
            throw new Error(`Failed to switch to Arc Testnet. Current chain: ${verifiedChain}`);
          }
        } catch (error: any) {
          // If switchChain fails, it might be because the chain is not added
          // In that case, add the chain first
          if (error.code === 4902 || error.message?.includes('Unrecognized chain') || error.code === -32603) {
            console.log('Chain not added, adding Arc Testnet...');
            await this.walletClient.addChain({ chain: arcTestnet });
            
            // Wait a bit before switching
            await new Promise(resolve => setTimeout(resolve, 500));
            
            await this.walletClient.switchChain({ id: targetChainId });
            
            // Verify chain switch was successful
            await new Promise(resolve => setTimeout(resolve, 1000));
            const verifiedChain = await this.walletClient.getChainId();
            if (verifiedChain !== targetChainId) {
              throw new Error(`Failed to switch to Arc Testnet after adding. Current chain: ${verifiedChain}`);
            }
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('Error ensuring correct chain:', error);
      throw error; // Throw error to be caught by caller
    }
  }

  // add method for safe request with retry and fallback RPC
  private async safeRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    let lastError: any;
    const originalRpcIndex = this.currentRpcIndex;
    
    // first try with current RPC
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error: any) {
        lastError = error;
        console.log(`Attempt ${attempt + 1}/${this.maxRetries + 1} failed with RPC ${ARC_RPC_URLS[this.currentRpcIndex]}:`, error.message);
        
        // if this is critical error or requires authentication, switch to another RPC immediately
        if (error.message?.includes('503') || error.message?.includes('502') || error.message?.includes('500') || 
            error.message?.includes('401') || error.message?.includes('403') || error.message?.includes('400') ||
            error.message?.includes('Unauthorized') || error.message?.includes('Bad Request') ||
            error.status === 503 || error.status === 502 || error.status === 500 || 
            error.status === 401 || error.status === 403 || error.status === 400) {
          console.log(`Critical error detected, switching RPC immediately`);
          break;
        }
        
        // if this is 429 (Too Many Requests), wait longer
        if (error.message?.includes('429') || error.status === 429) {
          const delay = Math.pow(2, attempt) * 1000; // exponential delay
          console.log(`Rate limited, waiting ${delay}ms before retry ${attempt + 1}/${this.maxRetries + 1}`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // for other errors, make a short pause
        if (attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        
        break;
      }
    }
    
    // if all attempts with current RPC failed, try other RPCs
    console.log(`All attempts failed with current RPC, trying other RPCs...`);
    for (let rpcAttempt = 0; rpcAttempt < Math.min(ARC_RPC_URLS.length - 1, 2); rpcAttempt++) {
      await this.switchToNextRpc();
      
      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        try {
          return await requestFn();
        } catch (error: any) {
          lastError = error;
          console.log(`Attempt ${attempt + 1}/${this.maxRetries + 1} failed with RPC ${ARC_RPC_URLS[this.currentRpcIndex]}:`, error.message);
          
          if (attempt < this.maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
          
          break;
        }
      }
    }
    
    // if all RPCs are not working, revert to original
    if (this.currentRpcIndex !== originalRpcIndex) {
      console.log(`All RPCs failed, reverting to original RPC`);
      this.currentRpcIndex = originalRpcIndex;
      this.createPublicClient();
    }
    
    throw lastError;
  }

  // Method to get NFTs via ArcScan API
  private async loadGiftCardsViaAPI(): Promise<GiftCardInfo[]> {
    if (!this.account) return [];

    try {
      const balancesUrl = `${ARCSCAN_API_URL}/addresses/${this.account}/token-balances`;
      
      console.log(`Fetching NFT tokens from ArcScan API for ${this.account}...`);
      
      let response: Response;
      let data: any;
      
      console.log('Using token-balances endpoint for received cards...');
      response = await fetch(balancesUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`ArcScan API error: ${response.status} ${response.statusText}`);
      }
      data = await response.json();
      console.log('Using token-balances endpoint');

      // Filter only our NFTs (ERC721) from our contract address
      const items = data.items || data || [];
      const nftTokens = items.filter((item: any) => {
        const contractAddr = item.token?.contract_address || item.contract_address || item.token?.address;
        const tokenType = item.token?.type || item.type || item.token?.token_type;
        
        return (tokenType === 'ERC-721' || tokenType === 'ERC721' || tokenType === 'nft') &&
               contractAddr?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase();
      });

      if (nftTokens.length === 0) {
        console.log('No NFT tokens found via API for contract:', CONTRACT_ADDRESS);
        return [];
      }

      console.log(`Found ${nftTokens.length} NFT tokens via API`);

      // Extract tokenId from each NFT token
      const tokenIds: string[] = [];
      nftTokens.forEach((item: any) => {
        // Token ID can be in different fields depending on API
        const tokenId = item.token_id || 
                        item.token?.token_id || 
                        item.id?.token_id ||
                        item.token?.id;
        
        if (tokenId !== undefined && tokenId !== null) {
          tokenIds.push(tokenId.toString());
        }
      });

      if (tokenIds.length === 0) {
        console.warn('Could not extract token IDs from API response');
        return [];
      }

      // Get detailed information about each card
      const cards: GiftCardInfo[] = [];
      const maxConcurrentRequests = 8;

      const giftCardPromises = tokenIds.map(tokenId => 
        this.safeRequest(async () => {
          const giftCardInfo = await this.publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: GiftCardABI,
            functionName: 'getGiftCardInfo',
            args: [BigInt(tokenId)],
          });
          
          // Check that current address is actually the owner
          const owner = await this.getCardOwner(tokenId);
          if (owner.toLowerCase() !== this.account!.toLowerCase()) {
            console.warn(`Token ${tokenId} is not owned by ${this.account}, skipping`);
            return null;
          }
          
          let sender = 'Unknown';
          try {
            sender = await this.getCardCreator(tokenId);
          } catch (error) {
            console.warn(`Could not get creator for card ${tokenId}:`, error);
          }
          
          const amount = this.formatAmount(giftCardInfo.amount);
          const token = this.getTokenSymbolFromAddress(giftCardInfo.token);
          
          return {
            tokenId: tokenId.toString(),
            recipient: this.account!,
            sender,
            amount,
            token,
            message: giftCardInfo.message,
            redeemed: giftCardInfo.redeemed,
            type: 'received'
          } as GiftCardInfo;
        }).catch(error => {
          console.warn(`Failed to load card ${tokenId} from API result:`, error);
          return null;
        })
      );
      
      // Execute requests in batches
      for (let i = 0; i < giftCardPromises.length; i += maxConcurrentRequests) {
        const batch = giftCardPromises.slice(i, i + maxConcurrentRequests);
        try {
          const batchResults = await Promise.all(batch);
          const validCards = batchResults.filter(card => card !== null) as GiftCardInfo[];
          cards.push(...validCards);
        } catch (error) {
          console.warn(`Failed to load batch of cards from API:`, error);
        }
      }

      return cards;
    } catch (error) {
      console.error('Error loading gift cards via ArcScan API:', error);
      // Return empty array to allow fallback
      return [];
    }
  }

  async loadGiftCards(useCache: boolean = false, useAPI: boolean = true): Promise<GiftCardInfo[]> {
    if (!this.account) return [];

    // Disable cache to get fresh data about NFT owners
    // Cache can cause new owner not to see received card
    if (useCache) {
      const cacheKey = `giftCards_${this.account}`;
      const cached = this.getCache(cacheKey);
      if (cached) {
        console.log('Using cached gift cards data');
        return cached;
      }
    }

    // Try to use ArcScan API to get fresh data
    if (useAPI) {
      try {
        const apiCards = await this.loadGiftCardsViaAPI();
        if (apiCards.length > 0) {
          console.log(`Loaded ${apiCards.length} cards via ArcScan API`);
          return apiCards;
        }
        console.log('ArcScan API returned no cards, falling back to direct blockchain queries');
      } catch (error) {
        console.warn('ArcScan API failed, falling back to direct blockchain queries:', error);
      }
    }

    // Fallback: use direct blockchain reading
    try {
      // Get balance using readContract with retry
      const balance = await this.safeRequest(async () => {
        return await this.publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: GiftCardABI,
          functionName: 'balanceOf',
          args: [this.account as `0x${string}`],
        });
      });
      
      if (BigInt(balance) === BigInt(0)) {
        const emptyResult: GiftCardInfo[] = [];
        if (useCache) {
          const cacheKey = `giftCards_${this.account}`;
          this.setCache(cacheKey, emptyResult);
        }
        return emptyResult;
      }

      const cards: GiftCardInfo[] = [];
      
      // Increased concurrent requests to 8 for better performance
      const maxConcurrentRequests = 8;
      const tokenIds: bigint[] = [];
      
      // first collect all tokenId
      for (let index = 0; index < Number(balance); index++) {
        try {
          const tokenId = await this.safeRequest(async () => {
            return await this.publicClient.readContract({
              address: CONTRACT_ADDRESS as `0x${string}`,
              abi: GiftCardABI,
              functionName: 'tokenOfOwnerByIndex',
              args: [this.account as `0x${string}`, BigInt(index)],
            });
          });
          tokenIds.push(tokenId);
        } catch (error) {
          console.warn(`Failed to get tokenId at index ${index}:`, error);
          continue;
        }
      }
      
      // then parallel get information for all cards (with increased limit)
      const giftCardPromises = tokenIds.map(tokenId => 
        this.safeRequest(async () => {
          const giftCardInfo = await this.publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: GiftCardABI,
            functionName: 'getGiftCardInfo',
            args: [tokenId],
          });
          
          let sender = 'Unknown';
          try {
            sender = await this.getCardCreator(tokenId.toString());
          } catch (error) {
            console.warn(`Could not get creator for card ${tokenId}:`, error);
          }
          
          const amount = this.formatAmount(giftCardInfo.amount);
          const token = this.getTokenSymbolFromAddress(giftCardInfo.token);
          
          return {
            tokenId: tokenId.toString(),
            recipient: this.account!,
            sender,
            amount,
            token,
            message: giftCardInfo.message,
            redeemed: giftCardInfo.redeemed,
            type: 'received'
          } as GiftCardInfo;
        })
      );
      
      // execute requests in batches with increased size
      for (let i = 0; i < giftCardPromises.length; i += maxConcurrentRequests) {
        const batch = giftCardPromises.slice(i, i + maxConcurrentRequests);
        try {
          const batchResults = await Promise.all(batch);
          cards.push(...batchResults);
        } catch (error) {
          console.warn(`Failed to load batch of cards:`, error);
          // continue with other batches
        }
      }
      
      // Sort by tokenId descending (newest first - tokenId increases with each new card)
      cards.sort((a, b) => parseInt(b.tokenId) - parseInt(a.tokenId));
      
      // Don't cache or cache only if explicitly allowed
      // This ensures new owner sees received card
      if (useCache) {
        const cacheKey = `giftCards_${this.account}`;
        this.setCache(cacheKey, cards);
      }
      return cards;
    } catch (error) {
      console.error('Error loading gift cards:', error);
      return [];
    }
  }

  // private async loadSentGiftCardsViaAPI(): Promise<GiftCardInfo[]> {
  //   // Skip API - go directly to blockchain queries
  //   // API only works for recent transfers, blockchain is more reliable
  //   console.log('Skipping API, using direct blockchain queries');
  //   return [];
  // }
/*
  async loadSentGiftCards(useCache: boolean = false, useAPI: boolean = true): Promise<GiftCardInfo[]> {
    if (!this.account) return [];

    // Don't use cache by default to get fresh data
    if (useCache) {
      const cacheKey = `sentGiftCards_${this.account}`;
      const cached = this.getCache(cacheKey);
      if (cached) {
        console.log('Using cached sent gift cards data');
        return cached;
      }
    }

    // Try to use ArcScan API to get sent cards
    if (useAPI) {
      try {
        const apiCards = await this.loadSentGiftCardsViaAPI();
        if (apiCards.length > 0) {
          console.log(`Loaded ${apiCards.length} sent cards via ArcScan API`);
          if (useCache) {
            const cacheKey = `sentGiftCards_${this.account}`;
            this.setCache(cacheKey, apiCards);
          }
          return apiCards;
        }
        console.log('ArcScan API returned no sent cards, falling back to direct blockchain queries');
      } catch (error) {
        console.warn('ArcScan API failed, falling back to direct blockchain queries:', error);
      }
    }

    try {
      // Get current block number to calculate a reasonable fromBlock
      const currentBlock = await this.safeRequest(async () => {
        return await this.publicClient.getBlockNumber();
      });
      
      // Use batching to query multiple 10k block ranges
      const maxBlockRange = 10000n; // Arc RPC limit is 10,000 blocks for eth_getLogs
      const numberOfBatches = 50; // Query 50 batches = 500k blocks of history (~5 weeks on Arc testnet)
      const logs: any[] = [];
      const twitterLogs: any[] = [];
      const twitchLogs: any[] = [];
      const telegramLogs: any[] = [];
      
      console.log(`Loading sent gift cards in ${numberOfBatches} batches of ${maxBlockRange} blocks each`);
      console.log(`Vault addresses: Twitter=${VAULT_CONTRACT_ADDRESS}, Twitch=${TWITCH_VAULT_CONTRACT_ADDRESS}, Telegram=${TELEGRAM_VAULT_CONTRACT_ADDRESS}, TikTok=${TIKTOK_VAULT_CONTRACT_ADDRESS}, Instagram=${INSTAGRAM_VAULT_CONTRACT_ADDRESS}`);
      
      // Query in batches
      for (let i = 0; i < numberOfBatches; i++) {
        const batchFromBlock = currentBlock > (maxBlockRange * BigInt(i + 1)) 
          ? currentBlock - (maxBlockRange * BigInt(i + 1))
          : 0n;
        const batchToBlock = i === 0 
          ? currentBlock 
          : currentBlock - (maxBlockRange * BigInt(i));
        
        console.log(`Batch ${i + 1}/${numberOfBatches}: blocks ${batchFromBlock} to ${batchToBlock}`);
        
        try {
          // Get Transfer events
          const batchLogs = await this.safeRequest(async () => {
            return await this.publicClient.getLogs({
              address: CONTRACT_ADDRESS as `0x${string}`,
              event: {
                type: 'event',
                name: 'Transfer',
                inputs: [
                  { name: 'from', type: 'address', indexed: true },
                  { name: 'to', type: 'address', indexed: true },
                  { name: 'tokenId', type: 'uint256', indexed: true }
                ]
              },
              fromBlock: batchFromBlock,
              toBlock: batchToBlock
            });
          });
          
          console.log(`Batch ${i + 1} found ${batchLogs.length} Transfer events before sender filter`);

          // Filter Transfer events where from = 0x0 (mint) and check tx.from, or where from = account (direct transfer)
          // Also check GiftCardCreated events to catch all card creations
          const logsFromAccount = await Promise.all(
            batchLogs.map(async (log: any) => {
              if (!log.transactionHash) return null;
              
              // If Transfer is from 0x0 (mint), check tx.from
              // If Transfer is from account, it's a direct transfer (shouldn't happen for sent cards, but include it)
              const isMint = log.args?.from?.toLowerCase() === '0x0000000000000000000000000000000000000000';
              const isFromAccount = log.args?.from?.toLowerCase() === this.account!.toLowerCase();
              
              if (!isMint && !isFromAccount) return null;
              
              try {
                const tx = await this.safeRequest(async () => {
                  return await this.publicClient.getTransaction({ hash: log.transactionHash });
                });
                if (tx && tx.from && tx.from.toLowerCase() === this.account!.toLowerCase()) {
                  return log;
                }
              } catch (error) {
                console.warn(`Failed to verify sender for Transfer event ${log.transactionHash}:`, (error as Error).message ?? error);
              }
              return null;
            })
          );
          
          const filteredBySender = logsFromAccount.filter((log): log is typeof batchLogs[number] => log !== null);
          console.log(`Batch ${i + 1} kept ${filteredBySender.length} Transfer events from ${this.account}`);
          logs.push(...filteredBySender);
          
          // Get GiftCardCreated events for regular address cards
          try {
            const giftCardCreatedBatch = await this.safeRequest(async () => {
              return await this.publicClient.getLogs({
                address: CONTRACT_ADDRESS as `0x${string}`,
                event: {
                  type: 'event',
                  name: 'GiftCardCreated',
                  inputs: [
                    { name: 'tokenId', type: 'uint256', indexed: false },
                    { name: 'recipient', type: 'address', indexed: false },
                    { name: 'amount', type: 'uint256', indexed: false },
                    { name: 'token', type: 'address', indexed: false },
                    { name: 'uri', type: 'string', indexed: false },
                    { name: 'message', type: 'string', indexed: false }
                  ]
                },
                fromBlock: batchFromBlock,
                toBlock: batchToBlock
              });
            });
            
            // Get transaction sender for each GiftCardCreated event
            console.log(`Batch ${i + 1} found ${giftCardCreatedBatch.length} GiftCardCreated events`);
            
            // Process in parallel for better performance
            const giftCardPromises = giftCardCreatedBatch.map(async (log: any) => {
              try {
                // Get transaction to find the sender
                const tx = await this.safeRequest(async () => {
                  return await this.publicClient.getTransaction({ hash: log.transactionHash });
                });
                const txFrom = tx.from.toLowerCase();
                
                // If this card was created by us, add it to regular logs
                if (txFrom === this.account!.toLowerCase()) {
                  // Create a mock Transfer log for processing
                  return {
                    ...log,
                    args: {
                      from: '0x0000000000000000000000000000000000000000',
                      to: log.args.recipient,
                      tokenId: log.args.tokenId
                    }
                  };
                }
              } catch (error) {
                console.warn(`Failed to get transaction for GiftCardCreated event:`, error);
              }
              return null;
            });
            
            const giftCardResults = await Promise.all(giftCardPromises);
            const validGiftCardLogs = giftCardResults.filter((log): log is NonNullable<typeof giftCardResults[number]> => log !== null);
            logs.push(...validGiftCardLogs);
            console.log(`Batch ${i + 1} added ${validGiftCardLogs.length} GiftCardCreated events from ${this.account}`);
          } catch (error: any) {
            console.warn(`Batch ${i + 1} failed to load GiftCardCreated events:`, error.message);
          }
          
          // Get Twitter events
          try {
            const twitterBatch = await this.safeRequest(async () => {
              return await this.publicClient.getLogs({
                address: CONTRACT_ADDRESS as `0x${string}`,
                event: {
                  type: 'event',
                  name: 'GiftCardCreatedForTwitter',
                  inputs: [
                    { name: 'tokenId', type: 'uint256', indexed: false },
                    { name: 'username', type: 'string', indexed: false },
                    { name: 'sender', type: 'address', indexed: false },
                    { name: 'amount', type: 'uint256', indexed: false },
                    { name: 'token', type: 'address', indexed: false },
                    { name: 'uri', type: 'string', indexed: false },
                    { name: 'message', type: 'string', indexed: false }
                  ]
                },
                fromBlock: batchFromBlock,
                toBlock: batchToBlock
              });
            });
            
            console.log(`Batch ${i + 1} found ${twitterBatch.length} Twitter events`);
            if (twitterBatch.length > 0) {
              console.log('Sample Twitter event:', twitterBatch[0]);
            }
            
            const twitterFiltered = twitterBatch.filter((log: any) =>
              log.args && log.args.sender &&
              log.args.sender.toLowerCase() === this.account!.toLowerCase()
            );
            
            console.log(`Batch ${i + 1} filtered to ${twitterFiltered.length} Twitter cards by ${this.account}`);
            twitterLogs.push(...twitterFiltered);
          } catch (error: any) {
            console.warn(`Batch ${i + 1} failed to load Twitter events:`, error.message);
          }
          
          // Get Twitch events
          try {
            const twitchBatch = await this.safeRequest(async () => {
              return await this.publicClient.getLogs({
                address: CONTRACT_ADDRESS as `0x${string}`,
                event: {
                  type: 'event',
                  name: 'GiftCardCreatedForTwitch',
                  inputs: [
                    { name: 'tokenId', type: 'uint256', indexed: false },
                    { name: 'username', type: 'string', indexed: false },
                    { name: 'sender', type: 'address', indexed: false },
                    { name: 'amount', type: 'uint256', indexed: false },
                    { name: 'token', type: 'address', indexed: false },
                    { name: 'uri', type: 'string', indexed: false },
                    { name: 'message', type: 'string', indexed: false }
                  ]
                },
                fromBlock: batchFromBlock,
                toBlock: batchToBlock
              });
            });
            
            const twitchFiltered = twitchBatch.filter((log: any) =>
              log.args && log.args.sender &&
              log.args.sender.toLowerCase() === this.account!.toLowerCase()
            );
            
            console.log(`Batch ${i + 1} found ${twitchFiltered.length} Twitch cards (from ${twitchBatch.length} total)`);
            twitchLogs.push(...twitchFiltered);
          } catch (error: any) {
            console.warn(`Batch ${i + 1} failed to load Twitch events:`, error.message);
          }
          
        // Get Telegram events
        try {
          const telegramBatch = await this.safeRequest(async () => {
            return await this.publicClient.getLogs({
              address: CONTRACT_ADDRESS as `0x${string}`,
              event: {
                type: 'event',
                name: 'GiftCardCreatedForTelegram',
                inputs: [
                  { name: 'tokenId', type: 'uint256', indexed: false },
                  { name: 'username', type: 'string', indexed: false },
                  { name: 'sender', type: 'address', indexed: false },
                  { name: 'amount', type: 'uint256', indexed: false },
                  { name: 'token', type: 'address', indexed: false },
                  { name: 'uri', type: 'string', indexed: false },
                  { name: 'message', type: 'string', indexed: false }
                ]
              },
              fromBlock: batchFromBlock,
              toBlock: batchToBlock
            });
          });

          const telegramFiltered = telegramBatch.filter((log: any) =>
            log.args && log.args.sender &&
            log.args.sender.toLowerCase() === this.account!.toLowerCase()
          );

          console.log(`Batch ${i + 1} found ${telegramFiltered.length} Telegram cards (from ${telegramBatch.length} total)`);
          telegramLogs.push(...telegramFiltered);
        } catch (error: any) {
          console.warn(`Batch ${i + 1} failed to load Telegram events:`, error.message);
        }
        
        } catch (error: any) {
          console.warn(`Batch ${i + 1} failed:`, error.message);
        }
      }
      
      console.log(`Total found: ${logs.length} Transfer/GiftCardCreated, ${twitterLogs.length} Twitter, ${twitchLogs.length} Twitch, ${telegramLogs.length} Telegram events`);
      console.log(`Account: ${this.account}`);
      console.log(`Total unique events to process: ${logs.length + twitterLogs.length + twitchLogs.length + telegramLogs.length}`);

      const sentCards: GiftCardInfo[] = [];
      
      console.log(`Processing ${logs.length} Transfer/GiftCardCreated events for regular address cards`);
      
      // Filter out transfers to Vault contracts (these are handled by Twitter/Twitch events)
      const vaultAddresses = [
        VAULT_CONTRACT_ADDRESS.toLowerCase(),
        TWITCH_VAULT_CONTRACT_ADDRESS.toLowerCase(),
        TELEGRAM_VAULT_CONTRACT_ADDRESS.toLowerCase()
      ];
      const filteredLogs = logs.filter((log: any) => {
        if (!log.args || !log.args.to) return false;
        const toAddress = log.args.to.toLowerCase();
        return !vaultAddresses.includes(toAddress);
      });
      
      console.log(`Filtered out ${logs.length - filteredLogs.length} Vault transfers, ${filteredLogs.length} regular transfers remaining`);
      
      // Increased concurrent requests to 8 for better performance
      const maxConcurrentRequests = 8;
      
      // Process Transfer events (regular address cards)
      const cardPromises = filteredLogs.map((log: any) => {
        if (!log.args || !log.args.tokenId) return Promise.resolve(null);
        
        return this.safeRequest(async () => {
          const tokenId = log.args.tokenId.toString();
          
          const giftCardInfo = await this.publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: GiftCardABI,
            functionName: 'getGiftCardInfo',
            args: [BigInt(tokenId)],
          });
          
          const amount = this.formatAmount(giftCardInfo.amount);
          const token = this.getTokenSymbolFromAddress(giftCardInfo.token);
          
          return {
            tokenId,
            recipient: log.args.to as string,
            sender: this.account!,
            amount,
            token,
            message: giftCardInfo.message,
            redeemed: giftCardInfo.redeemed,
            type: 'sent'
          } as GiftCardInfo;
        }).catch(error => {
          console.warn(`Failed to load sent card ${log.args?.tokenId}:`, error);
          return null;
        });
      });
      
      // Process Twitter card events
      const twitterCardPromises = twitterLogs.map((log: any) => {
        if (!log.args || !log.args.tokenId) return Promise.resolve(null);
        
        return this.safeRequest(async () => {
          const tokenId = log.args.tokenId.toString();
          
          // Check if redeemed
          let redeemed = false;
          try {
            const giftCardInfo = await this.publicClient.readContract({
              address: CONTRACT_ADDRESS as `0x${string}`,
              abi: GiftCardABI,
              functionName: 'getGiftCardInfo',
              args: [BigInt(tokenId)],
            });
            redeemed = giftCardInfo.redeemed;
          } catch (error) {
            console.warn(`Could not check redeemed status for Twitter card ${tokenId}`);
          }
          
          const amount = this.formatAmount(log.args.amount);
          const token = this.getTokenSymbolFromAddress(log.args.token);
          
          return {
            tokenId,
            recipient: `@${log.args.username}`, // Username as recipient
            sender: this.account!,
            amount,
            token,
            message: log.args.message || '',
            redeemed,
            type: 'sent'
          } as GiftCardInfo;
        }).catch(error => {
          console.warn(`Failed to load Twitter card ${log.args?.tokenId}:`, error);
          return null;
        });
      });
      
      // Process Twitch card events
      const twitchCardPromises = twitchLogs.map((log: any) => {
        if (!log.args || !log.args.tokenId) return Promise.resolve(null);
        
        return this.safeRequest(async () => {
          const tokenId = log.args.tokenId.toString();
          
          // Check if redeemed
          let redeemed = false;
          try {
            const giftCardInfo = await this.publicClient.readContract({
              address: CONTRACT_ADDRESS as `0x${string}`,
              abi: GiftCardABI,
              functionName: 'getGiftCardInfo',
              args: [BigInt(tokenId)],
            });
            redeemed = giftCardInfo.redeemed;
          } catch (error) {
            console.warn(`Could not check redeemed status for Twitch card ${tokenId}`);
          }
          
          const amount = this.formatAmount(log.args.amount);
          const token = this.getTokenSymbolFromAddress(log.args.token);
          
          return {
            tokenId,
            recipient: log.args.username, // Username as recipient
            sender: this.account!,
            amount,
            token,
            message: log.args.message || '',
            redeemed,
            type: 'sent'
          } as GiftCardInfo;
        }).catch(error => {
          console.warn(`Failed to load Twitch card ${log.args?.tokenId}:`, error);
          return null;
        });
      });
      
    // Process Telegram card events
    const telegramCardPromises = telegramLogs.map((log: any) => {
      if (!log.args || !log.args.tokenId) return Promise.resolve(null);
      
      return this.safeRequest(async () => {
        const tokenId = log.args.tokenId.toString();
        const rawUsername = (log.args.username || '').toString();
        const displayUsername = rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`;
        
        let redeemed = false;
        try {
          const giftCardInfo = await this.publicClient.readContract({
            address: CONTRACT_ADDRESS as `0x${string}`,
            abi: GiftCardABI,
            functionName: 'getGiftCardInfo',
            args: [BigInt(tokenId)],
          });
          redeemed = giftCardInfo.redeemed;
        } catch (error) {
          console.warn(`Could not check redeemed status for Telegram card ${tokenId}`);
        }
        
        const amount = this.formatAmount(log.args.amount);
        const token = this.getTokenSymbolFromAddress(log.args.token);
        
        return {
          tokenId,
          recipient: `telegram:${displayUsername.replace(/^@@/, '@')}`,
          sender: this.account!,
          amount,
          token,
          message: log.args.message || '',
          redeemed,
          type: 'sent'
        } as GiftCardInfo;
      }).catch(error => {
        console.warn(`Failed to load Telegram card ${log.args?.tokenId}:`, error);
        return null;
      });
    });
    
      // Combine all promises
    const allPromises = [
      ...cardPromises,
      ...twitterCardPromises,
      ...twitchCardPromises,
      ...telegramCardPromises
    ];
      
    console.log(`Total promises to process: ${allPromises.length} (${cardPromises.length} regular, ${twitterCardPromises.length} Twitter, ${twitchCardPromises.length} Twitch, ${telegramCardPromises.length} Telegram)`);
      
      // execute requests in batches with increased size
      for (let i = 0; i < allPromises.length; i += maxConcurrentRequests) {
        const batch = allPromises.slice(i, i + maxConcurrentRequests);
        try {
          const batchResults = await Promise.all(batch);
          const validResults = batchResults.filter(result => result !== null) as GiftCardInfo[];
          sentCards.push(...validResults);
        } catch (error) {
          console.warn(`Failed to load batch of sent cards:`, error);
            // continue with other batches
        }
      }
      
      console.log(`Successfully loaded ${sentCards.length} sent gift cards total`);
      console.log(`Breakdown: ${cardPromises.length} regular promises, ${twitterCardPromises.length} Twitter, ${twitchCardPromises.length} Twitch, ${telegramCardPromises.length} Telegram`);
      
      // Remove duplicates by tokenId
      const uniqueSentCards = Array.from(
        new Map(sentCards.map(card => [card.tokenId, card])).values()
      );
      console.log(`Removed duplicates, ${uniqueSentCards.length} unique cards remaining (had ${sentCards.length} before deduplication)`);
      
      // Log tokenIds for debugging
      if (uniqueSentCards.length > 0) {
        console.log(`Sample tokenIds: ${uniqueSentCards.slice(0, 10).map(c => c.tokenId).join(', ')}`);
      }
      
      // Sort by tokenId descending (newest first - tokenId increases with each new card)
      uniqueSentCards.sort((a, b) => parseInt(b.tokenId) - parseInt(a.tokenId));
      
      if (useCache) {
        const cacheKey = `sentGiftCards_${this.account}`;
        this.setCache(cacheKey, uniqueSentCards);
      }
      return uniqueSentCards;
    } catch (error) {
      console.error('Error loading sent gift cards:', error);
      // Return empty array instead of failing - this is not critical for app functionality
      // User can still create and receive gift cards even if sent cards history fails to load
      return [];
    }
  }
*/
  async getGiftCardInfo(tokenId: string): Promise<BlockchainGiftCardInfo | null> {
    const cacheKey = `giftCardInfo_${tokenId}`;
    const cached = this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const giftCardInfo = await this.safeRequest(async () => {
        return await this.publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: GiftCardABI,
          functionName: 'getGiftCardInfo',
          args: [BigInt(tokenId)],
        });
      });
      this.setCache(cacheKey, giftCardInfo);
      return giftCardInfo;
    } catch (error) {
      console.error('Error getting gift card info:', error);
      return null;
    }
  }

  async getCardOwner(tokenId: string): Promise<string> {
    const cacheKey = `cardOwner_${tokenId}`;
    const cached = this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const owner = await this.safeRequest(async () => {
        return await this.publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: GiftCardABI,
          functionName: 'ownerOf',
          args: [BigInt(tokenId)],
        });
      });
      this.setCache(cacheKey, owner);
      return owner;
    } catch (error) {
      console.error('Error getting card owner:', error);
      throw error;
    }
  }

  async getCardCreator(tokenId: string): Promise<string> {
    const cacheKey = `cardCreator_${tokenId}`;
    const cached = this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Get current block number to calculate a reasonable fromBlock
      const currentBlock = await this.safeRequest(async () => {
        return await this.publicClient.getBlockNumber();
      });
      
      // Further reduced block range for faster loading (last 5000 blocks)
      // Ensure fromBlock is not greater than currentBlock
      const blockRange = 5000n;
      const fromBlock = currentBlock > blockRange ? currentBlock - blockRange : 0n;
      
      // Ensure fromBlock doesn't exceed currentBlock
      const safeFromBlock = fromBlock > currentBlock ? currentBlock : fromBlock;
      
      // Get Transfer events for this token from a reasonable range
      const logs = await this.safeRequest(async () => {
        return await this.publicClient.getLogs({
          address: CONTRACT_ADDRESS as `0x${string}`,
          event: {
            type: 'event',
            name: 'Transfer',
            inputs: [
              { name: 'from', type: 'address', indexed: true },
              { name: 'to', type: 'address', indexed: true },
              { name: 'tokenId', type: 'uint256', indexed: true }
            ]
          },
          args: {
            tokenId: BigInt(tokenId)
          },
          fromBlock: safeFromBlock,
          toBlock: currentBlock
        });
      });

      // Find the minting event (Transfer from 0x0 address)
      const mintEvent = logs.find((log: any) => 
        log.args && 
        log.args.from === '0x0000000000000000000000000000000000000000'
      );

      let creator: string | null = null;
      if (mintEvent) {
        if (mintEvent.transactionHash) {
          try {
            const tx = await this.safeRequest(async () => {
              return await this.publicClient.getTransaction({ hash: mintEvent.transactionHash });
            });
            if (tx && tx.from) {
              creator = tx.from;
            }
          } catch (error) {
            console.warn(`Failed to fetch mint transaction for card ${tokenId}:`, error);
          }
        }

        if (!creator && mintEvent.args && mintEvent.args.from) {
          // If transaction lookup failed, infer creator from event "from" topic (should be zero address for mint).
          // Use recipient as last-resort fallback below.
          const inferred = mintEvent.args.from as string;
          if (inferred && inferred !== '0x0000000000000000000000000000000000000000') {
            creator = inferred;
          }
        }
      }

      if (!creator) {
        // Fallback to current owner if we can't find creator
        try {
          creator = await this.getCardOwner(tokenId);
        } catch (error) {
          console.warn(`Failed to resolve creator for card ${tokenId}, defaulting to unknown:`, error);
          creator = 'unknown';
        }
      }

      creator = creator?.toLowerCase() ?? 'unknown';

      this.setCache(cacheKey, creator);
      return creator;
    } catch (error) {
      console.error('Error getting card creator:', error);
      // Fallback to current owner if we can't find creator
      const owner = await this.getCardOwner(tokenId);
      this.setCache(cacheKey, owner);
      return owner;
    }
  }

  async approveToken(tokenAddress: string, amount: string): Promise<boolean> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not connected');
    }

    // Ensure we're on the correct chain before approving
    await this.ensureCorrectChain();

    // Get chain ID from multiple sources to ensure consistency
    const walletChainId = await this.walletClient.getChainId();
    const targetChainId = arcTestnet.id;
    
    // Also check directly from provider if available
    let providerChainId = walletChainId;
    let providerName = 'Unknown';
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const chainIdHex = await (window as any).ethereum.request({ method: 'eth_chainId' });
        providerChainId = parseInt(chainIdHex, 16);
        
        // Detect wallet provider
        if ((window as any).ethereum.isCoinbaseWallet) {
          providerName = 'Coinbase Wallet';
        } else if ((window as any).ethereum.isMetaMask) {
          providerName = 'MetaMask';
        } else if ((window as any).ethereum.isRainbow) {
          providerName = 'Rainbow';
        }
        
        console.log(`Provider: ${providerName}, Chain ID: ${providerChainId}, Wallet chain ID: ${walletChainId}, Target: ${targetChainId}`);
      } catch (e) {
        console.warn('Could not get chain ID from provider:', e);
      }
    }
    
    if (walletChainId !== targetChainId || providerChainId !== targetChainId) {
      console.error(`Chain ID mismatch: wallet=${walletChainId}, provider=${providerChainId}, expected=${targetChainId}`);
      throw new Error(`Please switch to Arc Testnet (Chain ID: ${targetChainId}) in your wallet. Current: ${providerChainId || walletChainId}`);
    }

    // Coinbase Wallet may have issues with Arc Testnet - show warning
    if (providerName === 'Coinbase Wallet') {
      console.warn('⚠️ Using Coinbase Wallet with Arc Testnet. If you encounter "invalid chain ID" errors, try using MetaMask or Rainbow Wallet instead.');
    }

    // Add delay to ensure chain switch is fully processed
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const amountWei = this.parseAmount(amount);
      
      // On ARC, USDC at 0x3600000000000000000000000000000000000000 has ERC20 interface
      // ERC20 functions (approve, transferFrom) work directly on native USDC balance
      
      // Check current allowance using readContract
      const allowance = await this.safeRequest(async () => {
        return await this.publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'allowance',
          args: [this.account as `0x${string}`, CONTRACT_ADDRESS as `0x${string}`],
        });
      });

      if (BigInt(allowance) < BigInt(amountWei)) {
        console.log(`Approving ${amountWei} tokens on chain ${targetChainId}...`);
        console.log(`Token address: ${tokenAddress}, Spender: ${CONTRACT_ADDRESS}`);
        
        // Re-verify chain ID one more time right before transaction
        const finalCheck = await this.walletClient.getChainId();
        if (finalCheck !== targetChainId) {
          throw new Error(`Chain ID changed before approval: expected ${targetChainId}, got ${finalCheck}`);
        }
        
        // Use writeContract with explicit chain parameter
        // Coinbase Wallet may require explicit chain specification
        console.log('Sending approve transaction...');
        console.log('WalletClient chain:', await this.walletClient.getChainId());
        console.log('ArcTestnet chain ID:', arcTestnet.id);
        console.log('Target chain ID:', targetChainId);
        
        // Try with explicit chain parameter - this ensures chain ID is included in transaction
        const hash = await this.walletClient.writeContract({
          chain: arcTestnet,
          address: tokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESS as `0x${string}`, BigInt(amountWei)],
          account: this.account as `0x${string}`,
        });
        
        console.log(`Approval transaction hash: ${hash}`);

        await this.safeRequest(async () => {
          return await this.publicClient.waitForTransactionReceipt({ hash });
        });
      }

      return true;
    } catch (error) {
      console.error('Error approving token:', error);
      throw error;
    }
  }

  async createGiftCard(
    recipient: string,
    amount: string,
    tokenType: SupportedTokenSymbol,
    metadata: string,
    message: string
  ): Promise<{ tokenId: string; txHash: string }> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not connected');
    }

    // Ensure we're on the correct chain before creating gift card
    await this.ensureCorrectChain();

    try {
      const tokenAddress = this.getTokenAddressFromSymbol(tokenType);
      const amountWei = this.parseAmount(amount);

      // Validate token address
      if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error(`${tokenType} address is not configured. Please set VITE_ARC_${tokenType}_ADDRESS in your .env file`);
      }
      
      console.log(`Checking ${tokenType} balance using ERC20 interface at address: ${tokenAddress}`);
      
      // On ARC, USDC at 0x3600000000000000000000000000000000000000 is the ERC20 interface for native USDC
      // The ERC20 interface directly affects native USDC balance movements
      // ERC20 interface uses 6 decimals, native balance uses 18 decimals
      
      // Check balance using ERC20 interface (6 decimals precision)
      const balance = await this.safeRequest(async () => {
        return await this.publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'balanceOf',
          args: [this.account as `0x${string}`],
        });
      });

      if (BigInt(balance) < BigInt(amountWei)) {
        throw new Error(`Insufficient ${tokenType} balance`);
      }

      // Approve tokens
      await this.approveToken(tokenAddress, amount);

      // Verify chain ID one more time before creating gift card
      const finalChainCheck = await this.walletClient.getChainId();
      if (finalChainCheck !== arcTestnet.id) {
        throw new Error(`Chain ID mismatch before creating gift card: expected ${arcTestnet.id}, got ${finalChainCheck}`);
      }

      // Create gift card with explicit chain parameter
      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: GiftCardABI,
        functionName: 'createGiftCard',
        args: [
          recipient as `0x${string}`,
          BigInt(amountWei),
          tokenAddress as `0x${string}`,
          metadata,
          message
        ],
        account: this.account as `0x${string}`,
      });

      const receipt = await this.safeRequest(async () => {
        return await this.publicClient.waitForTransactionReceipt({ hash });
      });

      // Check transaction status - if it failed, throw an error
      if (receipt.status === 'reverted' || (typeof receipt.status === 'number' && receipt.status === 0)) {
        throw new Error(`Transaction failed: ERC20 transfer amount exceeds balance or other contract error. Transaction hash: ${hash}`);
      }

      // Get token ID from Transfer event (emitted by ERC721 on mint)
      // Transfer(from=0x0, to=recipient, tokenId) - topics: [signature, from, to, tokenId]
      const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const zeroAddressTopic = '0x' + zeroAddress.slice(2).padStart(64, '0');
      
      let tokenId = '1'; // Default fallback
      const transferEvent = receipt.logs.find((log: any) => 
        log.topics[0] === transferEventSignature &&
        log.topics[1]?.toLowerCase() === zeroAddressTopic.toLowerCase() &&
        log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
      );

      if (transferEvent && transferEvent.topics[3]) {
        // tokenId is in topics[3] as uint256
        tokenId = BigInt(transferEvent.topics[3]).toString();
        console.log('Extracted tokenId from Transfer event:', tokenId);
      } else {
        console.warn('Transfer event not found, using default tokenId 1');
        console.log('Available logs:', receipt.logs.map((log: any) => ({
          address: log.address,
          topics: log.topics,
          data: log.data
        })));
      }

      // Clear sent cards cache so new card appears immediately in list
      const cacheKey = `sentGiftCards_${this.account}`;
      this.cache.delete(cacheKey);
      console.log('Cleared sent gift cards cache after creating new card');

      return { tokenId, txHash: hash };
    } catch (error) {
      console.error('Error creating gift card:', error);
      throw error;
    }
  }

  async redeemGiftCard(tokenId: string): Promise<string> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not connected');
    }

    // Ensure we're on the correct chain before redeeming
    await this.ensureCorrectChain();

    try {
      // Verify chain ID before redeeming
      const currentChain = await this.walletClient.getChainId();
      if (currentChain !== arcTestnet.id) {
        throw new Error(`Please switch to Arc Testnet (Chain ID: ${arcTestnet.id}) in your wallet`);
      }

      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: GiftCardABI,
        functionName: 'redeemGiftCard',
        args: [BigInt(tokenId)],
        account: this.account as `0x${string}`,
      });

      await this.safeRequest(async () => {
        return await this.publicClient.waitForTransactionReceipt({ hash });
      });
      return hash;
    } catch (error) {
      console.error('Error redeeming gift card:', error);
      throw error;
    }
  }

  async transferCard(tokenId: string, from: string, to: string): Promise<string> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not connected');
    }

    // Ensure the sender (from) is the current account
    if (from.toLowerCase() !== this.account.toLowerCase()) {
      throw new Error('You can only transfer cards from your own address');
    }

    // Ensure we're on the correct chain
    await this.ensureCorrectChain();

    try {
      // Verify chain ID
      const currentChain = await this.walletClient.getChainId();
      if (currentChain !== arcTestnet.id) {
        throw new Error(`Please switch to Arc Testnet (Chain ID: ${arcTestnet.id}) in your wallet`);
      }

      // Verify that the current account owns the card
      const owner = await this.getCardOwner(tokenId);
      if (owner.toLowerCase() !== this.account!.toLowerCase()) {
        throw new Error('You do not own this gift card');
      }

      // Transfer the NFT using transferFrom
      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: GiftCardABI,
        functionName: 'transferFrom',
        args: [
          from as `0x${string}`,
          to as `0x${string}`,
          BigInt(tokenId)
        ],
        account: this.account as `0x${string}`,
      });

      // Wait for transaction confirmation
      await this.safeRequest(async () => {
        return await this.publicClient.waitForTransactionReceipt({ hash });
      });

      // Clear cache for both addresses
      this.cache.delete(`sentGiftCards_${this.account}`);
      this.cache.delete(`receivedGiftCards_${this.account}`);
      this.cache.delete(`cardOwner_${tokenId}`);

      return hash;
    } catch (error) {
      console.error('Error transferring gift card:', error);
      throw error;
    }
  }

  async getTokenBalance(tokenType: SupportedTokenSymbol): Promise<string> {
    if (!this.account) return '0';

    const cacheKey = `tokenBalance_${tokenType}_${this.account}`;
    const cached = this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const tokenAddress = this.getTokenAddressFromSymbol(tokenType);
      
      if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
        return '0';
      }
      
      // On ARC, USDC at 0x3600000000000000000000000000000000000000 has ERC20 interface
      // Use ERC20 balanceOf to get balance with 6 decimals precision
      const balance = await this.safeRequest(async () => {
        return await this.publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'balanceOf',
          args: [this.account as `0x${string}`],
        });
      });
      
      const formattedBalance = this.formatAmount(BigInt(balance));
      this.setCache(cacheKey, formattedBalance);
      return formattedBalance;
    } catch (error) {
      console.error(`Error getting ${tokenType} balance:`, error);
      return '0';
    }
  }

  getAccount(): string | null {
    return this.account;
  }

  /**
   * Send tokens directly to an address
   * @param tokenType Supported token symbol
   * @param to Recipient address
   * @param amount Amount in token units (e.g., "10.5" for 10.5 USDC)
   * @returns Transaction hash
   */
  async sendToken(
    tokenType: SupportedTokenSymbol,
    to: string,
    amount: string
  ): Promise<string> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not connected');
    }

    await this.ensureCorrectChain();

    try {
      const tokenAddress = this.getTokenAddressFromSymbol(tokenType);
      const amountWei = this.parseAmount(amount);

      if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error(`${tokenType} address is not configured`);
      }

      if (!to || !to.startsWith('0x')) {
        throw new Error('Invalid recipient address');
      }

      // Check balance
      const balance = await this.safeRequest(async () => {
        return await this.publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'balanceOf',
          args: [this.account as `0x${string}`],
        });
      });

      const amountBigInt = BigInt(amountWei);
      if (balance < amountBigInt) {
        throw new Error(`Insufficient ${tokenType} balance. Required: ${amount}, Available: ${this.formatAmount(balance)}`);
      }

      // Send transfer transaction
      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        address: tokenAddress as `0x${string}`,
        abi: ERC20ABI,
        functionName: 'transfer',
        args: [to as `0x${string}`, amountBigInt],
        account: this.account as `0x${string}`,
      });

      // Wait for transaction receipt
      await this.safeRequest(async () => {
        return await this.publicClient.waitForTransactionReceipt({ hash });
      });

      console.log(`Successfully sent ${amount} ${tokenType} to ${to}, txHash: ${hash}`);
      return hash;
    } catch (error: any) {
      console.error(`Error sending ${tokenType}:`, error);
      throw error;
    }
  }

  private parseAmount(amount: string): string {
    // Convert amount to wei (6 decimals for supported stablecoins)
    return (parseFloat(amount) * 1000000).toString();
  }

  private formatAmount(amountWei: bigint): string {
    // Convert wei to amount (6 decimals for supported stablecoins)
    return (Number(amountWei) / 1000000).toString();
  }

  // Method to clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Twitter Vault functions
  async createCardForTwitter(
    username: string,
    amount: string,
    currency: SupportedTokenSymbol,
    metadataUri: string,
    message: string
  ): Promise<{ tokenId: string; txHash: string }> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not connected');
    }

    await this.ensureCorrectChain();

    try {
      const tokenAddress = this.getTokenAddressFromSymbol(currency);
      const amountWei = this.parseAmount(amount);

      if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error(`${currency} address is not configured`);
      }
      
      if (VAULT_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        throw new Error('Vault contract address is not configured');
      }

      // Normalize username: remove @ and convert to lowercase for consistency
      const normalizedUsername = username.toLowerCase().replace(/^@/, '').trim();
      console.log(`Creating Twitter gift card for username "${normalizedUsername}" (original: "${username}") with ${amount} ${currency}`);

      const balance = await this.safeRequest(async () => {
        return await this.publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'balanceOf',
          args: [this.account as `0x${string}`],
        });
      });

      console.log(`${currency} balance:`, balance.toString());

      const amountBigInt = BigInt(amountWei);
      if (balance < amountBigInt) {
        throw new Error(`Insufficient ${currency} balance. Required: ${amount}, Available: ${this.formatAmount(balance)}`);
      }

      const allowance = await this.safeRequest(async () => {
        return await this.publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'allowance',
          args: [this.account as `0x${string}`, CONTRACT_ADDRESS as `0x${string}`],
        });
      });

      if (allowance < amountBigInt) {
        console.log('Approving token spend...');
        const approveHash = await this.walletClient.writeContract({
          chain: arcTestnet,
          address: tokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESS as `0x${string}`, amountBigInt],
          account: this.account as `0x${string}`,
        });

        await this.safeRequest(async () => {
          return await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
        });
      }

      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: GiftCardABI,
        functionName: 'createGiftCardForTwitter',
        args: [
          normalizedUsername, // Using normalized username
          BigInt(amountWei),
          tokenAddress as `0x${string}`,
          metadataUri,
          message
        ],
        account: this.account as `0x${string}`,
      });

      const receipt = await this.safeRequest(async () => {
        return await this.publicClient.waitForTransactionReceipt({ hash });
      });

      // Check transaction status - if it failed, throw an error
      if (receipt.status === 'reverted' || (typeof receipt.status === 'number' && receipt.status === 0)) {
        throw new Error(`Transaction failed: ERC20 transfer amount exceeds balance or other contract error. Transaction hash: ${hash}`);
      }

      // Get token ID from Transfer event (emitted by ERC721 on mint)
      // Transfer(from=0x0, to=vault, tokenId) - topics: [signature, from, to, tokenId]
      const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const zeroAddressTopic = '0x' + zeroAddress.slice(2).padStart(64, '0');
      
      let tokenId = '1'; // Default fallback
      const transferEvent = receipt.logs.find((log: any) => 
        log.topics[0] === transferEventSignature &&
        log.topics[1]?.toLowerCase() === zeroAddressTopic.toLowerCase() &&
        (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase() ||
         log.address.toLowerCase() === VAULT_CONTRACT_ADDRESS.toLowerCase())
      );

      if (transferEvent && transferEvent.topics[3]) {
        // tokenId is in topics[3] as uint256
        tokenId = BigInt(transferEvent.topics[3]).toString();
        console.log('Extracted tokenId from Transfer event for Twitter card:', tokenId);
      } else {
        console.warn('Transfer event not found for Twitter card, using default tokenId 1');
        console.log('Available logs:', receipt.logs.map((log: any) => ({
          address: log.address,
          topics: log.topics,
          data: log.data
        })));
      }

      this.cache.delete(`sentGiftCards_${this.account}`);
      console.log('Twitter gift card created successfully:', { tokenId, txHash: hash });

      return { tokenId, txHash: hash };
    } catch (error) {
      console.error('Error creating Twitter gift card:', error);
      throw error;
    }
  }

  async getPendingTwitterCards(username: string): Promise<string[]> {
    try {
      if (VAULT_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        throw new Error('Vault contract address is not configured');
      }

      // Normalize username: remove @ and convert to lowercase
      const normalizedUsername = username.toLowerCase().replace(/^@/, '').trim();
      console.log(`[getPendingTwitterCards] Original username: "${username}", Normalized: "${normalizedUsername}"`);
      console.log(`[getPendingTwitterCards] Using Vault address: ${VAULT_CONTRACT_ADDRESS}`);
      console.log(`[getPendingTwitterCards] PublicClient initialized:`, !!this.publicClient);
      console.log(`[getPendingTwitterCards] Current RPC: ${ARC_RPC_URLS[this.currentRpcIndex]}`);

      const result = await this.safeRequest(async () => {
        console.log(`[getPendingTwitterCards] Calling readContract with:`, {
          address: VAULT_CONTRACT_ADDRESS,
          functionName: 'getPendingCardsForUsername',
          args: [normalizedUsername]
        });
        const contractResult = await this.publicClient.readContract({
          address: VAULT_CONTRACT_ADDRESS as `0x${string}`,
          abi: TwitterCardVaultABI,
          functionName: 'getPendingCardsForUsername',
          args: [normalizedUsername],
        });
        console.log(`[getPendingTwitterCards] Raw contract result:`, contractResult);
        return contractResult;
      });

      const tokenIds = (result as bigint[]).map((id) => id.toString());
      console.log(`[getPendingTwitterCards] Found ${tokenIds.length} pending cards for username "${normalizedUsername}":`, tokenIds);
      
      return tokenIds;
    } catch (error) {
      console.error('Error getting pending Twitter cards:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        vaultAddress: VAULT_CONTRACT_ADDRESS,
        hasPublicClient: !!this.publicClient
      });
      throw error;
    }
  }

  async claimTwitterCard(tokenId: string, username: string): Promise<string> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not connected');
    }

    await this.ensureCorrectChain();

    try {
      if (VAULT_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        throw new Error('Vault contract address is not configured');
      }

      // Normalize username for consistency
      const normalizedUsername = username.toLowerCase().replace(/^@/, '').trim();
      console.log(`[claimTwitterCard] Claiming tokenId ${tokenId} for username "${normalizedUsername}" (original: "${username}")`);

      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        address: VAULT_CONTRACT_ADDRESS as `0x${string}`,
        abi: TwitterCardVaultABI,
        functionName: 'claimCard',
        args: [BigInt(tokenId), normalizedUsername, this.account],
        account: this.account as `0x${string}`,
      });

      await this.safeRequest(async () => {
        return await this.publicClient.waitForTransactionReceipt({ hash });
      });

      console.log('Card claimed successfully:', { tokenId, txHash: hash });
      
      this.cache.delete(`giftCards_${this.account}`);
      this.cache.delete(`pendingCards_${normalizedUsername}`);

      return hash;
    } catch (error) {
      console.error('Error claiming Twitter card:', error);
      throw error;
    }
  }

  async isTwitterCardClaimed(tokenId: string): Promise<boolean> {
    try {
      if (VAULT_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        throw new Error('Vault contract address is not configured');
      }

      const result = await this.safeRequest(async () => {
        return await this.publicClient.readContract({
          address: VAULT_CONTRACT_ADDRESS as `0x${string}`,
          abi: TwitterCardVaultABI,
          functionName: 'isCardClaimed',
          args: [BigInt(tokenId)],
        });
      });

      return result as boolean;
    } catch (error) {
      console.error('Error checking card claim status:', error);
      throw error;
    }
  }

  /**
   * Diagnostic method: gets username for specific tokenId from Vault contract
   * Useful for debugging pending card search issues
   */
  async getUsernameForToken(tokenId: string): Promise<string> {
    try {
      if (VAULT_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        throw new Error('Vault contract address is not configured');
      }

      const result = await this.safeRequest(async () => {
        return await this.publicClient.readContract({
          address: VAULT_CONTRACT_ADDRESS as `0x${string}`,
          abi: TwitterCardVaultABI,
          functionName: 'getUsernameForToken',
          args: [BigInt(tokenId)],
        });
      });

      const username = result as string;
      console.log(`[getUsernameForToken] TokenId ${tokenId} is associated with username: "${username}"`);
      return username;
    } catch (error) {
      console.error('Error getting username for token:', error);
      throw error;
    }
  }

  // Twitch Vault functions
  async createCardForTwitch(
    username: string,
    amount: string,
    currency: SupportedTokenSymbol,
    metadataUri: string,
    message: string
  ): Promise<{ tokenId: string; txHash: string }> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not connected');
    }

    await this.ensureCorrectChain();

    try {
      const tokenAddress = this.getTokenAddressFromSymbol(currency);
      const amountWei = this.parseAmount(amount);

      if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error(`${currency} address is not configured`);
      }
      
      if (TWITCH_VAULT_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        throw new Error('Twitch Vault contract address is not configured');
      }

      const normalizedUsername = username.toLowerCase().trim();
      console.log(`Creating Twitch gift card for username "${normalizedUsername}" (original: "${username}") with ${amount} ${currency}`);

      const balance = await this.safeRequest(async () => {
        return await this.publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'balanceOf',
          args: [this.account as `0x${string}`],
        });
      });

      console.log(`${currency} balance:`, balance.toString());

      const amountBigInt = BigInt(amountWei);
      if (balance < amountBigInt) {
        throw new Error(`Insufficient ${currency} balance. Required: ${amount}, Available: ${this.formatAmount(balance)}`);
      }

      const allowance = await this.safeRequest(async () => {
        return await this.publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'allowance',
          args: [this.account as `0x${string}`, CONTRACT_ADDRESS as `0x${string}`],
        });
      });

      if (allowance < amountBigInt) {
        console.log('Approving token spend...');
        const approveHash = await this.walletClient.writeContract({
          chain: arcTestnet,
          address: tokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESS as `0x${string}`, amountBigInt],
          account: this.account as `0x${string}`,
        });

        await this.safeRequest(async () => {
          return await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
        });
      }

      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: GiftCardABI,
        functionName: 'createGiftCardForTwitch',
        args: [
          normalizedUsername,
          BigInt(amountWei),
          tokenAddress as `0x${string}`,
          metadataUri,
          message
        ],
        account: this.account as `0x${string}`,
      });

      const receipt = await this.safeRequest(async () => {
        return await this.publicClient.waitForTransactionReceipt({ hash });
      });

      // Check transaction status - if it failed, throw an error
      if (receipt.status === 'reverted' || (typeof receipt.status === 'number' && receipt.status === 0)) {
        throw new Error(`Transaction failed: ERC20 transfer amount exceeds balance or other contract error. Transaction hash: ${hash}`);
      }

      const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const zeroAddressTopic = '0x' + zeroAddress.slice(2).padStart(64, '0');
      
      let tokenId = '1';
      const transferEvent = receipt.logs.find((log: any) => 
        log.topics[0] === transferEventSignature &&
        log.topics[1]?.toLowerCase() === zeroAddressTopic.toLowerCase() &&
        (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase() ||
         log.address.toLowerCase() === TWITCH_VAULT_CONTRACT_ADDRESS.toLowerCase())
      );

      if (transferEvent && transferEvent.topics[3]) {
        tokenId = BigInt(transferEvent.topics[3]).toString();
        console.log('Extracted tokenId from Transfer event for Twitch card:', tokenId);
      } else {
        console.warn('Transfer event not found for Twitch card, using default tokenId 1');
      }

      this.cache.delete(`sentGiftCards_${this.account}`);
      console.log('Twitch gift card created successfully:', { tokenId, txHash: hash });

      return { tokenId, txHash: hash };
    } catch (error) {
      console.error('Error creating Twitch gift card:', error);
      throw error;
    }
  }

  async getPendingTwitchCards(username: string): Promise<string[]> {
    try {
      if (TWITCH_VAULT_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        throw new Error('Twitch Vault contract address is not configured');
      }

      const normalizedUsername = username.toLowerCase().trim();
      console.log(`[getPendingTwitchCards] Original username: "${username}", Normalized: "${normalizedUsername}"`);

      const result = await this.safeRequest(async () => {
        return await this.publicClient.readContract({
          address: TWITCH_VAULT_CONTRACT_ADDRESS as `0x${string}`,
          abi: TwitchCardVaultABI,
          functionName: 'getPendingCardsForUsername',
          args: [normalizedUsername],
        });
      });

      const tokenIds = (result as bigint[]).map((id) => id.toString());
      console.log(`[getPendingTwitchCards] Found ${tokenIds.length} pending cards for username "${normalizedUsername}":`, tokenIds);
      
      return tokenIds;
    } catch (error) {
      console.error('Error getting pending Twitch cards:', error);
      throw error;
    }
  }

  async claimTwitchCard(tokenId: string, username: string): Promise<string> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not connected');
    }

    await this.ensureCorrectChain();

    try {
      if (TWITCH_VAULT_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        throw new Error('Twitch Vault contract address is not configured');
      }

      const normalizedUsername = username.toLowerCase().trim();
      console.log(`[claimTwitchCard] Claiming tokenId ${tokenId} for username "${normalizedUsername}" (original: "${username}")`);

      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        address: TWITCH_VAULT_CONTRACT_ADDRESS as `0x${string}`,
        abi: TwitchCardVaultABI,
        functionName: 'claimCard',
        args: [BigInt(tokenId), normalizedUsername, this.account],
        account: this.account as `0x${string}`,
      });

      await this.safeRequest(async () => {
        return await this.publicClient.waitForTransactionReceipt({ hash });
      });

      console.log('Twitch card claimed successfully:', { tokenId, txHash: hash });
      
      this.cache.delete(`giftCards_${this.account}`);
      this.cache.delete(`pendingTwitchCards_${normalizedUsername}`);

      return hash;
    } catch (error) {
      console.error('Error claiming Twitch card:', error);
      throw error;
    }
  }

  // Telegram Vault functions
  async createCardForTelegram(
    username: string,
    amount: string,
    currency: SupportedTokenSymbol,
    metadataUri: string,
    message: string
  ): Promise<{ tokenId: string; txHash: string }> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not connected');
    }

    await this.ensureCorrectChain();

    try {
      const tokenAddress = this.getTokenAddressFromSymbol(currency);
      const amountWei = this.parseAmount(amount);

      if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error(`${currency} address is not configured`);
      }
      
      if (TELEGRAM_VAULT_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        throw new Error('Telegram Vault contract address is not configured');
      }

      const normalizedUsername = username.toLowerCase().replace(/^@/, '').trim();
      console.log(`Creating Telegram gift card for username "${normalizedUsername}" (original: "${username}") with ${amount} ${currency}`);

      const balance = await this.safeRequest(async () => {
        return await this.publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'balanceOf',
          args: [this.account as `0x${string}`],
        });
      });

      console.log(`${currency} balance:`, balance.toString());

      const amountBigInt = BigInt(amountWei);
      if (balance < amountBigInt) {
        throw new Error(`Insufficient ${currency} balance. Required: ${amount}, Available: ${this.formatAmount(balance)}`);
      }

      const allowance = await this.safeRequest(async () => {
        return await this.publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'allowance',
          args: [this.account as `0x${string}`, CONTRACT_ADDRESS as `0x${string}`],
        });
      });

      if (allowance < amountBigInt) {
        console.log('Approving token spend...');
        const approveHash = await this.walletClient.writeContract({
          chain: arcTestnet,
          address: tokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESS as `0x${string}`, amountBigInt],
          account: this.account as `0x${string}`,
        });

        await this.safeRequest(async () => {
          return await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
        });
      }

      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: GiftCardABI,
        functionName: 'createGiftCardForTelegram',
        args: [
          normalizedUsername,
          BigInt(amountWei),
          tokenAddress as `0x${string}`,
          metadataUri,
          message
        ],
        account: this.account as `0x${string}`,
      });

      const receipt = await this.safeRequest(async () => {
        return await this.publicClient.waitForTransactionReceipt({ hash });
      });

      // Check transaction status - if it failed, throw an error
      if (receipt.status === 'reverted' || (typeof receipt.status === 'number' && receipt.status === 0)) {
        throw new Error(`Transaction failed: ERC20 transfer amount exceeds balance or other contract error. Transaction hash: ${hash}`);
      }

      const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const zeroAddressTopic = '0x' + zeroAddress.slice(2).padStart(64, '0');
      
      let tokenId = '1';
      const transferEvent = receipt.logs.find((log: any) => 
        log.topics[0] === transferEventSignature &&
        log.topics[1]?.toLowerCase() === zeroAddressTopic.toLowerCase() &&
        (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase() ||
         log.address.toLowerCase() === TELEGRAM_VAULT_CONTRACT_ADDRESS.toLowerCase())
      );

      if (transferEvent && transferEvent.topics[3]) {
        tokenId = BigInt(transferEvent.topics[3]).toString();
        console.log('Extracted tokenId from Transfer event for Telegram card:', tokenId);
      } else {
        console.warn('Transfer event not found for Telegram card, using default tokenId 1');
      }

      this.cache.delete(`sentGiftCards_${this.account}`);
      console.log('Telegram gift card created successfully:', { tokenId, txHash: hash });

      return { tokenId, txHash: hash };
    } catch (error) {
      console.error('Error creating Telegram gift card:', error);
      throw error;
    }
  }

  async getPendingTelegramCards(username: string): Promise<string[]> {
    try {
      if (TELEGRAM_VAULT_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        throw new Error('Telegram Vault contract address is not configured');
      }

      const normalizedUsername = username.toLowerCase().replace(/^@/, '').trim();
      console.log(`[getPendingTelegramCards] Original username: "${username}", Normalized: "${normalizedUsername}"`);

      const result = await this.safeRequest(async () => {
        return await this.publicClient.readContract({
          address: TELEGRAM_VAULT_CONTRACT_ADDRESS as `0x${string}`,
          abi: TelegramCardVaultABI,
          functionName: 'getPendingCardsForUsername',
          args: [normalizedUsername],
        });
      });

      const tokenIds = (result as bigint[]).map((id) => id.toString());
      console.log(`[getPendingTelegramCards] Found ${tokenIds.length} pending cards for username "${normalizedUsername}":`, tokenIds);
      
      return tokenIds;
    } catch (error) {
      console.error('Error getting pending Telegram cards:', error);
      throw error;
    }
  }

  async claimTelegramCard(tokenId: string, username: string): Promise<string> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not connected');
    }

    await this.ensureCorrectChain();

    try {
      if (TELEGRAM_VAULT_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        throw new Error('Telegram Vault contract address is not configured');
      }

      const normalizedUsername = username.toLowerCase().replace(/^@/, '').trim();
      console.log(`[claimTelegramCard] Claiming tokenId ${tokenId} for username "${normalizedUsername}" (original: "${username}")`);

      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        address: TELEGRAM_VAULT_CONTRACT_ADDRESS as `0x${string}`,
        abi: TelegramCardVaultABI,
        functionName: 'claimCard',
        args: [BigInt(tokenId), normalizedUsername, this.account],
        account: this.account as `0x${string}`,
      });

      await this.safeRequest(async () => {
        return await this.publicClient.waitForTransactionReceipt({ hash });
      });

      console.log('Telegram card claimed successfully:', { tokenId, txHash: hash });
      
      this.cache.delete(`giftCards_${this.account}`);
      this.cache.delete(`pendingTelegramCards_${normalizedUsername}`);

      return hash;
    } catch (error) {
      console.error('Error claiming Telegram card:', error);
      throw error;
    }
  }

  // TikTok Vault functions
  async createCardForTikTok(
    username: string,
    amount: string,
    currency: SupportedTokenSymbol,
    metadataUri: string,
    message: string
  ): Promise<{ tokenId: string; txHash: string }> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not connected');
    }

    await this.ensureCorrectChain();

    try {
      const tokenAddress = this.getTokenAddressFromSymbol(currency);
      const amountWei = this.parseAmount(amount);

      if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error(`${currency} address is not configured`);
      }

      if (TIKTOK_VAULT_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        throw new Error('TikTok Vault contract address is not configured');
      }

      const normalizedUsername = username.toLowerCase().replace(/^@/, '').trim();
      console.log(`Creating TikTok gift card for username "${normalizedUsername}" (original: "${username}") with ${amount} ${currency}`);

      const balance = await this.safeRequest(async () => {
        return await this.publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'balanceOf',
          args: [this.account as `0x${string}`],
        });
      });

      console.log(`${currency} balance:`, balance.toString());

      const amountBigInt = BigInt(amountWei);
      if (balance < amountBigInt) {
        throw new Error(`Insufficient ${currency} balance. Required: ${amount}, Available: ${this.formatAmount(balance)}`);
      }

      const allowance = await this.safeRequest(async () => {
        return await this.publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'allowance',
          args: [this.account as `0x${string}`, CONTRACT_ADDRESS as `0x${string}`],
        });
      });

      if (allowance < amountBigInt) {
        console.log('Approving token spend...');
        const approveHash = await this.walletClient.writeContract({
          chain: arcTestnet,
          address: tokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESS as `0x${string}`, amountBigInt],
          account: this.account as `0x${string}`,
        });

        await this.safeRequest(async () => {
          return await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
        });
      }

      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: GiftCardABI,
        functionName: 'createGiftCardForTikTok',
        args: [
          normalizedUsername,
          BigInt(amountWei),
          tokenAddress as `0x${string}`,
          metadataUri,
          message
        ],
        account: this.account as `0x${string}`,
      });

      const receipt = await this.safeRequest(async () => {
        return await this.publicClient.waitForTransactionReceipt({ hash });
      });

      // Check transaction status - if it failed, throw an error
      if (receipt.status === 'reverted' || (typeof receipt.status === 'number' && receipt.status === 0)) {
        throw new Error(`Transaction failed: ERC20 transfer amount exceeds balance or other contract error. Transaction hash: ${hash}`);
      }

      const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const zeroAddressTopic = '0x' + zeroAddress.slice(2).padStart(64, '0');

      let tokenId = '1';
      const transferEvent = receipt.logs.find((log: any) =>
        log.topics[0] === transferEventSignature &&
        log.topics[1]?.toLowerCase() === zeroAddressTopic.toLowerCase() &&
        (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase() ||
         log.address.toLowerCase() === TIKTOK_VAULT_CONTRACT_ADDRESS.toLowerCase())
      );

      if (transferEvent && transferEvent.topics[3]) {
        tokenId = BigInt(transferEvent.topics[3]).toString();
        console.log('Extracted tokenId from Transfer event for TikTok card:', tokenId);
      } else {
        console.warn('Transfer event not found for TikTok card, using default tokenId 1');
      }

      this.cache.delete(`sentGiftCards_${this.account}`);
      console.log('TikTok gift card created successfully:', { tokenId, txHash: hash });

      return { tokenId, txHash: hash };
    } catch (error) {
      console.error('Error creating TikTok gift card:', error);
      throw error;
    }
  }

  async getPendingTikTokCards(username: string): Promise<string[]> {
    try {
      if (TIKTOK_VAULT_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        throw new Error('TikTok Vault contract address is not configured');
      }

      const normalizedUsername = username.toLowerCase().replace(/^@/, '').trim();
      console.log(`[getPendingTikTokCards] Original username: "${username}", Normalized: "${normalizedUsername}"`);

      const result = await this.safeRequest(async () => {
        return await this.publicClient.readContract({
          address: TIKTOK_VAULT_CONTRACT_ADDRESS as `0x${string}`,
          abi: TikTokCardVaultABI,
          functionName: 'getPendingCardsForUsername',
          args: [normalizedUsername],
        });
      });

      const tokenIds = (result as bigint[]).map((id) => id.toString());
      console.log(`[getPendingTikTokCards] Found ${tokenIds.length} pending cards for username "${normalizedUsername}":`, tokenIds);

      return tokenIds;
    } catch (error) {
      console.error('Error getting pending TikTok cards:', error);
      throw error;
    }
  }

  async claimTikTokCard(tokenId: string, username: string): Promise<string> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not connected');
    }

    await this.ensureCorrectChain();

    try {
      if (TIKTOK_VAULT_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        throw new Error('TikTok Vault contract address is not configured');
      }

      const normalizedUsername = username.toLowerCase().replace(/^@/, '').trim();
      console.log(`[claimTikTokCard] Claiming tokenId ${tokenId} for username "${normalizedUsername}" (original: "${username}")`);

      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        address: TIKTOK_VAULT_CONTRACT_ADDRESS as `0x${string}`,
        abi: TikTokCardVaultABI,
        functionName: 'claimCard',
        args: [BigInt(tokenId), normalizedUsername, this.account],
        account: this.account as `0x${string}`,
      });

      await this.safeRequest(async () => {
        return await this.publicClient.waitForTransactionReceipt({ hash });
      });

      console.log('TikTok card claimed successfully:', { tokenId, txHash: hash });

      this.cache.delete(`giftCards_${this.account}`);
      this.cache.delete(`pendingTikTokCards_${normalizedUsername}`);

      return hash;
    } catch (error) {
      console.error('Error claiming TikTok card:', error);
      throw error;
    }
  }

  // Instagram Vault functions
  async createCardForInstagram(
    username: string,
    amount: string,
    currency: SupportedTokenSymbol,
    metadataUri: string,
    message: string
  ): Promise<{ tokenId: string; txHash: string }> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not connected');
    }

    await this.ensureCorrectChain();

    try {
      const tokenAddress = this.getTokenAddressFromSymbol(currency);
      const amountWei = this.parseAmount(amount);

      if (!tokenAddress || tokenAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error(`${currency} address is not configured`);
      }

      if (INSTAGRAM_VAULT_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        throw new Error('Instagram Vault contract address is not configured');
      }

      const normalizedUsername = username.toLowerCase().replace(/^@/, '').trim();
      console.log(`Creating Instagram gift card for username "${normalizedUsername}" (original: "${username}") with ${amount} ${currency}`);

      const balance = await this.safeRequest(async () => {
        return await this.publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'balanceOf',
          args: [this.account as `0x${string}`],
        });
      });

      console.log(`${currency} balance:`, balance.toString());

      const amountBigInt = BigInt(amountWei);
      if (balance < amountBigInt) {
        throw new Error(`Insufficient ${currency} balance. Required: ${amount}, Available: ${this.formatAmount(balance)}`);
      }

      const allowance = await this.safeRequest(async () => {
        return await this.publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'allowance',
          args: [this.account as `0x${string}`, CONTRACT_ADDRESS as `0x${string}`],
        });
      });

      if (allowance < amountBigInt) {
        console.log('Approving token spend...');
        const approveHash = await this.walletClient.writeContract({
          chain: arcTestnet,
          address: tokenAddress as `0x${string}`,
          abi: ERC20ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESS as `0x${string}`, amountBigInt],
          account: this.account as `0x${string}`,
        });

        await this.safeRequest(async () => {
          return await this.publicClient.waitForTransactionReceipt({ hash: approveHash });
        });
      }

      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: GiftCardABI,
        functionName: 'createGiftCardForInstagram',
        args: [
          normalizedUsername,
          BigInt(amountWei),
          tokenAddress as `0x${string}`,
          metadataUri,
          message
        ],
        account: this.account as `0x${string}`,
      });

      const receipt = await this.safeRequest(async () => {
        return await this.publicClient.waitForTransactionReceipt({ hash });
      });

      // Check transaction status - if it failed, throw an error
      if (receipt.status === 'reverted' || (typeof receipt.status === 'number' && receipt.status === 0)) {
        throw new Error(`Transaction failed: ERC20 transfer amount exceeds balance or other contract error. Transaction hash: ${hash}`);
      }

      const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const zeroAddressTopic = '0x' + zeroAddress.slice(2).padStart(64, '0');

      let tokenId = '1';
      const transferEvent = receipt.logs.find((log: any) =>
        log.topics[0] === transferEventSignature &&
        log.topics[1]?.toLowerCase() === zeroAddressTopic.toLowerCase() &&
        (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase() ||
         log.address.toLowerCase() === INSTAGRAM_VAULT_CONTRACT_ADDRESS.toLowerCase())
      );

      if (transferEvent && transferEvent.topics[3]) {
        tokenId = BigInt(transferEvent.topics[3]).toString();
        console.log('Extracted tokenId from Transfer event for Instagram card:', tokenId);
      } else {
        console.warn('Transfer event not found for Instagram card, using default tokenId 1');
      }

      this.cache.delete(`sentGiftCards_${this.account}`);
      console.log('Instagram gift card created successfully:', { tokenId, txHash: hash });

      return { tokenId, txHash: hash };
    } catch (error) {
      console.error('Error creating Instagram gift card:', error);
      throw error;
    }
  }

  async getPendingInstagramCards(username: string): Promise<string[]> {
    try {
      if (INSTAGRAM_VAULT_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        throw new Error('Instagram Vault contract address is not configured');
      }

      const normalizedUsername = username.toLowerCase().replace(/^@/, '').trim();
      console.log(`[getPendingInstagramCards] Original username: "${username}", Normalized: "${normalizedUsername}"`);

      const result = await this.safeRequest(async () => {
        return await this.publicClient.readContract({
          address: INSTAGRAM_VAULT_CONTRACT_ADDRESS as `0x${string}`,
          abi: InstagramCardVaultABI,
          functionName: 'getPendingCardsForUsername',
          args: [normalizedUsername],
        });
      });

      const tokenIds = (result as bigint[]).map((id) => id.toString());
      console.log(`[getPendingInstagramCards] Found ${tokenIds.length} pending cards for username "${normalizedUsername}":`, tokenIds);

      return tokenIds;
    } catch (error) {
      console.error('Error getting pending Instagram cards:', error);
      throw error;
    }
  }

  async claimInstagramCard(tokenId: string, username: string): Promise<string> {
    if (!this.walletClient || !this.account) {
      throw new Error('Wallet not connected');
    }

    await this.ensureCorrectChain();

    try {
      if (INSTAGRAM_VAULT_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
        throw new Error('Instagram Vault contract address is not configured');
      }

      const normalizedUsername = username.toLowerCase().replace(/^@/, '').trim();
      console.log(`[claimInstagramCard] Claiming tokenId ${tokenId} for username "${normalizedUsername}" (original: "${username}")`);

      const hash = await this.walletClient.writeContract({
        chain: arcTestnet,
        address: INSTAGRAM_VAULT_CONTRACT_ADDRESS as `0x${string}`,
        abi: InstagramCardVaultABI,
        functionName: 'claimCard',
        args: [BigInt(tokenId), normalizedUsername, this.account],
        account: this.account as `0x${string}`,
      });

      await this.safeRequest(async () => {
        return await this.publicClient.waitForTransactionReceipt({ hash });
      });

      console.log('Instagram card claimed successfully:', { tokenId, txHash: hash });

      this.cache.delete(`giftCards_${this.account}`);
      this.cache.delete(`pendingInstagramCards_${normalizedUsername}`);

      return hash;
    } catch (error) {
      console.error('Error claiming Instagram card:', error);
      throw error;
    }
  }
}

export default new Web3Service();