import { apiCall } from '@/lib/supabase/client';

export interface DeveloperWallet {
  id?: number;
  user_id: string;
  circle_wallet_id: string;
  circle_wallet_set_id?: string;
  wallet_address: string;
  blockchain: string;
  account_type: 'EOA' | 'SCA';
  state: 'LIVE' | 'FROZEN';
  custody_type: 'DEVELOPER';
  created_at?: string;
  updated_at?: string;
  telegram_user_id?: string | null;
  user_type?: 'wallet_address' | 'twitch_id' | 'twitter_id' | 'telegram_id' | 'privy_id';
  social_platform?: 'twitch' | 'twitter' | 'telegram' | 'tiktok' | 'instagram' | null;
  social_user_id?: string | null;
  social_username?: string | null;
  privy_user_id?: string | null;
}

export interface CreateWalletRequest {
  userId: string;
  blockchain?: string;
  accountType?: 'EOA' | 'SCA';
}

export interface CreateWalletResponse {
  success: boolean;
  wallet: DeveloperWallet;
  circleWallet?: any;
  message?: string;
}

export interface GetWalletsResponse {
  success: boolean;
  wallets: DeveloperWallet[];
}

export interface LinkTelegramRequest {
  walletAddress: string;
  blockchain: string;
  telegramUserId: string;
  signature?: string;
  message?: string;
  privyUserId?: string;
  validateTelegram?: boolean;
}

export interface LinkTelegramResponse {
  success: boolean;
  wallet?: DeveloperWallet;
  message?: string;
  error?: string;
  details?: string;
  conflict?: {
    wallet_address: string;
    blockchain: string;
    user_id: string;
  } | null;
}

/**
 * Service for managing Circle Developer-Controlled Wallets
 */
export class DeveloperWalletService {
  /**
   * Create a new Developer-Controlled Wallet for a user
   */
  static async createWallet(request: CreateWalletRequest): Promise<CreateWalletResponse> {
    try {
      const response = await apiCall('/wallets/create', {
        method: 'POST',
        body: JSON.stringify({
          userId: request.userId.toLowerCase(),
          blockchain: request.blockchain || 'ARC-TESTNET',
          accountType: request.accountType || 'EOA'
        })
      });

      return response as CreateWalletResponse;
    } catch (error) {
      // Error creating Internal wallet
      throw error;
    }
  }

  /**
   * Get all Developer-Controlled Wallets for a user
   */
  static async getWallets(userId: string): Promise<DeveloperWallet[]> {
    try {
      const response = await apiCall(`/wallets?userId=${encodeURIComponent(userId.toLowerCase())}`, {
        method: 'GET'
      }) as GetWalletsResponse;

      return response.wallets || [];
    } catch (error) {
      // Error fetching Internal wallets
      throw error;
    }
  }

  /**
   * Get a specific wallet by blockchain
   */
  static async getWalletByBlockchain(userId: string, blockchain: string): Promise<DeveloperWallet | null> {
    try {
      const wallets = await this.getWallets(userId);
      return wallets.find(w => w.blockchain === blockchain) || null;
    } catch (error) {
      // Error fetching wallet by blockchain
      throw error;
    }
  }

  /**
   * Check if user has a wallet for a specific blockchain
   */
  static async hasWallet(userId: string, blockchain: string): Promise<boolean> {
    try {
      const wallet = await this.getWalletByBlockchain(userId, blockchain);
      return wallet !== null;
    } catch (error) {
      // Error checking wallet existence
      return false;
    }
  }

  /**
   * Request testnet tokens for a wallet
   */
  static async requestTestnetTokens(walletAddress: string, blockchain: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await apiCall('/wallets/request-testnet-tokens', {
        method: 'POST',
        body: JSON.stringify({
          walletAddress,
          blockchain
        })
      });

      return response as { success: boolean; message?: string };
    } catch (error) {
      // Error requesting testnet tokens
      throw error;
    }
  }

  /**
   * Link Telegram ID to a Internal wallet
   */
  static async linkTelegram(request: LinkTelegramRequest): Promise<LinkTelegramResponse> {
    try {
      const response = await apiCall('/wallets/link-telegram', {
        method: 'POST',
        body: JSON.stringify({
          wallet_address: request.walletAddress,
          blockchain: request.blockchain,
          telegram_user_id: request.telegramUserId,
          signature: request.signature,
          message: request.message,
          privy_user_id: request.privyUserId,
          validateTelegram: request.validateTelegram ?? false
        })
      });

      return response as LinkTelegramResponse;
    } catch (error) {
      // Error linking Telegram ID
      throw error;
    }
  }

  /**
   * Create wallet for social account
   */
  static async createWalletForSocial(
    platform: string,
    socialUserId: string,
    socialUsername: string,
    privyUserId: string,
    blockchain: string = 'ARC-TESTNET'
  ): Promise<CreateWalletResponse> {
    try {
      const response = await apiCall('/wallets/create-for-social', {
        method: 'POST',
        body: JSON.stringify({
          platform,
          socialUserId,
          socialUsername,
          privyUserId,
          blockchain
        })
      });

      return response as CreateWalletResponse;
    } catch (error) {
      // Error creating social wallet
      throw error;
    }
  }

  /**
   * Get wallet by social account
   */
  static async getWalletBySocial(
    platform: string,
    socialUserId: string,
    blockchain: string = 'ARC-TESTNET'
  ): Promise<DeveloperWallet | null> {
    try {
      const response = await apiCall(
        `/wallets/get-by-social?platform=${encodeURIComponent(platform)}&socialUserId=${encodeURIComponent(socialUserId)}&blockchain=${encodeURIComponent(blockchain)}`,
        {
          method: 'GET'
        }
      ) as { success: boolean; wallet: DeveloperWallet | null };

      return response.wallet || null;
    } catch (error) {
      // Error fetching wallet by social
      throw error;
    }
  }

  /**
   * Check if user has a wallet for social account
   */
  static async hasSocialWallet(
    platform: string,
    socialUserId: string,
    blockchain: string = 'ARC-TESTNET'
  ): Promise<boolean> {
    try {
      const wallet = await this.getWalletBySocial(platform, socialUserId, blockchain);
      return wallet !== null;
    } catch (error) {
      // Error checking social wallet existence
      return false;
    }
  }

  /**
   * Send transaction via Internal wallet
   */
  static async sendTransaction(params: {
    walletId: string;
    walletAddress: string;
    contractAddress: string;
    functionName: string;
    args: any[];
    blockchain: string;
    privyUserId?: string;
    socialPlatform?: string;
    socialUserId?: string;
  }): Promise<{ success: boolean; txHash?: string; transactionId?: string; transactionState?: string; error?: string; transaction?: any }> {
    try {
      // Convert BigInt values to strings for JSON serialization
      const serializedArgs = params.args.map(arg => {
        if (typeof arg === 'bigint') {
          return arg.toString();
        }
        return arg;
      });

      const requestBody = {
        walletId: params.walletId,
        walletAddress: params.walletAddress,
        contractAddress: params.contractAddress,
        functionName: params.functionName,
        args: serializedArgs,
        blockchain: params.blockchain,
        privyUserId: params.privyUserId,
        socialPlatform: params.socialPlatform,
        socialUserId: params.socialUserId
      };

      const response = await apiCall('/wallets/send-transaction', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      return response as { success: boolean; txHash?: string; error?: string; transaction?: any };
    } catch (error) {
      // Error sending transaction
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage
      };
    }
  }
}

