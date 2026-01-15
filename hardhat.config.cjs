require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { 
        enabled: true, 
        runs: 1  // Минимальное значение для уменьшения размера контракта
      },
      viaIR: true,  // Использовать новый IR оптимизатор для лучшей оптимизации размера
    },
  },
  paths: {
    sources: "contracts",
    tests: "test",
    cache: "cache",
    artifacts: "artifacts",
  },
  networks: {
    arcTestnet: {
      url: process.env.VITE_ARC_RPC_URL || "https://rpc.testnet.arc.network",
      chainId: 5042002,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    // Tempo Testnet
    tempoTestnet: {
      url: process.env.VITE_TEMPO_RPC_URL || "https://rpc.moderato.tempo.xyz",
      chainId: 42431,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
};

module.exports = config;
