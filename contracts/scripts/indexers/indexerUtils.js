function normalizeAddress(
  value
) {
  return value
    ? value.toLowerCase()
    : null;
}


/*
  Resolve the ZONE RPC URL used for log fetching.

  Quai is sharded: each contract lives in a zone determined by
  its address prefix. getLogs is zone-scoped, so a single gateway
  RPC (e.g. orchard.rpc.quai.network) cannot return logs for
  contracts in another zone. All Soapy contracts use the 0x00..
  prefix => Cyprus1 zone, whose RPC is the gateway + "/cyprus1".

  QUAI_ZONE_RPC_URL overrides; otherwise derive from QUAI_RPC_URL.
*/

function zoneRpcUrl() {
  if (
    process.env
      .QUAI_ZONE_RPC_URL
  ) {
    return process.env
      .QUAI_ZONE_RPC_URL;
  }

  const base =
    process.env.QUAI_RPC_URL ||
    "";

  if (
    base.endsWith("/cyprus1")
  ) {
    return base;
  }

  return base.replace(
    /\/$/,
    ""
  ) + "/cyprus1";
}


function getLogIndex(
  event
) {
  return Number(
    event.index ??
    event.logIndex ??
    0
  );
}


function getEventName(
  event
) {
  return (
    event.fragment?.name ||
    "UNKNOWN_EVENT"
  );
}


function getEventId(
  contractAddress,
  event
) {
  return [
    normalizeAddress(
      contractAddress
    ),

    event.transactionHash,

    getLogIndex(
      event
    ),

    getEventName(
      event
    ),
  ].join(":");
}


function sortEvents(
  events
) {
  return [...events]
    .sort(
      (a, b) => {
        const blockA =
          Number(
            a.blockNumber
          );

        const blockB =
          Number(
            b.blockNumber
          );

        if (
          blockA !==
          blockB
        ) {
          return (
            blockA -
            blockB
          );
        }

        return (
          getLogIndex(a) -
          getLogIndex(b)
        );
      }
    );
}


async function withRetry(
  fn,
  {
    attempts = 4,
    delayMs = 1500,
  } = {}
) {
  let lastError;


  for (
    let attempt = 1;
    attempt <= attempts;
    attempt++
  ) {
    try {
      return await fn();

    } catch (error) {
      lastError =
        error;

      if (
        attempt ===
        attempts
      ) {
        break;
      }


      console.warn(
        `Attempt ${attempt} failed. Retrying...`
      );


      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            delayMs *
              attempt
          )
      );
    }
  }


  throw lastError;
}


/*
  Quai's pathing RPC returns a broken/empty result from
  quais' provider.getLogs (it throws internally), but the
  raw eth_getLogs JSON-RPC method works fine. This helper
  wraps it so the indexers can rely on a usable response.
*/

async function rawGetLogs(
  provider,
  {
    address,
    topics,
    fromBlock,
    toBlock,
  }
) {
  const params = {
    fromBlock:
      "0x" +
      Number(fromBlock)
        .toString(16),

    toBlock:
      toBlock === "latest"
        ? "latest"
        : "0x" +
          Number(toBlock)
            .toString(16),
  };

  if (address) {
    params.address =
      normalizeAddress(
        address
      );
  }

  if (topics) {
    params.topics = topics;
  }

  const result =
    await withTimeout(
      provider.send(
        "eth_getLogs",
        [params]
      ),
      Number(
        process.env
          .INDEXER_RPC_TIMEOUT_MS ||
        20000
      )
    );

  return Array.isArray(result)
    ? result
    : [];
}


/*
  Race a promise against a timeout so an unreachable zone RPC
  (Quai sharding) fails fast instead of hanging the sync loop.
*/

function withTimeout(
  promise,
  ms
) {
  return new Promise(
    (resolve, reject) => {
      const timer =
        setTimeout(
          () =>
            reject(
              new Error(
                `eth_getLogs timed out after ${ms}ms`
              )
            ),
          ms
        );

      promise
        .then(
          (value) => {
            clearTimeout(timer);

            resolve(value);
          },
          (error) => {
            clearTimeout(timer);

            reject(error);
          }
        );
    }
  );
}


/*
  Real chain head on pathing RPCs: getBlockNumber() returns
  a low per-shard head, and getLogs-based probing is
  unreliable. eth_getBlockByNumber(["latest"]) returns the
  canonical head, which is what we want for safe scanning.
*/

