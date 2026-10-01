"use client";

import {
  useState,
} from "react";

/**
 * Tries a PNG path; falls back to children (emoji / CSS art)
 * so swapping in real pixel assets is a one-line src change.
 */
export default function GameAsset({
  src,
  alt = "",
  className = "",
  fallbackClassName = "",
  children,
}) {
  const [failed, setFailed] =
    useState(false);

  if (
    !src ||
    failed
  ) {
    return (
      <div
        className={`game-asset-fallback ${fallbackClassName}`.trim()}
        aria-hidden={
          alt
            ? undefined
            : true
        }
        role={
          alt
            ? "img"
            : undefined
        }
        aria-label={
          alt ||
          undefined
        }
      >
        {children}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`pixel-art ${className}`.trim()}
      onError={() =>
        setFailed(true)
      }
      draggable={false}
    />
  );
}
