"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  connectGameWallet,
  watchGameWallet,
} from "@/lib/gameWallet";

import {
  getRewardMineOwner,
  getAllRewardMines,
  getAllDamageConfig,

  createRewardMine,
  fundRewardMine,
  activateRewardMine,
  pauseRewardMine,
  resumeRewardMine,
  finishRewardMine,

  updateDamageRange,
  updatePickaxeDamageBonus,

  getRewardMineLeaderboard,
  getRecentRewardMineAttacks,
} from "@/lib/rewardMineContract";


export default function RewardMineAdminPage() {
  const [
    wallet,
    setWallet,
  ] = useState("");

  const [
    provider,
    setProvider,
  ] = useState(null);

  const [
    signer,
    setSigner,
  ] = useState(null);

  const [
    owner,
    setOwner,
  ] = useState("");

  const [
    mines,
    setMines,
  ] = useState([]);

  const [
    damageConfig,
    setDamageConfig,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    actionMessage,
    setActionMessage,
  ] = useState("");


  const [
    createForm,
    setCreateForm,
  ] = useState({
    name:
      "QUAI VEIN I",

    maxHealth:
      "100000",

    attackFeeGD:
      "1",

    restHours:
      "12",

    cooldownHours:
      "24",
  });


  const isAdmin =
    wallet &&
    owner &&
    wallet.toLowerCase() ===
      owner.toLowerCase();


  async function handleConnect() {
    try {
      setError("");

      const connection =
        await connectGameWallet();

      setWallet(
        connection.address
      );

      setProvider(
        connection.provider
      );

      setSigner(
        connection.signer
      );

      await loadAdminData(
        connection.provider
      );

    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
        "Failed to connect wallet."
      );
    }
  }


  async function loadAdminData(
    currentProvider = provider
  ) {
    if (!currentProvider) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [
        currentOwner,
        currentMines,
        currentDamageConfig,
      ] =
        await Promise.all([
          getRewardMineOwner(
            currentProvider
          ),

          getAllRewardMines(
            currentProvider
          ),

          getAllDamageConfig(
            currentProvider
          ),
        ]);

      setOwner(
        currentOwner
      );

      setMines(
        currentMines
      );

      setDamageConfig(
        currentDamageConfig
      );

    } catch (err) {
      console.error(err);

      setError(
        err?.shortMessage ||
        err?.message ||
        "Failed to load Reward Mines."
      );

    } finally {
      setLoading(false);
    }
  }


  async function runAdminAction(
    label,
    action
  ) {
    try {
      if (!signer) {
        throw new Error(
          "Connect admin wallet first."
        );
      }

      setActionMessage(
        `${label}...`
      );

      setError("");

      await action();

      setActionMessage(
        `${label} complete.`
      );

      await loadAdminData(
        provider
      );

    } catch (err) {
      console.error(err);

      setActionMessage("");

      setError(
        err?.shortMessage ||
        err?.reason ||
        err?.message ||
        `${label} failed.`
      );
    }
  }


  async function handleCreateMine() {
    const {
      name,
      maxHealth,
      attackFeeGD,
      restHours,
      cooldownHours,
    } =
      createForm;


    if (!name.trim()) {
      setError(
        "Enter a mine name."
      );

      return;
    }


    if (
      Number(maxHealth) <= 0
    ) {
      setError(
        "Health must be greater than zero."
      );

      return;
    }


    if (
      Number(cooldownHours) <
      Number(restHours)
    ) {
      setError(
        "Cooldown cannot be lower than rest duration."
      );

      return;
    }


    await runAdminAction(
      "Creating mine",
      () =>
        createRewardMine(
          signer,
          {
            name,
            maxHealth:
              Number(
                maxHealth
              ),

            attackFeeGD:
              Number(
                attackFeeGD
              ),

            restHours:
              Number(
                restHours
              ),

            cooldownHours:
              Number(
                cooldownHours
              ),
          }
        )
    );
  }


  useEffect(() => {
    const cleanup =
      watchGameWallet({
        onAccountChanged:
          async (
            address
          ) => {
            setWallet(
              address
            );

            if (provider) {
              await loadAdminData(
                provider
              );
            }
          },

        onDisconnected:
          () => {
            setWallet("");
            setSigner(null);
          },
      });

    return cleanup;
  }, [provider]);


  return (
    <main className="reward-admin-page">

      <header className="reward-admin-header">

        <div>
          <p>
            SOAPY MINERS ADMIN
          </p>

          <h1>
            QUAI REWARD MINES
          </h1>
        </div>


        <button
          type="button"
          className="reward-admin-wallet"
          onClick={
            handleConnect
          }
        >
          {wallet
            ? `${wallet.slice(
                0,
                6
              )}...${wallet.slice(
                -4
              )}`
            : "CONNECT ADMIN"}
        </button>

      </header>


      {error && (
        <p className="reward-admin-error">
          {error}
        </p>
      )}

      {actionMessage && (
        <p className="reward-admin-message">
          {actionMessage}
        </p>
      )}


      {!wallet && (
        <section className="reward-admin-access">

          <h2>
            ADMIN ACCESS REQUIRED
          </h2>

          <p>
            Connect the Reward Mine
            owner wallet.
          </p>

        </section>
      )}


      {wallet &&
        owner &&
        !isAdmin && (
        <section className="reward-admin-access denied">

          <h2>
            ACCESS DENIED
          </h2>

          <p>
            Connected wallet is not
            the Reward Mine owner.
          </p>

          <small>
            OWNER
            <br />
            {owner}
          </small>

        </section>
      )}


      {isAdmin && (
        <>

          <CreateMinePanel
            form={
              createForm
            }

            setForm={
              setCreateForm
            }

            onCreate={
              handleCreateMine
            }
          />


          <DamageConfigPanel
            config={
              damageConfig
            }

            signer={
              signer
            }

            runAction={
              runAdminAction
            }

            refresh={() =>
              loadAdminData(
                provider
              )
            }
          />


          <section className="reward-admin-list-header">

            <div>
              <small>
                DEPLOYED MINES
              </small>

              <h2>
                MINE CONTROL
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                loadAdminData(
                  provider
                )
              }
            >
              REFRESH
            </button>

          </section>


          {loading ? (
            <section className="reward-admin-empty">
              LOADING MINES...
            </section>
          ) : mines.length ===
            0 ? (
            <section className="reward-admin-empty">

              <h3>
                NO REWARD MINES
              </h3>

              <p>
                Create your first
                QUAI Reward Mine above.
              </p>

            </section>
          ) : (
            <div className="reward-admin-grid">

              {mines.map(
                (mine) => (
                  <MineAdminCard
                    key={
                      mine.id
                    }
                    mine={
                      mine
                    }
                    signer={
                      signer
                    }
                    runAction={
                      runAdminAction
                    }
                    refresh={() =>
                      loadAdminData(
                        provider
                      )
                    }
                  />
                )
              )}

            </div>
          )}

        </>
      )}

    </main>
  );
}


