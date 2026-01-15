import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';
import { initiateSmartContractPlatformClient } from '@circle-fin/smart-contract-platform';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getEnv(name, required = true) {
  const v = process.env[name];
  if (required && (!v || v.trim() === '')) {
    throw new Error(`Missing required env: ${name}`);
  }
  return v;
}

const API_KEY = getEnv('CIRCLE_API_KEY');
const ENTITY_SECRET = getEnv('CIRCLE_ENTITY_SECRET');
const ENTITY_SECRET_CIPHERTEXT = getEnv('CIRCLE_ENTITY_SECRET_CIPHERTEXT');
const WALLET_ID = getEnv('CIRCLE_WALLET_ID');
const BLOCKCHAIN = getEnv('CIRCLE_BLOCKCHAIN'); // e.g. MATIC-AMOY, BASE-SEPOLIA, ARBITRUM-SEPOLIA
const USDC_ADDRESS = getEnv('USDC_ADDRESS');

const artifactsPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'GiftCard.sol', 'GiftCard.json');
const artifact = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));
const abiJSONString = JSON.stringify(artifact.abi);
const bytecode = artifact.bytecode.startsWith('0x') ? artifact.bytecode : `0x${artifact.bytecode}`;

const wallets = initiateDeveloperControlledWalletsClient({ apiKey: API_KEY, entitySecret: ENTITY_SECRET });
const contracts = initiateSmartContractPlatformClient({ apiKey: API_KEY, entitySecret: ENTITY_SECRET });

async function main() {
  const deployRes = await contracts.deployContract({
    name: 'Sendly GiftCard',
    description: 'ERC721 gift card with USDC escrow',
    walletId: WALLET_ID,
    blockchain: BLOCKCHAIN,
    fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
    constructorParameters: [USDC_ADDRESS],
    entitySecretCiphertext: ENTITY_SECRET_CIPHERTEXT,
    abiJSON: abiJSONString,
    bytecode,
  });

  console.log('[deploy] response:', JSON.stringify(deployRes, null, 2));
  const contractId = deployRes?.data?.contractId;
  if (!contractId) {
    throw new Error('No contractId in deploy response');
  }

  // Optional: poll status
  let status = 'PENDING';
  let address = undefined;
  for (let i = 0; i < 30; i++) {
    const { data } = await contracts.getContract({ id: contractId });
    status = data?.contract?.status;
    address = data?.contract?.contractAddress;
    console.log(`[status] ${status} ${address ?? ''}`);
    if (status === 'COMPLETE' && address) break;
    await new Promise((r) => setTimeout(r, 5000));
  }

  if (!address) {
    console.warn('Contract address not available yet. Check later with GET /contracts/{id}.');
  } else {
    console.log('Deployed at:', address);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
