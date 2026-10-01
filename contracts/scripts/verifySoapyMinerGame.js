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
  const deploymentFile =
    path.join(
      process.cwd(),
      "deployment",
      `${hre.network.name}.json`
    );

  if (!fs.existsSync(deploymentFile)) {
    throw new Error(
      `Missing deployment file: ${deploymentFile}`
    );
  }

  const deployment =
    JSON.parse(
      fs.readFileSync(
        deploymentFile,
        "utf8"
      )
    );

  const gameAddress =
    deployment.address;

  const networkConfig =
    hre.network.config;

  const provider =
    new quais.JsonRpcProvider(
      networkConfig.url,
      undefined,
      {
        usePathing: true,
      }
    );

  const game =
    new quais.Contract(
      gameAddress,
      SoapyMinerGameArtifact.abi,
      provider
    );

  console.log(
    "Verifying SoapyMinerGame:",
    gameAddress
  );

  const linkedNft =
    await game.soapyMiners();

  console.log(
    "Linked NFT:",
    linkedNft
  );

  const mineCount =
    await game.mineCount();

  console.log(
    "mineCount:",
    mineCount.toString()
  );

  const mine1 =
    await game.mines(1);

  console.log(
    "mines(1):",
    {
      name: mine1[0],
      duration: mine1[1].toString(),
      entryCost: mine1[2].toString(),
      requiredPower: mine1[3].toString(),
      xpReward: mine1[4].toString(),
      active: mine1[5],
    }
  );

  const mine2 =
    await game.mines(2);

  console.log(
    "mines(2):",
    {
      name: mine2[0],
      duration: mine2[1].toString(),
      entryCost: mine2[2].toString(),
      requiredPower: mine2[3].toString(),
      xpReward: mine2[4].toString(),
      active: mine2[5],
    }
  );

  const mine3 =
    await game.mines(3);

  console.log(
    "mines(3):",
    {
      name: mine3[0],
      duration: mine3[1].toString(),
      entryCost: mine3[2].toString(),
      requiredPower: mine3[3].toString(),
      xpReward: mine3[4].toString(),
      active: mine3[5],
    }
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
