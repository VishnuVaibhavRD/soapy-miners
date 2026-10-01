"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getActiveRewardMines,
  getFinishedRewardMines,
  getMinerRewardEligibility,
  getMinerDamageRange,
  getPlayerRewardMineState,
  getPlayerRewardAmount,
  claimRewardMineReward,
  attackRewardMine,
  getRewardMineLeaderboard,
  getRecentRewardMineAttacks,
} from "@/lib/rewardMineContract";

import {
  requestRewardMineAttackSignature,
} from "@/lib/rewardMineAttack";

import {
  getMinerGameData,
} from "@/lib/gameContract";


export default function RewardMineWindow({
  wallet,
  provider,
  signer,
  ownedMiners,
  onClose,
  onRefreshGame,
}) {
  const [
    rewardTab,
    setRewardTab,
  ] = useState("active");

  const [
    mines,
    setMines,
  ] = useState([]);

  const [
    selectedMine,
    setSelectedMine,
  ] = useState(null);

  const [
    selectedMiner,
    setSelectedMiner,
  ] = useState(null);

  const [
    minerGame,
    setMinerGame,
  ] = useState(null);

  const [
    eligibility,
    setEligibility,
  ] = useState(null);

  const [
    damageRange,
    setDamageRange,
  ] = useState(null);

  const [
    playerState,
    setPlayerState,
  ] = useState(null);

  const [
    finishedMines,
    setFinishedMines,
  ] = useState([]);

  const [
    selectedFinishedMine,
    setSelectedFinishedMine,
  ] = useState(null);

  const [
    finishedPlayerState,
    setFinishedPlayerState,
  ] = useState(null);

  const [
    claimableReward,
    setClaimableReward,
  ] = useState("0");

  const [
    claiming,
    setClaiming,
  ] = useState(false);

  const [
    claimMessage,
    setClaimMessage,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    attacking,
    setAttacking,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    attackResult,
    setAttackResult,
  ] = useState(null);

  const [
    leaderboard,
    setLeaderboard,
  ] = useState([]);

  const [
    recentAttacks,
    setRecentAttacks,
  ] = useState([]);

  const [
    livePlayerState,
    setLivePlayerState,
  ] = useState(null);


  async function loadMineSocialData(
    mine = selectedMine
  ) {
    if (
      !provider ||
      !mine
    ) {
      return;
    }

    try {
      const [
        leaders,
        attacks,
        walletState,
      ] =
        await Promise.all([
          getRewardMineLeaderboard(
            provider,
            mine.id
          ),

          getRecentRewardMineAttacks(
            provider,
            mine.id,
            15
          ),

          wallet
            ? getPlayerRewardMineState(
                provider,
                mine.id,
                wallet
              )
            : Promise.resolve(null),
        ]);

      setLeaderboard(
        leaders
      );

      setRecentAttacks(
        attacks
      );

      setLivePlayerState(
        walletState
      );

    } catch (err) {
      console.error(
        "Failed to load Reward Mine activity:",
        err
      );
    }
  }


  async function loadMines() {
    if (!provider) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [
        active,
        finished,
      ] =
        await Promise.all([
          getActiveRewardMines(
            provider
          ),

          getFinishedRewardMines(
            provider
          ),
        ]);

      setMines(active);

      setFinishedMines(
        finished
      );

      if (active.length > 0) {
        setSelectedMine(
          (previous) => {
            if (previous) {
              const refreshed =
                active.find(
                  (mine) =>
                    mine.id ===
                    previous.id
                );

              if (refreshed) {
                return refreshed;
              }
            }

            return active[0];
          }
        );
      } else {
        setSelectedMine(null);
      }

      if (finished.length > 0) {
        setSelectedFinishedMine(
          (previous) => {
            if (previous) {
              const refreshed =
                finished.find(
                  (mine) =>
                    mine.id ===
                    previous.id
                );

              if (refreshed) {
                return refreshed;
              }
            }

            return previous;
          }
        );
      }

    } catch (err) {
      console.error(
        "Failed to load Reward Mines:",
        err
      );

      setError(
        err?.shortMessage ||
        err?.message ||
        "Failed to load Reward Mine."
      );

    } finally {
      setLoading(false);
    }
  }


  async function selectMiner(
    miner
  ) {
    if (
      !provider ||
      !wallet ||
      !selectedMine
    ) {
      return;
    }

    try {
      setError("");
      setAttackResult(null);

      setSelectedMiner(
        miner
      );

      const [
        gameData,
        attackEligibility,
        range,
        state,
      ] =
        await Promise.all([
          getMinerGameData(
            provider,
            miner.tokenId
          ),

          getMinerRewardEligibility(
            provider,
            selectedMine.id,
            wallet,
            miner.tokenId
          ),

          getMinerDamageRange(
            provider,
            miner.tokenId,
            wallet
          ),

          getPlayerRewardMineState(
            provider,
            selectedMine.id,
            wallet
          ),
        ]);

      setMinerGame(
        gameData
      );

      setEligibility(
        attackEligibility
      );

      setDamageRange(
        range
      );

      setPlayerState(
        state
      );

    } catch (err) {
      console.error(
        "Failed to load miner Reward Mine state:",
        err
      );

      setError(
        err?.shortMessage ||
        err?.message ||
        "Failed to check miner."
      );
    }
  }


  async function refreshSelectedMiner() {
    if (
      !selectedMiner ||
      !selectedMine
    ) {
      return;
    }

    await selectMiner(
      selectedMiner
    );
  }


  async function selectFinishedMine(
    mine
  ) {
    if (
      !provider ||
      !wallet
    ) {
      return;
    }

    try {
      setError("");
      setClaimMessage("");

      setSelectedFinishedMine(
        mine
      );

      const [
        state,
        reward,
      ] =
        await Promise.all([
          getPlayerRewardMineState(
            provider,
            mine.id,
            wallet
          ),

          getPlayerRewardAmount(
            provider,
            mine.id,
            wallet
          ),
        ]);

      setFinishedPlayerState(
        state
      );

      setClaimableReward(
        reward
      );

    } catch (err) {
      console.error(
        "Failed to load finished mine:",
        err
      );

      setError(
        err?.shortMessage ||
        err?.message ||
        "Failed to load reward."
      );
    }
  }


  async function handleAttack() {
    try {
      if (!signer) {
        throw new Error(
          "Wallet signer unavailable."
        );
      }

      if (!wallet) {
        throw new Error(
          "Connect wallet first."
        );
      }

      if (!selectedMine) {
        throw new Error(
          "No active Reward Mine."
        );
      }

      if (!selectedMiner) {
        throw new Error(
          "Select a Soapy."
        );
      }

      if (
        !eligibility?.canAttack
      ) {
        throw new Error(
          "This Soapy cannot attack right now."
        );
      }

      setAttacking(true);
      setError("");
      setAttackResult(null);


      const signedAttack =
        await requestRewardMineAttackSignature({
          mineId:
            selectedMine.id,

          tokenId:
            selectedMiner.tokenId,

          player:
            wallet,
        });


      await attackRewardMine(
        signer,
        {
          mineId:
            selectedMine.id,

          tokenId:
            selectedMiner.tokenId,

          damage:
            signedAttack.damage,

          nonce:
            signedAttack.nonce,

          deadline:
            signedAttack.deadline,

          signature:
            signedAttack.signature,
        }
      );


      setAttackResult({
        damage:
          signedAttack.damage,

        minDamage:
          signedAttack.minDamage,

        maxDamage:
          signedAttack.maxDamage,
      });


      await loadMines();

      await refreshSelectedMiner();

      await loadMineSocialData(
        selectedMine
      );

      if (onRefreshGame) {
        await onRefreshGame();
      }

    } catch (err) {
      console.error(
        "Reward Mine attack failed:",
        err
      );

      setError(
        err?.shortMessage ||
        err?.reason ||
        err?.message ||
        "Attack failed."
      );

    } finally {
      setAttacking(false);
    }
  }


  async function handleClaimReward() {
    try {
      if (!signer) {
        throw new Error(
          "Wallet signer unavailable."
        );
      }

      if (!selectedFinishedMine) {
        throw new Error(
          "No finished mine selected."
        );
      }

      if (
        !finishedPlayerState
          ?.participated
      ) {
        throw new Error(
          "You did not participate in this mine."
        );
      }

      if (
        finishedPlayerState
          ?.rewardClaimed
      ) {
        throw new Error(
          "Reward already claimed."
        );
      }

      if (
        Number(
          claimableReward
        ) <= 0
      ) {
        throw new Error(
          "No QUAI reward available."
        );
      }

      setClaiming(true);
      setError("");
      setClaimMessage("");

      const claimedAmount =
        claimableReward;

      await claimRewardMineReward(
        signer,
        selectedFinishedMine.id
      );

      const [
        updatedState,
        updatedReward,
      ] =
        await Promise.all([
          getPlayerRewardMineState(
            provider,
            selectedFinishedMine.id,
            wallet
          ),

          getPlayerRewardAmount(
            provider,
            selectedFinishedMine.id,
            wallet
          ),
        ]);

      setFinishedPlayerState(
        updatedState
      );

      setClaimableReward(
        updatedReward
      );

      setClaimMessage(
        `Claimed ${claimedAmount} QUAI successfully.`
      );

      await loadMines();

      if (onRefreshGame) {
        await onRefreshGame();
      }

    } catch (err) {
      console.error(
        "Reward claim failed:",
        err
      );

      setError(
        err?.shortMessage ||
        err?.reason ||
        err?.message ||
        "Reward claim failed."
      );

    } finally {
      setClaiming(false);
    }
  }


  useEffect(() => {
    loadMines();
  }, [provider]);


  useEffect(() => {
    setSelectedMiner(null);
    setMinerGame(null);
    setEligibility(null);
    setDamageRange(null);
    setPlayerState(null);
    setAttackResult(null);
  }, [selectedMine?.id]);


  useEffect(() => {
    if (selectedMine) {
      loadMineSocialData(
        selectedMine
      );
    } else {
      setLeaderboard([]);
      setRecentAttacks([]);
      setLivePlayerState(null);
    }
  }, [
    selectedMine?.id,
    provider,
    wallet,
  ]);


  useEffect(() => {
    if (
      rewardTab === "finished" &&
      selectedFinishedMine &&
      wallet &&
      provider
    ) {
      selectFinishedMine(
        selectedFinishedMine
      );
    }
  }, [rewardTab]);


  const healthPercent =
    useMemo(() => {
      if (
        !selectedMine ||
        selectedMine.maxHealth === 0
      ) {
        return 0;
      }

      return (
        selectedMine.currentHealth /
        selectedMine.maxHealth
      ) * 100;
    }, [selectedMine]);


  return (
    <div className="game-window-backdrop">

      <section className="game-dialog-window reward-player-window">

        <button
          type="button"
          className="dialog-close"
          onClick={onClose}
          disabled={
            attacking ||
            claiming
          }
        >
          ×
        </button>


        <p className="dialog-character">
          QUAI DEPTHS
        </p>

        <h2>
          REWARD MINE
        </h2>


        <div className="reward-player-tabs">

          <button
            type="button"
            className={
              rewardTab === "active"
                ? "active"
                : ""
            }
            onClick={() =>
              setRewardTab(
                "active"
              )
            }
          >
            ACTIVE MINE
          </button>

          <button
            type="button"
            className={
              rewardTab === "finished"
                ? "active"
                : ""
            }
            onClick={() =>
              setRewardTab(
                "finished"
              )
            }
          >
            CLAIM REWARDS
          </button>

        </div>


        {loading && (
          <p className="reward-player-muted">
            SEARCHING THE DEPTHS...
          </p>
        )}


        {rewardTab ===
          "active" && (
          <>

            {!loading &&
              mines.length === 0 && (
              <div className="reward-player-empty">

                <h3>
                  NO ACTIVE QUAI MINE
                </h3>

                <p>
                  The miners hear only
                  silence below.
                </p>

              </div>
            )}


            {selectedMine && (
              <>

                <div className="reward-player-mine-head">

                  <div>
                    <small>
                      ACTIVE MINE
                    </small>

                    <h3>
                      {selectedMine.name}
                    </h3>
                  </div>

                  <span>
                    {selectedMine.rewardPool}
                    {" QUAI"}
                  </span>

                </div>


                <div className="reward-player-health">

                  <div>
                    <span>
                      MINE HEALTH
                    </span>

                    <strong>
                      {selectedMine.currentHealth}
                      {" / "}
                      {selectedMine.maxHealth}
                    </strong>
                  </div>

                  <div className="reward-player-health-track">

                    <div
                      className="reward-player-health-fill"
                      style={{
                        width:
                          `${Math.max(
                            0,
                            Math.min(
                              100,
                              healthPercent
                            )
                          )}%`,
                      }}
                    />

                  </div>

                  <small>
                    {healthPercent.toFixed(
                      2
                    )}
                    % REMAINING
                  </small>

                </div>


                {mines.length > 1 && (
                  <div className="reward-mine-selector">

                    {mines.map(
                      (mine) => (
                        <button
                          key={mine.id}
                          type="button"
                          className={
                            selectedMine.id ===
                            mine.id
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            setSelectedMine(
                              mine
                            )
                          }
                        >
                          {mine.name}
                        </button>
                      )
                    )}

                  </div>
                )}


                <div className="reward-player-rules">

                  <div>
                    <small>
                      ATTACK FEE
                    </small>

                    <strong>
                      {selectedMine.attackFeeGD}
                      {" GD"}
                    </strong>
                  </div>

                  <div>
                    <small>
                      REST
                    </small>

                    <strong>
                      {selectedMine.attackRestDuration /
                        3600}
                      h
                    </strong>
                  </div>

                  <div>
                    <small>
                      ATTACK LIMIT
                    </small>

                    <strong>
                      1 /{" "}
                      {selectedMine.attackCooldown /
                        3600}
                      h
                    </strong>
                  </div>

                </div>


                <div className="reward-player-section">

                  <small className="reward-player-label">
                    CHOOSE YOUR SOAPY
                  </small>

                  <div className="reward-player-miners">

                    {ownedMiners.map(
                      (miner) => (
                        <button
                          type="button"
                          key={
                            miner.tokenId
                          }
                          className={
                            selectedMiner
                              ?.tokenId ===
                            miner.tokenId
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            selectMiner(
                              miner
                            )
                          }
                        >

                          {miner.image && (
                            <img
                              src={
                                miner.image
                              }
                              alt={
                                miner.name ||
                                `Soapy #${miner.tokenId}`
                              }
                            />
                          )}

                          <span>
                            {miner.name ||
                              `SOAPY #${miner.tokenId}`}
                          </span>

                        </button>
                      )
                    )}

                  </div>

                </div>


                {selectedMiner &&
                  minerGame &&
                  damageRange && (
                  <SelectedRewardMiner
                    miner={
                      selectedMiner
                    }
                    game={
                      minerGame
                    }
                    damageRange={
                      damageRange
                    }
                    eligibility={
                      eligibility
                    }
                    playerState={
                      playerState
                    }
                  />
                )}


                {attackResult && (
                  <div className="reward-attack-result">

                    <small>
                      HIT CONFIRMED
                    </small>

                    <strong>
                      -{attackResult.damage}
                      {" HEALTH"}
                    </strong>

                    <span>
                      DAMAGE RANGE{" "}
                      {attackResult.minDamage}
                      {" – "}
                      {attackResult.maxDamage}
                    </span>

                  </div>
                )}


                {error &&
                  rewardTab ===
                    "active" && (
                  <p className="market-error">
                    {error}
                  </p>
                )}


                <button
                  type="button"
                  className="reward-attack-button"
                  onClick={
                    handleAttack
                  }
                  disabled={
                    attacking ||
                    !selectedMiner ||
                    !eligibility
                      ?.canAttack
                  }
                >
                  {attacking
                    ? "STRIKING THE VEIN..."
                    : eligibility
                        ?.canAttack
                      ? `ATTACK FOR ${selectedMine.attackFeeGD} GD`
                      : selectedMiner
                        ? "MINER NOT READY"
                        : "SELECT A SOAPY"}
                </button>


                <ActiveMineCompetition
                  mine={
                    selectedMine
                  }
                  wallet={
                    wallet
                  }
                  livePlayerState={
                    livePlayerState
                  }
                  leaderboard={
                    leaderboard
                  }
                  recentAttacks={
                    recentAttacks
                  }
                />

              </>
            )}

          </>
        )}


        {rewardTab ===
          "finished" && (
          <>

            {!loading &&
              finishedMines.length ===
              0 ? (
              <div className="reward-player-empty">

                <h3>
                  NO FINISHED MINES
                </h3>

                <p>
                  Completed QUAI Reward
                  Mines will appear here.
                </p>

              </div>
            ) : (
              <>

                <div className="reward-finished-list">

                  {finishedMines.map(
                    (mine) => (
                      <button
                        key={
                          mine.id
                        }
                        type="button"
                        className={
                          selectedFinishedMine
                            ?.id ===
                          mine.id
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          selectFinishedMine(
                            mine
                          )
                        }
                      >

                        <span>
                          {mine.name}
                        </span>

                        <small>
                          {mine.finalRewardPool}
                          {" QUAI"}
                        </small>

                      </button>
                    )
                  )}

                </div>


                {selectedFinishedMine &&
                  finishedPlayerState && (
                  <section className="reward-claim-panel">

                    <div className="reward-claim-head">

                      <div>
                        <small>
                          FINISHED MINE
                        </small>

                        <h3>
                          {
                            selectedFinishedMine
                              .name
                          }
                        </h3>
                      </div>

                      <span>
                        FINISHED
                      </span>

                    </div>


                    <div className="reward-claim-stats">

                      <div>
                        <small>
                          TOTAL POOL
                        </small>

                        <strong>
                          {
                            selectedFinishedMine
                              .finalRewardPool
                          }
                          {" QUAI"}
                        </strong>
                      </div>


                      <div>
                        <small>
                          TOTAL MINE DAMAGE
                        </small>

                        <strong>
                          {
                            selectedFinishedMine
                              .totalDamage
                          }
                        </strong>
                      </div>


                      <div>
                        <small>
                          YOUR DAMAGE
                        </small>

                        <strong>
                          {
                            finishedPlayerState
                              .totalDamage
                          }
                        </strong>
                      </div>


                      <div>
                        <small>
                          YOUR ATTACKS
                        </small>

                        <strong>
                          {
                            finishedPlayerState
                              .attackCount
                          }
                        </strong>
                      </div>

                    </div>


                    <div className="reward-share-box">

                      <small>
                        YOUR QUAI REWARD
                      </small>

                      <strong>
                        {claimableReward}
                        {" QUAI"}
                      </strong>

                      {selectedFinishedMine
                        .totalDamage >
                        0 && (
                        <span>
                          {(
                            (
                              finishedPlayerState
                                .totalDamage /
                              selectedFinishedMine
                                .totalDamage
                            ) *
                            100
                          ).toFixed(
                            2
                          )}
                          % DAMAGE SHARE
                        </span>
                      )}

                    </div>


                    {finishedPlayerState
                      .rewardClaimed && (
                      <div className="reward-claimed-badge">
                        REWARD CLAIMED
                      </div>
                    )}


                    {claimMessage && (
                      <p className="market-success">
                        {claimMessage}
                      </p>
                    )}


                    {error && (
                      <p className="market-error">
                        {error}
                      </p>
                    )}


                    {!finishedPlayerState
                      .participated ? (
                      <div className="reward-player-muted">
                        You did not participate
                        in this Reward Mine.
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="reward-claim-button"
                        disabled={
                          claiming ||
                          finishedPlayerState
                            .rewardClaimed ||
                          Number(
                            claimableReward
                          ) <= 0
                        }
                        onClick={
                          handleClaimReward
                        }
                      >
                        {claiming
                          ? "CLAIMING QUAI..."
                          : finishedPlayerState
                              .rewardClaimed
                            ? "QUAI CLAIMED"
                            : `CLAIM ${claimableReward} QUAI`}
                      </button>
                    )}

                  </section>
                )}

              </>
            )}

          </>
        )}

      </section>

    </div>
  );
}


