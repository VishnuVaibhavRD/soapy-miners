"use client";

import { useState } from "react";

import GameWindow from "./GameWindow";

export default function UpgradesWindow({
  miner,
  game,
  goldDust,
  pickaxeUpgrade,
  backpackUpgrade,
  loadingPickaxe,
  loadingBackpack,
  upgradingPickaxe,
  upgradingBackpack,
  pickaxeError,
  backpackError,
  pickaxeSuccess,
  backpackSuccess,
  onUpgradePickaxe,
  onUpgradeBackpack,
  onClose,
}) {
  const [activeUpgrade, setActiveUpgrade] =
    useState("pickaxe");

  if (!miner || !game) {
    return (
      <GameWindow
        character="BLACKSMITH"
        title="SELECT A MINER"
        onClose={onClose}
      />
    );
  }

  const busy =
    upgradingPickaxe || upgradingBackpack;

  return (
    <GameWindow
      character="BLACKSMITH WORKSHOP"
      title="UPGRADE GEAR"
      onClose={busy ? undefined : onClose}
      wide
    >
      <div className="workshop-tabs">
        <button
          type="button"
          className={
            activeUpgrade === "pickaxe"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveUpgrade("pickaxe")
          }
          disabled={busy}
        >
          PICKAXE
        </button>

        <button
          type="button"
          className={
            activeUpgrade === "backpack"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveUpgrade("backpack")
          }
          disabled={busy}
        >
          BACKPACK
        </button>
      </div>

      {activeUpgrade === "pickaxe" ? (
        <PickaxeUpgradePanel
          game={game}
          goldDust={goldDust}
          upgrade={pickaxeUpgrade}
          loading={loadingPickaxe}
          upgrading={upgradingPickaxe}
          error={pickaxeError}
          success={pickaxeSuccess}
          onUpgrade={onUpgradePickaxe}
        />
      ) : null}

      {activeUpgrade === "backpack" ? (
        <BackpackUpgradePanel
          game={game}
          goldDust={goldDust}
          upgrade={backpackUpgrade}
          loading={loadingBackpack}
          upgrading={upgradingBackpack}
          error={backpackError}
          success={backpackSuccess}
          onUpgrade={onUpgradeBackpack}
        />
      ) : null}
    </GameWindow>
  );
}

function PickaxeUpgradePanel({
  game,
  goldDust,
  upgrade,
  loading,
  upgrading,
  error,
  success,
  onUpgrade,
}) {
  const minerReady = game.status === 0;
  const isMaxLevel = upgrade?.isMaxLevel;

  const enoughGD =
    isMaxLevel ||
    goldDust >= (upgrade?.goldDust ?? 0);

  const enoughOre =
    isMaxLevel ||
    game.ore >= (upgrade?.ore ?? 0);

  const enoughCrystal =
    isMaxLevel ||
    game.crystal >= (upgrade?.crystal ?? 0);

  const enoughCore =
    isMaxLevel ||
    game.core >= (upgrade?.core ?? 0);

  const canUpgrade =
    minerReady &&
    !loading &&
    !upgrading &&
    !isMaxLevel &&
    enoughGD &&
    enoughOre &&
    enoughCrystal &&
    enoughCore;

  return (
    <div className="pickaxe-upgrade-panel">
      <p className="workshop-dialogue">
        “A stronger pickaxe opens deeper
        shafts.”
      </p>

      <div className="workshop-current-gear">
        <div>
          <small>CURRENT PICKAXE</small>
          <strong>
            LEVEL {game.pickaxeLevel}
          </strong>
        </div>

        <div>
          <small>MINING POWER</small>
          <strong>{game.power}</strong>
        </div>
      </div>

      {loading ? (
        <p className="workshop-status">
          CHECKING THE FORGE...
        </p>
      ) : null}

      {!loading && isMaxLevel ? (
        <div className="workshop-max-level">
          <strong>MAXIMUM LEVEL</strong>
          <span>
            This pickaxe cannot be upgraded
            further.
          </span>
        </div>
      ) : null}

      {!loading && upgrade && !isMaxLevel ? (
        <>
          <div className="workshop-arrow">
            <span>LV {game.pickaxeLevel}</span>
            <strong>→</strong>
            <span>LV {upgrade.nextLevel}</span>
          </div>

          <div className="workshop-power-preview">
            <small>NEW MINING POWER</small>
            <strong>
              {upgrade.nextLevel * 10}
            </strong>
          </div>

          <h3>REQUIRED MATERIALS</h3>

          <div className="upgrade-cost-grid">
            <UpgradeCost
              name="GOLD DUST"
              required={upgrade.goldDust}
              owned={goldDust}
            />
            <UpgradeCost
              name="ORE"
              required={upgrade.ore}
              owned={game.ore}
            />
            <UpgradeCost
              name="CRYSTAL"
              required={upgrade.crystal}
              owned={game.crystal}
            />
            <UpgradeCost
              name="CORE"
              required={upgrade.core}
              owned={game.core}
            />
          </div>

          {!minerReady ? (
            <p className="workshop-error">
              Miner must be READY before
              upgrading.
            </p>
          ) : null}

          {error ? (
            <p className="workshop-error">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="workshop-success">
              {success}
            </p>
          ) : null}

          <button
            type="button"
            className="game-primary-button workshop-upgrade-button"
            disabled={!canUpgrade}
            onClick={onUpgrade}
          >
            {upgrading
              ? "FORGING..."
              : canUpgrade
                ? `UPGRADE TO LV ${upgrade.nextLevel}`
                : "MATERIALS REQUIRED"}
          </button>
        </>
      ) : null}
    </div>
  );
}

