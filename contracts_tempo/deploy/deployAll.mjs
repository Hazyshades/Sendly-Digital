import { exec } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import * as dotenv from "dotenv";

dotenv.config();

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function deployContract(scriptName, contractName) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🚀 Деплой ${contractName}...`);
  console.log(`${"=".repeat(60)}\n`);
  
  try {
    const scriptPath = join(__dirname, scriptName);
    const { stdout, stderr } = await execAsync(`node "${scriptPath}"`, {
      cwd: join(__dirname, "..", ".."),
    });
    
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes("warning")) console.error(stderr);
    
    return true;
  } catch (error) {
    console.error(`❌ Ошибка при деплое ${contractName}:`, error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    return false;
  }
}

async function main() {
  console.log("📦 Начинаю деплой всех контрактов на Arc Testnet...\n");
  
  const steps = [
    { script: "deployGiftCard.mjs", name: "GiftCard" },
    { waitMs: 3000, message: "⏳ Ожидание 3 секунды перед деплоем TwitterCardVault..." },
    { script: "deployTwitterCardVault.mjs", name: "TwitterCardVault" },
    { waitMs: 3000, message: "⏳ Ожидание 3 секунды перед деплоем TwitchCardVault..." },
    { script: "deployTwitchCardVault.mjs", name: "TwitchCardVault" },
    { waitMs: 3000, message: "⏳ Ожидание 3 секунды перед деплоем TelegramCardVault..." },
    { script: "deployTelegramCardVault.mjs", name: "TelegramCardVault" },
    { waitMs: 3000, message: "⏳ Ожидание 3 секунды перед деплоем TikTokCardVault..." },
    { script: "deployTikTokCardVault.mjs", name: "TikTokCardVault" },
    { waitMs: 3000, message: "⏳ Ожидание 3 секунды перед деплоем InstagramCardVault..." },
    { script: "deployInstagramCardVault.mjs", name: "InstagramCardVault" },
    { waitMs: 3000, message: "⏳ Ожидание 3 секунды перед связыванием TwitterCardVault..." },
    { script: "linkContracts.mjs", name: "Связывание TwitterCardVault" },
    { waitMs: 3000, message: "⏳ Ожидание 3 секунды перед связыванием TwitchCardVault..." },
    { script: "linkTwitchVault.mjs", name: "Связывание TwitchCardVault" },
    { waitMs: 3000, message: "⏳ Ожидание 3 секунды перед связыванием TelegramCardVault..." },
    { script: "linkTelegramVault.mjs", name: "Связывание TelegramCardVault" },
    { waitMs: 3000, message: "⏳ Ожидание 3 секунды перед связыванием TikTokCardVault..." },
    { script: "linkTikTokVault.mjs", name: "Связывание TikTokCardVault" },
    { waitMs: 3000, message: "⏳ Ожидание 3 секунды перед связыванием InstagramCardVault..." },
    { script: "linkInstagramVault.mjs", name: "Связывание InstagramCardVault" }
  ];

  const results = [];

  for (const step of steps) {
    if (step.waitMs) {
      console.log(`\n${step.message}`);
      await new Promise(resolve => setTimeout(resolve, step.waitMs));
      continue;
    }

    const success = await deployContract(step.script, step.name);
    results.push({ name: step.name, success });

    if (!success) {
      console.error(`\n❌ Шаг "${step.name}" завершился ошибкой. Остановка пайплайна.`);
      process.exit(1);
    }
  }
  
  console.log(`\n${"=".repeat(60)}`);
  console.log("📊 Итоги деплоя:");
  console.log(`${"=".repeat(60)}`);
  
  results.forEach(({ name, success }) => {
    console.log(`${success ? "✅" : "❌"} ${name}: ${success ? "Успешно" : "Ошибка"}`);
  });
  
  const allSuccess = results.every(r => r.success);
  
  if (allSuccess) {
    console.log("\n✅ Все контракты успешно задеплоены и связаны!");
    console.log("⚠️  Не забудьте обновить адреса в .env файле!");
  } else {
    console.log("\n❌ Некоторые контракты не удалось задеплоить или связать.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Критическая ошибка:", error);
  process.exit(1);
});
