"use client";

import CampObject from "./CampObject";
import GameAsset from "./GameAsset";

export default function GoldTrader({
  onClick,
  inRange = false,
}) {
  return (
    <CampObject
      interactId="gold"
      className="gold-merchant"
      label="GOLD TRADER"
      sublabel="NEED GOLD DUST?"
      action="Talk"
      inRange={inRange}
      onClick={onClick}
    >
      <GameAsset
        src="/images/game/gold-trader.png"
        alt="Gold Trader"
        className="merchant-sprite-img"
        fallbackClassName="merchant-sprite"
      >
        👷
      </GameAsset>
    </CampObject>
  );
}
