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
  const verifierAddress = process.env.VITE_ARC_ZKTLS_VERIFIER_ADDRESS;
  const rpcUrl = process.env.VITE_ARC_RPC_URL || "https://rpc.testnet.arc.network";
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  
  if (!usdcAddress || usdcAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("VITE_ARC_USDC_ADDRESS не установлен в .env файле");
  }
  
  if (!eurcAddress || eurcAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("VITE_ARC_EURC_ADDRESS не установлен в .env файле");
  }
  
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY не установлен в .env файле");
  }

  // Если верификатор не установлен, используем адрес деплойера как placeholder
  // Позже можно будет обновить через setVerifierContract()
  let finalVerifierAddress = verifierAddress;
  if (!finalVerifierAddress || finalVerifierAddress === "0x0000000000000000000000000000000000000000") {
    console.log("⚠️  ВНИМАНИЕ: VITE_ARC_ZKTLS_VERIFIER_ADDRESS не установлен.");
    console.log("   Используется адрес деплойера как placeholder.");
    console.log("   После деплоя verifier контракта обновите адрес через setVerifierContract()");
    
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    finalVerifierAddress = wallet.address;
  }

  console.log("Деплой контракта ZkSend на Arc Testnet...");
  console.log("Адрес USDC:", usdcAddress);
  console.log("Адрес EURC:", eurcAddress);
  console.log("Адрес Verifier:", finalVerifierAddress);
  console.log("RPC URL:", rpcUrl);

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log("Адрес деплойера:", wallet.address);
  
  const balance = await provider.getBalance(wallet.address);
  console.log("Баланс кошелька:", ethers.formatEther(balance), "ETH");

  const artifactPath = join(__dirname, "..", "..", "artifacts", "contracts", "ZkSend.sol", "ZkSend.json");
  const artifact = JSON.parse(readFileSync(artifactPath, "utf-8"));
  
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy(usdcAddress, eurcAddress, finalVerifierAddress);
  
  console.log("Ожидание подтверждения деплоя...");
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  
  console.log("\n✅ Контракт успешно задеплоен!");
  console.log("Адрес контракта:", contractAddress);
  console.log("\n⚠️  ВАЖНО: Добавьте следующий адрес в ваш .env файл:");
  console.log(`VITE_ARC_ZKSEND_CONTRACT_ADDRESS=${contractAddress}`);
  
  if (!verifierAddress || verifierAddress === "0x0000000000000000000000000000000000000000") {
    console.log("\n⚠️  НЕ ЗАБУДЬТЕ: После деплоя zkTLS Verifier контракта обновите адрес:");
    console.log(`   zkSend.setVerifierContract(verifierAddress)`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });







