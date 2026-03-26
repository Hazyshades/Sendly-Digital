// Base/Arc Contract Addresses (env-first; Arc variables preferred)
export const CONTRACT_ADDRESS =
  import.meta.env.VITE_ARC_CONTRACT_ADDRESS ||
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  "0x7f5c9e8548002134cde6093f2ca3ff5b8bd26982";
export const USDC_ADDRESS =
  import.meta.env.VITE_ARC_USDC_ADDRESS ||
  import.meta.env.VITE_USDC_ADDRESS ||
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

export const EURC_ADDRESS =
  import.meta.env.VITE_ARC_EURC_ADDRESS ||
  "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";

export const USYC_ADDRESS =
  import.meta.env.VITE_ARC_USYC_ADDRESS ||
  "0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C";

export const VAULT_CONTRACT_ADDRESS =
  import.meta.env.VITE_ARC_TWITTER_VAULT_ADDRESS ||
  import.meta.env.VITE_ARC_VAULT_CONTRACT_ADDRESS ||
  "0xF8A0870530bb7CD1D658742A079f85E91dFC8E3C";

export const TWITCH_VAULT_CONTRACT_ADDRESS =
  import.meta.env.VITE_ARC_TWITCH_VAULT_CONTRACT_ADDRESS ||
  import.meta.env.VITE_ARC_TWITCH_VAULT_ADDRESS ||
  "0xA27E6Cef4e9d794EE0356461fe65437Bb5f7cbE3";

export const TELEGRAM_VAULT_CONTRACT_ADDRESS =
  import.meta.env.VITE_ARC_TELEGRAM_VAULT_CONTRACT_ADDRESS ||
  import.meta.env.VITE_ARC_TELEGRAM_VAULT_ADDRESS ||
  "0x619A49213860A0448736880c4f456bCDfB96D938";

export const TIKTOK_VAULT_CONTRACT_ADDRESS =
  import.meta.env.VITE_ARC_TIKTOK_VAULT_CONTRACT_ADDRESS ||
  import.meta.env.VITE_ARC_TIKTOK_VAULT_ADDRESS ||
  "0xA4A44F97B8778B4Da8b9562d56A94BfCc0fB9893";

export const INSTAGRAM_VAULT_CONTRACT_ADDRESS =
  import.meta.env.VITE_ARC_INSTAGRAM_VAULT_CONTRACT_ADDRESS ||
  import.meta.env.VITE_ARC_INSTAGRAM_VAULT_ADDRESS ||
  "0x3332dEf130Ea17C69B9dFe8F06be1162526873df";

export const ZKSEND_CONTRACT_ADDRESS =
  import.meta.env.VITE_ARC_ZKSEND_CONTRACT_ADDRESS ||
  "0x30bbcCBB38B8C99A36c93BC36dcE2F9831FEFa4D";

export const DIRECT_SEND_CONTRACT_ADDRESS =
  import.meta.env.VITE_ARC_DIRECT_SEND_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000";

export const RECLAIM_VERIFIER_CONTRACT_ADDRESS =
  import.meta.env.VITE_RECLAIM_VERIFIER_CONTRACT_ADDRESS ||
  import.meta.env.VITE_ARC_ZKTLS_VERIFIER_ADDRESS ||
  "0xfDd1D064529aA8c8058CDD574452c3FF9d6256a7";

if (typeof window !== 'undefined' && USDC_ADDRESS !== '0x3600000000000000000000000000000000000000') {
  console.warn('Using fallback USDC address; set VITE_ARC_USDC_ADDRESS in .env and restart.');
}

export const USDT_ADDRESS = import.meta.env.VITE_USDT_ADDRESS || "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2";

// Base Network RPC URLs with fallback - added more reliable endpoints
export const BASE_RPC_URLS = [
  "https://base-rpc.publicnode.com",
  "https://base.llamarpc.com",
  "https://base-mainnet.public.blastapi.io",
  "https://base.blockpi.network/v1/rpc/public",
  "https://1rpc.io/base",
  "https://base.meowrpc.com"
];

export const BASE_RPC_URL = BASE_RPC_URLS[0]; // Primary RPC for backward compatibility

