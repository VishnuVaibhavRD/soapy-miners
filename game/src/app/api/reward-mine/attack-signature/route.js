import { NextResponse } from "next/server";

import {
  JsonRpcProvider,
  Contract,
  Wallet,
} from "quais";

import { serverSupabase }
  from "@/lib/serverSupabase";

import rewardMineAbi
  from "@/abi/SoapyRewardMine.json";


const RPC_URL =
  process.env.QUAI_RPC_URL;

const REWARD_ADDRESS =
  process.env
    .NEXT_PUBLIC_SOAPY_REWARD_MINE_CONTRACT_ADDRESS;

const SIGNER_PRIVATE_KEY =
  process.env
    .REWARD_MINE_DAMAGE_SIGNER_PRIVATE_KEY;


const SIGNATURE_TTL =
  Number(
    process.env
      .REWARD_ATTACK_SIGNATURE_TTL_SECONDS ||
    120
  );


const RATE_LIMIT_SECONDS =
  Number(
    process.env
      .REWARD_ATTACK_RATE_LIMIT_SECONDS ||
    5
  );


function normalizeAddress(
  value
) {
  return value
    ? value.toLowerCase()
    : null;
}


function randomInteger(
  min,
  max
) {
  const minimum =
    Math.ceil(min);

  const maximum =
    Math.floor(max);

  return (
    Math.floor(
      Math.random() *
        (
          maximum -
          minimum +
          1
        )
    ) +
    minimum
  );
}


function validateServerConfig() {
  if (!RPC_URL) {
    throw new Error(
      "Missing QUAI_RPC_URL"
    );
  }

  if (!REWARD_ADDRESS) {
    throw new Error(
      "Missing Reward Mine address"
    );
  }

  if (!SIGNER_PRIVATE_KEY) {
    throw new Error(
      "Missing damage signer private key"
    );
  }
}


async function checkRateLimit(
  player,
  tokenId
) {
  const since =
    new Date(
      Date.now() -
        RATE_LIMIT_SECONDS *
        1000
    ).toISOString();


  const {
    data,
    error,
  } =
    await serverSupabase
      .from(
        "reward_attack_signatures"
      )
      .select(
        "id, issued_at"
      )
      .eq(
        "player_wallet",
        normalizeAddress(
          player
        )
      )
      .eq(
        "token_id",
        Number(
          tokenId
        )
      )
      .gte(
        "issued_at",
        since
      )
      .limit(1);


  if (error) {
    throw error;
  }


  return (
    data &&
    data.length > 0
  );
}


