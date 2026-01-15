import 'dotenv/config';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

function getEnv(name, required = true, def) {
  const v = process.env[name] ?? def;
  if (required && (!v || String(v).trim() === '')) {
    throw new Error(`Missing required env: ${name}`);
  }
  return v;
}

async function ensureWalletSetId(walletsClient, maybeWalletSetId, nameForSet) {
  if (maybeWalletSetId && String(maybeWalletSetId).trim() !== '') {
    return maybeWalletSetId;
  }

  const res = await walletsClient.createWalletSet({ name: `${nameForSet} Set` });
  const createdId = res?.data?.walletSet?.id || res?.data?.id || res?.data?.walletSetId;
  if (!createdId) {
    console.log('Не удалось создать Wallet Set. Полный ответ:');
    console.log(JSON.stringify(res, null, 2));
    throw new Error('Wallet Set creation failed');
  }
  console.log(`Создан Wallet Set: ${createdId}`);
  return createdId;
}

async function main() { 
    
  const API_KEY = 'TEST_API_KEY:9628a369ad98b21507b4205486bb5cab:c889726f2f6699800f9adce408c4585f';
  const ENTITY_SECRET = '6356b916832fc38de145fad402270c2c2b2532e81b439a7856d071a8108c1e58';

  // Обязательная сеть для кошелька, например: ARBITRUM-SEPOLIA, BASE-SEPOLIA, MATIC-AMOY, ARC-TESTNET
  const BLOCKCHAIN = 'ARC-TESTNET';

  // Необязательные параметры
  const NAME = getEnv('CIRCLE_WALLET_NAME', false, 'Sendly Wallet');
  const ACCOUNT_TYPE = getEnv('CIRCLE_ACCOUNT_TYPE', false, 'EOA'); // EOA или SCA
  const COUNT = Number(getEnv('CIRCLE_WALLET_COUNT', false, '1'));
  const WALLET_SET_ID_ENV = getEnv('CIRCLE_WALLET_SET_ID', false);

  const wallets = initiateDeveloperControlledWalletsClient({ apiKey: API_KEY, entitySecret: ENTITY_SECRET });

  const walletSetId = await ensureWalletSetId(wallets, WALLET_SET_ID_ENV, NAME);

  const res = await wallets.createWallets({
    name: NAME,
    accountType: ACCOUNT_TYPE,
    count: COUNT,
    blockchains: [BLOCKCHAIN],
    walletSetId,
  });

  const created = res?.data?.wallets ?? [];
  if (!created.length) {
    console.log('Кошельки не созданы, проверьте параметры и доступы. Полный ответ:');
    console.log(JSON.stringify(res, null, 2));
    process.exit(1);
  }

  console.log('Создан(о) кошельков:', created.length);
  for (const w of created) {
    console.log(`- walletId: ${w.id} | address: ${w.address} | blockchain: ${w.blockchain}`);
  }
}

main().catch((e) => {
  console.error('Ошибка при создании кошелька:', e?.response?.data ?? e);
  process.exit(1);
});

