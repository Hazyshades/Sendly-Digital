import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Скрипт для верификации контракта GiftCard на ArcScan Testnet
 * 
 * Использование:
 * node contracts/deploy/verifyGiftCard.mjs
 * 
 * Требования:
 * - Установлен DEPLOYER_PRIVATE_KEY в .env (для получения информации о контракте)
 * - Контракт уже задеплоен по адресу 0x5743fd9c6372bE37B2CE8884EA9e8bF291132677
 */

const CONTRACT_ADDRESS = "0x5743fd9c6372bE37B2CE8884EA9e8bF291132677";
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const EURC_ADDRESS = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";
const ARCSCAN_API_URL = "https://testnet.arcscan.app/api";

async function verifyContract() {
  console.log("🔍 Начинаем верификацию контракта GiftCard...");
  console.log("Адрес контракта:", CONTRACT_ADDRESS);
  console.log("\n");

  // Читаем исходный код контракта
  const contractPath = join(__dirname, "..", "GiftCard.sol");
  const contractSource = readFileSync(contractPath, "utf-8");

  // Читаем зависимости
  const dependencies = {};
  const dependencyFiles = [
    "TwitterCardVault.sol",
    "TwitchCardVault.sol",
    "TelegramCardVault.sol",
    "TikTokCardVault.sol",
    "InstagramCardVault.sol"
  ];

  for (const depFile of dependencyFiles) {
    const depPath = join(__dirname, "..", depFile);
    try {
      dependencies[depFile] = readFileSync(depPath, "utf-8");
      console.log(`✅ Загружен файл зависимости: ${depFile}`);
    } catch (error) {
      console.warn(`⚠️  Не удалось загрузить ${depFile}:`, error.message);
    }
  }

  // Параметры для верификации
  const verificationData = {
    contractAddress: CONTRACT_ADDRESS,
    sourceCode: contractSource,
    contractName: "GiftCard",
    compilerVersion: "v0.8.20+commit.a1b79de6",
    optimization: true,
    optimizationRuns: 200,
    constructorArguments: new ethers.AbiCoder().encode(
      ["address", "address"],
      [USDC_ADDRESS, EURC_ADDRESS]
    ),
    libraries: {},
    evmVersion: "default"
  };

  console.log("\n📋 Параметры верификации:");
  console.log("- Версия компилятора: 0.8.20");
  console.log("- Оптимизация: включена (runs: 200)");
  console.log("- Параметры конструктора:");
  console.log(`  - USDC Address: ${USDC_ADDRESS}`);
  console.log(`  - EURC Address: ${EURC_ADDRESS}`);
  console.log("\n");

  // Инструкции для ручной верификации
  console.log("=".repeat(80));
  console.log("📝 ИНСТРУКЦИЯ ДЛЯ РУЧНОЙ ВЕРИФИКАЦИИ:");
  console.log("=".repeat(80));
  console.log("\n1. Перейдите на страницу верификации:");
  console.log(`   https://testnet.arcscan.app/address/${CONTRACT_ADDRESS}/contract-verification\n`);
  
  console.log("2. Выберите метод верификации: 'Via Standard JSON Input' (рекомендуется)\n");
  
  console.log("3. Заполните форму:");
  console.log("   - Contract Address: " + CONTRACT_ADDRESS);
  console.log("   - Contract Name: GiftCard");
  console.log("   - Compiler Version: v0.8.20+commit.a1b79de6");
  console.log("   - Optimization: Yes");
  console.log("   - Optimization Runs: 200");
  console.log("   - EVM Version: default\n");
  
  console.log("4. Для Standard JSON Input:");
  console.log("   - Создайте JSON файл с исходным кодом и настройками компиляции");
  console.log("   - Или используйте 'Via Source Code' и вставьте код вручную\n");
  
  console.log("5. Constructor Arguments (ABI-encoded):");
  const abiCoder = new ethers.AbiCoder();
  const constructorArgs = abiCoder.encode(
    ["address", "address"],
    [USDC_ADDRESS, EURC_ADDRESS]
  );
  console.log(`   ${constructorArgs}\n`);
  
  console.log("6. Загрузите исходный код:");
  console.log("   - Основной файл: contracts/GiftCard.sol");
  console.log("   - Зависимости:");
  dependencyFiles.forEach(file => {
    console.log(`     - contracts/${file}`);
  });
  console.log("\n");

  // Создаем файл с информацией для верификации
  const verificationInfo = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: "GiftCard",
    compilerVersion: "v0.8.20+commit.a1b79de6",
    optimization: {
      enabled: true,
      runs: 200
    },
    constructorArguments: {
      usdcAddress: USDC_ADDRESS,
      eurcAddress: EURC_ADDRESS,
      abiEncoded: constructorArgs
    },
    sourceFiles: [
      "contracts/GiftCard.sol",
      ...dependencyFiles.map(f => `contracts/${f}`)
    ],
    verificationUrl: `https://testnet.arcscan.app/address/${CONTRACT_ADDRESS}/contract-verification`
  };

  const infoPath = join(__dirname, "verification-info.json");
  require("fs").writeFileSync(infoPath, JSON.stringify(verificationInfo, null, 2));
  console.log(`✅ Информация для верификации сохранена в: ${infoPath}\n`);

  console.log("=".repeat(80));
  console.log("💡 СОВЕТ: Если у вас установлен @nomicfoundation/hardhat-verify,");
  console.log("   вы можете использовать команду Hardhat для автоматической верификации.");
  console.log("=".repeat(80));
}

verifyContract()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Ошибка:", error);
    process.exit(1);
  });

