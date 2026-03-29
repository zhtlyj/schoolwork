import path from "node:path";
import dotenv from "dotenv";
import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

// 与 hardhat.config.ts 同目录的 .env（npm 在别的目录执行时也能读到）
dotenv.config({ path: path.join(__dirname, ".env") });

/** Sepolia 部署用私钥，仅允许来自环境变量，勿写入仓库。 */
function sepoliaAccounts(): string[] {
  const k = process.env.SEPOLIA_PRIVATE_KEY?.trim();
  if (!k) return [];
  return [k.startsWith("0x") ? k : `0x${k}`];
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com",
      chainId: 11155111,
      accounts: sepoliaAccounts(),
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40_000,
    parallel: false,
  },
};

export default config;
