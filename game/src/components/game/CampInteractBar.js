"use client";

export default function CampInteractBar({
  action,
}) {
  if (!action) {
    return null;
  }

  return (
    <div className="camp-interact-bar">
      <kbd>E</kbd>

      <span>
        {action}
      </span>
    </div>
  );
}