// Arc Network RPC URLs with fallback (env-first)
export const ARC_RPC_URLS = (
  import.meta.env.VITE_ARC_RPC_URLS?.split(',').map((s: string) => s.trim()).filter(Boolean)
  || []
).concat([
  // default fallbacks (can be overridden by env)
  import.meta.env.VITE_ARC_RPC_URL || 'https://rpc.testnet.arc.network',
]).filter(Boolean);

export const ARC_RPC_URL = ARC_RPC_URLS[0];

// Arc block explorer API (Blockscout-based)
export const ARCSCAN_API_URL = 'https://testnet.arcscan.app/api/v2';

// Base Sepolia Testnet (84532)
export const BASE_SEPOLIA_CHAIN_ID = Number(import.meta.env.VITE_BASE_CHAIN_ID || 84532);
export const BASE_SEPOLIA_RPC_URLS = (
  import.meta.env.VITE_BASE_RPC_URLS?.split(',').map((s: string) => s.trim()).filter(Boolean)
  || []
).concat([
  import.meta.env.VITE_BASE_RPC_URL || 'https://sepolia.base.org',
  import.meta.env.VITE_BASE_RPC_FALLBACK_URL || 'https://base-sepolia-rpc.publicnode.com',
]).filter(Boolean);
export const BASE_SEPOLIA_RPC_URL = BASE_SEPOLIA_RPC_URLS[0];
export const BASE_SEPOLIA_EXPLORER_URL = import.meta.env.VITE_BASE_BLOCK_EXPLORER_URL || 'https://sepolia.basescan.org';
export const BASE_SEPOLIA_EXPLORER_API_URL = 'https://api-sepolia.basescan.org/api';

export const BASE_SEPOLIA_ZKSEND_CONTRACT_ADDRESS =
  import.meta.env.VITE_BASE_ZKSEND_CONTRACT_ADDRESS || '';
export const BASE_SEPOLIA_USDC_ADDRESS =
  import.meta.env.VITE_BASE_USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
export const BASE_SEPOLIA_USDT_ADDRESS =
  import.meta.env.VITE_BASE_USDT_ADDRESS || '';
export const BASE_SEPOLIA_RECLAIM_VERIFIER_CONTRACT_ADDRESS =
  import.meta.env.VITE_BASE_RECLAIM_VERIFIER_ADDRESS || '';

// Tempo Testnet (42431)
export const TEMPO_CHAIN_ID = Number(import.meta.env.VITE_TEMPO_CHAIN_ID || 42431);
export const TEMPO_RPC_URLS = (
  import.meta.env.VITE_TEMPO_RPC_URLS?.split(',').map((s: string) => s.trim()).filter(Boolean)
  || []
).concat([
  import.meta.env.VITE_TEMPO_RPC_URL || 'https://rpc.moderato.tempo.xyz',
]).filter(Boolean);
export const TEMPO_EXPLORER_URL = import.meta.env.VITE_TEMPO_BLOCK_EXPLORER_URL || 'https://explore.tempo.xyz';
export const TEMPO_EXPLORER_API_URL = import.meta.env.VITE_TEMPO_BLOCK_EXPLORER_API_URL || 'https://explore.tempo.xyz/api';

export const TEMPO_GIFTCARD_CONTRACT_ADDRESS =
  import.meta.env.VITE_TEMPO_GIFTCARD_CONTRACT_ADDRESS || '';
export const TEMPO_PATHUSD_ADDRESS =
  import.meta.env.VITE_TEMPO_PATHUSD_ADDRESS || '0x20c0000000000000000000000000000000000000';
export const TEMPO_ALPHAUSD_ADDRESS =
  import.meta.env.VITE_TEMPO_ALPHAUSD_ADDRESS || '0x20c0000000000000000000000000000000000001';
export const TEMPO_BETAUSD_ADDRESS =
  import.meta.env.VITE_TEMPO_BETAUSD_ADDRESS || '0x20c0000000000000000000000000000000000002';
export const TEMPO_THETAUSD_ADDRESS =
  import.meta.env.VITE_TEMPO_THETAUSD_ADDRESS || '0x20c0000000000000000000000000000000000003';
export const TEMPO_TWITTER_VAULT_ADDRESS =
  import.meta.env.VITE_TEMPO_TWITTER_VAULT_ADDRESS || import.meta.env.VITE_TEMPO_TWITTER_VAULT_CONTRACT_ADDRESS || '';
