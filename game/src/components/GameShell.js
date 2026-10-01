"use client";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

import {
  useGameWallet,
} from "@/components/GameWalletProvider";

const NAV_ITEMS = [
  {
    href: "/",
    text: "OVERVIEW",
    icon: "⌂",
  },
  {
    href: "/miners",
    text: "MY MINERS",
    icon: "♟",
  },
  {
    href: "/mines",
    text: "MINES",
    icon: "⛏",
  },
  {
    href: "/inventory",
    text: "INVENTORY",
    icon: "▣",
  },
  {
    href: "/upgrades",
    text: "UPGRADES",
    icon: "⚒",
  },
];

const ECONOMY_ITEMS = [
  {
    href: "/market",
    text: "MARKET",
    icon: "◆",
  },
  {
    href: "/reward-mines",
    text: "QUAI MINES",
    icon: "◈",
  },
];

export default function GameShell({
  goldDust = 0,
  campMode = false,
  children,
}) {
  const pathname =
    usePathname();

  const {
    wallet,
    connecting,
    handleConnectWallet,
  } = useGameWallet();

  return (
    <main className="game-world">

      <header className="game-header">

        <Link
          href="/"
          className="game-brand"
        >
          <span aria-hidden="true">⛏</span>
          <span className="game-brand-full">
            SOAPY MINERS
          </span>
          <span className="game-brand-short">
            SOAPY
          </span>
        </Link>

        <div className="game-header-meta">
          <span className="game-phase-badge">
            PHASE II — THE DESCENT
          </span>
        </div>

        <div className="game-header-right">

          <button
            type="button"
            onClick={handleConnectWallet}
            disabled={connecting}
            className="game-wallet-button"
          >
            {connecting
              ? "CONNECTING..."
              : wallet
                ? `${wallet.slice(
                    0,
                    6
                  )}...${wallet.slice(
                    -4
                  )}`
                : "CONNECT"}
          </button>

        </div>

      </header>

      <div
        className={`game-layout ${
          campMode
            ? "game-layout-camp"
            : ""
        }`}
      >

        {!campMode ? (
          <aside className="game-sidebar">

            <p className="game-sidebar-label">
              MINER CAMP
            </p>

            {NAV_ITEMS.map((item) => (
              <GameNav
                key={item.href}
                href={item.href}
                text={item.text}
                icon={item.icon}
                active={
                  pathname ===
                  item.href
                }
              />
            ))}

            <div className="game-nav-divider" />

            <p className="game-sidebar-label">
              ECONOMY
            </p>

            {ECONOMY_ITEMS.map((item) => (
              <GameNav
                key={item.href}
                href={item.href}
                text={item.text}
                icon={item.icon}
                active={
                  pathname ===
                  item.href
                }
              />
            ))}

          </aside>
        ) : null}

        <section
          className={`game-main ${
            campMode
              ? "game-main-camp"
              : ""
          }`}
        >
          {children}
        </section>

      </div>

    </main>
  );
}


function GameNav({
  href,
  text,
  icon,
  active,
}) {
  return (
    <Link
      href={href}
      className={`game-nav-item ${
        active
          ? "game-nav-item-active"
          : ""
      }`}
    >
      <span>
        {icon}
      </span>

      {text}
    </Link>
  );
}
