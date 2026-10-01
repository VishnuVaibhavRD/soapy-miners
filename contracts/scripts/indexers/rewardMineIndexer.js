require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");
const { JsonRpcProvider, Contract, Interface, keccak256, toUtf8Bytes, formatEther } = require("quais");

const {
  normalizeAddress,
  getLogIndex,
  getEventName,
  getEventId,
  sortEvents,
  withRetry,
  fetchEvents,
  getChainHead,
  eventTopics,
  zoneRpcUrl,
} = require("./indexerUtils");

const rewardAbi = require("../../artifacts/contracts/SoapyRewardMine.sol/SoapyRewardMine.json").abi;

const rewardInterface =
  new Interface(rewardAbi);

const REWARD_TOPICS =
  eventTopics(
    rewardInterface,
    keccak256,
    toUtf8Bytes
  );


const RPC_URL =
  process.env.QUAI_RPC_URL;

const REWARD_MINE_ADDRESS =
  process.env.SOAPY_REWARD_MINE_CONTRACT_ADDRESS;

const SUPABASE_URL =
  process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const NETWORK =
  process.env.QUAI_NETWORK_NAME || "cyprus1";


if (!RPC_URL) {
  throw new Error(
    "Missing QUAI_RPC_URL"
  );
}

if (!REWARD_MINE_ADDRESS) {
  throw new Error(
    "Missing SOAPY_REWARD_MINE_CONTRACT_ADDRESS"
  );
}

if (!SUPABASE_URL) {
  throw new Error(
    "Missing SUPABASE_URL"
  );
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY"
  );
}


const provider =
  new JsonRpcProvider(
    RPC_URL
  );


const zoneProvider =
  new JsonRpcProvider(
    zoneRpcUrl()
  );


const reward =
  new Contract(
    REWARD_MINE_ADDRESS,
    rewardAbi,
    provider
  );


const supabase =
  createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
      },
    }
  );


const blockTimestampCache =
  new Map();


async function getBlockTimestamp(
  blockNumber
) {
  const key =
    Number(
      blockNumber
    );

  if (
    blockTimestampCache
      .has(key)
  ) {
    return blockTimestampCache
      .get(key);
  }

  const block =
    await provider.getBlock(
      key
    );

  if (!block) {
    return null;
  }

  const timestamp =
    new Date(
      Number(
        block.timestamp
      ) * 1000
    ).toISOString();

  blockTimestampCache.set(
    key,
    timestamp
  );

  return timestamp;
}


async function getIndexerState() {
  const contractAddress =
    normalizeAddress(
      REWARD_MINE_ADDRESS
    );

  const {
    data,
    error,
  } =
    await supabase
      .from("indexer_state")
      .select("*")
      .eq(
        "network",
        NETWORK
      )
      .eq(
        "contract_address",
        contractAddress
      )
      .maybeSingle();


  if (error) {
    throw error;
  }

  return data;
}


async function setIndexerState(
  blockNumber
) {
  const contractAddress =
    normalizeAddress(
      REWARD_MINE_ADDRESS
    );

  const {
    error,
  } =
    await supabase
      .from("indexer_state")
      .upsert(
        {
          network:
            NETWORK,

          contract_address:
            contractAddress,

          contract_type:
            "reward_mine",

          last_processed_block:
            Number(
              blockNumber
            ),

          updated_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict:
            "network,contract_address",
        }
      );


  if (error) {
    throw error;
  }
}


