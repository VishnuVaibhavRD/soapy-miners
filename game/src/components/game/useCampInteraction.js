"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  findNearestInteractable,
  getInteractable,
  getInteractDistance,
} from "./campLayout";

export default function useCampInteraction({
  position,
  movementEnabled,
  modalOpen,
  disabled,
  moveTo,
  onOpenWindow,
  onWalkEnd,
}) {
  const [
    pendingInteractId,
    setPendingInteractId,
  ] = useState(null);

  const pendingRef =
    useRef(null);

  const positionRef =
    useRef(position);

  useEffect(() => {
    pendingRef.current =
      pendingInteractId;
  }, [
    pendingInteractId,
  ]);

  useEffect(() => {
    positionRef.current =
      position;
  }, [position]);

  const nearest =
    movementEnabled &&
    !disabled &&
    !modalOpen
      ? findNearestInteractable(
          position
        )
      : null;

  const openWindow =
    useCallback(
      (windowId) => {
        onOpenWindow(
          windowId
        );
      },
      [onOpenWindow]
    );

  const requestInteract =
    useCallback(
      (interactId) => {
        const spot =
          getInteractable(
            interactId
          );

        if (!spot) {
          return;
        }

        if (disabled || modalOpen) {
          return;
        }

        if (!movementEnabled) {
          openWindow(
            spot.window
          );
          return;
        }

        const distance =
          getInteractDistance(
            position,
            spot
          );

        if (
          distance <=
          spot.radius
        ) {
          openWindow(
            spot.window
          );
          return;
        }

        setPendingInteractId(
          interactId
        );

        moveTo(
          spot.walkX,
          spot.walkY
        );
      },
      [
        movementEnabled,
        disabled,
        modalOpen,
        position,
        moveTo,
        openWindow,
      ]
    );

  const tryPendingInteract =
    useCallback(() => {
      const pendingId =
        pendingRef.current;

      if (!pendingId) {
        return false;
      }

      const spot =
        getInteractable(
          pendingId
        );

      if (!spot) {
        setPendingInteractId(
          null
        );
        return false;
      }

      const current =
        positionRef.current;

      const distance =
        getInteractDistance(
          current,
          spot
        );

      const nearWalkTarget =
        Math.hypot(
          current.x - spot.walkX,
          current.y - spot.walkY
        ) <= 3.5;

      if (
        distance <=
          spot.radius + 2 ||
        nearWalkTarget
      ) {
        openWindow(
          spot.window
        );
        setPendingInteractId(
          null
        );
        return true;
      }

      setPendingInteractId(
        null
      );

      return false;
    }, [
      position,
      openWindow,
    ]);

  const handleWalkEnd =
    useCallback(() => {
      onWalkEnd?.();

      if (
        pendingRef.current
      ) {
        tryPendingInteract();
      }
    }, [
      onWalkEnd,
      tryPendingInteract,
    ]);

  const performKeyInteract =
    useCallback(() => {
      if (
        disabled ||
        modalOpen
      ) {
        return;
      }

      if (nearest) {
        openWindow(
          nearest.window
        );
      }
    }, [
      disabled,
      modalOpen,
      nearest,
      openWindow,
    ]);

  useEffect(() => {
    function onKeyDown(
      event
    ) {
      if (
        event.target instanceof
          HTMLInputElement ||
        event.target instanceof
          HTMLTextAreaElement
      ) {
        return;
      }

      if (
        event.key ===
        "Escape"
      ) {
        if (modalOpen) {
          event.preventDefault();
          onOpenWindow(
            null
          );
        }

        return;
      }

      if (
        disabled ||
        modalOpen
      ) {
        return;
      }

      if (
        event.key ===
          "e" ||
        event.key ===
          "E"
      ) {
        event.preventDefault();
        performKeyInteract();
        return;
      }

      if (
        event.key ===
          "Enter" ||
        event.key ===
          " "
      ) {
        if (nearest) {
          event.preventDefault();
          performKeyInteract();
        }
      }
    }

    window.addEventListener(
      "keydown",
      onKeyDown
    );

    return () =>
      window.removeEventListener(
        "keydown",
        onKeyDown
      );
  }, [
    disabled,
    modalOpen,
    nearest,
    performKeyInteract,
    onOpenWindow,
  ]);

  return {
    nearest,
    pendingInteractId,
    requestInteract,
    handleWalkEnd,
  };
}
