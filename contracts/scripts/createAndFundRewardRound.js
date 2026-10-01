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

const SoapyRewardMineArtifact = require(
  "../artifacts/contracts/SoapyRewardMine.sol/SoapyRewardMine.json"
);

const ROUND_STATUS = {
  0: "CREATED",
  1: "OPEN",
  2: "CLOSED",
  3: "SETTLED",
  4: "CANCELLED",
};

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

function decodeRound(round) {
  return {
    id: round.id ?? round[0],
    name: round.name ?? round[1],
    requiredPower:
      round.requiredPower ?? round[2],
    powerCap: round.powerCap ?? round[3],
    entryFee: round.entryFee ?? round[4],
    requiredAdminFunding:
      round.requiredAdminFunding ?? round[5],
    adminFundedAmount:
      round.adminFundedAmount ?? round[6],
    playerContributionAmount:
      round.playerContributionAmount ??
      round[7],
    startsAt: round.startsAt ?? round[8],
    endsAt: round.endsAt ?? round[9],
    totalDamage:
      round.totalDamage ?? round[10],
    distributablePool:
      round.distributablePool ?? round[11],
    status: Number(
      round.status ?? round[12]
    ),
    adminFundingWithdrawn: Boolean(
      round.adminFundingWithdrawn ??
        round[13]
    ),
  };
}

