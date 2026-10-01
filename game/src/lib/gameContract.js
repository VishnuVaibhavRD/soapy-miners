import {
  Contract,
} from "quais";

import SoapyMinerGameABI from "@/abi/SoapyMinerGame.json";

const GAME_ADDRESS =
  process.env
    .NEXT_PUBLIC_SOAPY_GAME_CONTRACT_ADDRESS;

export function getGameContract(
  signerOrProvider
) {
  if (!GAME_ADDRESS) {
    throw new Error(
      "Missing NEXT_PUBLIC_SOAPY_GAME_CONTRACT_ADDRESS"
    );
  }

  return new Contract(
    GAME_ADDRESS,
    SoapyMinerGameABI,
    signerOrProvider
  );
}

export async function getGoldDustBalance(
  signerOrProvider,
  address
) {
  const contract =
    getGameContract(
      signerOrProvider
    );

  const balance =
    await contract.goldDust(
      address
    );

  return Number(balance);
}

export async function getMinerGameData(
  signerOrProvider,
  tokenId
) {
  const contract =
    getGameContract(
      signerOrProvider
    );

  const [
    level,
    power,
    backpack,
    status,
    minerState,
    inventory,
  ] =
    await Promise.all([
      contract.getMinerLevel(
        tokenId
      ),

      contract.getMiningPower(
        tokenId
      ),

      contract.getBackpackCapacity(
        tokenId
      ),

      contract.getMinerStatus(
        tokenId
      ),

      contract.miners(
        tokenId
      ),

      contract.inventories(
        tokenId
      ),
    ]);

  return {
    tokenId:
      Number(tokenId),

    level:
      Number(level),

    power:
      Number(power),

    backpackCapacity:
      Number(backpack),

    status:
      Number(status),

    xp:
      Number(
        minerState.xp
      ),

    pickaxeLevel:
      Number(
        minerState.pickaxeLevel
      ) || 1,

    backpackLevel:
      Number(
        minerState.backpackLevel
      ) || 1,

    restUntil:
      Number(
        minerState.restUntil
      ),

    ore:
      Number(
        inventory.ore
      ),

    crystal:
      Number(
        inventory.crystal
      ),

    core:
      Number(
        inventory.core
      ),
  };
}

export async function getGameMines(
  signerOrProvider
) {
  const contract =
    getGameContract(
      signerOrProvider
    );

  const count =
    Number(
      await contract.mineCount()
    );

  const mines = [];

  for (
    let mineId = 1;
    mineId <= count;
    mineId++
  ) {
    const mine =
      await contract.mines(
        mineId
      );

    mines.push({
      id: mineId,

      name:
        mine.name,

      duration:
        Number(
          mine.duration
        ),

      entryCost:
        Number(
          mine.entryCost
        ),

      requiredPower:
        Number(
          mine.requiredPower
        ),

      xpReward:
        Number(
          mine.xpReward
        ),

      active:
        Boolean(
          mine.active
        ),
    });
  }

  return mines;
}

export function getMinerStatusName(
  status
) {
  const statuses = [
    "READY",
    "MINING",
    "CLAIMABLE",
    "RESTING",
  ];

  return (
    statuses[status] ||
    "UNKNOWN"
  );
}

export function formatMineDuration(
  seconds
) {
  if (seconds < 60) {
    return `${seconds} SEC`;
  }

  if (seconds < 3600) {
    return `${Math.floor(
      seconds / 60
    )} MIN`;
  }

  return `${Math.floor(
    seconds / 3600
  )} HR`;
}

export async function startGameExpedition(
  signer,
  tokenId,
  mineId
) {
  const contract =
    getGameContract(
      signer
    );

  const tx =
    await contract.startExpedition(
      tokenId,
      mineId
    );

  const receipt =
    await tx.wait();

  return {
    tx,
    receipt,
  };
}

export async function claimGameLoot(
  signer,
  expeditionId
) {
  const contract =
    getGameContract(signer);

  const tx =
    await contract.claimLoot(
      expeditionId
    );

  const receipt =
    await tx.wait();

  return {
    tx,
    receipt,
  };
}

export async function getNextPickaxeUpgrade(
  signerOrProvider,
  tokenId
) {
  const contract =
    getGameContract(signerOrProvider);

  try {
    const result =
      await contract.getNextPickaxeUpgradeCost(
        tokenId
      );

    return {
      isMaxLevel: false,

      nextLevel: Number(
        result.nextLevel ?? result[0]
      ),

      goldDust: Number(
        result.goldDustCost ?? result[1]
      ),

      ore: Number(
        result.oreCost ?? result[2]
      ),

      crystal: Number(
        result.crystalCost ?? result[3]
      ),

      core: Number(
        result.coreCost ?? result[4]
      ),
    };
  } catch (error) {
    const message =
      error?.shortMessage ||
      error?.reason ||
      error?.message ||
      "";

    if (
      message.includes(
        "Pickaxe already max level"
      )
    ) {
      return {
        isMaxLevel: true,
      };
    }

    throw error;
  }
}

export async function upgradeGamePickaxe(
  signer,
  tokenId
) {
  const contract =
    getGameContract(signer);

  const tx =
    await contract.upgradePickaxe(
      tokenId
    );

  const receipt =
    await tx.wait();

  return {
    tx,
    receipt,
  };
}

export async function getNextBackpackUpgrade(
  signerOrProvider,
  tokenId
) {
  const contract =
    getGameContract(signerOrProvider);

  try {
    const result =
      await contract.getNextBackpackUpgradeCost(
        tokenId
      );

    return {
      isMaxLevel: false,

      nextLevel: Number(
        result.nextLevel ?? result[0]
      ),

      goldDust: Number(
        result.goldDustCost ?? result[1]
      ),

      ore: Number(
        result.oreCost ?? result[2]
      ),

      crystal: Number(
        result.crystalCost ?? result[3]
      ),

      core: Number(
        result.coreCost ?? result[4]
      ),
    };
  } catch (error) {
    const message =
      error?.shortMessage ||
      error?.reason ||
      error?.message ||
      "";

    if (
      message.includes(
        "Backpack already max level"
      )
    ) {
      return {
        isMaxLevel: true,
      };
    }

    throw error;
  }
}

export async function upgradeGameBackpack(
  signer,
  tokenId
) {
  const contract =
    getGameContract(signer);

  const tx =
    await contract.upgradeBackpack(
      tokenId
    );

  const receipt =
    await tx.wait();

  return {
    tx,
    receipt,
  };
}

export async function getActiveExpeditionData(
  signerOrProvider,
  tokenId
) {
  const contract =
    getGameContract(
      signerOrProvider
    );

  // The public mapping returns { endsAt, mineId } and does
  // not revert when no expedition is active, unlike the
  // getActiveExpedition view. A mineId of 0 means idle.
  const expedition =
    await contract.activeExpeditions(
      tokenId
    );

  const mineId =
    Number(
      expedition.mineId
    );

  return {
    id: mineId,
    tokenId: Number(tokenId),
    mineId,
    startedAt: 0,
    endsAt: Number(expedition.endsAt),
    claimed: false,
  };
}
