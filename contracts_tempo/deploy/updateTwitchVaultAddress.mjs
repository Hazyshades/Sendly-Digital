import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

const RPC_URL = process.env.VITE_ARC_RPC_URL;
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const TWITCH_VAULT_ADDRESS =
  process.env.VITE_ARC_TWITCH_VAULT_ADDRESS ||
  process.env.VITE_ARC_TWITCH_VAULT_CONTRACT_ADDRESS;
const GIFT_CARD_ADDRESS = process.env.VITE_ARC_CONTRACT_ADDRESS;

if (!RPC_URL || !PRIVATE_KEY || !TWITCH_VAULT_ADDRESS || !GIFT_CARD_ADDRESS) {
  console.error('❌ Ошибка: Отсутствуют необходимые переменные окружения');
  console.error('Требуются: VITE_ARC_RPC_URL, DEPLOYER_PRIVATE_KEY, VITE_ARC_TWITCH_VAULT_ADDRESS/VITE_ARC_TWITCH_VAULT_CONTRACT_ADDRESS, VITE_ARC_CONTRACT_ADDRESS');
  process.exit(1);
}

const TWITCH_VAULT_ABI = [
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
  }
];

async function updateTwitchVaultAddress() {
  try {
    console.log('🔄 Обновление адреса GiftCard в TwitchCardVault...\n');

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log('📋 Параметры:');
    console.log(`   TwitchCardVault: ${TWITCH_VAULT_ADDRESS}`);
    console.log(`   Новый GiftCard: ${GIFT_CARD_ADDRESS}`);
    console.log(`   Отправитель: ${wallet.address}\n`);

    const twitchVaultContract = new ethers.Contract(TWITCH_VAULT_ADDRESS, TWITCH_VAULT_ABI, wallet);

    console.log('⏳ Отправка транзакции setGiftCardContract...');

    const tx = await twitchVaultContract.setGiftCardContract(GIFT_CARD_ADDRESS);
    console.log(`   TX Hash: ${tx.hash}`);
    console.log(`   [Просмотр транзакции](https://testnet.arcscan.app/tx/${tx.hash})\n`);

    console.log('⏳ Ожидание подтверждения...');
    const receipt = await tx.wait();

    if (receipt.status === 1) {
      console.log('✅ Адрес GiftCard успешно обновлен в TwitchCardVault!\n');
      console.log('📊 Детали транзакции:');
      console.log(`   Блок: ${receipt.blockNumber}`);
      console.log(`   Gas использовано: ${receipt.gasUsed.toString()}`);
      console.log(`   TX Hash: ${tx.hash}`);
    } else {
      console.error('❌ Транзакция не прошла');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Ошибка при обновлении адреса:');

    if (error.code === 'CALL_EXCEPTION') {
      console.error('   Возможно, есть ошибка вызова или отсутствуют права.');
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

updateTwitchVaultAddress();























