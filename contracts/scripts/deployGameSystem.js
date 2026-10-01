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

const SoapyRewardMineArtifact = require(
  "../artifacts/contracts/SoapyRewardMine.sol/SoapyRewardMine.json"
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

/*
  Write indexer deployment blocks into
  contracts/.env so the indexer can start
  its checkpoint from the correct block.

  Replaces existing *_DEPLOYMENT_BLOCK keys
  or appends them if missing.
*/

function writeDeploymentBlocksToEnv(
  envPath,
  blocks
) {
  const fs = require("fs");

  let content = "";

  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(
      envPath,
      "utf8"
    );
  }

  const lines = content
    .split("\n")
    .filter(
      (line) =>
        !/^[A-Za-z_]*DEPLOYMENT_BLOCK=/.test(
          line
        )
    );

  const append = [
    `GAME_DEPLOYMENT_BLOCK=${blocks.game}`,
    `MARKETPLACE_DEPLOYMENT_BLOCK=${blocks.marketplace}`,
    `REWARD_MINE_DEPLOYMENT_BLOCK=${blocks.rewardMine}`,
  ];

  const next =
    lines
      .filter(
        (l) => l.trim() !== ""
      )
      .concat(append)
      .join("\n") + "\n";

  fs.writeFileSync(
    envPath,
    next,
    "utf8"
  );

  console.log(
    `Wrote deployment blocks to ${envPath}`
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
    deploymentBlock:
      Number(
        receipt.blockNumber
      ),
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
    "\nDeploying with:",
    wallet.address
  );

  console.log(
    "Network:",
    networkName
  );

  console.log(
    "Existing Soapy NFT:",
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
                      1. GAME
  ===================================================== */

  console.log(
    "\n1. Deploying SoapyMinerGame..."
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
    "Game:",
    gameAddress
  );


  /* =====================================================
                    2. MARKETPLACE
  ===================================================== */

  console.log(
    "\n2. Deploying SoapyMarketplace..."
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
    "Marketplace:",
    marketplaceAddress
  );


  /* =====================================================
                    3. REWARD MINE
  ===================================================== */

  console.log(
    "\n3. Deploying SoapyRewardMine..."
  );

  const rewardMineDeploy =
    await deployWithMetadata(
      "SoapyRewardMine",
      SoapyRewardMineArtifact,
      wallet,
      provider,
      [gameAddress]
    );

  const rewardMineAddress =
    rewardMineDeploy.address;

  console.log(
    "Reward Mine:",
    rewardMineAddress
  );


  /*
    Capture deployment block heights for
    the indexer checkpoint start.
  */

  const deploymentBlocks = {
    game: gameDeploy.deploymentBlock,
    marketplace:
      marketplaceDeploy.deploymentBlock,
    rewardMine:
      rewardMineDeploy.deploymentBlock,
  };

  console.log(
    "Deployment blocks:",
    deploymentBlocks
  );



  const game =
    new quais.Contract(
      gameAddress,
      SoapyMinerGameArtifact.abi,
      wallet
    );

  const marketplace =
    new quais.Contract(
      marketplaceAddress,
      SoapyMarketplaceArtifact.abi,
      provider
    );

  const rewardMine =
    new quais.Contract(
      rewardMineAddress,
      SoapyRewardMineArtifact.abi,
      provider
    );


  /* =====================================================
                4. AUTHORIZE MARKETPLACE
  ===================================================== */

  console.log(
    "\n4. Linking Marketplace..."
  );

  const marketTx =
    await game.setMarketplace(
      marketplaceAddress
    );

  console.log(
    "setMarketplace tx:",
    marketTx.hash
  );

  const marketReceipt =
    await waitForReceipt(
      provider,
      marketTx.hash
    );

  if (Number(marketReceipt.status) !== 1) {
    throw new Error(
      "setMarketplace failed"
    );
  }

  console.log(
    "Marketplace authorized."
  );


  /* =====================================================
                5. AUTHORIZE REWARD MINE
  ===================================================== */

  console.log(
    "\n5. Linking Reward Mine..."
  );

  const rewardTx =
    await game.setRewardMine(
      rewardMineAddress
    );

  console.log(
    "setRewardMine tx:",
    rewardTx.hash
  );

  const rewardReceipt =
    await waitForReceipt(
      provider,
      rewardTx.hash
    );

  if (Number(rewardReceipt.status) !== 1) {
    throw new Error(
      "setRewardMine failed"
    );
  }

  console.log(
    "Reward Mine authorized."
  );


  /* =====================================================
                      6. VERIFY
  ===================================================== */

  console.log(
    "\n6. Verifying links..."
  );

  const linkedMarketplace =
    await game.marketplace();

  const linkedRewardMine =
    await game.rewardMine();

  const marketGame =
    await marketplace.gameContract();

  const rewardGame =
    await rewardMine.gameContract();

  const damageSigner =
    await rewardMine.damageSigner();

  const rewardOwner =
    await rewardMine.owner();

  console.log(
    "Game marketplace:",
    linkedMarketplace
  );

  console.log(
    "Game rewardMine:",
    linkedRewardMine
  );

  console.log(
    "Marketplace game:",
    marketGame
  );

  console.log(
    "RewardMine game:",
    rewardGame
  );

  console.log(
    "Damage signer:",
    damageSigner
  );

  console.log(
    "RewardMine owner:",
    rewardOwner
  );

  if (
    linkedMarketplace.toLowerCase() !==
    marketplaceAddress.toLowerCase()
  ) {
    throw new Error(
      "Game → Marketplace link failed"
    );
  }

  if (
    linkedRewardMine.toLowerCase() !==
    rewardMineAddress.toLowerCase()
  ) {
    throw new Error(
      "Game → RewardMine link failed"
    );
  }

  if (
    marketGame.toLowerCase() !==
    gameAddress.toLowerCase()
  ) {
    throw new Error(
      "Marketplace → Game link failed"
    );
  }

  if (
    rewardGame.toLowerCase() !==
    gameAddress.toLowerCase()
  ) {
    throw new Error(
      "RewardMine → Game link failed"
    );
  }

  if (
    damageSigner.toLowerCase() !==
    wallet.address.toLowerCase()
  ) {
    throw new Error(
      "Unexpected damageSigner"
    );
  }


  /* =====================================================
                    SAVE DEPLOYMENT
  ===================================================== */

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
    rewardMine: {
      contract: "SoapyRewardMine",
      address: rewardMineAddress,
      deploymentTransaction:
        rewardMineDeploy
          .deploymentTransaction
          ?.hash || null,
      metadataIpfsHash:
        rewardMineDeploy.ipfsHash,
      damageSigner,
      owner: rewardOwner,
    },
    deployedAt,
  };

  const deploymentFile =
    path.join(
      deploymentDirectory,
      `${networkName}-game-system.json`
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
        rewardMine: rewardMineAddress,
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
    "\n========================================"
  );

  console.log(
    "SOAPY GAME SYSTEM DEPLOYED"
  );

  console.log(
    "========================================"
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
    "REWARD MINE:",
    rewardMineAddress
  );

  console.log(
    "Saved:",
    deploymentFile
  );


  /*
    Persist deployment blocks so the
    indexer starts from the correct
    checkpoint on this network.
  */

  writeDeploymentBlocksToEnv(
    path.join(
      process.cwd(),
      ".env"
    ),
    deploymentBlocks
  );


  console.log(
    "========================================\n"
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
