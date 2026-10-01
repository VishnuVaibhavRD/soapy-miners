/**
 * @type import('hardhat/config').HardhatUserConfig
 */

require("@nomicfoundation/hardhat-toolbox");
require("@quai/hardhat-deploy-metadata");

const dotenv = require("dotenv");
const path = require("path");

dotenv.config({
  path: path.join(__dirname, ".env"),
});

dotenv.config({
  path: path.join(
    __dirname,
    "../../soapy-miners-nft/blockchain/.env"
  ),
});

module.exports = {
  defaultNetwork: "hardhat",

  networks: {
    cyprus1: {
      url:
        process.env.RPC_URL ||
        "https://rpc.quai.network",
      accounts: process.env.CYPRUS1_PK
        ? [process.env.CYPRUS1_PK]
        : [],
      chainId: Number(
        process.env.CHAIN_ID || 9000
      ),
    },
    orchard: {
      url:
        process.env.ORCHARD_RPC_URL ||
        "https://orchard.rpc.quai.network",
      accounts: process.env.CYPRUS1_PK
        ? [process.env.CYPRUS1_PK]
        : [],
      chainId: Number(
        process.env.ORCHARD_CHAIN_ID || 15000
      ),
    },
  },

  solidity: {
    version: "0.8.20",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 1000,
      },
      metadata: {
        bytecodeHash: "ipfs",
        useLiteralContent: true,
      },
      evmVersion: "london",
    },
  },

  paths: {
    sources: "./contracts",
    cache: "./cache",
    artifacts: "./artifacts",
    tests: "./test",
  },

  mocha: {
    timeout: 20000,
  },
};
