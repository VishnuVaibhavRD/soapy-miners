"use client";

import SoonBadge from "../ui/SoonBadge";
import StatGrid from "../ui/StatGrid";
import GameWindow from "./GameWindow";

export default function MarketWindow({
  onClose,
}) {
  return (
    <GameWindow
      character="MARKET TRADER"
      title="RESOURCE MARKET"
      onClose={onClose}
    >
      <p className="ui-dialogue">
        Buy and sell:
      </p>

      <StatGrid
        items={[
          {
            label: "ORE",
            value: "—",
          },
          {
            label: "CRYSTAL",
            value: "—",
          },
          {
            label: "CORE",
            value: "—",
          },
        ]}
      />

      <SoonBadge>
        Marketplace contract coming soon
      </SoonBadge>
    </GameWindow>
  );
}
