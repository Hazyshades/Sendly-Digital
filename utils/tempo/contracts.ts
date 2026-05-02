import { getContract, type Address, type WalletClient } from 'viem';
import { tempoClient } from './client';
import { GiftCardABI } from '../web3/constants';

// Get GiftCard contract instance
export function getGiftCardContract(address: Address, walletClient?: WalletClient) {
  return getContract({
    address,
    abi: GiftCardABI,
    client: walletClient ? { public: tempoClient, wallet: walletClient } : tempoClient,
  });
}

// Example: Create a gift card
export async function createGiftCard(
  contractAddress: Address,
  recipient: Address,
  amount: bigint,
  token: Address,
  metadataURI: string,
  message: string,
  walletClient: WalletClient
) {
  if (!walletClient.account) {
    throw new Error('Wallet client has no connected account');
  }

  const account = walletClient.account;

  // Create GiftCard contract with walletClient for writing (write-enabled)
  const contract = getContract({
    address: contractAddress,
    abi: GiftCardABI,
    client: { public: tempoClient, wallet: walletClient },
  });

  // Approve token first
  const tokenContract = getContract({
    address: token,
    abi: [
      {
        constant: false,
        inputs: [
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
        ],
        name: 'approve',
        outputs: [{ name: '', type: 'bool' }],
        type: 'function',
      },
    ],
    client: { public: tempoClient, wallet: walletClient },
  });

  // Token approval
  await tokenContract.write.approve([contractAddress, amount], { account });

  // Gift card creation
  const hash = await contract.write.createGiftCard([
    recipient,
    amount,
    token,
    metadataURI,
    message,
  ], { account });

  return hash;
}