function ActiveMineCompetition({
  mine,
  wallet,
  livePlayerState,
  leaderboard,
  recentAttacks,
}) {
  const playerRank =
    wallet &&
    leaderboard.length > 0
      ? leaderboard.findIndex(
          (row) =>
            row.player.toLowerCase() ===
            wallet.toLowerCase()
        ) + 1
      : 0;


  return (
    <>

      <section className="reward-competition-stats">

        <div>
          <small>
            YOUR DAMAGE
          </small>

          <strong>
            {livePlayerState
              ?.totalDamage ?? 0}
          </strong>
        </div>

        <div>
          <small>
            YOUR ATTACKS
          </small>

          <strong>
            {livePlayerState
              ?.attackCount ?? 0}
          </strong>
        </div>

        <div>
          <small>
            RANK
          </small>

          <strong>
            {playerRank > 0
              ? `#${playerRank}`
              : "—"}
          </strong>
        </div>

      </section>


      <div className="reward-live-reveal-note">
        FINAL QUAI REWARDS ARE REVEALED
        AFTER THE MINE IS FINISHED.
      </div>


      <section className="reward-live-section">

        <div className="reward-live-title">

          <small>
            LIVE COMPETITION
          </small>

          <h3>
            DAMAGE LEADERBOARD
          </h3>

        </div>


        {leaderboard.length === 0 ? (
          <p className="reward-player-muted">
            No miners have attacked yet.
          </p>
        ) : (
          <div className="reward-leaderboard">

            {leaderboard
              .slice(0, 10)
              .map(
                (
                  row,
                  index
                ) => (
                  <div
                    key={
                      row.player
                    }
                    className="reward-leader-row"
                  >

                    <strong>
                      #{index + 1}
                    </strong>

                    <span>
                      {row.player.slice(
                        0,
                        6
                      )}
                      ...
                      {row.player.slice(
                        -4
                      )}
                    </span>

                    <span>
                      {row.totalDamage}
                      {" DMG"}
                    </span>

                    <span>
                      {row.attackCount}
                      {" HITS"}
                    </span>

                  </div>
                )
              )}

          </div>
        )}

      </section>


      <section className="reward-live-section">

        <div className="reward-live-title">

          <small>
            DEEP MINE FEED
          </small>

          <h3>
            RECENT ATTACKS
          </h3>

        </div>


        {recentAttacks.length ===
          0 ? (
          <p className="reward-player-muted">
            No attacks recorded yet.
          </p>
        ) : (
          <div className="reward-attack-feed">

            {recentAttacks.map(
              (
                attack,
                index
              ) => (
                <div
                  key={
                    `${attack.transactionHash}-${index}`
                  }
                  className="reward-feed-row"
                >

                  <span>
                    SOAPY #
                    {attack.tokenId}
                  </span>

                  <strong>
                    -
                    {attack.damage}
                    {" HP"}
                  </strong>

                  <span>
                    {attack.player.slice(
                      0,
                      6
                    )}
                    ...
                    {attack.player.slice(
                      -4
                    )}
                  </span>

                  <small>
                    Mine HP{" "}
                    {
                      attack.remainingHealth
                    }
                  </small>

                </div>
              )
            )}

          </div>
        )}

      </section>

    </>
  );
}


