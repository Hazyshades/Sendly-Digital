import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Генерирует Standard JSON Input для верификации контракта на ArcScan
 * Использование: node contracts/deploy/generateStandardJson.mjs
 */

const contractsDir = join(__dirname, "..");
const nodeModulesDir = join(__dirname, "..", "..", "node_modules");

// Функция для чтения файла с обработкой ошибок
function readFile(path) {
  try {
    return readFileSync(path, "utf-8");
  } catch (error) {
    console.warn(`⚠️  Не удалось прочитать файл: ${path}`);
    return null;
  }
}

// Функция для рекурсивного сбора всех зависимостей
function collectDependencies(filePath, collected = new Set(), sources = {}) {
  if (collected.has(filePath)) return sources;
  collected.add(filePath);

  const content = readFile(filePath);
  if (!content) return sources;

  // Определяем путь для источника
  let sourceName = filePath;
  if (filePath.includes("node_modules/@openzeppelin")) {
    sourceName = filePath.replace(nodeModulesDir + "\\", "").replace(/\\/g, "/");
  } else if (filePath.includes("contracts")) {
    sourceName = filePath.replace(contractsDir + "\\", "contracts/").replace(/\\/g, "/");
  }

  sources[sourceName] = { content };

  // Находим все импорты
  const importRegex = /import\s+["']([^"']+)["']/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    let resolvedPath = null;

    // Обработка импортов OpenZeppelin
    if (importPath.startsWith("@openzeppelin/")) {
      resolvedPath = join(nodeModulesDir, importPath);
    }
    // Обработка локальных импортов
    else if (importPath.startsWith("./") || importPath.startsWith("../")) {
      const currentDir = dirname(filePath);
      resolvedPath = join(currentDir, importPath);
    }

    if (resolvedPath && !collected.has(resolvedPath)) {
      collectDependencies(resolvedPath, collected, sources);
    }
  }

  return sources;
}

// Основная функция
function generateStandardJson() {
  console.log("🔧 Генерация Standard JSON Input для верификации...\n");

  const mainContractPath = join(contractsDir, "GiftCard.sol");
  const sources = collectDependencies(mainContractPath);

  console.log(`✅ Найдено ${Object.keys(sources).length} файлов с зависимостями:\n`);
  Object.keys(sources).forEach((name, index) => {
    console.log(`   ${index + 1}. ${name}`);
  });

  // Создаем Standard JSON Input
  const standardJson = {
    language: "Solidity",
    sources: {},
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: "default",
      outputSelection: {
        "*": {
          "*": [
            "abi",
            "evm.bytecode",
            "evm.deployedBytecode",
            "evm.methodIdentifiers"
          ],
          "": ["ast"]
        }
      }
    }
  };

  // Добавляем все источники
  Object.keys(sources).forEach(name => {
    standardJson.sources[name] = {
      content: sources[name].content
    };
  });

  // Сохраняем в файл
  const outputPath = join(__dirname, "standard-json-input.json");
  writeFileSync(outputPath, JSON.stringify(standardJson, null, 2));

  console.log(`\n✅ Standard JSON Input сохранен в: ${outputPath}`);
  console.log("\n📋 Инструкция:");
  console.log("1. Перейдите на страницу верификации");
  console.log("2. Выберите 'Solidity (Standard JSON Input)'");
  console.log("3. Загрузите файл standard-json-input.json");
  console.log("4. Введите Contract Name: GiftCard");
  console.log("5. Введите Constructor Arguments (см. getConstructorArgs.mjs)");
  console.log("6. Нажмите 'Verify and Publish'\n");

  return standardJson;
}

generateStandardJson();



