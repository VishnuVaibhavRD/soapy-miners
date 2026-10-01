/**
 * One-shot verification of the freshly deployed SoapyMinerGame.
 * usage: node scripts/verifyPickaxeDeployment.js [address]
 */
require("dotenv").config();

require("dotenv").config({
  path: require("path").join(
    __dirname,
    "../../../soapy-miners-nft/blockchain/.env"
  ),
});

const { quais } = require("quais");

const artifact = require(
  "../artifacts/contracts/SoapyMinerGame.sol/SoapyMinerGame.json"
);

async function main() {
  const address =
    process.argv[2] ||
    require("../deployment/orchard.json")
      .address;

  const rpcUrl =
    process.env.ORCHARD_RPC_URL ||
    "https://orchard.rpc.quai.network";

  const provider =
    new quais.JsonRpcProvider(
      rpcUrl,
      undefined,
      { usePathing: true }
    );

  const game = new quais.Contract(
    address,
    artifact.abi,
    provider
  );

  console.log("Game:", address);

  const nft = await game.soapyMiners();
  console.log("soapyMiners:", nft);

  const mines = await game.mineCount();
  console.log("mineCount:", mines.toString());

  const cost2 =
    await game.pickaxeUpgradeCosts(2);
  console.log(
    "pickaxeUpgradeCosts(2):",
    {
      goldDust: cost2.goldDust.toString(),
      ore: cost2.ore.toString(),
      crystal: cost2.crystal.toString(),
      core: cost2.core.toString(),
    }
  );

  const cost3 =
    await game.pickaxeUpgradeCosts(3);
  console.log(
    "pickaxeUpgradeCosts(3):",
    {
      goldDust: cost3.goldDust.toString(),
      ore: cost3.ore.toString(),
      crystal: cost3.crystal.toString(),
      core: cost3.core.toString(),
    }
  );

  const level =
    await game.getPickaxeLevel(1);
  console.log(
    "getPickaxeLevel(1):",
    level.toString()
  );

  const power =
    await game.getMiningPower(1);
  console.log(
    "getMiningPower(1):",
    power.toString()
  );

  const next =
    await game.getNextPickaxeUpgradeCost(
      1
    );
  console.log(
    "getNextPickaxeUpgradeCost(1):",
    {
      nextLevel: next.nextLevel.toString(),
      goldDustCost:
        next.goldDustCost.toString(),
      oreCost: next.oreCost.toString(),
      crystalCost:
        next.crystalCost.toString(),
      coreCost: next.coreCost.toString(),
    }
  );

  const backpackLevel =
    await game.getBackpackLevel(1);
  console.log(
    "getBackpackLevel(1):",
    backpackLevel.toString()
  );

  const capacity =
    await game.getBackpackCapacity(1);
  console.log(
    "getBackpackCapacity(1):",
    capacity.toString()
  );

  const backpackCost2 =
    await game.backpackUpgradeCosts(2);
  console.log(
    "backpackUpgradeCosts(2):",
    {
      goldDust:
        backpackCost2.goldDust.toString(),
      ore: backpackCost2.ore.toString(),
      crystal:
        backpackCost2.crystal.toString(),
      core: backpackCost2.core.toString(),
    }
  );

  const nextBackpack =
    await game.getNextBackpackUpgradeCost(
      1
    );
  console.log(
    "getNextBackpackUpgradeCost(1):",
    {
      nextLevel:
        nextBackpack.nextLevel.toString(),
      goldDustCost:
        nextBackpack.goldDustCost.toString(),
      oreCost:
        nextBackpack.oreCost.toString(),
      crystalCost:
        nextBackpack.crystalCost.toString(),
      coreCost:
        nextBackpack.coreCost.toString(),
    }
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