function SelectedRewardMiner({
  miner,
  game,
  damageRange,
  eligibility,
  playerState,
}) {
  const now =
    Math.floor(
      Date.now() /
      1000
    );

  const cooldownRemaining =
    eligibility?.nextAttackAt &&
    eligibility.nextAttackAt >
      now
      ? eligibility.nextAttackAt -
        now
      : 0;


  return (
    <section className="reward-selected-miner">

      <div>
        <small>
          MINER
        </small>

        <strong>
          {miner.name ||
            `SOAPY #${miner.tokenId}`}
        </strong>
      </div>


      <div>
        <small>
          LEVEL
        </small>

        <strong>
          {game.level ?? 1}
        </strong>
      </div>


      <div>
        <small>
          PICKAXE
        </small>

        <strong>
          LV
          {game.pickaxeLevel ??
            1}
        </strong>
      </div>


      <div>
        <small>
          DAMAGE
        </small>

        <strong>
          {damageRange.minDamage}
          {" – "}
          {damageRange.maxDamage}
        </strong>
      </div>


      <div>
        <small>
          TOTAL QUAI DAMAGE
        </small>

        <strong>
          {playerState
            ?.totalDamage ?? 0}
        </strong>
      </div>


      <div>
        <small>
          STATUS
        </small>

        <strong>
          {eligibility?.canAttack
            ? "READY"
            : cooldownRemaining > 0
              ? "COOLDOWN"
              : "UNAVAILABLE"}
        </strong>
      </div>

    </section>
  );
}