export const TEMPO_TWITCH_VAULT_ADDRESS =
  import.meta.env.VITE_TEMPO_TWITCH_VAULT_ADDRESS || import.meta.env.VITE_TEMPO_TWITCH_VAULT_CONTRACT_ADDRESS || '';
export const TEMPO_TELEGRAM_VAULT_ADDRESS =
  import.meta.env.VITE_TEMPO_TELEGRAM_VAULT_ADDRESS || import.meta.env.VITE_TEMPO_TELEGRAM_VAULT_CONTRACT_ADDRESS || '';
export const TEMPO_TIKTOK_VAULT_ADDRESS =
  import.meta.env.VITE_TEMPO_TIKTOK_VAULT_ADDRESS || import.meta.env.VITE_TEMPO_TIKTOK_VAULT_CONTRACT_ADDRESS || '';
export const TEMPO_INSTAGRAM_VAULT_ADDRESS =
  import.meta.env.VITE_TEMPO_INSTAGRAM_VAULT_ADDRESS || import.meta.env.VITE_TEMPO_INSTAGRAM_VAULT_CONTRACT_ADDRESS || '';

export interface ChainContracts {
  chainId: number;
  contractAddress?: string;
  zksend: string;
  usdc: string;
  usdt?: string;
  eurc?: string;
  usyc?: string;
  pathusd?: string;
  alphausd?: string;
  betausd?: string;
  thetausd?: string;
  reclaimVerifier: string;
  vaultContract?: string;
  twitchVault?: string;
  telegramVault?: string;
  tiktokVault?: string;
  instagramVault?: string;
  directSend?: string;
  rpcUrls: string[];
  explorerUrl: string;
  explorerApiUrl: string;
}

export const ARC_CHAIN_ID = Number(import.meta.env.VITE_ARC_CHAIN_ID || 5042002);

export function getContractsForChain(chainId: number): ChainContracts {
  if (chainId === BASE_SEPOLIA_CHAIN_ID) {
    return {
      chainId: BASE_SEPOLIA_CHAIN_ID,
      contractAddress: undefined,
      zksend: BASE_SEPOLIA_ZKSEND_CONTRACT_ADDRESS,
      usdc: BASE_SEPOLIA_USDC_ADDRESS,
      usdt: BASE_SEPOLIA_USDT_ADDRESS || undefined,
      reclaimVerifier: BASE_SEPOLIA_RECLAIM_VERIFIER_CONTRACT_ADDRESS,
      rpcUrls: [...BASE_SEPOLIA_RPC_URLS],
      explorerUrl: BASE_SEPOLIA_EXPLORER_URL,
      explorerApiUrl: BASE_SEPOLIA_EXPLORER_API_URL,
    };
  }
  if (chainId === TEMPO_CHAIN_ID) {
    return {
      chainId: TEMPO_CHAIN_ID,
      contractAddress: TEMPO_GIFTCARD_CONTRACT_ADDRESS || CONTRACT_ADDRESS,
      zksend: '',
      usdc: TEMPO_PATHUSD_ADDRESS,
      pathusd: TEMPO_PATHUSD_ADDRESS,
      alphausd: TEMPO_ALPHAUSD_ADDRESS,
      betausd: TEMPO_BETAUSD_ADDRESS,
      thetausd: TEMPO_THETAUSD_ADDRESS,
      reclaimVerifier: RECLAIM_VERIFIER_CONTRACT_ADDRESS,
      vaultContract: TEMPO_TWITTER_VAULT_ADDRESS || VAULT_CONTRACT_ADDRESS,
      twitchVault: TEMPO_TWITCH_VAULT_ADDRESS || TWITCH_VAULT_CONTRACT_ADDRESS,
      telegramVault: TEMPO_TELEGRAM_VAULT_ADDRESS || TELEGRAM_VAULT_CONTRACT_ADDRESS,
      tiktokVault: TEMPO_TIKTOK_VAULT_ADDRESS || TIKTOK_VAULT_CONTRACT_ADDRESS,
      instagramVault: TEMPO_INSTAGRAM_VAULT_ADDRESS || INSTAGRAM_VAULT_CONTRACT_ADDRESS,
      directSend: undefined,
      rpcUrls: [...TEMPO_RPC_URLS],
      explorerUrl: TEMPO_EXPLORER_URL,
      explorerApiUrl: TEMPO_EXPLORER_API_URL,
    };
  }
  // Default: Arc Testnet
  return {
    chainId: ARC_CHAIN_ID,
    contractAddress: CONTRACT_ADDRESS,
    zksend: ZKSEND_CONTRACT_ADDRESS,
    usdc: USDC_ADDRESS,
    usdt: USDT_ADDRESS,
    eurc: EURC_ADDRESS,
    usyc: USYC_ADDRESS,
    reclaimVerifier: RECLAIM_VERIFIER_CONTRACT_ADDRESS,
    vaultContract: VAULT_CONTRACT_ADDRESS,
    twitchVault: TWITCH_VAULT_CONTRACT_ADDRESS,
    telegramVault: TELEGRAM_VAULT_CONTRACT_ADDRESS,
    tiktokVault: TIKTOK_VAULT_CONTRACT_ADDRESS,
    instagramVault: INSTAGRAM_VAULT_CONTRACT_ADDRESS,
    directSend: DIRECT_SEND_CONTRACT_ADDRESS,
    rpcUrls: [...ARC_RPC_URLS],
    explorerUrl: import.meta.env.VITE_ARC_BLOCK_EXPLORER_URL || 'https://testnet.arcscan.app',
    explorerApiUrl: ARCSCAN_API_URL,
  };
}

