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
  eventTopics,
  zoneRpcUrl,
} = require("./indexerUtils");

const marketplaceAbi =
  require(
    "../../artifacts/contracts/SoapyMarketplace.sol/SoapyMarketplace.json"
  ).abi;

const marketplaceInterface =
  new Interface(marketplaceAbi);

const MARKETPLACE_TOPICS =
  eventTopics(
    marketplaceInterface,
    keccak256,
    toUtf8Bytes
  );


const RPC_URL =
  process.env.QUAI_RPC_URL;

const MARKETPLACE_ADDRESS =
  process.env
    .SOAPY_MARKETPLACE_CONTRACT_ADDRESS;

const SUPABASE_URL =
  process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env
    .SUPABASE_SERVICE_ROLE_KEY;

const NETWORK =
  process.env.QUAI_NETWORK_NAME ||
  "cyprus1";


if (!RPC_URL) {
  throw new Error(
    "Missing QUAI_RPC_URL"
  );
}

if (!MARKETPLACE_ADDRESS) {
  throw new Error(
    "Missing SOAPY_MARKETPLACE_CONTRACT_ADDRESS"
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
          MARKETPLACE_ADDRESS
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
              MARKETPLACE_ADDRESS
            ),

          contract_type:
            "marketplace",

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


async function handleListingCreated(
  event
) {
  const {
    listingId,
    seller,
    sellerTokenId,
    resourceType,
    amount,
    price,
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
      .from(
        "marketplace_listings"
      )
      .upsert(
        {
          contract_address:
            normalizeAddress(
              MARKETPLACE_ADDRESS
            ),

          chain_listing_id:
            Number(
              listingId
            ),

          seller_wallet:
            normalizeAddress(
              seller
            ),

          seller_token_id:
            Number(
              sellerTokenId
            ),

          resource_type:
            Number(
              resourceType
            ),

          amount:
            Number(
              amount
            ),

          price_gd:
            price.toString(),

          status:
            "ACTIVE",

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
            "contract_address,chain_listing_id",
        }
      );


  if (error) {
    throw error;
  }


  await insertActivity({
    player: seller,
    tokenId: sellerTokenId,
    type:
      "MARKET_LISTED",
    event,
    metadata: {
      listingId:
        Number(
          listingId
        ),
      resourceType:
        Number(
          resourceType
        ),
      amount:
        Number(
          amount
        ),
      priceGD:
        price.toString(),
    },
  });
}


async function handleListingSold(
  event
) {
  const {
    listingId,
    seller,
    buyer,
    buyerTokenId,
    resourceType,
    amount,
    price,
    fee,
  } =
    event.args;


  const timestamp =
    await getBlockTimestamp(
      event.blockNumber
    );


  const contractAddress =
    normalizeAddress(
      MARKETPLACE_ADDRESS
    );


  /*
    Update indexed listing.
  */

  {
    const {
      error,
    } =
      await supabase
        .from(
          "marketplace_listings"
        )
        .update(
          {
            status:
              "SOLD",

            buyer_wallet:
              normalizeAddress(
                buyer
              ),

            buyer_token_id:
              Number(
                buyerTokenId
              ),

            sold_tx:
              event.transactionHash,

            sold_at:
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
          contractAddress
        )
        .eq(
          "chain_listing_id",
          Number(
            listingId
          )
        );


    if (error) {
      throw error;
    }
  }


  /*
    Add immutable sale history.
  */

  {
    const {
      error,
    } =
      await supabase
        .from(
          "marketplace_sales"
        )
        .upsert(
          {
            contract_address:
              contractAddress,

            chain_listing_id:
              Number(
                listingId
              ),

            seller_wallet:
              normalizeAddress(
                seller
              ),

            buyer_wallet:
              normalizeAddress(
                buyer
              ),

            buyer_token_id:
              Number(
                buyerTokenId
              ),

            resource_type:
              Number(
                resourceType
              ),

            amount:
              Number(
                amount
              ),

            price_gd:
              price.toString(),

            fee_gd:
              fee.toString(),

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

            sold_at:
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
    Activity feed.
  */

  await insertActivity({
    player: buyer,
    tokenId: buyerTokenId,
    type:
      "MARKET_SOLD",
    event,
    metadata: {
      listingId:
        Number(
          listingId
        ),
      seller:
        normalizeAddress(
          seller
        ),
      resourceType:
        Number(
          resourceType
        ),
      amount:
        Number(
          amount
        ),
      priceGD:
        price.toString(),
      feeGD:
        fee.toString(),
    },
  });
}


async function handleListingCancelled(
  event
) {
  const {
    listingId,
    seller,
    returnTokenId,
    resourceType,
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
      .from(
        "marketplace_listings"
      )
      .update(
        {
          status:
            "CANCELLED",

          return_token_id:
            Number(
              returnTokenId
            ),

          cancelled_tx:
            event.transactionHash,

          cancelled_at:
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
          MARKETPLACE_ADDRESS
        )
      )
      .eq(
        "chain_listing_id",
        Number(
          listingId
        )
      );


  if (error) {
    throw error;
  }


  await insertActivity({
    player: seller,
    tokenId: returnTokenId,
    type:
      "MARKET_CANCELLED",
    event,
    metadata: {
      listingId:
        Number(
          listingId
        ),
      resourceType:
        Number(
          resourceType
        ),
      amount:
        Number(
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
              MARKETPLACE_ADDRESS,
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
              MARKETPLACE_ADDRESS
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
    case "ListingCreated":
      await handleListingCreated(
        event
      );
      break;

    case "ListingSold":
      await handleListingSold(
        event
      );
      break;

    case "ListingCancelled":
      await handleListingCancelled(
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
    `Marketplace ${fromBlock} → ${toBlock}`
  );


  const events =
    await withRetry(
      () =>
        fetchEvents(
          zoneProvider,
          marketplaceInterface,
          MARKETPLACE_ADDRESS,
          MARKETPLACE_TOPICS,
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


async function syncMarketplace() {
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
        .MARKETPLACE_DEPLOYMENT_BLOCK
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
      "Invalid MARKETPLACE_DEPLOYMENT_BLOCK"
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
      `Marketplace: chain head ${chainHead} below deployment block ${deploymentBlock}; waiting for chain to advance.`
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
  syncMarketplace()
    .then(() => {
      console.log(
        "Marketplace sync complete."
      );

      process.exit(0);
    })
    .catch(
      (error) => {
        console.error(
          "Marketplace indexer failed:",
          error
        );

        process.exit(1);
      }
    );
}


module.exports = {
  syncMarketplace,
};
