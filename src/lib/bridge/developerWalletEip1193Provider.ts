/**
 * Minimal EIP-1193 provider wired to DeveloperWalletService (+ JSON-RPC reads).
 * Bridges Circle Bridge Kit flows that use viem/metaMask-shaped providers without `window.ethereum`.
 *
 * eth_signTypedData_v4 / personal_sign / eth_sign:
 * Developer Wallet EIP-712 is not exposed on `DeveloperWalletService` today.
 * Permit-based bridging will fail until a `/wallets/sign-typed-data` exists.
 */

import { type Abi, type EIP1193Provider, decodeFunctionData, erc20Abi, parseAbi } from 'viem';
import { DeveloperWalletService, type DeveloperWallet } from '@/lib/circle/developerWalletService';
import { getCircleBlockchainForChainId } from '@/lib/bridge/chainIdToCircleBlockchain';
import { BridgeError } from '@/lib/bridge/bridgeErrors';

const CCTP_V2_BRIDGE_DECODE_ABI = parseAbi([
  'function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller, uint256 maxFee, uint32 minFinalityThreshold)',
  'function depositForBurnWithHook(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller, uint256 maxFee, uint32 minFinalityThreshold, bytes hookData)',
  'function receiveMessage(bytes message, bytes attestation)',
]);

const DECODE_ABI = [...erc20Abi, ...CCTP_V2_BRIDGE_DECODE_ABI] as Abi;

export interface DeveloperWalletEip1193Context {
  wallet: DeveloperWallet;
  walletAddressLower: string;
  initialChainId: number;
  getRpcUrl: (chainId: number) => string;
  verification: {
    privyUserId?: string;
    socialPlatform?: string;
    socialUserId?: string;
  };
}

function hexToBigInt(hex: string | undefined): bigint {
  if (hex === undefined || hex === '') {
    return 0n;
  }
  const h = hex.startsWith('0x') ? hex : `0x${hex}`;
  return BigInt(h);
}

async function relayRpc(rpcUrl: string, method: string, params: unknown[]): Promise<unknown> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) {
    throw new BridgeError(
      typeof json.error.message === 'string' ? json.error.message : 'RPC error',
      'RPC_ERROR',
      json.error
    );
  }
  return json.result;
}

function normalizeArgs(args: readonly unknown[]): unknown[] {
  return args.map(arg => {
    if (typeof arg === 'bigint') {
      return arg.toString();
    }
    return arg;
  });
}

async function waitForTxReceiptRpc(rpcUrl: string, txHash: string, timeoutMs: number): Promise<Record<string, unknown>> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const rec = (await relayRpc(rpcUrl, 'eth_getTransactionReceipt', [txHash])) as Record<
      string,
      unknown
    > | null;
    if (rec && typeof rec.blockNumber === 'string') {
      return rec;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new BridgeError('Waiting for batch transaction confirmation timed out.', 'TX_RECEIPT_TIMEOUT');
}

type SendCallsEnvelope = {
  atomicRequired?: boolean;
  calls: Array<{ to?: string; data?: string; value?: string }>;
  chainId: string;
  from?: string;
  id?: string;
  version?: string;
};

async function decodeAndSubmitContractTx(
  ctx: DeveloperWalletEip1193Context,
  chainIdNum: number,
  contractAddress: string,
  data: string
): Promise<string> {
  const blockchain = getCircleBlockchainForChainId(chainIdNum);
  if (!blockchain) {
    throw new BridgeError(
      `Unsupported chain ${chainIdNum} for Internal Wallet bridging. Supported mapping is incomplete.`,
      'UNSUPPORTED_CHAIN'
    );
  }

  let functionName: string;
  let argsDecoded: unknown[];
  try {
    const decoded = decodeFunctionData({ abi: DECODE_ABI, data: data as `0x${string}` });
    functionName = decoded.functionName;
    const ra = decoded.args;
    argsDecoded =
      ra === undefined ? [] : Array.isArray(ra) ? ([...ra] as unknown[]) : [ra as unknown];
  } catch (e: any) {
    throw new BridgeError(
      e?.shortMessage ||
        'Could not decode contract call for Internal Wallet bridge. Permit-based routes may require EIP-712 support.',
      'DECODE_UNSUPPORTED',
      e
    );
  }

  const res = await DeveloperWalletService.sendTransaction({
    walletId: ctx.wallet.circle_wallet_id,
    walletAddress: ctx.wallet.wallet_address,
    contractAddress,
    functionName,
    args: normalizeArgs(argsDecoded),
    blockchain,
    privyUserId: ctx.verification.privyUserId,
    socialPlatform: ctx.verification.socialPlatform,
    socialUserId: ctx.verification.socialUserId,
  });

  if (!res.success || !res.txHash) {
    throw new BridgeError(res.error || 'Internal Wallet transaction failed', 'INTERNAL_WALLET_TX_FAILED', res);
  }

  return res.txHash.startsWith('0x') ? res.txHash : `0x${res.txHash}`;
}