export function getExplorerTxUrl(chainId: number, txHash: string): string {
  const { explorerUrl } = getContractsForChain(chainId);
  return `${explorerUrl}/tx/${txHash}`;
}

export function getExplorerAddressUrl(chainId: number, address: string): string {
  const { explorerUrl } = getContractsForChain(chainId);
  return `${explorerUrl}/address/${address}`;
}

// GiftCard ABI
export const GiftCardABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_usdcAddress",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_eurcAddress",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "approved",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "approved",
        "type": "bool"
      }
    ],
    "name": "ApprovalForAll",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "uri",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "message",
        "type": "string"
      }
    ],
    "name": "GiftCardCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "redeemer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "GiftCardRedeemed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "username",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "uri",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "message",
        "type": "string"
      }
    ],
    "name": "GiftCardCreatedForTwitter",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "username",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "uri",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "message",
        "type": "string"
      }
    ],
    "name": "GiftCardCreatedForTwitch",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "username",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "uri",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "message",
        "type": "string"
      }
    ],
    "name": "GiftCardCreatedForTelegram",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "username",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "uri",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "message",
        "type": "string"
      }
    ],
    "name": "GiftCardCreatedForTikTok",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "username",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "uri",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "message",
        "type": "string"
      }
    ],
    "name": "GiftCardCreatedForInstagram",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_username",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_token",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "_metadataURI",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_message",
        "type": "string"
      }
    ],
    "name": "createGiftCardForTikTok",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_username",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_token",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "_metadataURI",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_message",
        "type": "string"
      }
    ],
    "name": "createGiftCardForInstagram",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_recipient",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_token",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "_metadataURI",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_message",
        "type": "string"
      }
    ],
    "name": "createGiftCard",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "getApproved",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "getGiftCardInfo",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "bool",
            "name": "redeemed",
            "type": "bool"
          },
          {
            "internalType": "string",
            "name": "message",
            "type": "string"
          }
        ],
        "internalType": "struct GiftCard.GiftCardInfo",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "giftCards",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "redeemed",
        "type": "bool"
      },
      {
        "internalType": "string",
        "name": "message",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      }
    ],
    "name": "isApprovedForAll",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "ownerOf",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "redeemGiftCard",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "safeTransferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "safeTransferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "approved",
        "type": "bool"
      }
    ],
    "name": "setApprovalForAll",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes4",
        "name": "interfaceId",
        "type": "bytes4"
      }
    ],
    "name": "supportsInterface",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "tokenByIndex",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "tokenOfOwnerByIndex",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "tokenURI",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "usdcToken",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "eurcToken",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "vaultContract",
    "outputs": [
      {
        "internalType": "contract TwitterCardVault",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "twitchVaultContract",
    "outputs": [
      {
        "internalType": "contract TwitchCardVault",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "telegramVaultContract",
    "outputs": [
      {
        "internalType": "contract TelegramCardVault",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_username",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_token",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "_metadataURI",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_message",
        "type": "string"
      }
    ],
    "name": "createGiftCardForTwitter",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_vaultAddress",
        "type": "address"
      }
    ],
    "name": "setVaultContract",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_username",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_token",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "_metadataURI",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_message",
        "type": "string"
      }
    ],
    "name": "createGiftCardForTwitch",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_username",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "_token",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "_metadataURI",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_message",
        "type": "string"
      }
    ],
    "name": "createGiftCardForTelegram",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_vaultAddress",
        "type": "address"
      }
    ],
    "name": "setTwitchVaultContract",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_vaultAddress",
        "type": "address"
      }
    ],
    "name": "setTelegramVaultContract",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_vaultAddress",
        "type": "address"
      }
    ],
    "name": "setTikTokVaultContract",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_vaultAddress",
        "type": "address"
      }
    ],
    "name": "setInstagramVaultContract",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// TwitterCardVault ABI
