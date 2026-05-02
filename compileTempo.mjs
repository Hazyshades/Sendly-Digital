import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("Compiling contracts from contracts_tempo...\n");

// Path to config
const configPath = join(__dirname, "hardhat.config.cjs");
const configContent = readFileSync(configPath, "utf-8");

// Save original content
const originalConfig = configContent;

// Modify paths for contracts_tempo compilation
const modifiedConfig = configContent.replace(
  /paths:\s*\{[^}]*sources:\s*"[^"]*"[^}]*\}/s,
  `paths: {
    sources: "contracts_tempo",
    tests: "test",
    cache: "cache",
    artifacts: "contracts_tempo/artifacts",
  }`
);

try {
  // Write modified config
  writeFileSync(configPath, modifiedConfig, "utf-8");
  console.log("✓ Temporarily modified hardhat.config.cjs for contracts_tempo compilation\n");

  // Compile
  console.log("Running Hardhat compilation...\n");
  execSync("npx hardhat compile", { 
    stdio: "inherit", 
    cwd: __dirname,
    env: { ...process.env }
  });

  console.log("\n✅ Compilation completed successfully!");
} catch (error) {
  console.error("\n❌ Error during compilation:", error.message);
  process.exit(1);
} finally {
  // Restore original config
  writeFileSync(configPath, originalConfig, "utf-8");
  console.log("\n✓ Restored original hardhat.config.cjs");
}
