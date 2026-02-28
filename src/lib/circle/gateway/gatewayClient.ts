export interface GatewayInfo {
  supportedChains: Array<{
    domain: number;
    chainId: number;
    name: string;
    gatewayWallet: string;
    gatewayMinter: string;
    usdc: string;
  }>;
}

export interface BalanceSource {
  depositor: string;
  domain: number;
}

export interface BalanceResponse {
  balances: Array<{
    domain: number;
    balance: string;
  }>;
}

export interface TransferRequest {
  burnIntents: Array<{
    burnIntent: {
      maxBlockHeight: string;
      maxFee: string;
      spec: {
        sourceSigner: string;
        destinationCaller?: string;
        destinationDomain: number;
        recipient: string;
        amount: string;
      };
    };
    signature: string;
  }>;
}

export interface TransferResponse {
  success: boolean;
  message?: string;
  attestation?: string;
  signature?: string;
}

export class GatewayClient {
  private baseUrl: string;
  
  // Domain mapping for main networks (based on documentation)
  static DOMAINS = {
    ethereum: 0,
    sepolia: 0,
    avalanche: 1,
    avalancheFuji: 1,
    base: 6,
    baseSepolia: 6,
    arbitrum: 3,
    optimism: 7,
    polygon: 5,
    // Arc Testnet is supported, but domain needs to be obtained from API
  };

  static CHAIN_NAMES: Record<number, string> = {
    0: "Ethereum",
    1: "Avalanche", 
    3: "Arbitrum",
    5: "Polygon",
    6: "Base",
    7: "Optimism",
  };

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || import.meta.env.VITE_GATEWAY_API_URL || 
      'https://gateway-api-testnet.circle.com/v1';
  }

  /**
   * Get information about supported networks and contract addresses
   * This is critical - contract addresses may change
   */
  async info(): Promise<GatewayInfo> {
    return this.get('/info');
  }

  /**
   * Get user balances on specified domains
   * @param token - Token (usually 'USDC')
   * @param depositor - Depositor address
   * @param sources - Array of sources (depositor + domain)
   */
  async balances(
    token: string, 
    depositor: string, 
    sources?: BalanceSource[]
  ): Promise<BalanceResponse> {
    // If sources are not specified, get all supported domains from /info
    if (!sources) {
      const info = await this.info();
      sources = info.supportedChains.map(chain => ({
        depositor,
        domain: chain.domain,
      }));
    }

    return this.post('/balances', {
      token,
      sources,
    });
  }

  /**
   * Submit burn intents and get attestation for minting
   * @param request - Request with signed burn intents
   */
  async transfer(request: TransferRequest): Promise<TransferResponse> {
    return this.post('/transfer', request);
  }

  private async get(path: string) {
    const url = this.baseUrl + path;
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        message: response.statusText 
      }));
      throw new Error(error.message || `Gateway API error: ${response.statusText}`);
    }
    return response.json();
  }

  private async post(path: string, body: any) {
    const url = this.baseUrl + path;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body, (_key, value) => {
        // Serialize BigInt as string
        if (typeof value === 'bigint') {
          return value.toString();
        }
        return value;
      })
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        message: response.statusText 
      }));
      throw new Error(error.message || `Gateway API error: ${response.statusText}`);
    }
    return response.json();
  }
}

