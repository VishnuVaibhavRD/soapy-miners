"use client";

/** Inline feedback line inside a dialog. type: error | success | status */
export default function Message({
  type = "status",
  children,
}) {
  if (!children) {
    return null;
  }

  return (
    <p
      className={`ui-msg ui-msg-${type}`}
      role={
        type === "error"
          ? "alert"
          : undefined
      }
    >
      {children}
    </p>
  );
}
