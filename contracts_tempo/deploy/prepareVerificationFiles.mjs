import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Скрипт для подготовки всех файлов для верификации контракта
 * Создает файл со списком всех необходимых файлов и их содержимым
 */

const contractsDir = join(__dirname, "..");
const nodeModulesDir = join(__dirname, "..", "..", "node_modules");
const openzeppelinDir = join(nodeModulesDir, "@openzeppelin", "contracts");

// Функция для чтения файла
function readFile(path) {
  try {
    if (!existsSync(path)) {
      console.warn(`⚠️  Файл не найден: ${path}`);
      return null;
    }
    return readFileSync(path, "utf-8");
  } catch (error) {
    console.warn(`⚠️  Ошибка чтения файла ${path}:`, error.message);
    return null;
  }
}

// Функция для рекурсивного сбора всех зависимостей OpenZeppelin
function collectOpenZeppelinDependencies(filePath, collected = new Set(), dependencies = []) {
  if (collected.has(filePath)) return dependencies;
  collected.add(filePath);

  const content = readFile(filePath);
  if (!content) return dependencies;

  // Находим все импорты OpenZeppelin
  const importRegex = /import\s+.*?["'](@openzeppelin\/[^"']+)["']/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const fullPath = join(nodeModulesDir, importPath);
    
    if (!collected.has(fullPath)) {
      const depContent = readFile(fullPath);
      if (depContent) {
        dependencies.push({
          name: importPath,
          path: fullPath,
          content: depContent
        });
        // Рекурсивно собираем зависимости этого файла
        collectOpenZeppelinDependencies(fullPath, collected, dependencies);
      }
    }
  }

  return dependencies;
}

// Основная функция
function prepareFiles() {
  console.log("📦 Подготовка файлов для верификации...\n");

  const files = [];

  // 1. Основной контракт
  const mainContractPath = join(contractsDir, "GiftCard.sol");
  const mainContractContent = readFile(mainContractPath);
  if (mainContractContent) {
    files.push({
      name: "contracts/GiftCard.sol",
      content: mainContractContent
    });
    console.log("✅ GiftCard.sol");
  }

  // 2. Локальные зависимости (Vault контракты)
  const vaultFiles = [
    "TwitterCardVault.sol",
    "TwitchCardVault.sol",
    "TelegramCardVault.sol",
    "TikTokCardVault.sol",
    "InstagramCardVault.sol"
  ];

  vaultFiles.forEach(fileName => {
    const filePath = join(contractsDir, fileName);
    const content = readFile(filePath);
    if (content) {
      files.push({
        name: `contracts/${fileName}`,
        content: content
      });
      console.log(`✅ ${fileName}`);
    }
  });

  // 3. Собираем все OpenZeppelin зависимости
  console.log("\n📚 Сбор зависимостей OpenZeppelin...");
  const oaDeps = collectOpenZeppelinDependencies(mainContractPath);
  
  // Также проверяем зависимости в vault файлах
  vaultFiles.forEach(fileName => {
    const filePath = join(contractsDir, fileName);
    collectOpenZeppelinDependencies(filePath, new Set(), oaDeps);
  });

  // Удаляем дубликаты
  const uniqueDeps = [];
  const seen = new Set();
  oaDeps.forEach(dep => {
    if (!seen.has(dep.name)) {
      seen.add(dep.name);
      uniqueDeps.push(dep);
      console.log(`✅ ${dep.name}`);
    }
  });

  // Добавляем OpenZeppelin зависимости к списку файлов
  uniqueDeps.forEach(dep => {
    files.push({
      name: dep.name,
      content: dep.content
    });
  });

  // 4. Создаем инструкцию
  const instruction = {
    method: "Solidity (Multi-part files)",
    contractAddress: "0x5743fd9c6372bE37B2CE8884EA9e8bF291132677",
    contractName: "GiftCard",
    compilerVersion: "v0.8.20+commit.a1b79de6",
    optimization: {
      enabled: true,
      runs: 200
    },
    evmVersion: "default",
    constructorArguments: "0x000000000000000000000000360000000000000000000000000000000000000000000000000000000000000089b50855aa3be2f677cd6303cec089b5f319d72a",
    files: files.map(f => ({
      name: f.name,
      contentLength: f.content.length,
      preview: f.content.substring(0, 100) + "..."
    }))
  };

  // Сохраняем инструкцию
  const instructionPath = join(__dirname, "verification-instruction.json");
  writeFileSync(instructionPath, JSON.stringify(instruction, null, 2));
  console.log(`\n✅ Инструкция сохранена в: ${instructionPath}`);

  // Создаем отдельные файлы для каждого источника (для удобства копирования)
  const filesDir = join(__dirname, "verification-files");
  if (!existsSync(filesDir)) {
    require("fs").mkdirSync(filesDir, { recursive: true });
  }

  files.forEach(file => {
    const safeName = file.name.replace(/[\/\\]/g, "_").replace(/@/g, "at_");
    const filePath = join(filesDir, safeName);
    writeFileSync(filePath, file.content);
  });

  console.log(`✅ Все файлы сохранены в: ${filesDir}`);
  console.log(`\n📋 Всего файлов: ${files.length}`);
  console.log("\n" + "=".repeat(80));
  console.log("ИНСТРУКЦИЯ ДЛЯ ВЕРИФИКАЦИИ:");
  console.log("=".repeat(80));
  console.log("\n1. Перейдите на страницу верификации ArcScan");
  console.log("2. Выберите метод: 'Solidity (Multi-part files)'");
  console.log("3. Заполните основные параметры:");
  console.log("   - Contract Address: 0x5743fd9c6372bE37B2CE8884EA9e8bF291132677");
  console.log("   - Contract Name: GiftCard");
  console.log("   - Compiler: v0.8.20+commit.a1b79de6");
  console.log("   - Optimization: Yes, Runs: 200");
  console.log("   - EVM Version: default");
  console.log("\n4. В секции 'Contract Libraries' добавьте каждый файл:");
  files.forEach((file, index) => {
    console.log(`   ${index + 1}. Name: ${file.name}`);
    console.log(`      Файл: verification-files/${file.name.replace(/[\/\\]/g, "_").replace(/@/g, "at_")}`);
  });
  console.log("\n5. Constructor Arguments:");
  console.log("   0x000000000000000000000000360000000000000000000000000000000000000000000000000000000000000089b50855aa3be2f677cd6303cec089b5f319d72a");
  console.log("\n6. Нажмите 'Verify and Publish'");
  console.log("=".repeat(80));
}

prepareFiles();



