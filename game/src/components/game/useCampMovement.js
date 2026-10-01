"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  CAMERA_ANCHOR,
  DEFAULT_SPAWN,
  clampWalk,
  resolveWalkPosition,
  WALK_BOUNDS,
} from "./campLayout";

const DEFAULT_POSITION =
  DEFAULT_SPAWN;

const WALK_SPEED = 26;
const RUN_SPEED = 48;

function getWalkDuration(
  from,
  to
) {
  const dx =
    to.x - from.x;

  const dy =
    to.y - from.y;

  const distance =
    Math.sqrt(
      dx * dx +
        dy * dy
    );

  return Math.min(
    1600,
    Math.max(
      240,
      distance * 12
    )
  );
}

export default function useCampMovement({
  disabled = false,
  modalOpen = false,
} = {}) {
  const contentRef =
    useRef(null);

  const worldNodeRef =
    useRef(null);

  const cameraRef =
    useRef(0);

  const positionRef =
    useRef(
      DEFAULT_POSITION
    );

  const keysRef =
    useRef({
      up: false,
      down: false,
      left: false,
      right: false,
      run: false,
    });

  const pathWalkingRef =
    useRef(false);

  const [
    position,
    setPosition,
  ] = useState(
    DEFAULT_POSITION
  );

  const [
    facing,
    setFacing,
  ] = useState("right");

  const [
    isWalking,
    setIsWalking,
  ] = useState(false);

  const [
    isPathWalking,
    setIsPathWalking,
  ] = useState(false);

  const [
    walkDuration,
    setWalkDuration,
  ] = useState(0);

  const [
    movementEnabled,
    setMovementEnabled,
  ] = useState(false);

  const [cameraY, setCameraY] =
    useState(0);

  useEffect(() => {
    positionRef.current =
      position;
  }, [position]);

  useEffect(() => {
    pathWalkingRef.current =
      isPathWalking;
  }, [
    isPathWalking,
  ]);

  useEffect(() => {
    function update() {
      setMovementEnabled(
        window.matchMedia(
          "(min-width: 768px)"
        ).matches
      );
    }

    update();

    window.addEventListener(
      "resize",
      update
    );

    return () =>
      window.removeEventListener(
        "resize",
        update
      );
  }, []);

  const updateCamera =
    useCallback(() => {
      const world =
        worldNodeRef.current;

      const viewport =
        world?.parentElement;

      if (
        !world ||
        !viewport
      ) {
        return;
      }

      const worldHeight =
        world.offsetHeight;

      const viewHeight =
        viewport.clientHeight;

      const maxOffset =
        Math.max(
          0,
          worldHeight -
            viewHeight
        );

      const target =
        maxOffset === 0
          ? 0
          : clampWalk(
              (positionRef
                .current.y /
                100) *
                worldHeight -
                viewHeight *
                  CAMERA_ANCHOR,
              0,
              maxOffset
            );

      if (
        Math.abs(
          target -
            cameraRef.current
        ) < 0.5
      ) {
        return;
      }

      cameraRef.current =
        target;

      setCameraY(target);
    }, []);

  const worldRef =
    useCallback(
      (node) => {
        worldNodeRef.current =
          node;

        if (node) {
          updateCamera();
        }
      },
      [updateCamera]
    );

  useEffect(() => {
    if (!movementEnabled) {
      cameraRef.current = 0;
      setCameraY(0);
      return;
    }

    updateCamera();

    window.addEventListener(
      "resize",
      updateCamera
    );

    return () =>
      window.removeEventListener(
        "resize",
        updateCamera
      );
  }, [
    movementEnabled,
    updateCamera,
  ]);

  const applyPosition =
    useCallback(
      (
        next,
        options = {}
      ) => {
        const resolved =
          resolveWalkPosition(
            positionRef.current,
            next
          );

        if (
          Math.abs(
            resolved.x -
              positionRef.current
                .x
          ) < 0.05 &&
          Math.abs(
            resolved.y -
              positionRef.current
                .y
          ) < 0.05
        ) {
          return false;
        }

        if (
          resolved.x <
          positionRef.current
            .x -
            0.15
        ) {
          setFacing(
            "left"
          );
        } else if (
          resolved.x >
          positionRef.current
            .x +
            0.15
        ) {
          setFacing(
            "right"
          );
        }

        positionRef.current =
          resolved;

        setPosition(
          resolved
        );

        if (
          options.path
        ) {
          setIsPathWalking(
            true
          );

          setWalkDuration(
            options.duration ??
              0
          );
        } else {
          setIsPathWalking(
            false
          );

          setWalkDuration(
            0
          );
        }

        setIsWalking(
          true
        );

        updateCamera();

        return true;
      },
      [updateCamera]
    );

  const moveTo =
    useCallback(
      (nextX, nextY) => {
        if (
          disabled ||
          modalOpen ||
          !movementEnabled
        ) {
          return;
        }

        keysRef.current = {
          up: false,
          down: false,
          left: false,
          right: false,
          run: false,
        };

        const next = {
          x: nextX,
          y: nextY,
        };

        const current =
          positionRef.current;

        const duration =
          getWalkDuration(
            current,
            next
          );

        applyPosition(
          next,
          {
            path: true,
            duration,
          }
        );
      },
      [
        disabled,
        modalOpen,
        movementEnabled,
        applyPosition,
      ]
    );

  const handleCampClick =
    useCallback(
      (event) => {
        if (
          disabled ||
          modalOpen ||
          !movementEnabled
        ) {
          return;
        }

        if (
          event.target.closest(
            ".camp-object"
          )
        ) {
          return;
        }

        if (
          event.target.closest(
            ".game-camp-hud"
          )
        ) {
          return;
        }

        if (
          event.target.closest(
            "button, a"
          )
        ) {
          return;
        }

        const element =
          contentRef.current;

        if (!element) {
          return;
        }

        const rect =
          element.getBoundingClientRect();

        const x =
          ((event.clientX -
            rect.left) /
            rect.width) *
          100;

        const y =
          ((event.clientY -
            rect.top) /
            rect.height) *
          100;

        moveTo(
          x,
          y
        );
      },
      [
        disabled,
        modalOpen,
        movementEnabled,
        moveTo,
      ]
    );

  const handleWalkEnd =
    useCallback(() => {
      if (
        !pathWalkingRef.current
      ) {
        return;
      }

      setIsPathWalking(
        false
      );

      setIsWalking(
        keysRef.current.up ||
          keysRef.current
            .down ||
          keysRef.current
            .left ||
          keysRef.current
            .right
      );
    }, []);

  useEffect(() => {
    if (
      disabled ||
      modalOpen ||
      !movementEnabled
    ) {
      return;
    }

    function setKey(
      event,
      pressed
    ) {
      if (
        event.target instanceof
          HTMLInputElement ||
        event.target instanceof
          HTMLTextAreaElement
      ) {
        return;
      }

      let handled =
        false;

      switch (
        event.key
      ) {
        case "w":
        case "W":
        case "ArrowUp":
          keysRef.current.up =
            pressed;
          handled = true;
          break;

        case "s":
        case "S":
        case "ArrowDown":
          keysRef.current.down =
            pressed;
          handled = true;
          break;

        case "a":
        case "A":
        case "ArrowLeft":
          keysRef.current.left =
            pressed;
          handled = true;
          break;

        case "d":
        case "D":
        case "ArrowRight":
          keysRef.current.right =
            pressed;
          handled = true;
          break;

        case "Shift":
          keysRef.current.run =
            pressed;
          break;

        default:
          break;
      }

      if (
        handled &&
        pressed
      ) {
        event.preventDefault();

        setIsPathWalking(
          false
        );

        pathWalkingRef.current =
          false;
      }
    }

    function onKeyDown(
      event
    ) {
      setKey(
        event,
        true
      );
    }

    function onKeyUp(
      event
    ) {
      setKey(
        event,
        false
      );
    }

    window.addEventListener(
      "keydown",
      onKeyDown
    );

    window.addEventListener(
      "keyup",
      onKeyUp
    );

    return () => {
      window.removeEventListener(
        "keydown",
        onKeyDown
      );

      window.removeEventListener(
        "keyup",
        onKeyUp
      );
    };
  }, [
    disabled,
    modalOpen,
    movementEnabled,
  ]);

  useEffect(() => {
    if (
      disabled ||
      modalOpen ||
      !movementEnabled
    ) {
      return;
    }

    let frameId = 0;
    let lastTime =
      performance.now();

    function tick(
      now
    ) {
      const delta =
        Math.min(
          (now -
            lastTime) /
            1000,
          0.05
        );

      lastTime = now;

      if (
        !pathWalkingRef.current
      ) {
        const keys =
          keysRef.current;

        let dx = 0;
        let dy = 0;

        if (keys.up) {
          dy -= 1;
        }

        if (keys.down) {
          dy += 1;
        }

        if (keys.left) {
          dx -= 1;
        }

        if (keys.right) {
          dx += 1;
        }

        if (
          dx !== 0 ||
          dy !== 0
        ) {
          const length =
            Math.hypot(
              dx,
              dy
            );

          dx /= length;
          dy /= length;

          const speed =
            keys.run
              ? RUN_SPEED
              : WALK_SPEED;

          const current =
            positionRef.current;

          applyPosition(
            {
              x:
                current.x +
                dx *
                  speed *
                  delta,
              y:
                current.y +
                dy *
                  speed *
                  delta,
            }
          );

          setIsWalking(
            true
          );
        } else {
          setIsWalking(
            false
          );
        }
      }

      frameId =
        requestAnimationFrame(
          tick
        );
    }

    frameId =
      requestAnimationFrame(
        tick
      );

    return () =>
      cancelAnimationFrame(
        frameId
      );
  }, [
    disabled,
    modalOpen,
    movementEnabled,
    applyPosition,
  ]);

  return {
    contentRef,
    worldRef,
    cameraY,
    position,
    facing,
    isWalking,
    isPathWalking,
    walkDuration,
    movementEnabled,
    walkBounds:
      WALK_BOUNDS,
    moveTo,
    handleCampClick,
    handleWalkEnd,
  };
}