function CreateMinePanel({
  form,
  setForm,
  onCreate,
}) {
  function update(
    field,
    value
  ) {
    setForm(
      (
        previous
      ) => ({
        ...previous,

        [field]:
          value,
      })
    );
  }


  return (
    <section className="reward-create-panel">

      <div className="reward-panel-title">

        <small>
          NEW EVENT
        </small>

        <h2>
          CREATE REWARD MINE
        </h2>

      </div>


      <div className="reward-create-grid">

        <label>
          <span>
            MINE NAME
          </span>

          <input
            value={
              form.name
            }
            onChange={
              (event) =>
                update(
                  "name",
                  event.target.value
                )
            }
          />
        </label>


        <label>
          <span>
            HEALTH
          </span>

          <input
            type="number"
            min="1"
            value={
              form.maxHealth
            }
            onChange={
              (event) =>
                update(
                  "maxHealth",
                  event.target.value
                )
            }
          />
        </label>


        <label>
          <span>
            ATTACK FEE (GD)
          </span>

          <input
            type="number"
            min="0"
            value={
              form.attackFeeGD
            }
            onChange={
              (event) =>
                update(
                  "attackFeeGD",
                  event.target.value
                )
            }
          />
        </label>


        <label>
          <span>
            REST HOURS
          </span>

          <input
            type="number"
            min="1"
            value={
              form.restHours
            }
            onChange={
              (event) =>
                update(
                  "restHours",
                  event.target.value
                )
            }
          />
        </label>


        <label>
          <span>
            ATTACK COOLDOWN
          </span>

          <input
            type="number"
            min="1"
            value={
              form.cooldownHours
            }
            onChange={
              (event) =>
                update(
                  "cooldownHours",
                  event.target.value
                )
            }
          />
        </label>

      </div>


      <button
        type="button"
        className="reward-create-button"
        onClick={
          onCreate
        }
      >
        CREATE MINE
      </button>

    </section>
  );
}