export async function POST(
  request
) {
  try {
    validateServerConfig();


    const body =
      await request.json();


    const {
      mineId,
      tokenId,
      player,
    } =
      body;


    if (
      mineId === undefined ||
      tokenId === undefined ||
      !player
    ) {
      return NextResponse.json(
        {
          error:
            "mineId, tokenId and player are required",
        },
        {
          status: 400,
        }
      );
    }


    const numericMineId =
      Number(
        mineId
      );


    const numericTokenId =
      Number(
        tokenId
      );


    if (
      !Number.isInteger(
        numericMineId
      ) ||
      numericMineId <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid mineId",
        },
        {
          status: 400,
        }
      );
    }


    if (
      !Number.isInteger(
        numericTokenId
      ) ||
      numericTokenId <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid tokenId",
        },
        {
          status: 400,
        }
      );
    }


    const normalizedPlayer =
      normalizeAddress(
        player
      );


    const rateLimited =
      await checkRateLimit(
        normalizedPlayer,
        numericTokenId
      );


    if (rateLimited) {
      return NextResponse.json(
        {
          error:
            "Too many signature requests. Try again shortly.",
        },
        {
          status: 429,
        }
      );
    }


    const provider =
      new JsonRpcProvider(
        RPC_URL
      );


    const rewardContract =
      new Contract(
        REWARD_ADDRESS,
        rewardMineAbi,
        provider
      );


    const signerWallet =
      new Wallet(
        SIGNER_PRIVATE_KEY,
        provider
      );


    /*
      1. Check Reward Mine
    */

    const mine =
      await rewardContract.mines(
        numericMineId
      );


    const status =
      Number(
        mine.status
      );


    if (status !== 1) {
      return NextResponse.json(
        {
          error:
            "Reward Mine is not active",
        },
        {
          status: 400,
        }
      );
    }


    if (
      Number(
        mine.currentHealth
      ) <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Reward Mine is depleted",
        },
        {
          status: 400,
        }
      );
    }


    /*
      2. Check miner attack eligibility

      This remains a contract check,
      not a Supabase check.
    */

    const canAttack =
      await rewardContract
        .canMinerAttack(
          numericMineId,
          normalizedPlayer,
          numericTokenId
        );


    if (!canAttack) {
      return NextResponse.json(
        {
          error:
            "Miner cannot attack right now",
        },
        {
          status: 400,
        }
      );
    }


    /*
      3. Get current ON-CHAIN nonce

      This replaces Date.now().
    */

    const nonce =
      await rewardContract
        .rewardAttackNonce(
          numericTokenId
        );


    /*
      4. Read allowed damage
    */

    const damageRange =
      await rewardContract
        .getAllowedDamageRange(
          numericTokenId,
          normalizedPlayer
        );


    const minDamage =
      Number(
        damageRange[0]
      );


    const maxDamage =
      Number(
        damageRange[1]
      );


    if (
      minDamage <= 0 ||
      maxDamage < minDamage
    ) {
      throw new Error(
        "Invalid damage range returned by contract"
      );
    }


    /*
      5. Generate damage
    */

    const damage =
      randomInteger(
        minDamage,
        maxDamage
      );


    /*
      6. Short expiry
    */

    const now =
      Math.floor(
        Date.now() /
        1000
      );


    const deadline =
      now +
      SIGNATURE_TTL;


    /*
      7. Chain ID
    */

    const network =
      await provider
        .getNetwork();


    const chainId =
      network.chainId;


    /*
      8. EIP-712 domain
    */

    const domain = {
      name:
        "SoapyRewardMine",

      version:
        "1",

      chainId,

      verifyingContract:
        REWARD_ADDRESS,
    };


    const types = {
      Attack: [
        {
          name:
            "mineId",
          type:
            "uint256",
        },
        {
          name:
            "tokenId",
          type:
            "uint256",
        },
        {
          name:
            "player",
          type:
            "address",
        },
        {
          name:
            "damage",
          type:
            "uint256",
        },
        {
          name:
            "nonce",
          type:
            "uint256",
        },
        {
          name:
            "deadline",
          type:
            "uint256",
        },
      ],
    };


    const value = {
      mineId:
        BigInt(
          numericMineId
        ),

      tokenId:
        BigInt(
          numericTokenId
        ),

      player:
        normalizedPlayer,

      damage:
        BigInt(
          damage
        ),

      nonce,

      deadline:
        BigInt(
          deadline
        ),
    };


    /*
      9. Sign server-side
    */

    const signature =
      await signerWallet
        .signTypedData(
          domain,
          types,
          value
        );


    /*
      10. Store issued signature metadata.

      Private key/signature authority
      remains blockchain + server.
    */

    const {
      error:
        insertError,
    } =
      await serverSupabase
        .from(
          "reward_attack_signatures"
        )
        .upsert(
          {
            contract_address:
              normalizeAddress(
                REWARD_ADDRESS
              ),

            chain_mine_id:
              numericMineId,

            player_wallet:
              normalizedPlayer,

            token_id:
              numericTokenId,

            nonce:
              nonce.toString(),

            damage,

            min_damage:
              minDamage,

            max_damage:
              maxDamage,

            deadline,

            status:
              "ISSUED",

            issued_at:
              new Date()
                .toISOString(),
          },
          {
            onConflict:
              "contract_address,token_id,nonce",
          }
        );


    if (insertError) {
      throw insertError;
    }


    return NextResponse.json({
      mineId:
        numericMineId,

      tokenId:
        numericTokenId,

      player:
        normalizedPlayer,

      damage,

      minDamage,

      maxDamage,

      nonce:
        nonce.toString(),

      deadline,

      signature,
    });

  } catch (error) {
    console.error(
      "Attack signer error:",
      error
    );


    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to create attack signature",
      },
      {
        status: 500,
      }
    );
  }
}
