"use client";

import {
  formatCountdown,
  minerDisplayName,
} from "./formatters";

export default function GameHUD({
  miner,
  onChangeMiner,
  lockStatus = null,
  onClaimLoot,
  claimingLoot = false,
  claimError = "",
  onReturnToCamp,
}) {
  if (
    !miner &&
    !onChangeMiner &&
    !lockStatus
  ) {
    return null;
  }

  const canClaim =
    lockStatus?.label === "RETURNED" &&
    Boolean(onClaimLoot);

  const backToCamp =
    onReturnToCamp || onChangeMiner;

  return (
    <div className="game-camp-hud game-camp-hud-minimal">
      {miner ? (
        <div className="camp-active-miner">
          <small>
            ACTIVE MINER
          </small>

          <strong>
            {minerDisplayName(
              miner
            )}
          </strong>
        </div>
      ) : null}

      {lockStatus ? (
        <div
          className={`camp-lock-banner status-${
            lockStatus.label ===
            "RESTING"
              ? "resting"
              : lockStatus.label ===
                  "RETURNED"
                ? "claimable"
                : "mining"
          }`}
        >
          <small>
            {lockStatus.label}
          </small>

          {lockStatus.countdown !==
            null &&
          lockStatus.countdown !==
            undefined ? (
            <strong>
              {formatCountdown(
                lockStatus.countdown
              )}
            </strong>
          ) : (
            <strong>
              {lockStatus.detail}
            </strong>
          )}

          <span>
            {lockStatus.note}
          </span>

          {canClaim ? (
            <button
              type="button"
              className="game-primary-button camp-hud-claim-button"
              onClick={onClaimLoot}
              disabled={claimingLoot}
            >
              {claimingLoot
                ? "CLAIMING..."
                : "CLAIM LOOT"}
            </button>
          ) : null}

          {canClaim && claimError ? (
            <p className="game-error">
              {claimError}
            </p>
          ) : null}
        </div>
      ) : null}

      {backToCamp ? (
        <button
          type="button"
          className="camp-change-miner"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            backToCamp();
          }}
        >
          BACK TO CAMP
        </button>
      ) : null}
    </div>
  );
}