function BackpackUpgradePanel({
  game,
  goldDust,
  upgrade,
  loading,
  upgrading,
  error,
  success,
  onUpgrade,
}) {
  const minerReady = game.status === 0;
  const isMaxLevel = upgrade?.isMaxLevel;

  const enoughGD =
    isMaxLevel ||
    goldDust >= (upgrade?.goldDust ?? 0);

  const enoughOre =
    isMaxLevel ||
    game.ore >= (upgrade?.ore ?? 0);

  const enoughCrystal =
    isMaxLevel ||
    game.crystal >= (upgrade?.crystal ?? 0);

  const enoughCore =
    isMaxLevel ||
    game.core >= (upgrade?.core ?? 0);

  const canUpgrade =
    minerReady &&
    !loading &&
    !upgrading &&
    !isMaxLevel &&
    enoughGD &&
    enoughOre &&
    enoughCrystal &&
    enoughCore;

  if (loading) {
    return (
      <p className="workshop-status">
        CHECKING BACKPACK MATERIALS...
      </p>
    );
  }

  if (isMaxLevel) {
    return (
      <div className="workshop-max-level">
        <strong>MAXIMUM BACKPACK LEVEL</strong>
        <span>
          This Backpack cannot be upgraded
          further.
        </span>
      </div>
    );
  }

  if (!upgrade) {
    return (
      <p className="workshop-error">
        Upgrade information unavailable.
      </p>
    );
  }

  return (
    <div className="backpack-upgrade-panel">
      <p className="workshop-dialogue">
        “More room means more treasure.”
      </p>

      <div className="workshop-current-gear">
        <div>
          <small>CURRENT BACKPACK</small>
          <strong>
            LEVEL {game.backpackLevel}
          </strong>
        </div>

        <div>
          <small>CURRENT CAPACITY</small>
          <strong>
            {game.backpackCapacity}
          </strong>
        </div>
      </div>

      <div className="workshop-arrow">
        <span>LV {game.backpackLevel}</span>
        <strong>→</strong>
        <span>LV {upgrade.nextLevel}</span>
      </div>

      <div className="workshop-power-preview">
        <small>NEW CAPACITY</small>
        <strong>
          {500 + upgrade.nextLevel * 500}
        </strong>
      </div>

      <h3>REQUIRED MATERIALS</h3>

      <div className="upgrade-cost-grid">
        <UpgradeCost
          name="GOLD DUST"
          required={upgrade.goldDust}
          owned={goldDust}
        />
        <UpgradeCost
          name="ORE"
          required={upgrade.ore}
          owned={game.ore}
        />
        <UpgradeCost
          name="CRYSTAL"
          required={upgrade.crystal}
          owned={game.crystal}
        />
        <UpgradeCost
          name="CORE"
          required={upgrade.core}
          owned={game.core}
        />
      </div>

      {!minerReady ? (
        <p className="workshop-error">
          Miner must be READY before
          upgrading.
        </p>
      ) : null}

      {error ? (
        <p className="workshop-error">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="workshop-success">
          {success}
        </p>
      ) : null}

      <button
        type="button"
        className="game-primary-button workshop-upgrade-button"
        disabled={!canUpgrade}
        onClick={onUpgrade}
      >
        {upgrading
          ? "SEWING..."
          : canUpgrade
            ? `UPGRADE TO LV ${upgrade.nextLevel}`
            : "MATERIALS REQUIRED"}
      </button>
    </div>
  );
}

function UpgradeCost({ name, required, owned }) {
  const enough = owned >= required;

  return (
    <div
      className={`upgrade-cost ${
        enough ? "enough" : "missing"
      }`}
    >
      <small>{name}</small>
      <strong>{required}</strong>
      <span>OWNED: {owned}</span>
    </div>
  );
}
