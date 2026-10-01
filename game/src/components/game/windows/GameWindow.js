"use client";

export default function GameWindow({
  character,
  title,
  onClose,
  children,
  wide = false,
}) {
  return (
    <div
      className="game-window-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <section
        className={`game-dialog-window ${
          wide
            ? "game-dialog-wide"
            : ""
        }`}
        onClick={(event) =>
          event.stopPropagation()
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-dialog-title"
      >
        {onClose ? (
          <button
            type="button"
            className="dialog-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        ) : null}

        {character ? (
          <p className="dialog-character">
            {character}
          </p>
        ) : null}

        {title ? (
          <h2 id="game-dialog-title">
            {title}
          </h2>
        ) : null}

        {children}
      </section>
    </div>
  );
}
