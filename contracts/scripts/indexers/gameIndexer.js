require("dotenv").config();

const {
  createClient,
} = require("@supabase/supabase-js");

const {
  JsonRpcProvider,
  Interface,
  keccak256,
  toUtf8Bytes,
} = require("quais");

const {
  normalizeAddress,
  getLogIndex,
  getEventId,
  sortEvents,
  withRetry,
  fetchEvents,
  getChainHead,
  decodeLogs,
  zoneRpcUrl,
} = require("./indexerUtils");

const gameAbi =
  require(
    "../../artifacts/contracts/SoapyMinerGame.sol/SoapyMinerGame.json"
  ).abi;

const gameInterface =
  new Interface(gameAbi);

function topic0(
  signature
) {
  return keccak256(
    toUtf8Bytes(signature)
  );
}

const GAME_TOPICS = [
  topic0(
    "ExpeditionStarted(address,uint256,uint256,uint256)"
  ),
  topic0(
    "LootClaimed(address,uint256,uint256,uint256,uint256,uint256,uint256)"
  ),
  topic0(
    "PickaxeUpgraded(address,uint256,uint256)"
  ),
  topic0(
    "BackpackUpgraded(address,uint256,uint256)"
  ),
];


const RPC_URL =
  process.env.QUAI_RPC_URL;

const GAME_ADDRESS =
  process.env
    .SOAPY_GAME_CONTRACT_ADDRESS;

const SUPABASE_URL =
  process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env
    .SUPABASE_SERVICE_ROLE_KEY;

const NETWORK =
  process.env.QUAI_NETWORK_NAME ||
  "cyprus1";


const provider =
  new JsonRpcProvider(
    RPC_URL
  );


// Zone-scoped provider for getLogs (Quai sharding). Falls back to
// the root RPC if the zone endpoint is unreachable in this env.
const zoneProvider =
  new JsonRpcProvider(
    zoneRpcUrl()
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
        normalizeAddress(
          GAME_ADDRESS
        )
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
            normalizeAddress(
              GAME_ADDRESS
            ),

          contract_type:
            "game",

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


async function handleExpeditionStarted(
  event
) {
  const {
    player,
    tokenId,
    mineId,
    endsAt,
  } =
    event.args;


  const startedAt =
    await getBlockTimestamp(
      event.blockNumber
    );


  const endsAtIso =
    new Date(
      Number(
        endsAt
      ) * 1000
    ).toISOString();


  const {
    error,
  } =
    await supabase
      .from("expeditions")
      .upsert(
        {
          game_contract_address:
            normalizeAddress(
              GAME_ADDRESS
            ),

          token_id:
            Number(
              tokenId
            ),

          player_wallet:
            normalizeAddress(
              player
            ),

          mine_id:
            Number(
              mineId
            ),

          status:
            "MINING",

          started_at:
            startedAt,

          ends_at:
            endsAtIso,

          start_tx:
            event.transactionHash,

          start_block:
            Number(
              event.blockNumber
            ),

          updated_at:
            startedAt,
        },
        {
          onConflict:
            "start_tx,token_id",
        }
      );


  if (error) {
    throw error;
  }


  await insertGameActivity({
    player,
    tokenId,
    type:
      "MINING_STARTED",

    event,

    metadata: {
      mineId:
        Number(
          mineId
        ),

      endsAt:
        endsAtIso,
    },
  });
}


async function handleLootClaimed(
  event
) {
  const {
    player,
    tokenId,
    mineId,
    ore,
    crystal,
    core,
    xp,
  } =
    event.args;


  const timestamp =
    await getBlockTimestamp(
      event.blockNumber
    );


  /*
    Find most recent still-MINING
    expedition for this miner.
  */

  const {
    data: expedition,
    error: findError,
  } =
    await supabase
      .from("expeditions")
      .select("*")
      .eq(
        "game_contract_address",
        normalizeAddress(
          GAME_ADDRESS
        )
      )
      .eq(
        "token_id",
        Number(
          tokenId
        )
      )
      .eq(
        "status",
        "MINING"
      )
      .order(
        "started_at",
        {
          ascending: false,
        }
      )
      .limit(1)
      .maybeSingle();


  if (findError) {
    throw findError;
  }


  if (expedition) {
    const {
      error,
    } =
      await supabase
        .from("expeditions")
        .update({
          status:
            "CLAIMED",

          claimed_at:
            timestamp,

          ore:
            Number(
              ore
            ),

          crystal:
            Number(
              crystal
            ),

          core:
            Number(
              core
            ),

          xp:
            Number(
              xp
            ),

          claim_tx:
            event.transactionHash,

          claim_block:
            Number(
              event.blockNumber
            ),

          updated_at:
            timestamp,
        })
        .eq(
          "id",
          expedition.id
        );


    if (error) {
      throw error;
    }
  }


  await insertGameActivity({
    player,
    tokenId,
    type:
      "MINING_CLAIMED",

    event,

    metadata: {
      mineId:
        Number(
          mineId
        ),

      ore:
        Number(
          ore
        ),

      crystal:
        Number(
          crystal
        ),

      core:
        Number(
          core
        ),

      xp:
        Number(
          xp
        ),
    },
  });
}


async function handlePickaxeUpgraded(
  event
) {
  const {
    player,
    tokenId,
    newLevel,
  } =
    event.args;


  await insertGameActivity({
    player,
    tokenId,
    type:
      "PICKAXE_UPGRADED",

    event,

    metadata: {
      level:
        Number(
          newLevel
        ),
    },
  });
}


async function handleBackpackUpgraded(
  event
) {
  const {
    player,
    tokenId,
    newLevel,
  } =
    event.args;


  await insertGameActivity({
    player,
    tokenId,
    type:
      "BACKPACK_UPGRADED",

    event,

    metadata: {
      level:
        Number(
          newLevel
        ),
    },
  });
}


async function insertGameActivity({
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
              GAME_ADDRESS,
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
              GAME_ADDRESS
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
    case "ExpeditionStarted":
      await handleExpeditionStarted(
        event
      );
      break;

    case "LootClaimed":
      await handleLootClaimed(
        event
      );
      break;

    case "PickaxeUpgraded":
      await handlePickaxeUpgraded(
        event
      );
      break;

    case "BackpackUpgraded":
      await handleBackpackUpgraded(
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
    `Game ${fromBlock} → ${toBlock}`
  );


  const events =
    await withRetry(
      () =>
        fetchEvents(
          zoneProvider,
          gameInterface,
          GAME_ADDRESS,
          GAME_TOPICS,
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


async function syncGame() {
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
        .GAME_DEPLOYMENT_BLOCK
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
      "Invalid GAME_DEPLOYMENT_BLOCK"
    );
  }

  let nextBlock =
    state
      ? Number(
          state
            .last_processed_block
        ) + 1
      : deploymentBlock;

  if (
    chainHead <
    deploymentBlock
  ) {
    console.log(
      `Game: chain head ${chainHead} below deployment block ${deploymentBlock}; waiting for chain to advance.`
    );

    // Persist the deployment block as the checkpoint so a
    // later, higher head resumes from the right place.
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
  syncGame()
    .then(() => {
      console.log(
        "Game sync complete."
      );

      process.exit(0);
    })
    .catch(
      (error) => {
        console.error(
          "Game indexer failed:",
          error
        );

        process.exit(1);
      }
    );
}


module.exports = {
  syncGame,
};
