"use client";

/**
 * Grid of label/value cells — the repeated block in nearly every window.
 *
 * items: [{ label, value, tone? }]
 * tone maps to the status colours in ui.css (ready / mining / claimable...).
 */
export default function StatGrid({
  items,
  cols = 3,
  size = "md",
  className = "",
}) {
  return (
    <div
      className={`ui-stat-grid ${className}`.trim()}
      style={{ "--cols": cols }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={`ui-stat ${
            size === "lg"
              ? "ui-stat-lg"
              : ""
          }`.trim()}
        >
          <small>{item.label}</small>

          <strong
            className={
              item.tone
                ? `status-${item.tone}`
                : undefined
            }
          >
            {item.value}
          </strong>
        </div>
      ))}
    </div>
  );
}
