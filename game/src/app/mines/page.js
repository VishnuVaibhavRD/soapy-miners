"use client";

import GamePlaceholder from "@/components/GamePlaceholder";

export default function MinesPage() {
  return (
    <GamePlaceholder
      section="MINES"
      title="MINING SHAFTS"
      description="Three test shafts are configured on-chain. Start expedition flow will wire here next."
      backHref="/"
      backLabel="← OVERVIEW"
    />
  );
}
