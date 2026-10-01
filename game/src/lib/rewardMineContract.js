import {
  Contract,
  parseQuai,
  formatQuai,
} from "quais";

import SoapyRewardMineABI
  from "@/abi/SoapyRewardMine.json";


const REWARD_MINE_ADDRESS =
  process.env
    .NEXT_PUBLIC_SOAPY_REWARD_MINE_CONTRACT_ADDRESS;


export function getRewardMineContract(
  signerOrProvider
) {
  if (!REWARD_MINE_ADDRESS) {
    throw new Error(
      "Missing Reward Mine contract address."
    );
  }

  return new Contract(
    REWARD_MINE_ADDRESS,
    SoapyRewardMineABI,
    signerOrProvider
  );
}


export function getMineStatusName(
  status
) {
  const names = [
    "CREATED",
    "ACTIVE",
    "PAUSED",
    "FINISHED",
    "CANCELLED",
  ];

  return (
    names[Number(status)] ||
    "UNKNOWN"
  );
}


export async function getRewardMineOwner(
  signerOrProvider
) {
  const contract =
    getRewardMineContract(
      signerOrProvider
    );

  return await contract.owner();
}


export async function getRewardMineCount(
  signerOrProvider
) {
  const contract =
    getRewardMineContract(
      signerOrProvider
    );

  return Number(
    await contract.mineCount()
  );
}


export async function getRewardMine(
  signerOrProvider,
  mineId
) {
  const contract =
    getRewardMineContract(
      signerOrProvider
    );

  const mine =
    await contract.mines(
      mineId
    );

  return {
    // The deployed contract no longer stores id/name on the
    // mine struct; id comes from the query argument.
    id: Number(mineId),

    name: `Mine #${mineId}`,

    maxHealth:
      Number(
        mine.maxHealth
      ),

    currentHealth:
      Number(
        mine.currentHealth
      ),

    rewardPoolWei:
      mine.rewardPool,

    rewardPool:
      formatQuai(
        mine.rewardPool
      ),

    attackFeeGD:
      Number(
        mine.attackFeeGD
      ),

    attackRestDuration:
      Number(
        mine.attackRestDuration
      ),

    attackCooldown:
      Number(
        mine.attackCooldown
      ),

    totalDamage:
      Number(
        mine.totalDamage
      ),

    // The deployed contract removed totalAttacks /
    // participantCount fields; derive what we can from
    // on-chain events elsewhere. Default to 0.
    totalAttacks: 0,

    participantCount: 0,

    finalRewardPool:
      formatQuai(
        mine.finalRewardPool
      ),

    totalClaimed: "0",

    claimedParticipants: 0,

    status:
      Number(
        mine.status
      ),

    statusName:
      getMineStatusName(
        mine.status
      ),

    adminFundingWithdrawn:
      Boolean(
        mine.adminFundingWithdrawn
      ),
  };
}


export async function getAllRewardMines(
  signerOrProvider
) {
  const count =
    await getRewardMineCount(
      signerOrProvider
    );

  if (count === 0) {
    return [];
  }

  const requests = [];

  for (
    let id = 1;
    id <= count;
    id++
  ) {
    requests.push(
      getRewardMine(
        signerOrProvider,
        id
      )
    );
  }

  return (
    await Promise.all(
      requests
    )
  ).reverse();
}


export async function getActiveRewardMines(
  signerOrProvider
) {
  const mines =
    await getAllRewardMines(
      signerOrProvider
    );

  return mines.filter(
    (mine) =>
      mine.statusName === "ACTIVE"
  );
}


export async function getFinishedRewardMines(
  signerOrProvider
) {
  const mines =
    await getAllRewardMines(
      signerOrProvider
    );

  return mines.filter(
    (mine) =>
      mine.statusName === "FINISHED"
  );
}


export async function getPlayerRewardAmount(
  signerOrProvider,
  mineId,
  player
) {
  const contract =
    getRewardMineContract(
      signerOrProvider
    );

  const reward =
    await contract.getPlayerReward(
      mineId,
      player
    );

  return formatQuai(
    reward
  );
}


export async function claimRewardMineReward(
  signer,
  mineId
) {
  const contract =
    getRewardMineContract(
      signer
    );

  const tx =
    await contract.claimReward(
      mineId
    );

  return await tx.wait();
}


