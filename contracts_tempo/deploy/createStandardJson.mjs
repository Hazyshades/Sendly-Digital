import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Создает Standard JSON Input файл для верификации контракта
 * Использование: node contracts/deploy/createStandardJson.mjs
 */

const contractsDir = join(__dirname, "..");
const nodeModulesDir = join(__dirname, "..", "..", "node_modules");

// Функция для чтения файла
function readFile(path) {
  try {
    if (!existsSync(path)) {
      return null;
    }
    return readFileSync(path, "utf-8");
  } catch (error) {
    return null;
  }
}

// Функция для нормализации пути
function normalizePath(path) {
  return path.replace(/\\/g, "/");
}

// Функция для сбора всех зависимостей
function collectAllDependencies(mainFilePath, collected = new Set(), sources = {}) {
  if (collected.has(mainFilePath)) return sources;
  collected.add(mainFilePath);

  const content = readFile(mainFilePath);
  if (!content) return sources;

  // Определяем имя источника
  let sourceName;
  if (mainFilePath.includes("node_modules/@openzeppelin")) {
    sourceName = normalizePath(mainFilePath.replace(nodeModulesDir + "\\", "").replace(/\\/g, "/"));
  } else if (mainFilePath.includes("contracts")) {
    sourceName = normalizePath(mainFilePath.replace(contractsDir + "\\", "contracts/").replace(/\\/g, "/"));
  } else {
    sourceName = normalizePath(mainFilePath);
  }

  sources[sourceName] = { content };

  // Находим все импорты
  const importRegex = /import\s+.*?["']([^"']+)["']/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    let resolvedPath = null;

    // Обработка OpenZeppelin импортов
    if (importPath.startsWith("@openzeppelin/")) {
      resolvedPath = join(nodeModulesDir, importPath);
    }
    // Обработка локальных импортов
    else if (importPath.startsWith("./") || importPath.startsWith("../")) {
      const currentDir = dirname(mainFilePath);
      resolvedPath = join(currentDir, importPath);
    }

    if (resolvedPath && !collected.has(resolvedPath)) {
      collectAllDependencies(resolvedPath, collected, sources);
    }
  }

  return sources;
}

// Основная функция
function createStandardJson() {
  console.log("🔧 Создание Standard JSON Input...\n");

  const mainContractPath = join(contractsDir, "GiftCard.sol");
  const sources = collectAllDependencies(mainContractPath);

  console.log(`✅ Найдено ${Object.keys(sources).length} файлов:\n`);
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

  // Сохраняем файл
  const outputPath = join(__dirname, "standard-json-input.json");
  writeFileSync(outputPath, JSON.stringify(standardJson, null, 2));

  console.log(`\n✅ Standard JSON Input сохранен в: ${outputPath}`);
  console.log(`   Размер файла: ${(JSON.stringify(standardJson).length / 1024).toFixed(2)} KB\n`);

  console.log("=".repeat(80));
  console.log("ИНСТРУКЦИЯ:");
  console.log("=".repeat(80));
  console.log("\n1. На странице верификации ArcScan выберите:");
  console.log("   'Solidity (Standard JSON Input)'\n");
  console.log("2. Заполните основные параметры:");
  console.log("   - Contract Address: 0x5743fd9c6372bE37B2CE8884EA9e8bF291132677");
  console.log("   - Contract Name: GiftCard");
  console.log("   - Compiler Version: v0.8.20+commit.a1b79de6");
  console.log("   - Optimization: Yes, Runs: 200");
  console.log("   - EVM Version: default\n");
  console.log("3. Загрузите файл:");
  console.log(`   ${outputPath}\n`);
  console.log("4. Constructor Arguments:");
  console.log("   0x000000000000000000000000360000000000000000000000000000000000000000000000000000000000000089b50855aa3be2f677cd6303cec089b5f319d72a\n");
  console.log("5. Нажмите 'Verify and Publish'");
  console.log("=".repeat(80));

  return standardJson;
}

createStandardJson();



