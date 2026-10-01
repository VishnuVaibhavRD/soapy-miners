"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import CampEnvironment, {
  CampForeground,
} from "./CampEnvironment";
import { CAMP_WORLD_SCALE } from "./campLayout";
import GameHUD from "./GameHUD";
import GoldTrader from "./GoldTrader";
import MarketStall from "./MarketStall";
import MineEntrance from "./MineEntrance";
import PlayerMiner from "./PlayerMiner";
import QuaiMineEntrance from "./QuaiMineEntrance";
import RestingMiner from "./RestingMiner";
import StorageChest from "./StorageChest";
import Workshop from "./Workshop";

import GoldTraderWindow from "./windows/GoldTraderWindow";
import InventoryWindow from "./windows/InventoryWindow";
import MinerWindow from "./windows/MinerWindow";
import MinesWindow from "./windows/MinesWindow";
import RewardMineWindow from "./RewardMineWindow";
import ReturnedLootWindow from "./windows/ReturnedLootWindow";
import UpgradesWindow from "./windows/UpgradesWindow";
import useCampMovement from "./useCampMovement";
import useCampInteraction from "./useCampInteraction";
import CampInteractBar from "./CampInteractBar";
import Message from "./ui/Message";
import { formatCountdown } from "./formatters";

function CampScene({
  className = "",
  children,
  hud = null,
  windows = null,
  contentRef,
  worldRef,
  cameraY = 0,
  onCampClick,
  movementEnabled = false,
  interactAction = null,
}) {
  return (
    <section
      className={`soapy-game-camp ${className}`.trim()}
      style={{
        "--camp-world-scale":
          CAMP_WORLD_SCALE,
      }}
    >
      <div
        ref={worldRef}
        className={`camp-world ${
          movementEnabled
            ? "camp-world-scrolling"
            : ""
        }`.trim()}
        style={
          movementEnabled
            ? {
                transform: `translate3d(0, ${-cameraY}px, 0)`,
              }
            : undefined
        }
      >
        <CampEnvironment />

        <div
          ref={contentRef}
          className={`game-world-content ${
            movementEnabled
              ? "camp-walk-surface"
              : ""
          }`.trim()}
          onClick={onCampClick}
          role="presentation"
        >
          <div
            className="camp-walk-zone"
            aria-hidden="true"
          />

          {children}
        </div>

        <CampForeground />
      </div>

      {hud}

      {movementEnabled ? (
        <p className="camp-walk-hint camp-walk-hint-desktop">
          Click ground to walk · hold
          WASD to move ·{" "}
          <kbd>Shift</kbd> run ·{" "}
          <kbd>E</kbd> interact
        </p>
      ) : (
        <p className="camp-walk-hint camp-walk-hint-mobile">
          Tap a location to open
        </p>
      )}

      <CampInteractBar
        action={interactAction}
      />

      {windows}
    </section>
  );
}

