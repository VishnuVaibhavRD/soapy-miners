"use client";

import OptionRow from "../ui/OptionRow";
import SoonBadge from "../ui/SoonBadge";
import GameWindow from "./GameWindow";

const QUAI_VEINS = [
  {
    name: "QUAI VEIN I",
    requiredPower: 20,
  },
  {
    name: "QUAI VEIN II",
    requiredPower: 50,
  },
  {
    name: "ANCIENT QUAI CORE",
    requiredPower: 120,
  },
];

export default function QuaiMinesWindow({
  power = 0,
  onClose,
}) {
  return (
    <GameWindow
      character="QUAI DEPTHS"
      title="REAL QUAI REWARD MINES"
      onClose={onClose}
      wide
    >
      <p className="camp-mine-subtitle">
        Your Mining Power: {power}
      </p>

      <div className="camp-mine-list">
        {QUAI_VEINS.map((vein) => {
          const unlocked =
            power >= vein.requiredPower;

          return (
            <OptionRow
              key={vein.name}
              name={vein.name}
              tag={
                unlocked
                  ? "AVAILABLE"
                  : "LOCKED"
              }
              locked={!unlocked}
            >
              <small>
                Required Power:{" "}
                {vein.requiredPower}
              </small>
            </OptionRow>
          );
        })}
      </div>

      <p className="ui-dialogue">
        Stronger miners deal more damage to
        admin-funded QUAI pools.
      </p>

      <SoonBadge>
        Reward mine coming soon
      </SoonBadge>
    </GameWindow>
  );
}