// The deployed contract removed getMineParticipants(); the
// participant list is reconstructed from AttackPerformed
// events. getMineParticipants returns unique player addresses.
export async function getMineParticipants(
  signerOrProvider,
  mineId
) {
  const attacks =
    await getRecentRewardMineAttacks(
      signerOrProvider,
      mineId,
      1000
    );

  return [
    ...new Set(
      attacks.map(
        (a) => a.player
      )
    ),
  ];
}


export async function getRewardMineLeaderboard(
  signerOrProvider,
  mineId
) {
  const attacks =
    await getRecentRewardMineAttacks(
      signerOrProvider,
      mineId,
      1000
    );

  const byPlayer = new Map();

  for (const a of attacks) {
    const entry =
      byPlayer.get(a.player) || {
        player: a.player,
        totalDamage: 0,
        attackCount: 0,
        participated: true,
        rewardClaimed: false,
      };

    entry.totalDamage += a.damage;
    entry.attackCount += 1;

    byPlayer.set(
      a.player,
      entry
    );
  }

  return [
    ...byPlayer.values(),
  ].sort(
    (x, y) =>
      y.totalDamage -
      x.totalDamage
  );
}


export function calculateEstimatedReward(
  rewardPool,
  playerDamage,
  totalDamage
) {
  if (
    Number(totalDamage) <= 0
  ) {
    return "0";
  }

  const pool =
    Number(rewardPool);

  const share =
    Number(playerDamage) /
    Number(totalDamage);

  return (
    pool *
    share
  ).toFixed(6);
}


export async function getRecentRewardMineAttacks(
  signerOrProvider,
  mineId,
  limit = 20
) {
  const contract =
    getRewardMineContract(
      signerOrProvider
    );

  const filter =
    contract.filters.AttackPerformed(
      mineId
    );

  /*
    Start broad for now.

    Later Supabase/indexing should
    replace this for large history.
  */

  const events =
    await contract.queryFilter(
      filter
    );

  const recent =
    events
      .slice(-limit)
      .reverse();

  return recent.map(
    (event) => ({
      mineId:
        Number(
          event.args.mineId
        ),

      player:
        event.args.player,

      tokenId:
        Number(
          event.args.tokenId
        ),

      damage:
        Number(
          event.args.damage
        ),

      remainingHealth:
        Number(
          event.args
            .remainingHealth
        ),

      playerTotalDamage:
        Number(
          event.args
            .playerTotalDamage
        ),

      minerTotalDamage:
        Number(
          event.args
            .minerTotalDamage
        ),

      transactionHash:
        event.transactionHash,

      blockNumber:
        Number(
          event.blockNumber
        ),
    })
  );
}


export async function getMinerRewardEligibility(
  signerOrProvider,
  mineId,
  player,
  tokenId
) {
  const contract =
    getRewardMineContract(
      signerOrProvider
    );

  const result =
    await contract.canMinerAttack(
      mineId,
      player,
      tokenId
    );

  return {
    canAttack:
      Boolean(
        result.canAttack ??
        result[0]
      ),

    nextAttackAt:
      Number(
        result.nextAttackAt ??
        result[1]
      ),
  };
}


export async function getMinerDamageRange(
  signerOrProvider,
  tokenId,
  player
) {
  const contract =
    getRewardMineContract(
      signerOrProvider
    );

  // Deployed signature: getAllowedDamageRange(tokenId, player)
  const range =
    await contract.getAllowedDamageRange(
      tokenId,
      player
    );

  return {
    minDamage:
      Number(
        range.minDamage ??
        range[0]
      ),

    maxDamage:
      Number(
        range.maxDamage ??
        range[1]
      ),
  };
}


export async function getPlayerRewardMineState(
  signerOrProvider,
  mineId,
  player
) {
  const contract =
    getRewardMineContract(
      signerOrProvider
    );

  const state =
    await contract.playerMineStates(
      mineId,
      player
    );

  // Deployed PlayerMineState is { totalDamage, rewardClaimed }.
  return {
    totalDamage:
      Number(
        state.totalDamage ??
        state[0]
      ),

    attackCount: 0,

    participated: true,

    rewardClaimed:
      Boolean(
        state.rewardClaimed ??
        state[1]
      ),
  };
}