async function main() {
  const REWARD_MINE_ADDRESS =
    process.env.SOAPY_REWARD_MINE_CONTRACT_ADDRESS ||
    "0x0070B85836D07f8953eA0a26E3dE6738AAf28079";

  const privateKey =
    process.env.CYPRUS1_PK ||
    process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error(
      "Missing CYPRUS1_PK or PRIVATE_KEY in .env"
    );
  }

  const networkName =
    hre.network.name;

  const networkConfig =
    hre.network.config;

  const rpcUrl =
    networkConfig.url ||
    process.env.ORCHARD_RPC_URL ||
    "https://orchard.rpc.quai.network";

  const provider =
    new quais.JsonRpcProvider(
      rpcUrl,
      undefined,
      {
        usePathing: true,
      }
    );

  const wallet =
    new quais.Wallet(
      privateKey,
      provider
    );

  const reward =
    new quais.Contract(
      REWARD_MINE_ADDRESS,
      SoapyRewardMineArtifact.abi,
      wallet
    );

  console.log(
    "Admin:",
    wallet.address
  );

  console.log(
    "Network:",
    networkName
  );

  console.log(
    "RewardMine:",
    REWARD_MINE_ADDRESS
  );

  const balance =
    await provider.getBalance(
      wallet.address
    );

  console.log(
    `Admin balance: ${quais.formatQuai(balance)} QUAI`
  );

  if (balance < quais.parseQuai("1.1")) {
    throw new Error(
      "Admin needs at least ~1.1 QUAI for funding + gas"
    );
  }


  /* =====================================================
                    1. CURRENT TIMESTAMP
  ===================================================== */

  // quais getBlock("latest") can fail on Orchard ("Invalid shard").
  // eth_getBlockByNumber still returns a usable timestamp.
  const block =
    await provider.send(
      "eth_getBlockByNumber",
      ["latest", false]
    );

  const now =
    Number(
      BigInt(block.timestamp)
    );

  // 30 minutes — room for the next player-entry test
  const durationSeconds = 1800;

  const startsAt = now;
  const endsAt = now + durationSeconds;

  console.log(
    "\nBlock timestamp:",
    now
  );

  console.log(
    "Round window:",
    startsAt,
    "→",
    endsAt,
    `(${durationSeconds / 60} min)`
  );


  /* =====================================================
                    2. CREATE ROUND
  ===================================================== */

  console.log(
    "\nCreating Reward Round..."
  );

  const createTx =
    await reward.createRewardRound(
      "Test QUAI Vein I",
      0,
      50,
      quais.parseQuai("0.1"),
      quais.parseQuai("1"),
      startsAt,
      endsAt
    );

  console.log(
    "createRewardRound tx:",
    createTx.hash
  );

  const createReceipt =
    await waitForReceipt(
      provider,
      createTx.hash
    );

  if (Number(createReceipt.status) !== 1) {
    throw new Error(
      "createRewardRound failed"
    );
  }


  /* =====================================================
                    3. CONFIRM ROUND
  ===================================================== */

  const roundCount =
    await reward.roundCount();

  console.log(
    "roundCount:",
    roundCount.toString()
  );

  if (roundCount < 1n) {
    throw new Error(
      "Expected roundCount >= 1"
    );
  }

  const roundId = roundCount;

  let round =
    decodeRound(
      await reward.rounds(roundId)
    );

  console.log(
    "\n--- ROUND AFTER CREATE ---"
  );

  console.log({
    id: round.id.toString(),
    name: round.name,
    requiredPower:
      round.requiredPower.toString(),
    powerCap: round.powerCap.toString(),
    entryFee: `${quais.formatQuai(round.entryFee)} QUAI`,
    requiredAdminFunding: `${quais.formatQuai(round.requiredAdminFunding)} QUAI`,
    adminFundedAmount: `${quais.formatQuai(round.adminFundedAmount)} QUAI`,
    playerContributionAmount: `${quais.formatQuai(round.playerContributionAmount)} QUAI`,
    totalDamage:
      round.totalDamage.toString(),
    status: `${round.status} (${ROUND_STATUS[round.status]})`,
  });

  if (round.status !== 0) {
    throw new Error(
      "Expected status CREATED (0)"
    );
  }

  if (
    round.entryFee !==
    quais.parseQuai("0.1")
  ) {
    throw new Error(
      "Unexpected entryFee"
    );
  }

  if (
    round.requiredAdminFunding !==
    quais.parseQuai("1")
  ) {
    throw new Error(
      "Unexpected requiredAdminFunding"
    );
  }


  /* =====================================================
                    4. FUND 1 QUAI
  ===================================================== */

  console.log(
    "\nFunding round with 1 QUAI..."
  );

  const fundTx =
    await reward.fundRewardRound(
      roundId,
      {
        value: quais.parseQuai("1"),
      }
    );

  console.log(
    "fundRewardRound tx:",
    fundTx.hash
  );

  const fundReceipt =
    await waitForReceipt(
      provider,
      fundTx.hash
    );

  if (Number(fundReceipt.status) !== 1) {
    throw new Error(
      "fundRewardRound failed"
    );
  }

  round =
    decodeRound(
      await reward.rounds(roundId)
    );

  console.log(
    "adminFundedAmount:",
    `${quais.formatQuai(round.adminFundedAmount)} QUAI`
  );

  if (
    round.adminFundedAmount !==
    quais.parseQuai("1")
  ) {
    throw new Error(
      "Expected adminFundedAmount = 1 QUAI"
    );
  }


  /* =====================================================
                5. CONTRACT BALANCE
  ===================================================== */

  const contractBalance =
    await provider.getBalance(
      REWARD_MINE_ADDRESS
    );

  console.log(
    "Contract balance:",
    `${quais.formatQuai(contractBalance)} QUAI`
  );

  if (
    contractBalance !==
    quais.parseQuai("1")
  ) {
    throw new Error(
      `Expected contract balance 1 QUAI, got ${quais.formatQuai(contractBalance)}`
    );
  }


  /* =====================================================
                    6. OPEN ROUND
  ===================================================== */

  console.log(
    "\nOpening Reward Round..."
  );

  const openTx =
    await reward.openRewardRound(
      roundId
    );

  console.log(
    "openRewardRound tx:",
    openTx.hash
  );

  const openReceipt =
    await waitForReceipt(
      provider,
      openTx.hash
    );

  if (Number(openReceipt.status) !== 1) {
    throw new Error(
      "openRewardRound failed"
    );
  }

  round =
    decodeRound(
      await reward.rounds(roundId)
    );

  console.log(
    "status:",
    `${round.status} (${ROUND_STATUS[round.status]})`
  );

  if (round.status !== 1) {
    throw new Error(
      "Expected status OPEN (1)"
    );
  }


  /* =====================================================
                      SAVE RESULT
  ===================================================== */

  const deploymentDirectory =
    path.join(
      process.cwd(),
      "deployment"
    );

  fs.mkdirSync(
    deploymentDirectory,
    {
      recursive: true,
    }
  );

  const resultFile =
    path.join(
      deploymentDirectory,
      `${networkName}-reward-round-${roundId}.json`
    );

  fs.writeFileSync(
    resultFile,
    JSON.stringify(
      {
        network: networkName,
        chainId: networkConfig.chainId,
        rewardMine: REWARD_MINE_ADDRESS,
        roundId: Number(roundId),
        name: round.name,
        requiredPower: Number(
          round.requiredPower
        ),
        powerCap: Number(round.powerCap),
        entryFeeQuai: "0.1",
        requiredAdminFundingQuai: "1",
        adminFundedAmountQuai: "1",
        contractBalanceQuai: "1",
        startsAt,
        endsAt,
        durationMinutes:
          durationSeconds / 60,
        status: ROUND_STATUS[round.status],
        createTx: createTx.hash,
        fundTx: fundTx.hash,
        openTx: openTx.hash,
        createdAt:
          new Date().toISOString(),
      },
      null,
      2
    )
  );


  console.log(
    "\n=============================="
  );

  console.log(
    "REWARD ROUND READY"
  );

  console.log(
    "Round ID:",
    roundId.toString()
  );

  console.log(
    "Status: OPEN"
  );

  console.log(
    "Admin funded / contract balance: 1 QUAI"
  );

  console.log(
    "Entry fee: 0.1 QUAI"
  );

  console.log(
    "Ends at unix:",
    endsAt
  );

  console.log(
    "Saved:",
    resultFile
  );

  console.log(
    "=============================="
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
