"use client";

import CampObject from "./CampObject";
import GameAsset from "./GameAsset";

export default function StorageChest({
  almostFull = false,
  onClick,
  inRange = false,
}) {
  return (
    <CampObject
      interactId="storage"
      className={`camp-storage ${
        almostFull
          ? "almost-full"
          : ""
      }`}
      label="STORAGE"
      sublabel={
        almostFull
          ? "ALMOST FULL"
          : undefined
      }
      action="Open"
      inRange={inRange}
      onClick={onClick}
    >
      <GameAsset
        src="/images/game/storage-chest.png"
        alt="Storage Chest"
        className="storage-chest-img"
        fallbackClassName="storage-art"
      >
        📦
      </GameAsset>
    </CampObject>
  );
}
