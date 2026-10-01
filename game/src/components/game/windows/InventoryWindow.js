"use client";

import Meter from "../ui/Meter";
import StatGrid from "../ui/StatGrid";
import GameWindow from "./GameWindow";

export default function InventoryWindow({
  game,
  onClose,
}) {
  const total = game
    ? game.ore +
      game.crystal +
      game.core
    : 0;

  return (
    <GameWindow
      character="STORAGE CHEST"
      title="YOUR RESOURCES"
      onClose={onClose}
    >
      {game ? (
        <>
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

          <div className="merchant-balance">
            <Meter
              label="Backpack"
              value={total}
              max={
                game.backpackCapacity ||
                0
              }
            />
          </div>
        </>
      ) : (
        <p className="ui-dialogue">
          Select a miner to view their
          inventory.
        </p>
      )}
    </GameWindow>
  );
}
