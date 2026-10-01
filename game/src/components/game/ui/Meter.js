"use client";

/** Backpack-style capacity bar. */
export default function Meter({
  label,
  value,
  max,
  fullAt = 85,
}) {
  const pct =
    max > 0
      ? Math.min(
          100,
          Math.round(
            (value / max) * 100
          )
        )
      : 0;

  const full = pct >= fullAt;

  return (
    <div
      className={
        full ? "ui-meter-full" : undefined
      }
    >
      <div className="ui-meter-label">
        <span>{label}</span>

        <span>
          {value} / {max}
        </span>
      </div>

      <div
        className="ui-meter"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className="ui-meter-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
