"use client";

import CampObject from "./CampObject";
import GameAsset from "./GameAsset";

export default function MineEntrance({
  onClick,
  inRange = false,
  claimReady = false,
}) {
  return (
    <CampObject
      interactId="mines"
      className={`camp-mine${
        claimReady
          ? " camp-mine-claim-ready"
          : ""
      }`}
      label={
        claimReady
          ? "CLAIM YOUR LOOT"
          : "ENTER THE MINES"
      }
      action={
        claimReady
          ? "Claim"
          : "Enter"
      }
      inRange={
        inRange || claimReady
      }
      onClick={onClick}
    >
      <div className="camp-mine-art">
        <GameAsset
          src="/images/game/mine-entrance.png"
          alt="Enter the mines"
          className="mine-entrance-img"
          fallbackClassName="mine-entrance-hit"
        >
          <span className="mine-lantern mine-lantern-left">
            🔥
          </span>
          <span className="mine-hit-sign">
            ⛏
          </span>
          <span className="mine-lantern mine-lantern-right">
            🔥
          </span>
        </GameAsset>

        <div
          className="mine-dust"
          aria-hidden="true"
        >
          <i />
          <i />
          <i />
        </div>
      </div>
    </CampObject>
  );
}