function DamageConfigPanel({
  config,
  signer,
  runAction,
  refresh,
}) {
  const [
    localConfig,
    setLocalConfig,
  ] = useState([]);


  useEffect(() => {
    setLocalConfig(
      config.map(
        (item) => ({
          ...item,
        })
      )
    );
  }, [config]);


  function updateField(
    level,
    field,
    value
  ) {
    setLocalConfig(
      (
        previous
      ) =>
        previous.map(
          (item) =>
            item.level ===
            level
              ? {
                  ...item,

                  [field]:
                    value,
                }
              : item
        )
    );
  }


  async function saveDamageRange(
    item
  ) {
    const minDamage =
      Number(
        item.minDamage
      );

    const maxDamage =
      Number(
        item.maxDamage
      );


    if (
      minDamage <= 0 ||
      maxDamage <
        minDamage
    ) {
      return;
    }


    await runAction(
      `Updating Level ${item.level} damage`,
      async () => {
        await updateDamageRange(
          signer,
          item.level,
          minDamage,
          maxDamage
        );

        await refresh();
      }
    );
  }


  async function savePickaxeBonus(
    item
  ) {
    const bonus =
      Number(
        item.pickaxeBonus
      );


    if (
      bonus < 0
    ) {
      return;
    }


    await runAction(
      `Updating Pickaxe Lv${item.level} bonus`,
      async () => {
        await updatePickaxeDamageBonus(
          signer,
          item.level,
          bonus
        );

        await refresh();
      }
    );
  }


  return (
    <section className="reward-damage-panel">

      <div className="reward-panel-title">

        <small>
          COMBAT BALANCE
        </small>

        <h2>
          DAMAGE CONFIGURATION
        </h2>

      </div>


      <p className="reward-damage-help">
        Final attack range =
        miner level damage
        range + pickaxe bonus.
      </p>


      <div className="reward-damage-table">

        <div className="reward-damage-head">

          <span>
            LEVEL
          </span>

          <span>
            MIN
          </span>

          <span>
            MAX
          </span>

          <span>
            PICKAXE BONUS
          </span>

          <span>
            RESULTING RANGE
          </span>

          <span>
            ACTIONS
          </span>

        </div>


        {localConfig.map(
          (item) => {

            const min =
              Number(
                item.minDamage
              ) || 0;

            const max =
              Number(
                item.maxDamage
              ) || 0;

            const bonus =
              Number(
                item.pickaxeBonus
              ) || 0;


            return (
              <div
                key={
                  item.level
                }
                className="reward-damage-row"
              >

                <strong>
                  LV{item.level}
                </strong>


                <input
                  type="number"
                  min="1"
                  value={
                    item.minDamage
                  }
                  onChange={
                    (event) =>
                      updateField(
                        item.level,
                        "minDamage",
                        event
                          .target
                          .value
                      )
                  }
                />


                <input
                  type="number"
                  min="1"
                  value={
                    item.maxDamage
                  }
                  onChange={
                    (event) =>
                      updateField(
                        item.level,
                        "maxDamage",
                        event
                          .target
                          .value
                      )
                  }
                />


                <input
                  type="number"
                  min="0"
                  value={
                    item.pickaxeBonus
                  }
                  onChange={
                    (event) =>
                      updateField(
                        item.level,
                        "pickaxeBonus",
                        event
                          .target
                          .value
                      )
                  }
                />


                <span className="reward-result-range">
                  {min + bonus}
                  {" – "}
                  {max + bonus}
                </span>


                <div className="reward-damage-actions">

                  <button
                    type="button"
                    onClick={() =>
                      saveDamageRange(
                        item
                      )
                    }
                  >
                    SAVE RANGE
                  </button>


                  <button
                    type="button"
                    onClick={() =>
                      savePickaxeBonus(
                        item
                      )
                    }
                  >
                    SAVE BONUS
                  </button>

                </div>

              </div>
            );
          }
        )}

      </div>

    </section>
  );
}


