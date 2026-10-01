"use client";

import GameAsset from "./GameAsset";
import { getDepthZIndex } from "./campLayout";
import {
  formatCountdown,
  minerDisplayName,
} from "./formatters";

export default function PlayerMiner({
  miner,
  isUnderground,
  isClaimable,
  timeRemaining,
  mineName,
  onClick,
  position,
  facing = "right",
  isWalking = false,
  isPathWalking = false,
  walkDuration = 0,
  movementEnabled = false,
  onWalkEnd,
  onClaimLoot,
  claimingLoot = false,
  claimError = "",
  onReturnToCamp,
}) {
  if (
    isUnderground ||
    isClaimable
  ) {
    return (
      <div
        className={`camp-object player-miner player-miner-fixed underground-sign status-board-interactive ${
          isClaimable
            ? "underground-sign-claimable"
            : ""
        }`}
      >
        <div className="underground-sign-board">
          <p>
            {isClaimable
              ? `${minerDisplayName(miner).toUpperCase()} HAS RETURNED`
              : `${minerDisplayName(miner).toUpperCase()} IS UNDERGROUND`}
          </p>

          <div className="underground-pickaxe-hit-wrap">
            ⛏
          </div>

          <strong>
            {isClaimable
              ? "READY TO CLAIM"
              : formatCountdown(
                  timeRemaining
                )}
          </strong>

          <small>
            {isClaimable
              ? mineName || "LOOT READY"
              : mineName || "MINING"}
          </small>

          {!isClaimable ? (
            <span className="camp-lock-note">
              CAMP LOCKED
            </span>
          ) : null}

          {isClaimable ? (
            <>
              <span className="camp-lock-note">
                CLAIM TO UNLOCK CAMP
              </span>

              <button
                type="button"
                onClick={onClaimLoot}
                disabled={
                  claimingLoot ||
                  !onClaimLoot
                }
                className="game-primary-button claim-loot-button"
              >
                {claimingLoot
                  ? "CLAIMING..."
                  : "CLAIM LOOT"}
              </button>

              {claimError ? (
                <p className="game-error">
                  {claimError}
                </p>
              ) : null}
            </>
          ) : null}

          {onReturnToCamp ? (
            <button
              type="button"
              className="camp-back-button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onReturnToCamp();
              }}
            >
              BACK TO CAMP
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const style =
    movementEnabled &&
    position
      ? {
          left: `${position.x}%`,
          top: `${position.y}%`,
          zIndex: getDepthZIndex(
            position.y,
            1
          ),
          transitionDuration:
            isPathWalking
              ? `${walkDuration}ms`
              : "0ms",
        }
      : undefined;

  return (
    <button
      type="button"
      className={`camp-object player-miner ${
        movementEnabled
          ? "player-miner-movable"
          : "player-miner-fixed"
      } ${
        isPathWalking
          ? "is-path-walking"
          : ""
      } ${
        isWalking
          ? "is-walking"
          : ""
      } ${
        facing === "left"
          ? "facing-left"
          : "facing-right"
      }`}
      style={style}
      onClick={onClick}
      onTransitionEnd={
        onWalkEnd
      }
    >
      <div className="camp-object-visual">
        <GameAsset
          src={miner?.image}
          alt={minerDisplayName(
            miner
          )}
          className="camp-player-miner"
          fallbackClassName="miner-placeholder"
        >
          👷
        </GameAsset>
      </div>

      <span className="camp-object-label">
        <strong>
          {minerDisplayName(
            miner
          )}
        </strong>

        <em>
          {movementEnabled
            ? "WASD · SHIFT RUN"
            : "TAP TO VIEW"}
        </em>
      </span>
    </button>
  );
}
