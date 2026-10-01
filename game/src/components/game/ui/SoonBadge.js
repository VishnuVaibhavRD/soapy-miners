"use client";

/** "Coming soon" footer used by the not-yet-implemented windows. */
export default function SoonBadge({
  children,
}) {
  return (
    <p className="ui-badge-soon">
      {children}
    </p>
  );
}