function MineAdminCard({
  mine,
  signer,
  runAction,
  refresh,
}) {
  const [
    fundingAmount,
    setFundingAmount,
  ] = useState("");

  const [
    showDetails,
    setShowDetails,
  ] = useState(false);

  const [
    leaders,
    setLeaders,
  ] = useState([]);

  const [
    attacks,
    setAttacks,
  ] = useState([]);

  const [
    loadingActivity,
    setLoadingActivity,
  ] = useState(false);


  const healthPercent =
    mine.maxHealth > 0
      ? (
          mine.currentHealth /
          mine.maxHealth
        ) *
        100
      : 0;

  const canFund = [
    "CREATED",
    "ACTIVE",
    "PAUSED",
  ].includes(
    mine.statusName
  );

  const isFinished =
    mine.statusName ===
    "FINISHED";


  async function fund() {
    if (
      Number(
        fundingAmount
      ) <= 0
    ) {
      return;
    }


    await runAction(
      `Funding Mine #${mine.id}`,
      async () => {
        await fundRewardMine(
          signer,
          mine.id,
          fundingAmount
        );

        setFundingAmount("");

        await refresh();
      }
    );
  }


  async function loadActivity() {
    try {
      setLoadingActivity(true);

      const [
        currentLeaders,
        currentAttacks,
      ] =
        await Promise.all([
          getRewardMineLeaderboard(
            signer,
            mine.id
          ),

          getRecentRewardMineAttacks(
            signer,
            mine.id,
            20
          ),
        ]);

      setLeaders(
        currentLeaders
      );

      setAttacks(
        currentAttacks
      );

    } catch (err) {
      console.error(
        "Failed to load mine activity:",
        err
      );

    } finally {
      setLoadingActivity(false);
    }
  }


  useEffect(() => {
    if (
      showDetails &&
      signer
    ) {
      loadActivity();
    }
  }, [
    showDetails,
    mine.id,
    mine.totalAttacks,
  ]);


  return (
    <article className="reward-mine-card">

      <header>

        <div>
          <small>
            MINE #{mine.id}
          </small>

          <h3>
            {mine.name}
          </h3>
        </div>


        <span
          className={`reward-status ${mine.statusName.toLowerCase()}`}
        >
          {mine.statusName}
        </span>

      </header>


      <section className="reward-health">

        <div className="reward-health-title">
          <span>
            MINE HEALTH
          </span>

          <strong>
            {mine.currentHealth}
            {" / "}
            {mine.maxHealth}
          </strong>
        </div>


        <div className="reward-health-track">

          <div
            className="reward-health-fill"
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
          %
        </small>

      </section>


      <section className="reward-mine-stats">

        <div>
          <small>
            {isFinished
              ? "FINAL REWARD POOL"
              : "CURRENT REWARD POOL"}
          </small>

          <strong>
            {isFinished
              ? mine.finalRewardPool
              : mine.rewardPool}
            {" QUAI"}
          </strong>
        </div>


        <div>
          <small>
            DAMAGE
          </small>

          <strong>
            {mine.totalDamage}
          </strong>
        </div>


        <div>
          <small>
            ATTACKS
          </small>

          <strong>
            {mine.totalAttacks}
          </strong>
        </div>


        <div>
          <small>
            PLAYERS
          </small>

          <strong>
            {mine.participantCount}
          </strong>
        </div>

      </section>


      <section className="reward-config-mini">

        <span>
          FEE
          <strong>
            {mine.attackFeeGD} GD
          </strong>
        </span>

        <span>
          REST
          <strong>
            {(
              mine.attackRestDuration /
              3600
            ).toFixed(1)}
            h
          </strong>
        </span>

        <span>
          COOLDOWN
          <strong>
            {(
              mine.attackCooldown /
              3600
            ).toFixed(1)}
            h
          </strong>
        </span>

      </section>


      {canFund && (
        <section className="reward-funding">

          <input
            type="number"
            min="0"
            step="0.01"
            value={
              fundingAmount
            }
            onChange={
              (event) =>
                setFundingAmount(
                  event.target.value
                )
            }
            placeholder="QUAI amount"
          />

          <button
            type="button"
            onClick={fund}
          >
            ADD QUAI
          </button>

        </section>
      )}


      {canFund && (
        <p className="reward-pool-edit-note">
          This pool remains editable until
          the mine is FINISHED.
        </p>
      )}


      {isFinished && (
        <p className="reward-pool-locked-note">
          FINAL REWARD POOL LOCKED
        </p>
      )}


      <section className="reward-admin-actions">

        {mine.statusName ===
          "CREATED" && (
          <button
            type="button"
            className="activate"
            onClick={() =>
              runAction(
                `Activating Mine #${mine.id}`,
                () =>
                  activateRewardMine(
                    signer,
                    mine.id
                  )
              )
            }
          >
            ACTIVATE
          </button>
        )}


        {mine.statusName ===
          "ACTIVE" && (
          <>
            <button
              type="button"
              className="pause"
              onClick={() =>
                runAction(
                  `Pausing Mine #${mine.id}`,
                  () =>
                    pauseRewardMine(
                      signer,
                      mine.id
                    )
                )
              }
            >
              PAUSE
            </button>

            <button
              type="button"
              className="finish"
              onClick={() =>
                runAction(
                  `Finishing Mine #${mine.id}`,
                  () =>
                    finishRewardMine(
                      signer,
                      mine.id
                    )
                )
              }
            >
              FINISH
            </button>
          </>
        )}


        {mine.statusName ===
          "PAUSED" && (
          <>
            <button
              type="button"
              className="activate"
              onClick={() =>
                runAction(
                  `Resuming Mine #${mine.id}`,
                  () =>
                    resumeRewardMine(
                      signer,
                      mine.id
                    )
                )
              }
            >
              RESUME
            </button>

            <button
              type="button"
              className="finish"
              onClick={() =>
                runAction(
                  `Finishing Mine #${mine.id}`,
                  () =>
                    finishRewardMine(
                      signer,
                      mine.id
                    )
                )
              }
            >
              FINISH
            </button>
          </>
        )}

      </section>


      <button
        type="button"
        className="reward-admin-view-details"
        onClick={() =>
          setShowDetails(
            (previous) =>
              !previous
          )
        }
      >
        {showDetails
          ? "HIDE ACTIVITY"
          : "VIEW ACTIVITY"}
      </button>


      {showDetails && (
        <section className="reward-admin-activity">

          <div className="reward-admin-activity-head">

            <h4>
              LIVE LEADERBOARD
            </h4>

            <button
              type="button"
              onClick={
                loadActivity
              }
            >
              REFRESH
            </button>

          </div>


          {loadingActivity ? (
            <p>
              Loading activity...
            </p>
          ) : (
            <>

              <div className="reward-admin-leaders">

                {leaders.length ===
                  0 ? (
                  <p>
                    No participants yet.
                  </p>
                ) : (
                  leaders
                    .slice(0, 10)
                    .map(
                      (
                        player,
                        index
                      ) => (
                        <div
                          key={
                            player.player
                          }
                        >

                          <strong>
                            #{index + 1}
                          </strong>

                          <span>
                            {player.player.slice(
                              0,
                              6
                            )}
                            ...
                            {player.player.slice(
                              -4
                            )}
                          </span>

                          <span>
                            {
                              player.totalDamage
                            } DMG
                          </span>

                          <span>
                            {
                              player.attackCount
                            } HITS
                          </span>

                        </div>
                      )
                    )
                )}

              </div>


              <div className="reward-admin-recent">

                <h4>
                  RECENT ATTACKS
                </h4>

                {attacks.length ===
                  0 ? (
                  <p>
                    No attacks yet.
                  </p>
                ) : (
                  attacks.map(
                    (
                      attack,
                      index
                    ) => (
                      <div
                        key={
                          `${attack.transactionHash}-${index}`
                        }
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
                          {
                            attack.remainingHealth
                          } HP LEFT
                        </span>

                      </div>
                    )
                  )
                )}

              </div>

            </>
          )}

        </section>
      )}

    </article>
  );
}
