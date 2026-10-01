"use client";

import {
  getCampObjectPlacement,
  getInteractable,
} from "./campLayout";

export default function CampObject({
  interactId,
  className = "",
  label,
  sublabel,
  action,
  inRange = false,
  onClick,
  children,
  as = "button",
}) {
  const Tag = as;

  const spot =
    interactId
      ? getInteractable(
          interactId
        )
      : null;

  const placement =
    getCampObjectPlacement(
      spot
    );

  const sharedProps = {
    className: [
      "camp-object",
      placement.className,
      className,
      inRange
        ? "camp-object-in-range"
        : "",
    ]
      .filter(Boolean)
      .join(" "),
    style: placement.style,
    type:
      Tag === "button"
        ? "button"
        : undefined,
    onClick,
  };

  return (
    <Tag {...sharedProps}>
      <div
        className="camp-object-spotlight"
        aria-hidden="true"
      />

      <div className="camp-object-visual">
        {children}
      </div>

      {inRange && action ? (
        <span className="camp-interact-prompt">
          <kbd>E</kbd>
          {action}
        </span>
      ) : null}

      <span className="camp-object-label">
        <strong>
          {label}
        </strong>

        {sublabel ? (
          <em>
            {sublabel}
          </em>
        ) : null}
      </span>
    </Tag>
  );
}