export const TwitterCardVaultABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_giftCardAddress",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "string",
        "name": "username",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "CardDeposited",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "claimer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "string",
        "name": "username",
        "type": "string"
      }
    ],
    "name": "CardClaimed",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "claimedTokens",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "giftCardContract",
    "outputs": [
      {
        "internalType": "contract GiftCard",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "tokenToUsername",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "usernameToTokens",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "username",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "depositCardForUsername",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "username",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "claimer",
        "type": "address"
      }
    ],
    "name": "claimCard",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "username",
        "type": "string"
      }
    ],
    "name": "getPendingCardsForUsername",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "isCardClaimed",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "getUsernameForToken",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_giftCardAddress",
        "type": "address"
      }
    ],
    "name": "setGiftCardContract",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "emergencyRecover",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// TwitchCardVault ABI (identical to TwitterCardVault)
export const TwitchCardVaultABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_giftCardAddress",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "string",
        "name": "username",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "CardDeposited",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "claimer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "string",
        "name": "username",
        "type": "string"
      }
    ],
    "name": "CardClaimed",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "claimedTokens",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "giftCardContract",
    "outputs": [
      {
        "internalType": "contract GiftCard",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "tokenToUsername",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "usernameToTokens",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "username",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "depositCardForUsername",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "username",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "claimer",
        "type": "address"
      }
    ],
    "name": "claimCard",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "username",
        "type": "string"
      }
    ],
    "name": "getPendingCardsForUsername",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "isCardClaimed",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "getUsernameForToken",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_giftCardAddress",
        "type": "address"
      }
    ],
    "name": "setGiftCardContract",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "emergencyRecover",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// TelegramCardVault ABI (identical to TwitchCardVault)
export const TelegramCardVaultABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_giftCardAddress",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "string",
        "name": "username",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "CardDeposited",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "claimer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "string",
        "name": "username",
        "type": "string"
      }
    ],
    "name": "CardClaimed",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "claimedTokens",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "giftCardContract",
    "outputs": [
      {
        "internalType": "contract GiftCard",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "tokenToUsername",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "usernameToTokens",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "username",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "depositCardForUsername",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "username",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "claimer",
        "type": "address"
      }
    ],
    "name": "claimCard",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "username",
        "type": "string"
      }
    ],
    "name": "getPendingCardsForUsername",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "isCardClaimed",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "getUsernameForToken",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_giftCardAddress",
        "type": "address"
      }
    ],
    "name": "setGiftCardContract",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "emergencyRecover",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export const TikTokCardVaultABI = TwitchCardVaultABI;
export const InstagramCardVaultABI = TwitchCardVaultABI;

