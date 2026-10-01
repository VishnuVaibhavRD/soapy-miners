"use client";

import {
  useState,
} from "react";

import {
  minerDisplayName,
} from "./formatters";

export default function MinerSelectScreen({
  miners,
  goldDust,
  loading = false,
  initialMiner = null,
  onConfirm,
}) {
  const [
    picked,
    setPicked,
  ] = useState(
    initialMiner
  );

  const selected =
    picked ??
    initialMiner ??
    miners[0] ??
    null;

  return (
    <section className="miner-select-screen">
      <div className="miner-select-heading">
        <p>
          PHASE II — THE DESCENT
        </p>

        <h1>
          CHOOSE YOUR SOAPY
        </h1>

        <span>
          Select a miner to enter
          the underground camp.
        </span>
      </div>

      <div className="miner-select-meta">
        <strong>
          🪙 {goldDust} GD
        </strong>

        <span>
          {miners.length}{" "}
          {miners.length === 1
            ? "MINER"
            : "MINERS"}{" "}
          IN WALLET
        </span>
      </div>

      <div className="miner-select-grid">
        {miners.map(
          (miner) => {
            const active =
              selected?.tokenId ===
              miner.tokenId;

            return (
              <button
                key={
                  miner.tokenId
                }
                type="button"
                className={`miner-select-card ${
                  active
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  setPicked(
                    miner
                  )
                }
              >
                <div className="miner-select-portrait">
                  {miner.image ? (
                    <img
                      src={
                        miner.image
                      }
                      alt={
                        minerDisplayName(
                          miner
                        )
                      }
                      className="pixel-art"
                      draggable={
                        false
                      }
                    />
                  ) : (
                    <span>
                      👷
                    </span>
                  )}
                </div>

                <h3>
                  {minerDisplayName(
                    miner
                  )}
                </h3>

                <small>
                  TOKEN #
                  {miner.tokenId}
                </small>

                {active ? (
                  <em>
                    SELECTED
                  </em>
                ) : null}
              </button>
            );
          }
        )}
      </div>

      <div className="miner-select-actions">
        <button
          type="button"
          className="game-primary-button"
          disabled={
            !selected ||
            loading
          }
          onClick={() =>
            onConfirm(
              selected
            )
          }
        >
          {loading
            ? "LOADING MINER..."
            : "ENTER MINER CAMP"}
        </button>
      </div>
    </section>
  );
}
