import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..", "..");

/**
 * Скрипт для верификации контракта GiftCard через Hardhat
 * Использование: node contracts/deploy/verifyContract.mjs
 */

const CONTRACT_ADDRESS = "0x5743fd9c6372bE37B2CE8884EA9e8bF291132677";
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const EURC_ADDRESS = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";

console.log("🔍 Начинаем верификацию контракта через Hardhat...\n");
console.log("Адрес контракта:", CONTRACT_ADDRESS);
console.log("Параметры конструктора:");
console.log("  - USDC Address:", USDC_ADDRESS);
console.log("  - EURC Address:", EURC_ADDRESS);
console.log("\n");

try {
  // Переходим в корень проекта
  process.chdir(projectRoot);
  
  // Запускаем команду верификации
  const command = `npx hardhat verify --network arcTestnet ${CONTRACT_ADDRESS} "${USDC_ADDRESS}" "${EURC_ADDRESS}"`;
  
  console.log("Выполняем команду:");
  console.log(command);
  console.log("\n");
  
  execSync(command, {
    stdio: "inherit",
    cwd: projectRoot,
    shell: true
  });
  
  console.log("\n✅ Верификация успешно завершена!");
  console.log(`Проверьте контракт: https://testnet.arcscan.app/address/${CONTRACT_ADDRESS}#code`);
  
} catch (error) {
  console.error("\n❌ Ошибка при верификации:");
  console.error(error.message);
  process.exit(1);
}



