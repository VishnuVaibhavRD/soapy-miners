"use client";

/** Selectable row used by the mine/vein pickers. */
export default function OptionRow({
  name,
  tag,
  locked = false,
  selected = false,
  onClick,
  children,
}) {
  return (
    <button
      type="button"
      disabled={locked}
      onClick={onClick}
      className={`ui-option ${
        selected ? "selected" : ""
      } ${locked ? "locked" : ""}`.trim()}
    >
      <span className="ui-option-top">
        <strong>{name}</strong>

        {tag ? (
          <span
            className={`ui-tag ${
              locked
                ? "ui-tag-locked"
                : ""
            }`.trim()}
          >
            {tag}
          </span>
        ) : null}
      </span>

      {children}
    </button>
  );
}