async function getChainMine(
  mineId
) {
  const mine =
    await reward.mines(
      mineId
    );

  return {
    rewardPool:
      mine.rewardPool,

    finalRewardPool:
      mine.finalRewardPool,

    maxHealth:
      Number(
        mine.maxHealth
      ),

    currentHealth:
      Number(
        mine.currentHealth
      ),

    totalDamage:
      Number(
        mine.totalDamage
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

    status:
      Number(
        mine.status
      ),
  };
}


function getStatusName(
  status
) {
  return [
    "CREATED",
    "ACTIVE",
    "PAUSED",
    "FINISHED",
    "CANCELLED",
  ][Number(status)] ||
    "UNKNOWN";
}


async function handleRewardMineCreated(
  event
) {
  const {
    mineId,
    name,
    maxHealth,
    attackFeeGD,
    attackRestDuration,
    attackCooldown,
  } =
    event.args;


  const timestamp =
    await getBlockTimestamp(
      event.blockNumber
    );


  const contractAddress =
    normalizeAddress(
      REWARD_MINE_ADDRESS
    );


  const {
    error,
  } =
    await supabase
      .from("reward_mines")
      .upsert(
        {
          chain_mine_id:
            Number(
              mineId
            ),

          contract_address:
            contractAddress,

          name:
            name,

          status:
            "CREATED",

          max_health:
            Number(
              maxHealth
            ),

          current_health:
            Number(
              maxHealth
            ),

          current_reward_pool:
            0,

          final_reward_pool:
            0,

          total_damage:
            0,

          attack_fee_gd:
            Number(
              attackFeeGD
            ),

          rest_seconds:
            Number(
              attackRestDuration
            ),

          cooldown_seconds:
            Number(
              attackCooldown
            ),

          created_tx:
            event.transactionHash,

          created_block:
            Number(
              event.blockNumber
            ),

          updated_block:
            Number(
              event.blockNumber
            ),

          created_at:
            timestamp,

          updated_at:
            timestamp,
        },
        {
          onConflict:
            "contract_address,chain_mine_id",
        }
      );


  if (error) {
    throw error;
  }


  await insertActivity({
    type:
      "REWARD_MINE_CREATED",
    event,
    metadata: {
      mineId:
        Number(
          mineId
        ),
    },
  });
}


async function handleRewardMineFunded(
  event
) {
  const {
    mineId,
  } =
    event.args;


  const chainMine =
    await getChainMine(
      Number(
        mineId
      )
    );


  const timestamp =
    await getBlockTimestamp(
      event.blockNumber
    );


  const {
    error,
  } =
    await supabase
      .from("reward_mines")
      .update(
        {
          current_reward_pool:
            formatEther(
              chainMine.rewardPool
            ),

          updated_block:
            Number(
              event.blockNumber
            ),

          updated_at:
            timestamp,
        }
      )
      .eq(
        "contract_address",
        normalizeAddress(
          REWARD_MINE_ADDRESS
        )
      )
      .eq(
        "chain_mine_id",
        Number(
          mineId
        )
      );


  if (error) {
    throw error;
  }


  await insertActivity({
    type:
      "REWARD_MINE_FUNDED",
    event,
    metadata: {
      mineId:
        Number(
          mineId
        ),
    },
  });
}


async function updateMineStatus(
  mineId,
  status,
  event,
  extra = {}
) {
  const timestamp =
    await getBlockTimestamp(
      event.blockNumber
    );


  const {
    error,
  } =
    await supabase
      .from("reward_mines")
      .update({
        status,

        updated_block:
          Number(
            event.blockNumber
          ),

        updated_at:
          timestamp,

        ...extra,
      })
      .eq(
        "contract_address",
        normalizeAddress(
          REWARD_MINE_ADDRESS
        )
      )
      .eq(
        "chain_mine_id",
        Number(
          mineId
        )
      );


  if (error) {
    throw error;
  }
}


async function handleActivated(
  event
) {
  await updateMineStatus(
    event.args.mineId,
    "ACTIVE",
    event,
    {
      activated_at:
        await getBlockTimestamp(
          event.blockNumber
        ),
    }
  );

  await insertActivity({
    type:
      "REWARD_MINE_ACTIVATED",
    event,
    metadata: {
      mineId:
        Number(
          event.args.mineId
        ),
    },
  });
}


async function handlePaused(
  event
) {
  await updateMineStatus(
    event.args.mineId,
    "PAUSED",
    event,
    {
      paused_at:
        await getBlockTimestamp(
          event.blockNumber
        ),
    }
  );

  await insertActivity({
    type:
      "REWARD_MINE_PAUSED",
    event,
    metadata: {
      mineId:
        Number(
          event.args.mineId
        ),
    },
  });
}


async function handleResumed(
  event
) {
  await updateMineStatus(
    event.args.mineId,
    "ACTIVE",
    event
  );

  await insertActivity({
    type:
      "REWARD_MINE_RESUMED",
    event,
    metadata: {
      mineId:
        Number(
          event.args.mineId
        ),
    },
  });
}


async function handleCancelled(
  event
) {
  await updateMineStatus(
    event.args.mineId,
    "CANCELLED",
    event,
    {
      cancelled_at:
        await getBlockTimestamp(
          event.blockNumber
        ),
    }
  );

  await insertActivity({
    type:
      "REWARD_MINE_CANCELLED",
    event,
    metadata: {
      mineId:
        Number(
          event.args.mineId
        ),
    },
  });
}


async function handleFinished(
  event
) {
  const {
    mineId,
  } =
    event.args;


  const chainMine =
    await getChainMine(
      Number(
        mineId
      )
    );


  const timestamp =
    await getBlockTimestamp(
      event.blockNumber
    );


  const {
    error,
  } =
    await supabase
      .from("reward_mines")
      .update(
        {
          status:
            "FINISHED",

          current_health:
            chainMine.currentHealth,

          total_damage:
            chainMine.totalDamage,

          current_reward_pool:
            formatEther(
              chainMine.rewardPool
            ),

          final_reward_pool:
            formatEther(
              chainMine.finalRewardPool
            ),

          finished_at:
            timestamp,

          updated_block:
            Number(
              event.blockNumber
            ),

          updated_at:
            timestamp,
        }
      )
      .eq(
        "contract_address",
        normalizeAddress(
          REWARD_MINE_ADDRESS
        )
      )
      .eq(
        "chain_mine_id",
        Number(
          mineId
        )
      );


  if (error) {
    throw error;
  }


  await insertActivity({
    type:
      "REWARD_MINE_FINISHED",
    event,
    metadata: {
      mineId:
        Number(
          mineId
        ),
    },
  });
}


async function handleAttack(
  event
) {
  const {
    mineId,
    player,
    tokenId,
    damage,
    remainingHealth,
  } =
    event.args;


  const mine =
    Number(
      mineId
    );

  const token =
    Number(
      tokenId
    );

  const damageValue =
    Number(
      damage
    );

  const wallet =
    normalizeAddress(
      player
    );

  const timestamp =
    await getBlockTimestamp(
      event.blockNumber
    );


  /*
    1. Insert immutable attack
  */

  {
    const {
      error,
    } =
      await supabase
        .from("reward_attacks")
        .upsert(
          {
            contract_address:
              normalizeAddress(
                REWARD_MINE_ADDRESS
              ),

            chain_mine_id:
              mine,

            player_wallet:
              wallet,

            token_id:
              token,

            damage:
              damageValue,

            remaining_health:
              Number(
                remainingHealth
              ),

            tx_hash:
              event.transactionHash,

            log_index:
              getLogIndex(
                event
              ),

            block_number:
              Number(
                event.blockNumber
              ),

            block_timestamp:
              timestamp,
          },
          {
            onConflict:
              "tx_hash,log_index",
          }
        );


    if (error) {
      throw error;
    }
  }


  /*
    2. Rebuild player's totals
       from immutable attacks.

       This is intentionally
       idempotent.
  */

  const {
    data:
      playerAttacks,
    error:
      playerAttackError,
  } =
    await supabase
      .from("reward_attacks")
      .select(
        "damage, token_id, block_timestamp"
      )
      .eq(
        "contract_address",
        normalizeAddress(
          REWARD_MINE_ADDRESS
        )
      )
      .eq(
        "chain_mine_id",
        mine
      )
      .eq(
        "player_wallet",
        wallet
      );


  if (playerAttackError) {
    throw playerAttackError;
  }


  const playerTotalDamage =
    playerAttacks.reduce(
      (
        total,
        row
      ) =>
        total +
        Number(
          row.damage
        ),
      0
    );


  const {
    error:
      playerError,
  } =
    await supabase
      .from("reward_players")
      .upsert(
        {
          contract_address:
            normalizeAddress(
              REWARD_MINE_ADDRESS
            ),

          chain_mine_id:
            mine,

          player_wallet:
            wallet,

          total_damage:
            playerTotalDamage,

          attack_count:
            playerAttacks.length,

          last_attack_at:
            timestamp,

          last_token_id:
            token,

          updated_at:
            timestamp,
        },
        {
          onConflict:
            "contract_address,chain_mine_id,player_wallet",
        }
      );


  if (playerError) {
    throw playerError;
  }


  /*
    3. Per-miner totals
  */

  const {
    data:
      minerAttacks,
    error:
      minerAttackError,
  } =
    await supabase
      .from("reward_attacks")
      .select(
        "damage, block_timestamp"
      )
      .eq(
        "contract_address",
        normalizeAddress(
          REWARD_MINE_ADDRESS
        )
      )
      .eq(
        "chain_mine_id",
        mine
      )
      .eq(
        "token_id",
        token
      );


  if (minerAttackError) {
    throw minerAttackError;
  }


  const minerTotalDamage =
    minerAttacks.reduce(
      (
        total,
        row
      ) =>
        total +
        Number(
          row.damage
        ),
      0
    );


  const {
    error:
      minerError,
  } =
    await supabase
      .from("reward_miners")
      .upsert(
        {
          contract_address:
            normalizeAddress(
              REWARD_MINE_ADDRESS
            ),

          chain_mine_id:
            mine,

          token_id:
            token,

          player_wallet:
            wallet,

          total_damage:
            minerTotalDamage,

          attack_count:
            minerAttacks.length,

          last_attack_at:
            timestamp,

          updated_at:
            timestamp,
        },
        {
          onConflict:
            "contract_address,chain_mine_id,token_id",
        }
      );


  if (minerError) {
    throw minerError;
  }


  /*
    4. Reconcile mine state from chain
  */

  const chainMine =
    await getChainMine(
      mine
    );


  const {
    error:
      mineError,
  } =
    await supabase
      .from("reward_mines")
      .update(
        {
          current_health:
            chainMine.currentHealth,

          total_damage:
            chainMine.totalDamage,

          current_reward_pool:
            formatEther(
              chainMine.rewardPool
            ),

          status:
            getStatusName(
              chainMine.status
            ),

          updated_block:
            Number(
              event.blockNumber
            ),

          updated_at:
            timestamp,
        }
      )
      .eq(
        "contract_address",
        normalizeAddress(
          REWARD_MINE_ADDRESS
        )
      )
      .eq(
        "chain_mine_id",
        mine
      );


  if (mineError) {
    throw mineError;
  }


  await insertActivity({
    player,
    tokenId,
    type:
      "REWARD_ATTACK",
    event,
    metadata: {
      mineId: mine,
      damage: damageValue,
      remainingHealth:
        Number(
          remainingHealth
        ),
    },
  });
}


async function handleClaim(
  event
) {
  const {
    mineId,
    player,
    amount,
  } =
    event.args;


  const timestamp =
    await getBlockTimestamp(
      event.blockNumber
    );


  const {
    error,
  } =
    await supabase
      .from("reward_claims")
      .upsert(
        {
          contract_address:
            normalizeAddress(
              REWARD_MINE_ADDRESS
            ),

          chain_mine_id:
            Number(
              mineId
            ),

          player_wallet:
            normalizeAddress(
              player
            ),

          amount_quai:
            formatEther(
              amount
            ),

          tx_hash:
            event.transactionHash,

          log_index:
            getLogIndex(
              event
            ),

          block_number:
            Number(
              event.blockNumber
            ),

          claimed_at:
            timestamp,
        },
        {
          onConflict:
            "tx_hash,log_index",
        }
      );


  if (error) {
    throw error;
  }


  await insertActivity({
    player,
    tokenId: null,
    type:
      "REWARD_CLAIM",
    event,
    metadata: {
      mineId:
        Number(
          mineId
        ),
      amountQuai:
        formatEther(
          amount
        ),
    },
  });
}


async function insertActivity({
  player,
  tokenId,
  type,
  event,
  metadata = {},
}) {
  const timestamp =
    await getBlockTimestamp(
      event.blockNumber
    );


  const {
    error,
  } =
    await supabase
      .from("game_activity")
      .upsert(
        {
          event_id:
            getEventId(
              REWARD_MINE_ADDRESS,
              event
            ),

          wallet:
            player
              ? normalizeAddress(
                  player
                )
              : null,

          token_id:
            tokenId != null
              ? Number(
                  tokenId
                )
              : null,

          activity_type:
            type,

          contract_address:
            normalizeAddress(
              REWARD_MINE_ADDRESS
            ),

          tx_hash:
            event.transactionHash,

          log_index:
            getLogIndex(
              event
            ),

          block_number:
            Number(
              event.blockNumber
            ),

          block_timestamp:
            timestamp,

          metadata,
        },
        {
          onConflict:
            "event_id",
        }
      );


  if (error) {
    throw error;
  }
}


async function processEvent(
  event
) {
  switch (
    event.fragment?.name
  ) {
    case "RewardMineCreated":
      await handleRewardMineCreated(
        event
      );
      break;


    case "RewardMineFunded":
      await handleRewardMineFunded(
        event
      );
      break;


    case "RewardMineActivated":
      await handleActivated(
        event
      );
      break;


    case "RewardMinePaused":
      await handlePaused(
        event
      );
      break;


    case "RewardMineResumed":
      await handleResumed(
        event
      );
      break;


    case "RewardMineFinished":
      await handleFinished(
        event
      );
      break;


    case "RewardMineCancelled":
      await handleCancelled(
        event
      );
      break;


    case "AttackPerformed":
      await handleAttack(
        event
      );
      break;


    case "RewardClaimed":
      await handleClaim(
        event
      );
      break;


    default:
      break;
  }
}


async function processBlockRange(
  fromBlock,
  toBlock
) {
  console.log(
    `RewardMine ${fromBlock} → ${toBlock}`
  );


  const events =
    await withRetry(
      () =>
        fetchEvents(
          zoneProvider,
          rewardInterface,
          REWARD_MINE_ADDRESS,
          REWARD_TOPICS,
          fromBlock,
          toBlock
        )
    );

  const sorted =
    sortEvents(events);

  for (
    const event of sorted
  ) {
    console.log(
      event.fragment?.name,
      event.transactionHash
    );

    await processEvent(
      event
    );
  }


  await setIndexerState(
    toBlock
  );
}


async function syncRewardMine() {
  const state =
    await getIndexerState();

  const confirmations =
    Number(
      process.env
        .INDEXER_CONFIRMATIONS ||
      5
    );

  const deploymentBlock =
    Number(
      process.env
        .REWARD_MINE_DEPLOYMENT_BLOCK
    );

  // On pathing RPCs getBlockNumber() returns a low per-shard
  // head that is far below the real deployment/event blocks.
  // Use eth_getBlockByNumber(["latest"] for the canonical head.
  const chainHead =
    await getChainHead(provider);

  const safeBlock =
    Math.max(
      deploymentBlock,
      chainHead -
        confirmations
    );

  if (
    !Number.isInteger(
      deploymentBlock
    ) ||
    deploymentBlock <= 0
  ) {
    throw new Error(
      "Invalid REWARD_MINE_DEPLOYMENT_BLOCK"
    );
  }

  let nextBlock =
    state
      ? Number(
          state.last_processed_block
        ) + 1
      : deploymentBlock;

  if (
    chainHead <
    deploymentBlock
  ) {
    console.log(
      `RewardMine: chain head ${chainHead} below deployment block ${deploymentBlock}; waiting for chain to advance.`
    );

    await setIndexerState(
      deploymentBlock - 1
    );

    return;
  }

  const chunkSize =
    Number(
      process.env
        .INDEXER_CHUNK_SIZE ||
      500
    );

  while (
    nextBlock <=
    safeBlock
  ) {
    const end =
      Math.min(
        nextBlock +
          chunkSize -
          1,
        safeBlock
      );

    await processBlockRange(
      nextBlock,
      end
    );

    nextBlock =
      end + 1;
  }
}


if (require.main === module) {
  syncRewardMine()
    .then(() => {
      console.log(
        "Reward Mine sync complete."
      );

      process.exit(0);
    })
    .catch(
      (error) => {
        console.error(
          "Indexer failed:",
          error
        );

        process.exit(1);
      }
    );
}


module.exports = {
  syncRewardMine,
};
