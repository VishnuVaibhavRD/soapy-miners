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

const SoapyMarketplaceArtifact = require(
  "../artifacts/contracts/SoapyMarketplace.sol/SoapyMarketplace.json"
);

async function sleep(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

async function waitForReceipt(
  provider,
  hash,
  {
    timeoutMs = 180000,
    pollMs = 4000,
  } = {}
) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const receipt =
      await provider.getTransactionReceipt(
        hash
      );

    if (receipt) {
      return receipt;
    }

    await sleep(pollMs);
  }

  throw new Error(
    `Timed out waiting for receipt: ${hash}`
  );
}

async function deployWithMetadata(
  contractName,
  artifact,
  wallet,
  provider,
  constructorArgs
) {
  console.log(
    `Uploading ${contractName} metadata to Quai IPFS...`
  );

  const ipfsHash =
    await hre.deployMetadata.pushMetadataToIPFS(
      contractName
    );

  if (
    !ipfsHash ||
    ipfsHash.length !== 46
  ) {
    throw new Error(
      `Failed to obtain a valid IPFS hash for ${contractName}.`
    );
  }

  const factory =
    new quais.ContractFactory(
      artifact.abi,
      artifact.bytecode,
      wallet,
      ipfsHash
    );

  const contract =
    await factory.deploy(
      ...constructorArgs
    );

  const deploymentTransaction =
    contract.deploymentTransaction();

  if (!deploymentTransaction?.hash) {
    throw new Error(
      `${contractName} missing deployment transaction hash`
    );
  }

  console.log(
    "Transaction:",
    deploymentTransaction.hash
  );

  const receipt =
    await waitForReceipt(
      provider,
      deploymentTransaction.hash
    );

  if (Number(receipt.status) !== 1) {
    throw new Error(
      `${contractName} deployment failed`
    );
  }

  const address =
    receipt.contractAddress ||
    (await contract.getAddress());

  return {
    contract: new quais.Contract(
      address,
      artifact.abi,
      wallet
    ),
    address,
    deploymentTransaction,
    ipfsHash,
  };
}

