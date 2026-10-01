"use client";

import Message from "../ui/Message";
import GameWindow from "./GameWindow";

const OFFERS = [
  { gd: 10, quai: 1 },
  { gd: 50, quai: 5 },
  { gd: 100, quai: 10 },
];

export default function GoldTraderWindow({
  balance,
  buying,
  error,
  success,
  onBuy,
  onClose,
}) {
  return (
    <GameWindow
      character="GOLD TRADER"
      title="NEED GOLD DUST?"
      onClose={onClose}
    >
      <p className="ui-dialogue">
        &ldquo;Heading underground?
        You&apos;ll need Gold Dust.&rdquo;
      </p>

      <div className="merchant-balance">
        <small>YOUR POUCH</small>

        <strong>🪙 {balance} GD</strong>
      </div>

      <div className="merchant-shop">
        {OFFERS.map((offer) => (
          <button
            key={offer.quai}
            type="button"
            disabled={buying}
            onClick={() =>
              onBuy(offer.quai)
            }
          >
            <strong>{offer.gd} GD</strong>

            <span>{offer.quai} QUAI</span>
          </button>
        ))}
      </div>

      {buying ? (
        <Message type="status">
          Waiting for wallet... transaction
          confirming...
        </Message>
      ) : null}

      <Message type="error">
        {error}
      </Message>

      <Message type="success">
        {success}
      </Message>
    </GameWindow>
  );
}
