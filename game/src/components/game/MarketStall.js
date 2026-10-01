"use client";

import CampObject from "./CampObject";
import GameAsset from "./GameAsset";

export default function MarketStall({
  onClick,
  inRange = false,
}) {
  return (
    <CampObject
      interactId="market"
      className="camp-market"
      label="RESOURCE MARKET"
      action="Trade"
      inRange={inRange}
      onClick={onClick}
    >
      <GameAsset
        src="/images/game/market-stall.png"
        alt="Market Stall"
        className="market-stall-img"
        fallbackClassName="market-art"
      >
        🏪
      </GameAsset>
    </CampObject>
  );
}