async function getChainHead(
  provider
) {
  const block =
    await provider.send(
      "eth_getBlockByNumber",
      ["latest", false]
    );

  if (
    !block ||
    block.number == null
  ) {
    throw new Error(
      "eth_getBlockByNumber returned no head"
    );
  }

  return Number(
    block.number
  );
}


/*
  Fetch and decode events for a contract over a block range.

  topics: optional array (or array-of-arrays) of topic0
  filters. Returns decoded logs with { fragment, args,
  blockNumber, transactionHash, logIndex } shape compatible
  with the rest of the indexer code.
*/

function decodeLogs(
  iface,
  logs
) {
  const events = [];

  for (
    const log of logs
  ) {
    try {
      const parsed =
        iface.parseLog({
          topics:
            log.topics,
          data:
            log.data,
        });

      if (!parsed) {
        continue;
      }

      events.push({
        fragment: {
          name:
            parsed.name,
        },

        args:
          parsed.args,

        blockNumber:
          Number(
            log.blockNumber
          ),

        transactionHash:
          log.transactionHash,

        logIndex:
          Number(
            log.logIndex
          ),

        index:
          Number(
            log.logIndex
          ),
      });

    } catch {
      // Ignore logs that do not match the expected ABI.
    }
  }

  return events;
}


async function fetchEvents(
  provider,
  iface,
  contractAddress,
  topic0List,
  fromBlock,
  toBlock
) {
  const topics =
    topic0List.length === 1
      ? [topic0List[0]]
      : [topic0List];

  const logs =
    await rawGetLogs(
      provider,
      {
        address:
          contractAddress,

        topics,

        fromBlock,

        toBlock,
      }
    );

  return decodeLogs(
    iface,
    logs
  );
}


/*
  Build the topic0 hash for every event in an ABI
  Interface. This avoids hardcoding event signatures and
  works around quais' missing getEventTopic on this fork.
*/

function eventTopics(
  iface,
  keccak256Fn,
  toUtf8BytesFn
) {
  const topics = [];

  for (
    const fragment of iface.fragments
  ) {
    if (
      fragment.type !==
      "event"
    ) {
      continue;
    }

    const inputs =
      fragment.inputs
        .map(
          (i) => i.type
        )
        .join(",");

    const signature =
      `${fragment.name}(${inputs})`;

    topics.push(
      keccak256Fn(
        toUtf8BytesFn(signature)
      )
    );
  }

  return topics;
}


/*
  Discover the real chain tip on pathing RPCs where
  provider.getBlockNumber() returns a low per-shard head
  that is far below the actual deployment/event blocks.

  Strategy: probe with raw eth_getLogs over a single
  block. A range that exists returns (possibly empty);
  once we walk past the real head the RPC errors. We
  exponential-search forward then binary-search the last
  reachable block.
*/

async function blockExists(
  provider,
  address,
  block
) {
  const logs =
    await rawGetLogs(
      provider,
      {
        address,
        fromBlock: block,
        toBlock: block,
      }
    );

  return Array.isArray(logs);
}


async function discoverTip(
  provider,
  address,
  floorBlock
) {
  // Confirm the floor is queryable; if not, the chain is
  // behind the floor and we treat the floor as the tip.
  let exists;

  try {
    exists =
      await blockExists(
        provider,
        address,
        floorBlock
      );

  } catch {
    exists = false;
  }

  if (!exists) {
    return floorBlock;
  }

  // Exponential search forward.
  let lo = floorBlock;
  let hi = floorBlock + 1;

  while (true) {
    let ok;

    try {
      ok =
        await blockExists(
          provider,
          address,
          hi
        );

    } catch {
      ok = false;
    }

    if (!ok) {
      break;
    }

    lo = hi;
    hi =
      hi * 2 -
      floorBlock;

    // Guard against runaway if the probe never errors.
    if (
      hi - floorBlock >
      5_000_000
    ) {
      break;
    }
  }

  // Binary search the last reachable block in [lo, hi].
  while (
    hi - lo >
    1
  ) {
    const mid =
      Math.floor(
        (lo + hi) / 2
      );

    let ok;

    try {
      ok =
        await blockExists(
          provider,
          address,
          mid
        );

    } catch {
      ok = false;
    }

    if (ok) {
      lo = mid;

    } else {
      hi = mid;
    }
  }

  return lo;
}


module.exports = {
  normalizeAddress,
  getLogIndex,
  getEventName,
  getEventId,
  sortEvents,
  withRetry,
  rawGetLogs,
  getChainHead,
  decodeLogs,
  fetchEvents,
  eventTopics,
  zoneRpcUrl,
  discoverTip,
};
