"use client";

import { getMinerStatusName } from "@/lib/gameContract";

import { minerDisplayName } from "../formatters";
import GameAsset from "../GameAsset";
import StatGrid from "../ui/StatGrid";
import GameWindow from "./GameWindow";

export default function MinerWindow({
  miners,
  miner,
  game,
  loading,
  onSelectMiner,
  onOpenInventory,
  onOpenUpgrades,
  onClose,
}) {
  const statusName = game
    ? getMinerStatusName(game.status)
    : null;

  return (
    <GameWindow
      character="MINER PROFILE"
      title={minerDisplayName(miner)}
      onClose={onClose}
      wide
    >
      {loading ? (
        <p className="ui-dialogue">
          Loading miner stats...
        </p>
      ) : miner && game ? (
        <>
          <div className="camp-miner-portrait">
            <GameAsset
              src={miner.image}
              alt={minerDisplayName(
                miner
              )}
              className="camp-player-miner"
              fallbackClassName="miner-placeholder"
            >
              👷
            </GameAsset>
          </div>

          <StatGrid
            items={[
              {
                label: "LEVEL",
                value: game.level,
              },
              {
                label: "XP",
                value: game.xp,
              },
              {
                label: "MINING POWER",
                value: game.power,
              },
              {
                label: "PICKAXE",
                value: `LV ${game.pickaxeLevel}`,
              },
              {
                label: "BACKPACK",
                value: `LV ${game.backpackLevel}`,
              },
              {
                label: "STATUS",
                value: statusName,
                tone: statusName?.toLowerCase(),
              },
            ]}
          />

          <div className="camp-miner-inv-summary">
            <StatGrid
              size="lg"
              items={[
                {
                  label: "ORE",
                  value: game.ore,
                },
                {
                  label: "CRYSTAL",
                  value: game.crystal,
                },
                {
                  label: "CORE",
                  value: game.core,
                },
              ]}
            />
          </div>

          <div className="camp-window-actions">
            <button
              type="button"
              className="camp-window-action"
              onClick={onOpenInventory}
            >
              VIEW INVENTORY
            </button>

            <button
              type="button"
              className="camp-window-action"
              onClick={onOpenUpgrades}
            >
              UPGRADES
            </button>
          </div>

          {miners.length > 1 ? (
            <div className="camp-miner-switch">
              <small>YOUR CREW</small>

              <div className="camp-miner-switch-list">
                {miners.map((item) => (
                  <button
                    key={item.tokenId}
                    type="button"
                    className={
                      miner.tokenId ===
                      item.tokenId
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      onSelectMiner(item)
                    }
                  >
                    {minerDisplayName(
                      item
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <p className="ui-dialogue">
          No miner selected.
        </p>
      )}
    </GameWindow>
  );
}
