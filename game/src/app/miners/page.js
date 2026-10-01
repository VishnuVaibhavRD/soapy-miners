"use client";

import GamePlaceholder from "@/components/GamePlaceholder";

export default function MinersPage() {
  return (
    <GamePlaceholder
      section="MY MINERS"
      title="YOUR CREW"
      description="Select a miner, view stats, and send them underground. Wiring to the game contract comes next."
      backHref="/"
      backLabel="← OVERVIEW"
    />
  );
}
