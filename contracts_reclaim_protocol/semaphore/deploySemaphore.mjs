import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

dotenv.config({ path: path.join(repoRoot, ".env") });

const DEFAULT_VERIFIER_NAME = "SemaphoreVerifier";
const DEFAULT_SEMAPHORE_NAME = "Semaphore";

function requireEnv(value, name) {
  if (!value || typeof value !== "string") {
    throw new Error(`${name} is not configured in .env`);
  }
  return value;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function findArtifactPaths(rootDir, contractName) {
  const results = [];
  if (!fs.existsSync(rootDir)) {
    return results;
  }

  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name === `${contractName}.json`) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

function selectArtifactPath(paths) {
  if (paths.length === 0) {
    return null;
  }
  const score = (value) => {
    const lowered = value.toLowerCase();
    if (lowered.includes(`${path.sep}artifacts${path.sep}`)) return 0;
    if (lowered.includes(`${path.sep}dist${path.sep}`)) return 1;
    return 2;
  };
  return paths.sort((a, b) => score(a) - score(b))[0];
}

function loadArtifact(rootDir, contractName) {
  const paths = findArtifactPaths(rootDir, contractName);
  const artifactPath = selectArtifactPath(paths);
  if (!artifactPath) {
    throw new Error(
      `Artifact for ${contractName} not found under ${rootDir}. ` +
        `Run: npx hardhat compile --config contracts_zktls/semaphore/hardhat.config.cjs ` +
        `or set SEMAPHORE_ARTIFACT_ROOT.`
    );
  }

  const artifact = readJson(artifactPath);
  if (!artifact.abi || !artifact.bytecode) {
    throw new Error(`Invalid artifact ${artifactPath}: missing abi/bytecode`);
  }

  return { artifact, artifactPath };
}

function getConstructorInputs(abi) {
  const entry = abi.find((item) => item.type === "constructor");
  return entry?.inputs ?? [];
}

function parseJsonArray(value, label) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      throw new Error(`${label} must be a JSON array`);
    }
    return parsed;
  } catch (error) {
    throw new Error(`Failed to parse ${label}: ${error.message}`);
  }
}

