import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const RPC_URL = process.env.VITE_ARC_RPC_URL;
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const GIFT_CARD_ADDRESS = process.env.VITE_ARC_CONTRACT_ADDRESS;
const TWITCH_VAULT_ADDRESS =
  process.env.VITE_ARC_TWITCH_VAULT_ADDRESS ||
  process.env.VITE_ARC_TWITCH_VAULT_CONTRACT_ADDRESS;

if (!RPC_URL || !PRIVATE_KEY || !GIFT_CARD_ADDRESS || !TWITCH_VAULT_ADDRESS) {
  console.error('❌ Ошибка: Отсутствуют необходимые переменные окружения');
  console.error('Требуются: VITE_ARC_RPC_URL, DEPLOYER_PRIVATE_KEY, VITE_ARC_CONTRACT_ADDRESS, VITE_ARC_TWITCH_VAULT_ADDRESS/VITE_ARC_TWITCH_VAULT_CONTRACT_ADDRESS');
  process.exit(1);
}

const GIFT_CARD_ABI = [
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
  }
];

async function linkTwitchVault() {
  try {
    console.log('🔗 Связывание TwitchCardVault с GiftCard...\n');
    
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log('📋 Параметры:');
    console.log(`   GiftCard: ${GIFT_CARD_ADDRESS}`);
    console.log(`   TwitchCardVault: ${TWITCH_VAULT_ADDRESS}`);
    console.log(`   Отправитель: ${wallet.address}\n`);
    
    const giftCardContract = new ethers.Contract(GIFT_CARD_ADDRESS, GIFT_CARD_ABI, wallet);
    
    console.log('⏳ Отправка транзакции setTwitchVaultContract...');
    
    const tx = await giftCardContract.setTwitchVaultContract(TWITCH_VAULT_ADDRESS);
    console.log(`   TX Hash: ${tx.hash}`);
    console.log(`   [Просмотр транзакции](https://testnet.arcscan.app/tx/${tx.hash})\n`);
    
    console.log('⏳ Ожидание подтверждения...');
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log('✅ TwitchCardVault успешно связан с GiftCard!\n');
      console.log('📊 Детали транзакции:');
      console.log(`   Блок: ${receipt.blockNumber}`);
      console.log(`   Gas использовано: ${receipt.gasUsed.toString()}`);
      console.log(`   TX Hash: ${tx.hash}`);
    } else {
      console.error('❌ Транзакция не прошла');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Ошибка при связывании контрактов:');
    
    if (error.code === 'CALL_EXCEPTION') {
      console.error('   Возможно, контракт GiftCard не имеет установленного Twitch Vault или есть другая ошибка вызова.');
    } else if (error.code === 'NONCE_EXPIRED') {
      console.error('   Nonce устарел. Попробуйте снова.');
    } else if (error.message?.includes('insufficient funds')) {
      console.error('   Недостаточно средств для оплаты газа.');
    } else if (error.message?.includes('only owner')) {
      console.error('   Только владелец контракта может вызвать эту функцию.');
    } else {
      console.error('   ', error.message);
    }
    
    process.exit(1);
  }
}

linkTwitchVault();




