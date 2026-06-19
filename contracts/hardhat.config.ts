import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

loadEnv({ path: resolve(__dirname, "../.env") });

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  paths: {
    sources: "./src",
    tests: "./test",
  },
  networks: {
    galileo: {
      url: process.env.OG_RPC_URL ?? "https://evmrpc-testnet.0g.ai",
      chainId: 16602,
      accounts: process.env.SERVER_WALLET_PRIVATE_KEY
        ? [process.env.SERVER_WALLET_PRIVATE_KEY]
        : [],
    },
  },
};

export default config;
