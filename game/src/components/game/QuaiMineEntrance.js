"use client";

import CampObject from "./CampObject";
import GameAsset from "./GameAsset";

export default function QuaiMineEntrance({
  onClick,
  inRange = false,
}) {
  return (
    <CampObject
      interactId="quai"
      className="quai-reward-door"
      label="QUAI SHAFTS"
      sublabel="REAL QUAI REWARDS"
      action="Descend"
      inRange={inRange}
      onClick={onClick}
    >
      <div className="quai-shaft">
        <div
          className="quai-shaft-aura"
          aria-hidden="true"
        />

        <GameAsset
          src="/images/game/quai-mine-entrance.png"
          alt="Quai Shafts"
          className="quai-door-img"
          fallbackClassName="quai-door-art"
        >
          ◈
        </GameAsset>
      </div>
    </CampObject>
  );
}
