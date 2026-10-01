"use client";

import GameAsset from "./GameAsset";
import { getDepthZIndex } from "./campLayout";
import {
  formatCountdown,
  minerDisplayName,
} from "./formatters";

export default function RestingMiner({
  miner,
  remaining = 0,
  onReturnToCamp,
  compact = false,
  position,
  movementEnabled = false,
}) {
  if (compact) {
    const style =
      movementEnabled && position
        ? {
            left: `${position.x}%`,
            top: `${position.y}%`,
            zIndex: getDepthZIndex(
              position.y,
              1
            ),
          }
        : undefined;

    return (
      <div
        className={`camp-object resting-miner-compact ${
          movementEnabled
            ? "player-miner-movable"
            : "player-miner-fixed"
        }`}
        style={style}
      >
        <div className="resting-miner-art">
          <GameAsset
            src={miner?.image}
            alt={minerDisplayName(miner)}
            className="camp-player-miner resting-miner-sprite"
            fallbackClassName="miner-placeholder"
          >
            👷
          </GameAsset>

          <span
            className="resting-symbol"
            aria-hidden="true"
          >
            Z Z Z
          </span>
        </div>

        <span className="camp-object-label">
          <strong>RESTING</strong>
          <em>
            {formatCountdown(remaining)}
          </em>
        </span>
      </div>
    );
  }

  return (
    <div className="camp-object player-miner player-miner-fixed underground-sign resting-sign status-board-interactive">
      <div className="underground-sign-board">
        <p>
          {minerDisplayName(miner).toUpperCase()}{" "}
          IS RESTING
        </p>

        <div
          className="resting-sign-zzz"
          aria-hidden="true"
        >
          Z Z Z
        </div>

        <strong>
          {formatCountdown(remaining)}
        </strong>

        <small>
          READY WHEN THE TIMER ENDS
        </small>

        <span className="camp-lock-note">
          CAMP LOCKED
        </span>

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
