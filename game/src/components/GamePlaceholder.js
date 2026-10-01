"use client";

import Link from "next/link";

import GameShell from "@/components/GameShell";

export default function GamePlaceholder({
  section,
  title,
  description,
  locked = false,
  backHref,
  backLabel,
}) {
  return (
    <GameShell>

      {backHref ? (
        <Link
          href={backHref}
          className="game-inline-back"
        >
          {backLabel}
        </Link>
      ) : null}

      <div className="game-title">

        <p>
          {section}
        </p>

        <h1>
          {title}
        </h1>

        <span>
          {description}
        </span>

      </div>

      <section className="game-welcome-panel">

        {locked ? (
          <div className="game-locked-badge">
            LOCKED
          </div>
        ) : (
          <div className="game-pickaxe">
            ⛏
          </div>
        )}

        <h2>
          {locked
            ? "COMING IN NEXT BUILD"
            : "UNDER CONSTRUCTION"}
        </h2>

        <p>
          {description}
        </p>

        <Link
          href="/"
          className="game-primary-button"
        >
          BACK TO CAMP
        </Link>

      </section>

    </GameShell>
  );
}
