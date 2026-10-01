"use client";

import CampObject from "./CampObject";
import GameAsset from "./GameAsset";

export default function Workshop({
  onClick,
  inRange = false,
}) {
  return (
    <CampObject
      interactId="upgrades"
      className="camp-workshop"
      label="WORKSHOP"
      sublabel="UPGRADE GEAR"
      action="Upgrade"
      inRange={inRange}
      onClick={onClick}
    >
      <GameAsset
        src="/images/game/blacksmith.png"
        alt="Workshop"
        className="workshop-scene-img"
        fallbackClassName="workshop-art"
      >
        ⚒
      </GameAsset>
    </CampObject>
  );
}
