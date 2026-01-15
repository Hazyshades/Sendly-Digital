import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const usdcAddress = process.env.VITE_ARC_USDC_ADDRESS;
  const eurcAddress = process.env.VITE_ARC_EURC_ADDRESS;
  const rpcUrl = process.env.VITE_ARC_RPC_URL || "https://rpc.testnet.arc.network";
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  
  if (!usdcAddress) {
    throw new Error("VITE_ARC_USDC_ADDRESS не установлен в .env файле");
  }
  
  if (!eurcAddress) {
    throw new Error("VITE_ARC_EURC_ADDRESS не установлен в .env файле");
  }
  
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY не установлен в .env файле");
  }

  console.log("Деплой контракта GiftCard на Arc Testnet...");
  console.log("Адрес USDC:", usdcAddress);
  console.log("Адрес EURC:", eurcAddress);
  console.log("RPC URL:", rpcUrl);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("Адрес деплойера:", wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  console.log("Баланс кошелька:", ethers.formatUnits(balance, 6), "USDC");

  const artifactPath = join(__dirname, "..", "..", "artifacts", "contracts", "GiftCard.sol", "GiftCard.json");
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(usdcAddress, eurcAddress);
  
  console.log("Ожидание подтверждения деплоя...");
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  
  console.log("\n✅ Контракт успешно задеплоен!");
  console.log("Адрес контракта:", contractAddress);
  console.log("\n⚠️  ВАЖНО: Добавьте следующий адрес в ваш .env файл:");
  console.log(`VITE_ARC_CONTRACT_ADDRESS=${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });



