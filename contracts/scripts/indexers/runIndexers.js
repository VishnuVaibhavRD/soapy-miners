require("dotenv").config();

const {
  syncGame,
} = require(
  "./gameIndexer"
);

const {
  syncMarketplace,
} = require(
  "./marketplaceIndexer"
);

const {
  syncRewardMine,
} = require(
  "./rewardMineIndexer"
);


const intervalMs =
  Number(
    process.env
      .INDEXER_POLL_INTERVAL_MS ||
    15000
  );


let syncing = false;


async function syncAll() {
  if (syncing) {
    console.log(
      "Previous sync still running."
    );

    return;
  }


  syncing = true;


  try {
    console.log(
      "\n--- INDEXER SYNC START ---"
    );


    await syncGame();

    await syncMarketplace();

    await syncRewardMine();


    console.log(
      "--- INDEXER SYNC COMPLETE ---\n"
    );

  } catch (error) {
    console.error(
      "Indexer sync failed:",
      error
    );

  } finally {
    syncing = false;
  }
}


async function main() {
  console.log(
    "Soapy indexer running..."
  );

  console.log(
    `Poll interval: ${intervalMs}ms`
  );


  await syncAll();


  setInterval(
    syncAll,
    intervalMs
  );
}


main().catch(
  (error) => {
    console.error(
      error
    );

    process.exit(1);
  }
);
