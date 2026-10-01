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
  const GAME_ADDRESS =
    process.env.SOAPY_GAME_CONTRACT_ADDRESS;

  if (!GAME_ADDRESS) {
    throw new Error(
      "Missing SOAPY_GAME_CONTRACT_ADDRESS"
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
    "Using Game contract:",
    GAME_ADDRESS
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
    "\nDeploying SoapyRewardMine..."
  );

  const rewardMineDeploy =
    await deployWithMetadata(
      "SoapyRewardMine",
      SoapyRewardMineArtifact,
      wallet,
      provider,
      [GAME_ADDRESS]
    );

  const rewardMineAddress =
    rewardMineDeploy.address;

  console.log(
    "SoapyRewardMine:",
    rewardMineAddress
  );


  const rewardMine =
    new quais.Contract(
      rewardMineAddress,
      SoapyRewardMineArtifact.abi,
      provider
    );

  const linkedGame =
    await rewardMine.gameContract();

  const roundCount =
    await rewardMine.roundCount();

  console.log(
    "RewardMine linked Game:",
    linkedGame
  );

  console.log(
    "roundCount:",
    roundCount.toString()
  );

  if (
    linkedGame.toLowerCase() !==
    GAME_ADDRESS.toLowerCase()
  ) {
    throw new Error(
      "RewardMine linkage verification failed"
    );
  }

  if (roundCount !== 0n) {
    throw new Error(
      "Unexpected non-zero roundCount on fresh deploy"
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

  const deploymentFile =
    path.join(
      deploymentDirectory,
      `${networkName}-reward-mine.json`
    );

  fs.writeFileSync(
    deploymentFile,
    JSON.stringify(
      {
        network: networkName,
        chainId: networkConfig.chainId,
        linkedGame: GAME_ADDRESS,
        rewardMine: {
          contract: "SoapyRewardMine",
          address: rewardMineAddress,
          deploymentTransaction:
            rewardMineDeploy
              .deploymentTransaction
              ?.hash || null,
          metadataIpfsHash:
            rewardMineDeploy.ipfsHash,
        },
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
    "REWARD MINE DEPLOYMENT COMPLETE"
  );

  console.log(
    "GAME:",
    GAME_ADDRESS
  );

  console.log(
    "REWARD MINE:",
    rewardMineAddress
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
