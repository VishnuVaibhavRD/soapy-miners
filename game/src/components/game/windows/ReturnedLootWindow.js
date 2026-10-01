"use client";

export default function ReturnedLootWindow({
  loot,
  onClose,
}) {
  return (
    <div
      className="game-window-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="game-dialog-window returned-loot-window"
        onClick={(event) =>
          event.stopPropagation()
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="returned-loot-title"
      >
        <p className="dialog-character">
          EXPEDITION COMPLETE
        </p>

        <h2 id="returned-loot-title">
          YOUR SOAPY RETURNED!
        </h2>

        <div className="returned-loot-grid">
          <div>
            <span>🪨</span>

            <strong>
              +{loot.ore}
            </strong>

            <small>
              ORE
            </small>
          </div>

          <div>
            <span>💎</span>

            <strong>
              +{loot.crystal}
            </strong>

            <small>
              CRYSTAL
            </small>
          </div>

          <div>
            <span>🔮</span>

            <strong>
              +{loot.core}
            </strong>

            <small>
              CORE
            </small>
          </div>
        </div>

        <div className="returned-xp">
          +{loot.xp} XP
        </div>

        <button
          type="button"
          className="game-primary-button"
          onClick={onClose}
        >
          RETURN TO CAMP
        </button>
      </section>
    </div>
  );
}
