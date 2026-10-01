"use client";

import { CAMP_ROWS } from "./campLayout";

/**
 * Environment-only layers for the miner camp.
 * Interactive NPCs/objects must NOT live here.
 *
 * Painted back to front: backdrop art, colour grade, ground shelves,
 * then lighting, dust and fog on top.
 */
export default function CampEnvironment() {
  return (
    <>
      <div
        className="game-bg game-bg-back"
        aria-hidden="true"
      />

      <div
        className="game-bg game-bg-mid"
        aria-hidden="true"
      />

      <div
        className="game-bg game-bg-ground"
        aria-hidden="true"
      />

      {CAMP_ROWS.map((y) => (
        <div
          key={y}
          className="env-shelf"
          style={{ top: `${y}%` }}
          aria-hidden="true"
        />
      ))}

      <div
        className="env-quai-tunnel"
        aria-hidden="true"
      />

      <div
        className="game-lighting"
        aria-hidden="true"
      />

      <div
        className="cave-dust"
        aria-hidden="true"
      />

      <div
        className="game-bg game-bg-fog"
        aria-hidden="true"
      />
    </>
  );
}

export function CampForeground() {
  return (
    <div
      className="game-bg game-bg-foreground"
      aria-hidden="true"
    />
  );
}
