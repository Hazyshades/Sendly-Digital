import { GatewayClient } from './gatewayClient';
import { getGatewayConfig } from './gatewayConfig';
import { gatewayWalletAbi, gatewayMinterAbi, erc20Abi } from './abis';
import { createPublicClient, http, type Address, type Chain } from 'viem';
import { createBurnIntent, burnIntentTypedData } from './typedData';
import { getChainByChainId, getChainByDomain } from '@/lib/bridge/chainRegistry';
import { defineChain } from 'viem';

export interface GatewayBalance {
  domain: number;
  balance: string;
  chain: string;
}

export interface GatewayDepositParams {
  chainId: number;
  amount: string;
  walletClient?: any; // Wagmi wallet client
}

export interface GatewayTransferParams {
  fromChainId: number;
  toChainId: number;
  amount: string;
  recipient: Address;
  walletClient?: any; // Wagmi wallet client
}

export class GatewayService {
  private client: GatewayClient;

  constructor() {
    this.client = new GatewayClient();
  }

  // Get information about supported networks
  async getInfo() {
    return this.client.info();
  }

  // Get user balances
  async getBalances(depositor: Address): Promise<GatewayBalance[]> {
    const response = await this.client.balances('USDC', depositor);
    return response.balances.map((b: any) => {
      const chainConfig = getChainByDomain(b.domain);
      return {
        domain: b.domain,
        balance: b.balance,
        chain: chainConfig?.name || GatewayClient.CHAIN_NAMES[b.domain] || `Domain ${b.domain}`,
      };
    });
  }

  // Deposit USDC to Gateway Wallet
  async deposit(params: GatewayDepositParams): Promise<string> {
    const config = await getGatewayConfig(params.chainId, this.client);
    if (!config) {
      throw new Error(`Gateway not supported on chain ${params.chainId}`);
    }

    if (!params.walletClient) {
      throw new Error('Wallet client required for deposit');
    }

    const chainConfig = getChainByChainId(params.chainId);
    if (!chainConfig) {
      throw new Error(`Chain ${params.chainId} not found in registry`);
    }

    const chain = this.getViemChain(params.chainId, chainConfig);
    const publicClient = createPublicClient({
      chain,
      transport: http(chainConfig.rpcUrl),
    });

    const account = params.walletClient.account;
    if (!account) {
      throw new Error('Account not found in wallet client');
    }

    const amount = BigInt(Math.floor(parseFloat(params.amount) * 1e6)); // USDC has 6 decimals

    // Check USDC balance
    const usdcBalance = await publicClient.readContract({
      address: config.usdc as Address,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address],
    });

    if (usdcBalance < amount) {
      throw new Error('Insufficient USDC balance');
    }

    // Check allowance
    const allowance = await publicClient.readContract({
      address: config.usdc as Address,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [account.address, config.wallet as Address],
    });

    // If allowance is insufficient, make approve
    if (allowance < amount) {
      const approveHash = await params.walletClient.writeContract({
        address: config.usdc as Address,
        abi: erc20Abi,
        functionName: 'approve',
        args: [config.wallet as Address, amount],
        chain,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
    }

    // Deposit to Gateway Wallet
    const hash = await params.walletClient.writeContract({
      address: config.wallet as Address,
      abi: gatewayWalletAbi,
      functionName: 'deposit',
      args: [config.usdc as Address, amount],
      chain,
    });

    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  }

  // Transfer USDC via Gateway (burn intent + mint)
  async transfer(params: GatewayTransferParams): Promise<{
    burnTxHash: string;
    mintTxHash: string;
  }> {
    const fromConfig = await getGatewayConfig(params.fromChainId, this.client);
    const toConfig = await getGatewayConfig(params.toChainId, this.client);

    if (!fromConfig || !toConfig) {
      throw new Error('Gateway not supported on selected chains');
    }

    if (!params.walletClient) {
      throw new Error('Wallet client required for transfer');
    }

    const account = params.walletClient.account;
    if (!account) {
      throw new Error('Account not found in wallet client');
    }

    const fromChainConfig = getChainByChainId(params.fromChainId);
    const toChainConfig = getChainByChainId(params.toChainId);

    if (!fromChainConfig || !toChainConfig) {
      throw new Error('Chain configuration not found');
    }

    const fromChain = this.getViemChain(params.fromChainId, fromChainConfig);
    const toChain = this.getViemChain(params.toChainId, toChainConfig);

    // 1. Get current block height on source network
    const fromPublicClient = createPublicClient({
      chain: fromChain,
      transport: http(fromChainConfig.rpcUrl),
    });

    const currentBlock = await fromPublicClient.getBlockNumber();

    // 2. Create burn intent with correct structure
    const burnIntent = createBurnIntent({
      sourceSigner: account.address,
      destinationDomain: toConfig.domain,
      recipient: params.recipient,
      amount: params.amount,
      destinationCaller: account.address, // Sender of mint transaction
    }, currentBlock, '0'); // maxFee = '0' for testnet

    // 3. Sign burn intent (EIP-712)
    const typedData = burnIntentTypedData(burnIntent, params.fromChainId);
    const signature = await params.walletClient.signTypedData({
      account,
      domain: typedData.domain,
      types: typedData.types,
      primaryType: typedData.primaryType,
      message: typedData.message,
    });

    // 4. Submit burn intent to Gateway API
    const response = await this.client.transfer({
      burnIntents: [{
        burnIntent: {
          maxBlockHeight: burnIntent.maxBlockHeight,
          maxFee: burnIntent.maxFee,
          spec: {
            sourceSigner: burnIntent.spec.sourceSigner,
            destinationCaller: burnIntent.spec.destinationCaller,
            destinationDomain: burnIntent.spec.destinationDomain,
            recipient: burnIntent.spec.recipient,
            amount: burnIntent.spec.amount,
          },
        },
        signature,
      }],
    });

    if (!response.success) {
      throw new Error(response.message || 'Transfer failed');
    }

    if (!response.attestation || !response.signature) {
      throw new Error('Invalid response from Gateway API');
    }

    // 5. Mint USDC on target network
    const toPublicClient = createPublicClient({
      chain: toChain,
      transport: http(toChainConfig.rpcUrl),
    });

    const mintHash = await params.walletClient.writeContract({
      address: toConfig.minter as Address,
      abi: gatewayMinterAbi,
      functionName: 'gatewayMint',
      args: [
        response.attestation as `0x${string}`,
        response.signature as `0x${string}`,
      ],
      chain: toChain,
    });

    await toPublicClient.waitForTransactionReceipt({ hash: mintHash });

    return {
      burnTxHash: '', // Burn happens automatically after mint
      mintTxHash: mintHash,
    };
  }

  private getViemChain(chainId: number, chainConfig: any): Chain {
    return defineChain({
      id: chainId,
      name: chainConfig.name,
      nativeCurrency: chainConfig.nativeCurrency,
      rpcUrls: {
        default: { http: [chainConfig.rpcUrl || ''] },
        public: { http: [chainConfig.rpcUrl || ''] },
      },
      blockExplorers: chainConfig.blockExplorer ? {
        default: { name: 'Explorer', url: chainConfig.blockExplorer },
      } : undefined,
    });
  }
}

export const gatewayService = new GatewayService();

