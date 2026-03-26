import { type Address } from 'viem';

export interface TransferSpec {
  sourceSigner: Address;        // Address that signs the burn intent
  destinationCaller?: Address;  // Optional: address that will call mint
  destinationDomain: number;     // Domain of target network
  recipient: Address;           // Recipient address on target network
  amount: string;              // Amount in wei (for USDC: amount * 10^6)
}

export interface BurnIntent {
  maxBlockHeight: string;       // Maximum block height (expiration)
  maxFee: string;              // Maximum fee that Circle can take
  spec: TransferSpec;          // Transfer specification
}

export interface BurnIntentMessage {
  maxBlockHeight: bigint;
  maxFee: bigint;
  spec: {
    sourceSigner: Address;
    destinationCaller?: Address;
    destinationDomain: number;
    recipient: Address;
    amount: bigint;
  };
}

/**
 * Create typed data for signing burn intent (EIP-712)
 * Based on quickstart example and documentation
 */
export function burnIntentTypedData(
  intent: BurnIntent,
  chainId: number
) {
  return {
    domain: {
      name: 'Circle Gateway',
      version: '1',
      chainId: chainId,
    },
    types: {
      BurnIntent: [
        { name: 'maxBlockHeight', type: 'uint256' },
        { name: 'maxFee', type: 'uint256' },
        { name: 'spec', type: 'TransferSpec' },
      ],
      TransferSpec: [
        { name: 'sourceSigner', type: 'address' },
        { name: 'destinationCaller', type: 'address' },
        { name: 'destinationDomain', type: 'uint32' },
        { name: 'recipient', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
    },
    primaryType: 'BurnIntent' as const,
    message: {
      maxBlockHeight: BigInt(intent.maxBlockHeight),
      maxFee: BigInt(intent.maxFee),
      spec: {
        sourceSigner: intent.spec.sourceSigner,
        destinationCaller: intent.spec.destinationCaller || '0x0000000000000000000000000000000000000000',
        destinationDomain: intent.spec.destinationDomain,
        recipient: intent.spec.recipient,
        amount: BigInt(intent.spec.amount),
      },
    } as BurnIntentMessage,
  };
}

/**
 * Create burn intent for transfer
 * @param params - Transfer parameters
 * @param currentBlockHeight - Current block height on source network
 * @param maxFee - Maximum fee (usually '0' for testnet)
 */
export function createBurnIntent(params: {
  sourceSigner: Address;
  destinationDomain: number;
  recipient: Address;
  amount: string; // In USDC (will be converted to wei)
  destinationCaller?: Address;
}, currentBlockHeight: bigint, maxFee: string = '0'): BurnIntent {
  // USDC has 6 decimals
  const amountInWei = BigInt(Math.floor(parseFloat(params.amount) * 1e6)).toString();
  
  // Expiration: current block + ~1000 blocks (approximately 3-4 hours for Ethereum)
  const expirationBlocks = BigInt(1000);
  const maxBlockHeight = (currentBlockHeight + expirationBlocks).toString();

  return {
    maxBlockHeight,
    maxFee,
    spec: {
      sourceSigner: params.sourceSigner,
      destinationCaller: params.destinationCaller,
      destinationDomain: params.destinationDomain,
      recipient: params.recipient,
      amount: amountInWei,
    },
  };
}

