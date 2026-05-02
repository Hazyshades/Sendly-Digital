import { ethers } from "ethers";

/**
 * Скрипт для получения ABI-encoded аргументов конструктора
 * Запустите: node contracts/deploy/getConstructorArgs.mjs
 */

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";
const EURC_ADDRESS = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";

const abiCoder = new ethers.AbiCoder();
const constructorArgs = abiCoder.encode(
  ["address", "address"],
  [USDC_ADDRESS, EURC_ADDRESS]
);

console.log("=".repeat(80));
console.log("Constructor Arguments (ABI-encoded):");
console.log("=".repeat(80));
console.log(constructorArgs);
console.log("\nПараметры конструктора:");
console.log(`- USDC Address: ${USDC_ADDRESS}`);
console.log(`- EURC Address: ${EURC_ADDRESS}`);
console.log("=".repeat(80));