export async function createRewardMine(
  signer,
  {
    name,
    maxHealth,
    attackFeeGD,
    restHours,
    cooldownHours,
  }
) {
  const contract =
    getRewardMineContract(
      signer
    );

  const tx =
    await contract.createRewardMine(
      name,
      maxHealth,
      attackFeeGD,
      Math.floor(
        Number(restHours) *
        60 *
        60
      ),
      Math.floor(
        Number(cooldownHours) *
        60 *
        60
      )
    );

  return await tx.wait();
}


export async function fundRewardMine(
  signer,
  mineId,
  quaiAmount
) {
  const contract =
    getRewardMineContract(
      signer
    );

  const tx =
    await contract.fundMine(
      mineId,
      {
        value:
          parseQuai(
            String(
              quaiAmount
            )
          ),
      }
    );

  return await tx.wait();
}


export async function activateRewardMine(
  signer,
  mineId
) {
  const contract =
    getRewardMineContract(
      signer
    );

  const tx =
    await contract.activateMine(
      mineId
    );

  return await tx.wait();
}


export async function pauseRewardMine(
  signer,
  mineId
) {
  const contract =
    getRewardMineContract(
      signer
    );

  const tx =
    await contract.pauseMine(
      mineId
    );

  return await tx.wait();
}


export async function resumeRewardMine(
  signer,
  mineId
) {
  const contract =
    getRewardMineContract(
      signer
    );

  const tx =
    await contract.resumeMine(
      mineId
    );

  return await tx.wait();
}


export async function finishRewardMine(
  signer,
  mineId
) {
  const contract =
    getRewardMineContract(
      signer
    );

  const tx =
    await contract.finishMine(
      mineId
    );

  return await tx.wait();
}


export async function attackRewardMine(
  signer,
  {
    mineId,
    tokenId,
    damage,
    nonce,
    deadline,
    signature,
  }
) {
  const contract =
    getRewardMineContract(
      signer
    );


  const tx =
    await contract.attack(
      mineId,
      tokenId,
      damage,
      nonce,
      deadline,
      signature
    );


  return await tx.wait();
}


export async function getDamageRange(
  signerOrProvider,
  level
) {
  const contract =
    getRewardMineContract(
      signerOrProvider
    );

  const range =
    await contract.levelDamageRanges(
      level
    );

  return {
    minDamage:
      Number(
        range.minDamage
      ),

    maxDamage:
      Number(
        range.maxDamage
      ),
  };
}


export async function getPickaxeDamageBonus(
  signerOrProvider,
  level
) {
  const contract =
    getRewardMineContract(
      signerOrProvider
    );

  return Number(
    await contract.pickaxeDamageBonus(
      level
    )
  );
}


export async function getAllDamageConfig(
  signerOrProvider
) {
  const levels = [
    1,
    2,
    3,
    4,
    5,
  ];

  const [
    ranges,
    bonuses,
  ] =
    await Promise.all([
      Promise.all(
        levels.map(
          (level) =>
            getDamageRange(
              signerOrProvider,
              level
            )
        )
      ),

      Promise.all(
        levels.map(
          (level) =>
            getPickaxeDamageBonus(
              signerOrProvider,
              level
            )
        )
      ),
    ]);

  return levels.map(
    (
      level,
      index
    ) => ({
      level,

      minDamage:
        ranges[index]
          .minDamage,

      maxDamage:
        ranges[index]
          .maxDamage,

      pickaxeBonus:
        bonuses[index],
    })
  );
}


export async function updateDamageRange(
  signer,
  level,
  minDamage,
  maxDamage
) {
  const contract =
    getRewardMineContract(
      signer
    );

  const tx =
    await contract.setDamageRange(
      level,
      minDamage,
      maxDamage
    );

  return await tx.wait();
}


export async function updatePickaxeDamageBonus(
  signer,
  pickaxeLevel,
  bonus
) {
  const contract =
    getRewardMineContract(
      signer
    );

  const tx =
    await contract.setPickaxeDamageBonus(
      pickaxeLevel,
      bonus
    );

  return await tx.wait();
}
