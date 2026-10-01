"use client";

import {
  GameWalletProvider,
} from "@/components/GameWalletProvider";

export default function Providers({
  children,
}) {
  return (
    <GameWalletProvider>
      {children}
    </GameWalletProvider>
  );
}
