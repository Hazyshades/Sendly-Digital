import { generateEntitySecret, generateEntitySecretCiphertext, registerEntitySecretCiphertext } from '@circle-fin/developer-controlled-wallets';
import * as fs from 'fs';
import * as path from 'path';

function getEnv(name, required = true) {
  const v = process.env[name];
  if (required && (!v || v.trim() === '')) {
    throw new Error(`Missing required env: ${name}`);
  }
  return v;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
Использование:
  node scripts/circleEntitySecret.mjs <command> [options]

Команды:
  generate     - Сгенерировать новый Entity Secret
  encrypt      - Зашифровать Entity Secret в Ciphertext
  register     - Зарегистрировать Entity Secret Ciphertext в Circle

Примеры:
  node scripts/circleEntitySecret.mjs generate
  node scripts/circleEntitySecret.mjs encrypt --api-key <API_KEY>
  node scripts/circleEntitySecret.mjs register --api-key <API_KEY>
`);
    process.exit(0);
  }

  if (command === 'generate') {
    console.log('Генерация нового Entity Secret...\n');
    generateEntitySecret();
    console.log('\n⚠️  ВАЖНО: Сохраните этот секрет в безопасном месте!');
    console.log('Вы можете использовать его для encrypt и register команд.');
    console.log('\nДля шифрования установите переменные окружения:');
    console.log('  $Env:CIRCLE_API_KEY="ваш_api_ключ"');
    console.log('  $Env:CIRCLE_ENTITY_SECRET="полученный_секрет"');
    console.log('\nЗатем запустите: node scripts/circleEntitySecret.mjs encrypt');
  }

  if (command === 'encrypt') {
    const API_KEY = getEnv('CIRCLE_API_KEY');
    const ENTITY_SECRET = getEnv('CIRCLE_ENTITY_SECRET');

    console.log('Генерация Ciphertext из Entity Secret...\n');
    console.log('Используемый API Key:', API_KEY.substring(0, 20) + '...');
    console.log('Используемый Entity Secret:', ENTITY_SECRET.substring(0, 20) + '...\n');
    
    try {
      const ciphertext = await generateEntitySecretCiphertext({
        apiKey: API_KEY,
        entitySecret: ENTITY_SECRET,
      });

      console.log('Entity Secret Ciphertext:', ciphertext);
      console.log('\n✅ Ciphertext успешно сгенерирован!');
      console.log('Используйте этот ciphertext для register команды.');
    } catch (error) {
      console.error('\n❌ Ошибка при генерации Ciphertext:', error.message);
      if (error.response) {
        console.log('Response status:', error.response.status);
        console.log('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      if (error.request) {
        console.log('Request made but no response received');
      }
      console.log('\nВозможные причины:');
      console.log('1. Неверный API ключ (проверьте в Circle Developer Console)');
      console.log('2. Неверный формат API ключа (возможно нужен Bearer токен)');
      console.log('3. API ключ не имеет доступа к тестнету');
      console.log('4. API ключ устарел или был отозван');
      console.log('\nПолучите новый API ключ: https://console.circle.com/');
      throw error;
    }
  }

  if (command === 'register') {
    const API_KEY = getEnv('CIRCLE_API_KEY');
    const ENTITY_SECRET = getEnv('CIRCLE_ENTITY_SECRET');

    console.log('Регистрация Entity Secret Ciphertext в Circle...\n');

    const response = await registerEntitySecretCiphertext({
      apiKey: API_KEY,
      entitySecret: ENTITY_SECRET,
    });

    console.log('Response:', JSON.stringify(response, null, 2));

    if (response.data?.recoveryFile) {
      const recoveryPath = path.join(process.cwd(), 'recovery_file.dat');
      fs.writeFileSync(recoveryPath, response.data.recoveryFile);
      console.log('\n✅ Файл восстановления сохранен:', recoveryPath);
    }

    console.log('\n✅ Entity Secret Ciphertext успешно зарегистрирован!');
  }
}

main().catch((e) => {
  console.error('Ошибка:', e.message);
  process.exit(1);
});

