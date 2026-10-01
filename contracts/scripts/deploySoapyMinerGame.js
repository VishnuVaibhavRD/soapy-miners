require("dotenv").config();

require("dotenv").config({
  path: require("path").join(
    __dirname,
    "../../../soapy-miners-nft/blockchain/.env"
  ),
});

const fs = require("fs");
const path = require("path");

const hre = require("hardhat");
const { quais } = require("quais");

const SoapyMinerGameArtifact = require(
  "../artifacts/contracts/SoapyMinerGame.sol/SoapyMinerGame.json"
);

async function main() {
  const SOAPY_MINERS_ADDRESS =
    process.env.SOAPY_MINERS_NFT_ADDRESS;

  if (!SOAPY_MINERS_ADDRESS) {
    throw new Error(
      "Missing SOAPY_MINERS_NFT_ADDRESS in .env"
    );
  }

  const privateKey =
    process.env.CYPRUS1_PK ||
    process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error(
      "Missing CYPRUS1_PK or PRIVATE_KEY in .env"
    );
  }

  const networkName =
    hre.network.name;

  const networkConfig =
    hre.network.config;

  const rpcUrl =
    networkConfig.url ||
    process.env.ORCHARD_RPC_URL ||
    "https://orchard.rpc.quai.network";

  console.log(
    "Using Soapy Miners NFT:",
    SOAPY_MINERS_ADDRESS
  );

  console.log(
    "Network:",
    networkName
  );

  const provider =
    new quais.JsonRpcProvider(
      rpcUrl,
      undefined,
      {
        usePathing: true,
      }
    );

  const wallet =
    new quais.Wallet(
      privateKey,
      provider
    );

  console.log(
    "Deployer:",
    wallet.address
  );

  const balance =
    await provider.getBalance(
      wallet.address
    );

  console.log(
    `Balance: ${quais.formatQuai(balance)} QUAI`
  );

  if (balance === 0n) {
    throw new Error(
      "Deployer wallet has 0 QUAI. Fund it before deploying."
    );
  }

  console.log(
    "Deploying SoapyMinerGame..."
  );

  console.log(
    "Uploading contract metadata to Quai IPFS..."
  );

  const ipfsHash =
    await hre.deployMetadata.pushMetadataToIPFS(
      "SoapyMinerGame"
    );

  if (
    !ipfsHash ||
    ipfsHash.length !== 46
  ) {
    throw new Error(
      "Failed to obtain a valid IPFS hash for deployment metadata."
    );
  }

  const factory =
    new quais.ContractFactory(
      SoapyMinerGameArtifact.abi,
      SoapyMinerGameArtifact.bytecode,
      wallet,
      ipfsHash
    );

  const game =
    await factory.deploy(
      SOAPY_MINERS_ADDRESS
    );

  const deploymentTransaction =
    game.deploymentTransaction();

  if (deploymentTransaction) {
    console.log(
      "Transaction:",
      deploymentTransaction.hash
    );
  }

  await game.waitForDeployment();

  const gameAddress =
    await game.getAddress();

  console.log(
    "SoapyMinerGame deployed to:",
    gameAddress
  );

  console.log(
    "Linked NFT contract:",
    SOAPY_MINERS_ADDRESS
  );

  console.log(
    "Initial mines: Basic, Deep, Ancient"
  );

  const deploymentDirectory =
    path.join(
      process.cwd(),
      "deployment"
    );

  fs.mkdirSync(
    deploymentDirectory,
    {
      recursive: true,
    }
  );

  const deploymentData = {
    network: networkName,
    chainId: networkConfig.chainId,
    contract: "SoapyMinerGame",
    address: gameAddress,
    linkedNft: SOAPY_MINERS_ADDRESS,
    deploymentTransaction:
      deploymentTransaction?.hash ||
      null,
    metadataIpfsHash: ipfsHash,
    deployedAt:
      new Date().toISOString(),
  };

  const deploymentFile =
    path.join(
      deploymentDirectory,
      `${networkName}.json`
    );

  fs.writeFileSync(
    deploymentFile,
    JSON.stringify(
      deploymentData,
      null,
      2
    )
  );

  console.log(
    "Deployment saved to:",
    deploymentFile
  );
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