function parseNumberEnv(value, fallback, label) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive number`);
  }
  return parsed;
}

function resolveConstructorArgs(inputs, fallbackArgs, explicitArgs, label) {
  if (explicitArgs) {
    if (explicitArgs.length !== inputs.length) {
      throw new Error(
        `${label} expects ${inputs.length} args, got ${explicitArgs.length}. ` +
          `Fix ${label}_CONSTRUCTOR_ARGS_JSON.`
      );
    }
    return explicitArgs;
  }

  if (fallbackArgs.length !== inputs.length) {
    throw new Error(
      `${label} expects ${inputs.length} args. ` +
        `Provide ${label}_CONSTRUCTOR_ARGS_JSON.`
    );
  }

  return fallbackArgs;
}

function resolveLibraryAddress(libraries, sourceName, contractName) {
  if (!libraries) return null;
  return (
    libraries[`${sourceName}:${contractName}`] ||
    libraries[contractName] ||
    libraries[sourceName] ||
    null
  );
}

function linkBytecode(bytecode, linkReferences, libraries) {
  if (!linkReferences || Object.keys(linkReferences).length === 0) {
    return bytecode;
  }

  // Replace Hardhat link placeholders using byte offsets from linkReferences.
  let linked = bytecode.startsWith("0x") ? bytecode.slice(2) : bytecode;
  for (const [sourceName, contracts] of Object.entries(linkReferences)) {
    for (const [contractName, references] of Object.entries(contracts)) {
      const address = resolveLibraryAddress(libraries, sourceName, contractName);
      if (!address) {
        throw new Error(
          `Missing library address for ${sourceName}:${contractName}. ` +
            `Set SEMAPHORE_POSEIDON_T3_ADDRESS or provide a matching library mapping.`
        );
      }

      const addressBytes = ethers.getBytes(address);
      for (const reference of references) {
        if (addressBytes.length !== reference.length) {
          throw new Error(
            `Library ${sourceName}:${contractName} expects ${reference.length} bytes, ` +
              `got ${addressBytes.length}.`
          );
        }

        const start = reference.start * 2;
        const length = reference.length * 2;
        const replacement = ethers.hexlify(addressBytes).slice(2);
        linked = linked.slice(0, start) + replacement + linked.slice(start + length);
      }
    }
  }

  return `0x${linked}`;
}

async function main() {
  const rpcUrl = requireEnv(process.env.VITE_ARC_RPC_URL, "VITE_ARC_RPC_URL");
  const privateKey = requireEnv(process.env.DEPLOYER_PRIVATE_KEY, "DEPLOYER_PRIVATE_KEY");
  const chainId = parseNumberEnv(process.env.VITE_ARC_CHAIN_ID, null, "VITE_ARC_CHAIN_ID");
  const networkName = process.env.VITE_ARC_NAME || "arc-testnet";
  const rpcTimeoutMs = parseNumberEnv(
    process.env.VITE_ARC_RPC_TIMEOUT_MS,
    20000,
    "VITE_ARC_RPC_TIMEOUT_MS"
  );

  const verifierName = process.env.SEMAPHORE_VERIFIER_CONTRACT_NAME || DEFAULT_VERIFIER_NAME;
  const semaphoreName = process.env.SEMAPHORE_CONTRACT_NAME || DEFAULT_SEMAPHORE_NAME;

  const artifactRoot =
    process.env.SEMAPHORE_ARTIFACT_ROOT || path.join(__dirname, "artifacts");

  const request = new ethers.FetchRequest(rpcUrl);
  request.timeout = rpcTimeoutMs;
  const network = chainId ? { chainId, name: networkName } : undefined;
  const provider = new ethers.JsonRpcProvider(
    request,
    network,
    chainId ? { staticNetwork: true } : undefined
  );
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log("=== Semaphore deploy ===");
  console.log("Deployer:", wallet.address);
  console.log("Artifact root:", artifactRoot);
  console.log("Verifier contract name:", verifierName);
  console.log("Semaphore contract name:", semaphoreName);

  const verifierArgsOverride = parseJsonArray(
    process.env.SEMAPHORE_VERIFIER_CONSTRUCTOR_ARGS_JSON,
    "SEMAPHORE_VERIFIER_CONSTRUCTOR_ARGS_JSON"
  );
  const semaphoreArgsOverride = parseJsonArray(
    process.env.SEMAPHORE_CONSTRUCTOR_ARGS_JSON,
    "SEMAPHORE_CONSTRUCTOR_ARGS_JSON"
  );

  let verifierAddress = process.env.SEMAPHORE_VERIFIER_ADDRESS || "";

  if (!verifierAddress) {
    const { artifact: verifierArtifact, artifactPath: verifierPath } = loadArtifact(
      artifactRoot,
      verifierName
    );
    const verifierInputs = getConstructorInputs(verifierArtifact.abi);
    const verifierArgs = resolveConstructorArgs(
      verifierInputs,
      [],
      verifierArgsOverride,
      "SEMAPHORE_VERIFIER"
    );

    console.log("Deploying verifier from:", verifierPath);
    const verifierFactory = new ethers.ContractFactory(
      verifierArtifact.abi,
      verifierArtifact.bytecode,
      wallet
    );
    const verifier = await verifierFactory.deploy(...verifierArgs);
    await verifier.waitForDeployment();
    verifierAddress = await verifier.getAddress();
    console.log("SemaphoreVerifier deployed:", verifierAddress);
  } else {
    console.log("Using existing verifier:", verifierAddress);
  }

  let poseidonT3Address = process.env.SEMAPHORE_POSEIDON_T3_ADDRESS || "";
  if (!poseidonT3Address) {
    const { artifact: poseidonArtifact, artifactPath: poseidonPath } = loadArtifact(
      artifactRoot,
      "PoseidonT3"
    );
    const poseidonInputs = getConstructorInputs(poseidonArtifact.abi);
    const poseidonArgs = resolveConstructorArgs(
      poseidonInputs,
      [],
      null,
      "POSEIDON_T3"
    );

    console.log("Deploying PoseidonT3 from:", poseidonPath);
    const poseidonFactory = new ethers.ContractFactory(
      poseidonArtifact.abi,
      poseidonArtifact.bytecode,
      wallet
    );
    const poseidon = await poseidonFactory.deploy(...poseidonArgs);
    await poseidon.waitForDeployment();
    poseidonT3Address = await poseidon.getAddress();
    console.log("PoseidonT3 deployed:", poseidonT3Address);
  } else {
    console.log("Using existing PoseidonT3:", poseidonT3Address);
  }

  const { artifact: semaphoreArtifact, artifactPath: semaphorePath } = loadArtifact(
    artifactRoot,
    semaphoreName
  );
  const linkedSemaphoreBytecode = linkBytecode(
    semaphoreArtifact.bytecode,
    semaphoreArtifact.linkReferences,
    {
      "poseidon-solidity/PoseidonT3.sol:PoseidonT3": poseidonT3Address,
      PoseidonT3: poseidonT3Address,
    }
  );
  const semaphoreInputs = getConstructorInputs(semaphoreArtifact.abi);
  const defaultSemaphoreArgs =
    semaphoreInputs.length === 1 && semaphoreInputs[0]?.type === "address"
      ? [verifierAddress]
      : [];
  const semaphoreArgs = resolveConstructorArgs(
    semaphoreInputs,
    defaultSemaphoreArgs,
    semaphoreArgsOverride,
    "SEMAPHORE"
  );

  console.log("Deploying semaphore from:", semaphorePath);
  const semaphoreFactory = new ethers.ContractFactory(
    semaphoreArtifact.abi,
    linkedSemaphoreBytecode,
    wallet
  );
  const semaphore = await semaphoreFactory.deploy(...semaphoreArgs);
  await semaphore.waitForDeployment();

  const semaphoreAddress = await semaphore.getAddress();
  console.log("Semaphore deployed:", semaphoreAddress);
  console.log("SemaphoreVerifier:", verifierAddress);
}

main().catch((error) => {
  console.error("deploySemaphore failed:", error);
  process.exitCode = 1;
});