export default function GameCamp({
  goldDust,
  buyingGoldDust,
  gdError,
  gdSuccess,
  onBuyGoldDust,
  miners,
  miner,
  minerGame,
  loadingMinerGame,
  onSelectMiner,
  gameMines,
  selectedMine,
  onSelectMine,
  startingExpedition,
  expeditionError,
  expeditionSuccess,
  onStartExpedition,
  activeExpedition,
  timeRemaining,
  restTimeRemaining = 0,
  onClaimLoot,
  claimingLoot = false,
  claimError = "",
  claimedLoot = null,
  onCloseClaimedLoot,
  pickaxeUpgrade = null,
  loadingPickaxeUpgrade = false,
  upgradingPickaxe = false,
  pickaxeUpgradeError = "",
  pickaxeUpgradeSuccess = "",
  onUpgradePickaxe,
  backpackUpgrade = null,
  loadingBackpackUpgrade = false,
  upgradingBackpack = false,
  backpackUpgradeError = "",
  backpackUpgradeSuccess = "",
  onUpgradeBackpack,
  wallet,
  provider,
  signer,
  connecting,
  walletError,
  onConnectWallet,
  mintSiteUrl,
  onChangeMiner,
  onRefreshGame,
}) {
  const router = useRouter();

  const [
    activeWindow,
    setActiveWindow,
  ] = useState(null);

  const [
    showStatusBoard,
    setShowStatusBoard,
  ] = useState(true);

  const previousLockKeyRef =
    useRef("");

  const minerStatus =
    minerGame?.status;

  const isResting =
    minerStatus === 3;

  const isClaimable =
    minerStatus === 2 ||
    (!isResting &&
      Boolean(activeExpedition) &&
      timeRemaining === 0);

  const isUnderground =
    minerStatus === 1 ||
    (!isResting &&
      !isClaimable &&
      Boolean(activeExpedition) &&
      timeRemaining > 0);

  const movementLocked =
    isUnderground ||
    isResting ||
    isClaimable;

  const interactionLocked =
    isUnderground ||
    isResting;

  function openWindow(windowId) {
    if (interactionLocked) {
      return;
    }

    if (
      isClaimable &&
      windowId !== "mines"
    ) {
      return;
    }

    if (windowId === "market") {
      router.push("/marketplace");
      return;
    }

    setActiveWindow(windowId);
  }

  const activeMine =
    activeExpedition
      ? gameMines.find(
          (item) =>
            item.id ===
            activeExpedition.mineId
        )
      : null;

  const inventoryTotal =
    minerGame
      ? minerGame.ore +
        minerGame.crystal +
        minerGame.core
      : 0;

  const almostFull =
    minerGame?.backpackCapacity > 0 &&
    inventoryTotal /
      minerGame.backpackCapacity >=
      0.85;

  function closeWindow() {
    setActiveWindow(null);
  }

  useEffect(() => {
    if (
      expeditionSuccess &&
      activeExpedition
    ) {
      setActiveWindow(null);
      onSelectMine?.(null);
    }
  }, [
    expeditionSuccess,
    activeExpedition,
    onSelectMine,
  ]);

  useEffect(() => {
    if (interactionLocked) {
      setActiveWindow(null);
    }
  }, [interactionLocked]);

  useEffect(() => {
    const lockKey = isClaimable
      ? "claimable"
      : isUnderground
        ? "mining"
        : isResting
          ? "resting"
          : "ready";

    if (
      lockKey !== "ready" &&
      lockKey !==
        previousLockKeyRef.current
    ) {
      setShowStatusBoard(true);

      if (lockKey === "claimable") {
        setActiveWindow("mines");
      }
    }

    previousLockKeyRef.current =
      lockKey;
  }, [
    isUnderground,
    isResting,
    isClaimable,
  ]);

  function returnToCamp() {
    setActiveWindow(null);
    setShowStatusBoard(false);

    if (onChangeMiner) {
      onChangeMiner();
      return;
    }
  }

  const {
    contentRef,
    worldRef,
    cameraY,
    position,
    facing,
    isWalking,
    isPathWalking,
    walkDuration,
    movementEnabled,
    moveTo,
    handleCampClick,
    handleWalkEnd:
      handleMovementEnd,
  } = useCampMovement({
    disabled: movementLocked,
    modalOpen:
      Boolean(
        activeWindow
      ),
  });

  const {
    nearest,
    requestInteract,
    handleWalkEnd,
  } = useCampInteraction({
    position,
    movementEnabled,
    modalOpen:
      Boolean(
        activeWindow
      ),
    disabled: interactionLocked,
    moveTo,
    onOpenWindow:
      openWindow,
    onWalkEnd:
      handleMovementEnd,
  });

  function isInRange(
    id
  ) {
    return (
      nearest?.id === id
    );
  }

  if (!wallet) {
    return (
      <CampScene className="camp-connect">
        <div className="camp-connect-panel">
          <div className="underground-pickaxe">
            ⛏
          </div>

          <h2>
            ENTER YOUR MINER CAMP
          </h2>

          <p>
            Connect your wallet to load
            your Soapy Miners and begin
            Phase II.
          </p>

          <button
            type="button"
            onClick={
              onConnectWallet
            }
            disabled={
              connecting
            }
            className="game-primary-button"
          >
            {connecting
              ? "CONNECTING..."
              : "CONNECT WALLET"}
          </button>

          <Message type="error">
            {walletError}
          </Message>
        </div>
      </CampScene>
    );
  }

  if (miners.length === 0) {
    return (
      <CampScene className="camp-connect">
        <div className="camp-connect-panel">
          <h2>
            NO MINERS FOUND
          </h2>

          <p>
            You need a Soapy Miner NFT
            in your wallet before entering
            the underground.
          </p>

          {mintSiteUrl ? (
            <a
              href={mintSiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="game-primary-button"
            >
              GET A MINER
            </a>
          ) : (
            <p className="ui-dialogue">
              Mint a Soapy Miner from the
              official collection site.
            </p>
          )}
        </div>
      </CampScene>
    );
  }

  const lockStatus = isUnderground
    ? {
        label: "IN THE SHAFT",
        detail: activeMine?.name || "MINING",
        countdown: timeRemaining,
        note: "Camp locked until your miner returns",
      }
    : isClaimable
      ? {
          label: "RETURNED",
          detail: activeMine?.name || "LOOT READY",
          countdown: null,
          note: "Claim loot before using camp again",
        }
      : isResting
        ? {
            label: "RESTING",
            detail: "RECOVERING FROM THE SHAFT",
            countdown: restTimeRemaining,
            note: "Camp locked until your miner is READY",
          }
        : null;

  const campStateClass = interactionLocked
    ? "camp-locked"
    : isClaimable
      ? "camp-claim-ready"
      : "";

  return (
    <CampScene
      className={campStateClass}
      contentRef={contentRef}
      worldRef={worldRef}
      cameraY={cameraY}
      onCampClick={
        movementLocked
          ? undefined
          : handleCampClick
      }
      movementEnabled={
        movementEnabled
      }
      interactAction={
        interactionLocked
          ? null
          : isClaimable
            ? "Claim loot"
            : nearest?.action ??
              null
      }
      hud={
        <GameHUD
          miner={miner}
          onChangeMiner={
            onChangeMiner
          }
          lockStatus={
            lockStatus
          }
          onClaimLoot={
            onClaimLoot
          }
          claimingLoot={
            claimingLoot
          }
          claimError={
            claimError
          }
          onReturnToCamp={
            returnToCamp
          }
        />
      }
      windows={
        <>
          {activeWindow ===
          "gold" ? (
            <GoldTraderWindow
              balance={goldDust}
              buying={
                buyingGoldDust
              }
              error={gdError}
              success={gdSuccess}
              onBuy={
                onBuyGoldDust
              }
              onClose={
                closeWindow
              }
            />
          ) : null}

          {activeWindow ===
          "mines" ? (
            <MinesWindow
              mines={gameMines}
              miner={miner}
              game={minerGame}
              goldDust={goldDust}
              selectedMine={
                selectedMine
              }
              onSelectMine={
                onSelectMine
              }
              starting={
                startingExpedition
              }
              error={
                expeditionError
              }
              success={
                expeditionSuccess
              }
              onStart={
                onStartExpedition
              }
              onClose={
                closeWindow
              }
              onBackToCamp={
                returnToCamp
              }
              restTimeRemaining={
                restTimeRemaining
              }
              isClaimable={
                isClaimable
              }
              activeMineName={
                activeMine?.name
              }
              onClaimLoot={
                onClaimLoot
              }
              claimingLoot={
                claimingLoot
              }
              claimError={
                claimError
              }
            />
          ) : null}

          {activeWindow ===
          "miner" ? (
            <MinerWindow
              miners={miners}
              miner={miner}
              game={minerGame}
              loading={
                loadingMinerGame
              }
              onSelectMiner={
                onSelectMiner
              }
              onOpenInventory={() =>
                setActiveWindow(
                  "inventory"
                )
              }
              onOpenUpgrades={() =>
                setActiveWindow(
                  "upgrades"
                )
              }
              onClose={
                closeWindow
              }
            />
          ) : null}

          {activeWindow ===
          "inventory" ? (
            <InventoryWindow
              game={minerGame}
              onClose={
                closeWindow
              }
            />
          ) : null}

          {activeWindow ===
          "upgrades" ? (
            <UpgradesWindow
              miner={miner}
              game={minerGame}
              goldDust={goldDust}
              pickaxeUpgrade={
                pickaxeUpgrade
              }
              backpackUpgrade={
                backpackUpgrade
              }
              loadingPickaxe={
                loadingPickaxeUpgrade
              }
              loadingBackpack={
                loadingBackpackUpgrade
              }
              upgradingPickaxe={
                upgradingPickaxe
              }
              upgradingBackpack={
                upgradingBackpack
              }
              pickaxeError={
                pickaxeUpgradeError
              }
              backpackError={
                backpackUpgradeError
              }
              pickaxeSuccess={
                pickaxeUpgradeSuccess
              }
              backpackSuccess={
                backpackUpgradeSuccess
              }
              onUpgradePickaxe={
                onUpgradePickaxe
              }
              onUpgradeBackpack={
                onUpgradeBackpack
              }
              onClose={
                closeWindow
              }
            />
          ) : null}

          {activeWindow ===
          "quai" ? (
            <RewardMineWindow
              wallet={wallet}
              provider={provider}
              signer={signer}
              ownedMiners={miners}
              onClose={
                closeWindow
              }
              onRefreshGame={
                onRefreshGame
              }
            />
          ) : null}

          {claimedLoot ? (
            <ReturnedLootWindow
              loot={claimedLoot}
              onClose={
                onCloseClaimedLoot
              }
            />
          ) : null}
        </>
      }
    >
      <MineEntrance
        inRange={isInRange(
          "mines"
        )}
        claimReady={
          isClaimable
        }
        onClick={() =>
          isClaimable
            ? setActiveWindow(
                "mines"
              )
            : requestInteract(
                "mines"
              )
        }
      />

      <GoldTrader
        inRange={isInRange(
          "gold"
        )}
        onClick={() =>
          requestInteract(
            "gold"
          )
        }
      />

      {isResting ? (
        <RestingMiner
          miner={miner}
          remaining={
            restTimeRemaining
          }
          compact={
            !showStatusBoard
          }
          position={position}
          movementEnabled={
            movementEnabled
          }
          onReturnToCamp={
            showStatusBoard
              ? returnToCamp
              : undefined
          }
        />
      ) : null}

      {showStatusBoard &&
      (isUnderground ||
        isClaimable) ? (
        <PlayerMiner
          miner={miner}
          isUnderground={
            isUnderground
          }
          isClaimable={
            isClaimable
          }
          timeRemaining={
            timeRemaining
          }
          mineName={
            activeMine?.name
          }
          onClaimLoot={
            onClaimLoot
          }
          claimingLoot={
            claimingLoot
          }
          claimError={
            claimError
          }
          onReturnToCamp={
            returnToCamp
          }
        />
      ) : null}

      {!showStatusBoard &&
      isUnderground ? (
        <div className="camp-object player-miner player-miner-fixed underground-camp-marker">
          <span className="camp-object-label">
            <strong>
              UNDERGROUND
            </strong>
            <em>
              {formatCountdown(
                timeRemaining
              )}
            </em>
          </span>
        </div>
      ) : null}

      {!showStatusBoard &&
      isClaimable ? (
        <div className="camp-object player-miner player-miner-fixed underground-camp-marker status-board-interactive">
          <span className="camp-object-label">
            <strong>
              LOOT READY
            </strong>
            <em>
              {activeMine?.name ||
                "CLAIM NOW"}
            </em>
          </span>

          <button
            type="button"
            className="game-primary-button claim-loot-button"
            onClick={onClaimLoot}
            disabled={
              claimingLoot ||
              !onClaimLoot
            }
          >
            {claimingLoot
              ? "CLAIMING..."
              : "CLAIM LOOT"}
          </button>
        </div>
      ) : null}

      {!movementLocked ? (
        <PlayerMiner
          miner={miner}
          isUnderground={false}
          isClaimable={false}
          timeRemaining={0}
          position={position}
          facing={facing}
          isWalking={isWalking}
          isPathWalking={
            isPathWalking
          }
          walkDuration={
            walkDuration
          }
          movementEnabled={
            movementEnabled
          }
          onWalkEnd={
            handleWalkEnd
          }
          onClick={() =>
            setActiveWindow(
              "miner"
            )
          }
        />
      ) : null}

      <StorageChest
        almostFull={
          almostFull
        }
        inRange={isInRange(
          "storage"
        )}
        onClick={() =>
          requestInteract(
            "storage"
          )
        }
      />

      <Workshop
        inRange={isInRange(
          "upgrades"
        )}
        onClick={() =>
          requestInteract(
            "upgrades"
          )
        }
      />

      <MarketStall
        inRange={isInRange(
          "market"
        )}
        onClick={() =>
          requestInteract(
            "market"
          )
        }
      />

      <QuaiMineEntrance
        inRange={isInRange(
          "quai"
        )}
        onClick={() =>
          requestInteract(
            "quai"
          )
        }
      />
    </CampScene>
  );
}