async function main() {
  const NFT_ADDRESS =
    process.env.SOAPY_MINERS_NFT_ADDRESS;

  if (!NFT_ADDRESS) {
    throw new Error(
      "Missing SOAPY_MINERS_NFT_ADDRESS"
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
    "Deploying with:",
    wallet.address
  );

  console.log(
    "Network:",
    networkName
  );

  console.log(
    "Existing NFT:",
    NFT_ADDRESS
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


  /* =====================================================
                      GAME CONTRACT
  ===================================================== */

  console.log(
    "\nDeploying SoapyMinerGame..."
  );

  const gameDeploy =
    await deployWithMetadata(
      "SoapyMinerGame",
      SoapyMinerGameArtifact,
      wallet,
      provider,
      [NFT_ADDRESS]
    );

  const gameAddress =
    gameDeploy.address;

  console.log(
    "SoapyMinerGame:",
    gameAddress
  );


  /* =====================================================
                  MARKETPLACE CONTRACT
  ===================================================== */

  console.log(
    "\nDeploying SoapyMarketplace..."
  );

  const marketplaceDeploy =
    await deployWithMetadata(
      "SoapyMarketplace",
      SoapyMarketplaceArtifact,
      wallet,
      provider,
      [gameAddress]
    );

  const marketplaceAddress =
    marketplaceDeploy.address;

  console.log(
    "SoapyMarketplace:",
    marketplaceAddress
  );


  /* =====================================================
                  AUTHORIZE MARKETPLACE
  ===================================================== */

  console.log(
    "\nAuthorizing Marketplace..."
  );

  const game =
    new quais.Contract(
      gameAddress,
      SoapyMinerGameArtifact.abi,
      wallet
    );

  const tx =
    await game.setMarketplace(
      marketplaceAddress
    );

  console.log(
    "Authorization tx:",
    tx.hash
  );

  const authReceipt =
    await waitForReceipt(
      provider,
      tx.hash
    );

  if (Number(authReceipt.status) !== 1) {
    throw new Error(
      "setMarketplace transaction failed"
    );
  }

  console.log(
    "Marketplace authorized."
  );


  /* =====================================================
                      VERIFY LINKAGE
  ===================================================== */

  const marketplace =
    new quais.Contract(
      marketplaceAddress,
      SoapyMarketplaceArtifact.abi,
      provider
    );

  const linkedMarketplace =
    await game.marketplace();

  const linkedGame =
    await marketplace.gameContract();

  const marketplaceActive =
    await marketplace.marketplaceActive();

  const marketplaceFeeBps =
    await marketplace.marketplaceFeeBps();

  const listingCount =
    await marketplace.listingCount();

  console.log(
    "\n--- VERIFY ---"
  );

  console.log(
    "Game marketplace:",
    linkedMarketplace
  );

  console.log(
    "Marketplace game:",
    linkedGame
  );

  console.log(
    "marketplaceActive:",
    marketplaceActive
  );

  console.log(
    "marketplaceFeeBps:",
    marketplaceFeeBps.toString()
  );

  console.log(
    "listingCount:",
    listingCount.toString()
  );


  if (
    linkedMarketplace.toLowerCase() !==
    marketplaceAddress.toLowerCase()
  ) {
    throw new Error(
      "Game marketplace linkage failed"
    );
  }

  if (
    linkedGame.toLowerCase() !==
    gameAddress.toLowerCase()
  ) {
    throw new Error(
      "Marketplace game linkage failed"
    );
  }

  if (marketplaceActive !== true) {
    throw new Error(
      "Marketplace is not active"
    );
  }

  if (marketplaceFeeBps !== 500n) {
    throw new Error(
      "Unexpected marketplace fee"
    );
  }


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

  const deployedAt =
    new Date().toISOString();

  const deploymentData = {
    network: networkName,
    chainId: networkConfig.chainId,
    linkedNft: NFT_ADDRESS,
    game: {
      contract: "SoapyMinerGame",
      address: gameAddress,
      deploymentTransaction:
        gameDeploy.deploymentTransaction
          ?.hash || null,
      metadataIpfsHash:
        gameDeploy.ipfsHash,
    },
    marketplace: {
      contract: "SoapyMarketplace",
      address: marketplaceAddress,
      deploymentTransaction:
        marketplaceDeploy
          .deploymentTransaction
          ?.hash || null,
      metadataIpfsHash:
        marketplaceDeploy.ipfsHash,
    },
    deployedAt,
  };

  const deploymentFile =
    path.join(
      deploymentDirectory,
      `${networkName}-game-marketplace.json`
    );

  fs.writeFileSync(
    deploymentFile,
    JSON.stringify(
      deploymentData,
      null,
      2
    )
  );

  // Keep orchard.json pointing at the live game address.
  fs.writeFileSync(
    path.join(
      deploymentDirectory,
      `${networkName}.json`
    ),
    JSON.stringify(
      {
        network: networkName,
        chainId: networkConfig.chainId,
        contract: "SoapyMinerGame",
        address: gameAddress,
        marketplace: marketplaceAddress,
        linkedNft: NFT_ADDRESS,
        deploymentTransaction:
          gameDeploy.deploymentTransaction
            ?.hash || null,
        metadataIpfsHash:
          gameDeploy.ipfsHash,
        deployedAt,
      },
      null,
      2
    )
  );

  console.log(
    "\n=============================="
  );

  console.log(
    "DEPLOYMENT COMPLETE"
  );

  console.log(
    "NFT:",
    NFT_ADDRESS
  );

  console.log(
    "GAME:",
    gameAddress
  );

  console.log(
    "MARKETPLACE:",
    marketplaceAddress
  );

  console.log(
    "Saved:",
    deploymentFile
  );

  console.log(
    "=============================="
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
