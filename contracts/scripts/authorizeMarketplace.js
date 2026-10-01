/**
 * Authorize an already-deployed marketplace on the game contract.
 *
 * usage:
 *   node scripts/authorizeMarketplace.js [gameAddress] [marketplaceAddress]
 *
 * Defaults to addresses in deployment/orchard-game-marketplace.json
 * or the known orchard deploy from this session.
 */
require("dotenv").config();

require("dotenv").config({
  path: require("path").join(
    __dirname,
    "../../../soapy-miners-nft/blockchain/.env"
  ),
});

const fs = require("fs");
const path = require("path");
const { quais } = require("quais");

const gameAbi = require(
  "../artifacts/contracts/SoapyMinerGame.sol/SoapyMinerGame.json"
).abi;

const marketAbi = require(
  "../artifacts/contracts/SoapyMarketplace.sol/SoapyMarketplace.json"
).abi;

const DEFAULT_GAME =
  "0x0030C549f25D1C2f2760e96C6Eb65670F3a8F20D";

const DEFAULT_MARKET =
  "0x007A439b416Fa278460b7C64b244fcc13d8be083";

const DEFAULT_NFT =
  "0x0076B6072257590A6EC6833aaE5fA3F6Fd6b46FE";

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

function loadDefaults() {
  const file = path.join(
    __dirname,
    "../deployment/orchard-game-marketplace.json"
  );

  if (!fs.existsSync(file)) {
    return {
      game: DEFAULT_GAME,
      market: DEFAULT_MARKET,
      nft: DEFAULT_NFT,
    };
  }

  const data = JSON.parse(
    fs.readFileSync(file, "utf8")
  );

  return {
    game:
      data.game?.address || DEFAULT_GAME,
    market:
      data.marketplace?.address ||
      DEFAULT_MARKET,
    nft: data.linkedNft || DEFAULT_NFT,
  };
}

async function main() {
  const defaults = loadDefaults();

  const gameAddress =
    process.argv[2] || defaults.game;

  const marketplaceAddress =
    process.argv[3] || defaults.market;

  const nftAddress = defaults.nft;

  const privateKey =
    process.env.CYPRUS1_PK ||
    process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error(
      "Missing CYPRUS1_PK or PRIVATE_KEY"
    );
  }

  const rpcUrl =
    process.env.ORCHARD_RPC_URL ||
    "https://orchard.rpc.quai.network";

  const provider =
    new quais.JsonRpcProvider(
      rpcUrl,
      undefined,
      { usePathing: true }
    );

  const wallet =
    new quais.Wallet(
      privateKey,
      provider
    );

  const game = new quais.Contract(
    gameAddress,
    gameAbi,
    wallet
  );

  const market = new quais.Contract(
    marketplaceAddress,
    marketAbi,
    provider
  );

  console.log("Game:", gameAddress);
  console.log(
    "Marketplace:",
    marketplaceAddress
  );
  console.log(
    "Deployer:",
    wallet.address
  );

  const linkedGame =
    await market.gameContract();

  if (
    linkedGame.toLowerCase() !==
    gameAddress.toLowerCase()
  ) {
    throw new Error(
      `Marketplace points at ${linkedGame}, expected ${gameAddress}`
    );
  }

  const current =
    await game.marketplace();

  console.log(
    "Current game.marketplace():",
    current
  );

  if (
    current.toLowerCase() !==
    marketplaceAddress.toLowerCase()
  ) {
    console.log(
      "Sending setMarketplace..."
    );

    const tx =
      await game.setMarketplace(
        marketplaceAddress
      );

    console.log("Tx:", tx.hash);

    const receipt =
      await waitForReceipt(
        provider,
        tx.hash
      );

    if (Number(receipt.status) !== 1) {
      throw new Error(
        "setMarketplace transaction failed"
      );
    }

    console.log(
      "Marketplace authorized."
    );
  } else {
    console.log(
      "Already authorized."
    );
  }

  const linkedMarketplace =
    await game.marketplace();

  const active =
    await market.marketplaceActive();

  const fee =
    await market.marketplaceFeeBps();

  const listingCount =
    await market.listingCount();

  console.log("\n--- VERIFY ---");
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
    active
  );
  console.log(
    "marketplaceFeeBps:",
    fee.toString()
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

  if (active !== true) {
    throw new Error(
      "Marketplace is not active"
    );
  }

  if (fee !== 500n) {
    throw new Error(
      "Unexpected marketplace fee"
    );
  }

  const deploymentDirectory =
    path.join(
      process.cwd(),
      "deployment"
    );

  fs.mkdirSync(deploymentDirectory, {
    recursive: true,
  });

  const deployedAt =
    new Date().toISOString();

  const deploymentData = {
    network: "orchard",
    chainId: 15000,
    linkedNft: nftAddress,
    game: {
      contract: "SoapyMinerGame",
      address: gameAddress,
      deploymentTransaction:
        "0x0051006360f999317d8a8404bd0bf489f68ad5a59633c0eca51a09fbac8c1067",
      metadataIpfsHash:
        "QmNchKxnZtLHFYSKpeC3KFGLmECQ31nyMBK1khpDTzthnA",
    },
    marketplace: {
      contract: "SoapyMarketplace",
      address: marketplaceAddress,
      deploymentTransaction:
        "0x001a00708189c47970ae67c831cd5354cec3a65948faaa61706c1e17d4d14831",
      metadataIpfsHash:
        "QmY5bmCsW92HWMMms5LTqwURJHvRVDmEVbE8MrnnswHa66",
    },
    authorized: true,
    deployedAt,
  };

  fs.writeFileSync(
    path.join(
      deploymentDirectory,
      "orchard-game-marketplace.json"
    ),
    JSON.stringify(
      deploymentData,
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(
      deploymentDirectory,
      "orchard.json"
    ),
    JSON.stringify(
      {
        network: "orchard",
        chainId: 15000,
        contract: "SoapyMinerGame",
        address: gameAddress,
        marketplace: marketplaceAddress,
        linkedNft: nftAddress,
        deploymentTransaction:
          deploymentData.game
            .deploymentTransaction,
        metadataIpfsHash:
          deploymentData.game
            .metadataIpfsHash,
        deployedAt,
      },
      null,
      2
    )
  );

  console.log(
    "\n=============================="
  );
  console.log("AUTHORIZATION COMPLETE");
  console.log("NFT:", nftAddress);
  console.log("GAME:", gameAddress);
  console.log(
    "MARKETPLACE:",
    marketplaceAddress
  );
  console.log(
    "=============================="
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