// ZkSend ABI (synced with `contracts/ZkSend.sol` in this repo)
export const ZkSendABI = [
  {
    type: 'event',
    name: 'PaymentCreated',
    inputs: [
      { name: 'paymentId', type: 'uint256', indexed: true },
      { name: 'sender', type: 'address', indexed: true },
      { name: 'socialIdentityHash', type: 'bytes32', indexed: true },
      { name: 'platform', type: 'string', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'token', type: 'address', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'PaymentClaimed',
    inputs: [
      { name: 'paymentId', type: 'uint256', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'socialIdentityHash', type: 'bytes32', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'token', type: 'address', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'function',
    name: 'createPayment',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_socialIdentityHash', type: 'bytes32' },
      { name: '_platform', type: 'string' },
      { name: '_amount', type: 'uint256' },
      { name: '_token', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'claimPayment',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_paymentId', type: 'uint256' },
      {
        name: '_proof',
        type: 'tuple',
        components: [
          {
            name: 'claimInfo',
            type: 'tuple',
            components: [
              { name: 'provider', type: 'string' },
              { name: 'parameters', type: 'string' },
              { name: 'context', type: 'string' },
            ],
          },
          {
            name: 'signedClaim',
            type: 'tuple',
            components: [
              {
                name: 'claim',
                type: 'tuple',
                components: [
                  { name: 'identifier', type: 'bytes32' },
                  { name: 'owner', type: 'address' },
                  { name: 'timestampS', type: 'uint32' },
                  { name: 'epoch', type: 'uint32' },
                ],
              },
              { name: 'signatures', type: 'bytes[]' },
            ],
          },
        ],
      },
      { name: '_recipient', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'claimPayments',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_paymentIds', type: 'uint256[]' },
      {
        name: '_proof',
        type: 'tuple',
        components: [
          {
            name: 'claimInfo',
            type: 'tuple',
            components: [
              { name: 'provider', type: 'string' },
              { name: 'parameters', type: 'string' },
              { name: 'context', type: 'string' },
            ],
          },
          {
            name: 'signedClaim',
            type: 'tuple',
            components: [
              {
                name: 'claim',
                type: 'tuple',
                components: [
                  { name: 'identifier', type: 'bytes32' },
                  { name: 'owner', type: 'address' },
                  { name: 'timestampS', type: 'uint32' },
                  { name: 'epoch', type: 'uint32' },
                ],
              },
              { name: 'signatures', type: 'bytes[]' },
            ],
          },
        ],
      },
      { name: '_recipient', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getPendingPayments',
    stateMutability: 'view',
    inputs: [{ name: '_socialIdentityHash', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'getPayment',
    stateMutability: 'view',
    inputs: [{ name: '_paymentId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'paymentId', type: 'uint256' },
          { name: 'sender', type: 'address' },
          { name: 'socialIdentityHash', type: 'bytes32' },
          { name: 'platform', type: 'string' },
          { name: 'amount', type: 'uint256' },
          { name: 'token', type: 'address' },
          { name: 'recipient', type: 'address' },
          { name: 'claimed', type: 'bool' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'claimedAt', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'verifierContract',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'setVerifierContract',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_newVerifier', type: 'address' }],
    outputs: [],
  },
] as const;

// DirectSend ABI (contracts_reclaim_protocol/DirectSend.sol, contracts/DirectSend.sol)
export const DirectSendABI = [
  {
    type: 'event',
    name: 'DirectTransfer',
    inputs: [
      { name: 'sender', type: 'address', indexed: true },
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'token', type: 'address', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'FeePaid',
    inputs: [
      { name: 'sender', type: 'address', indexed: true },
      { name: 'feeRecipient', type: 'address', indexed: true },
      { name: 'feeAmount', type: 'uint256', indexed: false },
      { name: 'token', type: 'address', indexed: false },
    ],
    anonymous: false,
  },
  {
    type: 'event',
    name: 'FeeRecipientUpdated',
    inputs: [
      { name: 'oldRecipient', type: 'address', indexed: true },
      { name: 'newRecipient', type: 'address', indexed: true },
    ],
    anonymous: false,
  },
  {
    type: 'function',
    name: 'sendToAddress',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_recipient', type: 'address' },
      { name: '_amount', type: 'uint256' },
      { name: '_token', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'setFeeRecipient',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_feeRecipient', type: 'address' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'emergencyWithdraw',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_token', type: 'address' },
      { name: '_amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

// ERC20 ABI for USDC/USDT
export const ERC20ABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "name",
    "outputs": [{"name": "", "type": "string"}],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "symbol",
    "outputs": [{"name": "", "type": "string"}],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{"name": "", "type": "uint8"}],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"name": "", "type": "uint256"}],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{"name": "owner", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {"name": "owner", "type": "address"},
      {"name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"name": "", "type": "uint256"}],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {"name": "spender", "type": "address"},
      {"name": "value", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {"name": "to", "type": "address"},
      {"name": "value", "type": "uint256"}
    ],
    "name": "transfer",
    "outputs": [{"name": "", "type": "bool"}],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {"name": "from", "type": "address"},
      {"name": "to", "type": "address"},
      {"name": "value", "type": "uint256"}
    ],
    "name": "transferFrom",
    "outputs": [{"name": "", "type": "bool"}],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
];