/**
 * EIP-1193 provider that routes writes to DeveloperWalletService.
 */
export function createDeveloperWalletEip1193Provider(ctx: DeveloperWalletEip1193Context): EIP1193Provider {
  let activeChainId = ctx.initialChainId;
  /** synthetic EIP-5792 batch payloads after sequential Developer Wallet executions */
  const completedBatches = new Map<
    string,
    { statusCode: number; receipts: Record<string, unknown>[]; chainIdHex: string }
  >();

  async function handleSendTransaction(payload: Record<string, unknown>): Promise<string> {
    const from = (payload.from as string)?.toLowerCase?.();
    if (from && from !== ctx.walletAddressLower) {
      throw new BridgeError('Wrong `from` address for Internal Wallet provider', 'WRONG_SIGNER_ADDRESS');
    }

    const to = payload.to as string | undefined;
    const data = (payload.data as string | undefined) || '0x';
    const rawChainId = payload.chainId as string | number | bigint | undefined;
    let chainIdNum =
      typeof rawChainId === 'bigint'
        ? Number(rawChainId)
        : typeof rawChainId === 'number'
          ? rawChainId
          : typeof rawChainId === 'string'
            ? Number(hexToBigInt(rawChainId))
            : activeChainId;

    if (!Number.isFinite(chainIdNum)) {
      chainIdNum = activeChainId;
    }

    if (!to) {
      throw new BridgeError('Contract `to` is required for Internal Wallet bridge', 'MISSING_CONTRACT_TO');
    }

    return decodeAndSubmitContractTx(ctx, chainIdNum, to, data);
  }

  return {
    request: async <T = unknown>(args: {
      readonly method?: string | undefined;
      readonly params?: readonly unknown[] | undefined;
      readonly chainId?: `0x${string}` | undefined;
    }) => {
      const method = args.method;
      const params = (args.params as unknown[]) ?? [];

      if (!method) {
        throw new BridgeError('RPC method missing', 'INVALID_REQUEST');
      }

      switch (method) {
        case 'eth_accounts':
        case 'eth_requestAccounts':
          return [ctx.wallet.wallet_address] as unknown as T;

        case 'eth_chainId':
          return `0x${activeChainId.toString(16)}` as T;

        case 'wallet_switchEthereumChain':
        case 'wallet_addEthereumChain': {
          const p0 = params[0] as { chainId?: string } | undefined;
          if (!p0?.chainId) {
            throw new BridgeError('wallet_switchEthereumChain: missing chainId', 'CHAIN_SWITCH_MISSING');
          }
          activeChainId = Number(hexToBigInt(p0.chainId));
          return null as unknown as T;
        }

        case 'wallet_getCapabilities':
          return {} as T;

        case 'wallet_sendCalls':
        case 'wallet_sendCalls_v1': {
          const envelope = params[0] as SendCallsEnvelope | undefined;
          if (!envelope?.calls?.length || !envelope.chainId) {
            throw new BridgeError('wallet_sendCalls: invalid params', 'INVALID_SEND_CALLS');
          }
          if (envelope.atomicRequired && envelope.calls.length > 1) {
            throw new BridgeError(
              'Atomic multi-call batches are not supported on Internal Wallet. Connect MetaMask or another external wallet.',
              'ATOMIC_BATCH_UNSUPPORTED'
            );
          }

          const fromAddr = envelope.from?.toLowerCase?.();
          if (fromAddr && fromAddr !== ctx.walletAddressLower) {
            throw new BridgeError('Wrong `from` address for Internal Wallet batched sends', 'WRONG_SIGNER_ADDRESS');
          }

          const chainIdNum = Number(hexToBigInt(envelope.chainId));
          activeChainId = chainIdNum;
          const rpcUrl = ctx.getRpcUrl(chainIdNum);
          const batchId =
            typeof envelope.id === 'string' && envelope.id.length > 0
              ? envelope.id
              : `sendly-iw-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

          const receiptsAcc: Record<string, unknown>[] = [];
          const chainIdHex = `0x${chainIdNum.toString(16)}`;

          for (let i = 0; i < envelope.calls.length; i++) {
            const call = envelope.calls[i];
            if (!call?.to) {
              throw new BridgeError('wallet_sendCalls: call missing `to`', 'INVALID_SEND_CALLS');
            }
            if (call.value !== undefined && hexToBigInt(call.value) !== 0n) {
              throw new BridgeError(
                'Native-token `value` in batched calls is not supported on Internal Wallet.',
                'NATIVE_VALUE_IN_BATCH_UNSUPPORTED'
              );
            }
            const data = call.data && call.data.startsWith('0x') ? call.data : call.data ? `0x${call.data}` : '0x';
            const hash = await decodeAndSubmitContractTx(ctx, chainIdNum, call.to, data);
            receiptsAcc.push(await waitForTxReceiptRpc(rpcUrl, hash, 120_000));

            if (envelope.calls.length > 1 && i < envelope.calls.length - 1) {
              await new Promise((r) => setTimeout(r, 40));
            }
          }

          completedBatches.set(batchId, { statusCode: 200, receipts: receiptsAcc, chainIdHex });
          return { id: batchId } as unknown as T;
        }

        case 'wallet_getCallsStatus': {
          const raw = params[0] as string | { id?: string } | undefined;
          const sid = typeof raw === 'string' ? raw : typeof raw?.id === 'string' ? raw.id : undefined;
          if (!sid) {
            throw new BridgeError('wallet_getCallsStatus: missing batch id', 'INVALID_BATCH_STATUS');
          }
          const stored = completedBatches.get(sid);
          if (!stored) {
            throw new BridgeError(
              `Internal Wallet: unknown batch "${sid}". Retry the bridge or use an external wallet.`,
              'UNKNOWN_BATCH'
            );
          }
          return {
            version: '2.0.0',
            id: sid,
            chainId: stored.chainIdHex,
            atomic: false,
            statusCode: stored.statusCode,
            receipts: stored.receipts,
          } as unknown as T;
        }

        case 'eth_estimateGas':
        case 'eth_call':
        case 'eth_blockNumber':
        case 'eth_getBlockByNumber':
        case 'eth_getTransactionReceipt':
        case 'eth_getTransactionCount':
        case 'eth_gasPrice':
        case 'eth_feeHistory':
          return relayRpc(ctx.getRpcUrl(activeChainId), method, [...params]) as Promise<T>;

        case 'wallet_getCallsReceipt':
          throw new BridgeError(`${method} is not supported on Internal Wallet`, 'UNSUPPORTED_RPC');

        case 'eth_sendTransaction':
          return (await handleSendTransaction(params[0] as Record<string, unknown>)) as unknown as T;

        case 'eth_signTypedData_v4':
        case 'personal_sign':
        case 'eth_sign':
          throw new BridgeError(
            'EIP-712 / raw signing via Internal Wallet bridge is not implemented. Connect MetaMask/RainbowKit for permit-style routes.',
            'EIP_SIGNING_UNSUPPORTED'
          );

        default: {
          // Best-effort read relay (simulation/trace paths)
          return relayRpc(ctx.getRpcUrl(activeChainId), method, [...params]) as Promise<T>;
        }
      }
    },
  } as EIP1193Provider;
}
