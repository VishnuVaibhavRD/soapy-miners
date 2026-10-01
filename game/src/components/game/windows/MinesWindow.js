"use client";

import { formatMineDuration } from "@/lib/gameContract";

import {
  formatCountdown,
  minerDisplayName,
} from "../formatters";
import Message from "../ui/Message";
import OptionRow from "../ui/OptionRow";
import StatGrid from "../ui/StatGrid";
import GameWindow from "./GameWindow";

export default function MinesWindow({
  mines,
  miner,
  game,
  goldDust,
  selectedMine,
  onSelectMine,
  starting,
  error,
  success,
  onStart,
  onClose,
  onBackToCamp,
  restTimeRemaining = 0,
  isClaimable = false,
  activeMineName = "",
  onClaimLoot,
  claimingLoot = false,
  claimError = "",
}) {
  const goBackToCamp =
    onBackToCamp || onClose;
  const minerPower = game?.power ?? 0;
  const minerReady = game?.status === 0;
  const isResting = game?.status === 3;

  const enoughGD = selectedMine
    ? goldDust >= selectedMine.entryCost
    : false;

  function shaftActionLabel(mine) {
    if (isClaimable) {
      return "CLAIM LOOT FIRST";
    }

    if (!minerReady) {
      if (isResting) {
        return `RESTING ${formatCountdown(restTimeRemaining)}`;
      }

      return "MINER UNAVAILABLE";
    }

    if (minerPower < mine.requiredPower) {
      return `NEED ${mine.requiredPower} POWER`;
    }

    if (goldDust < mine.entryCost) {
      return "NOT ENOUGH GD";
    }

    return "SELECT SHAFT";
  }

  return (
    <GameWindow
      character="MINE ENTRANCE"
      title={
        isClaimable
          ? "LOOT READY"
          : "CHOOSE A SHAFT"
      }
      onClose={onClose}
      wide
    >
      {!miner || !game ? (
        <p className="ui-dialogue">
          Choose your Soapy at camp before
          entering the mines.
        </p>
      ) : (
        <>
          {isClaimable ? (
            <div className="mine-claim-panel">
              <p className="dialog-character">
                RETURNED FROM THE SHAFT
              </p>

              <h3>
                {minerDisplayName(miner).toUpperCase()}{" "}
                IS BACK
              </h3>

              <p className="ui-dialogue">
                {activeMineName
                  ? `${activeMineName} run complete.`
                  : "Mining run complete."}
                {" "}
                Claim loot to unlock the camp.
              </p>

              <button
                type="button"
                className="game-primary-button mine-claim-button"
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

              <button
                type="button"
                className="camp-back-button mine-back-button"
                onClick={goBackToCamp}
              >
                BACK TO CAMP
              </button>

              <Message type="error">
                {claimError}
              </Message>
            </div>
          ) : null}

          <p className="camp-mine-subtitle">
            YOUR MINER POWER: {game.power}
            {" · "}
            {minerDisplayName(miner)}
            {isResting
              ? ` · RESTING ${formatCountdown(restTimeRemaining)}`
              : ""}
            {isClaimable
              ? " · LOOT READY"
              : ""}
          </p>

          {!minerReady && !isClaimable ? (
            <Message type="status">
              {isResting
                ? `Your Soapy is resting. Ready in ${formatCountdown(restTimeRemaining)}.`
                : "Your miner is not ready for a new shaft."}
            </Message>
          ) : null}

          <div className="camp-mine-list">
            {mines.map((mine) => {
              const powerOk =
                minerPower >=
                mine.requiredPower;

              const canSelect =
                !isClaimable &&
                minerReady &&
                mine.active &&
                powerOk;

              return (
                <OptionRow
                  key={mine.id}
                  name={mine.name}
                  tag={shaftActionLabel(mine)}
                  locked={!canSelect}
                  selected={
                    selectedMine?.id ===
                    mine.id
                  }
                  onClick={() =>
                    onSelectMine(mine)
                  }
                >
                  <small>
                    {formatMineDuration(
                      mine.duration
                    )}
                    {" — TEST MODE"}
                  </small>

                  <small>
                    {mine.entryCost} GD
                    {" · "}POWER REQUIRED:{" "}
                    {mine.requiredPower}
                    {" · "}XP:{" "}
                    {mine.xpReward}
                  </small>
                </OptionRow>
              );
            })}
          </div>

          {selectedMine && minerReady ? (
            <div className="camp-expedition-confirm">
              <p>
                SEND{" "}
                {minerDisplayName(
                  miner
                ).toUpperCase()}{" "}
                UNDERGROUND?
              </p>

              <StatGrid
                cols={4}
                items={[
                  {
                    label: "MINE",
                    value:
                      selectedMine.name,
                  },
                  {
                    label: "DURATION",
                    value:
                      formatMineDuration(
                        selectedMine.duration
                      ),
                  },
                  {
                    label: "ENTRY",
                    value: `${selectedMine.entryCost} GD`,
                  },
                  {
                    label: "POWER",
                    value: game.power,
                  },
                ]}
              />

              {!enoughGD ? (
                <Message type="error">
                  Not enough Gold Dust.
                  Visit the Gold Trader.
                </Message>
              ) : null}

              <Message type="error">
                {error}
              </Message>

              <Message type="success">
                {success}
              </Message>

              <div className="camp-window-actions">
                <button
                  type="button"
                  className="camp-window-action"
                  disabled={starting}
                  onClick={goBackToCamp}
                >
                  BACK TO CAMP
                </button>

                <button
                  type="button"
                  className="game-primary-button camp-enter-shaft"
                  disabled={
                    starting ||
                    !enoughGD ||
                    !minerReady ||
                    minerPower <
                      selectedMine.requiredPower
                  }
                  onClick={onStart}
                >
                  {starting
                    ? "ENTERING..."
                    : "ENTER SHAFT"}
                </button>
              </div>
            </div>
          ) : null}

          {!isClaimable &&
          (!selectedMine ||
            !minerReady) ? (
            <button
              type="button"
              className="camp-back-button mine-back-button"
              onClick={goBackToCamp}
            >
              BACK TO CAMP
            </button>
          ) : null}
        </>
      )}
    </GameWindow>
  );
}
