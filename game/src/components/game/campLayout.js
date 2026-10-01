/**
 * Camp layout — single source of truth for placement, walking and depth.
 *
 * Coordinate system: percentages of the scrolling camp world.
 * Every object is "feet anchored": (x, y) is the point where the object
 * touches the ground. Sprites are drawn upward from there, so `y` doubles
 * as the depth key — larger y renders in front.
 *
 * Invariants (kept in sync by design):
 *  1. walkX/walkY are inside WALK_BOUNDS
 *  2. distance(walk, anchor) <= radius        → arriving always triggers E
 *  3. distance(walk, obstacle) > obstacleRadius → approach is never blocked
 */

/** Taller map → more vertical room between landmarks. */
export const CAMP_WORLD_SCALE = 2.4;

/** Wide walkable floor — room to roam between buildings. */
export const WALK_BOUNDS = {
  minX: 12,
  maxX: 88,
  minY: 24,
  maxY: 94,
};

/** Miner spawn — open centre between mid-camp rows. */
export const DEFAULT_SPAWN = {
  x: 50,
  y: 52,
};

/** Keeps the miner slightly below viewport centre. */
export const CAMERA_ANCHOR = 0.55;

const OBSTACLE_RADIUS = 4.5;

/**
 * Rows run top to bottom with generous gaps:
 *   mine (22) → trader/workshop (42) → storage/market (66) → quai (88)
 * Left / right sit farther out so the centre aisle stays open.
 */
export const CAMP_INTERACTABLES = [
  {
    id: "mines",
    window: "mines",
    x: 50,
    y: 22,
    walkX: 50,
    walkY: 32,
    radius: 13,
    action: "Enter Mines",
  },
  {
    id: "gold",
    window: "gold",
    x: 16,
    y: 42,
    walkX: 26,
    walkY: 46,
    radius: 12,
    action: "Talk to Gold Trader",
  },
  {
    id: "upgrades",
    window: "upgrades",
    x: 84,
    y: 42,
    walkX: 74,
    walkY: 46,
    radius: 12,
    action: "Visit Workshop",
  },
  {
    id: "storage",
    window: "inventory",
    x: 16,
    y: 66,
    walkX: 26,
    walkY: 70,
    radius: 12,
    action: "Open Storage",
  },
  {
    id: "market",
    window: "market",
    x: 84,
    y: 66,
    walkX: 74,
    walkY: 70,
    radius: 12,
    action: "Browse Market",
  },
  {
    id: "quai",
    window: "quai",
    x: 50,
    y: 88,
    walkX: 50,
    walkY: 93,
    radius: 14,
    action: "Descend Quai Shafts",
  },
];

/**
 * Distinct ground lines, derived from the objects themselves so the
 * environment's floor shelves can never drift out of sync with placement.
 */
export const CAMP_ROWS = [
  ...new Set(
    CAMP_INTERACTABLES.map(
      (spot) => spot.y
    )
  ),
].sort((a, b) => a - b);

/** Blockers sit on each object's base so the miner cannot stand inside it. */
export const WALK_OBSTACLES = CAMP_INTERACTABLES.map(
  (spot) => ({
    x: spot.x,
    y: spot.y,
    radius: OBSTACLE_RADIUS,
  })
);

/**
 * Shared depth scale for objects and the player so they interleave by y.
 * Scaled down to stay well below the modal layer (z-index 100).
 */
export function getDepthZIndex(
  y,
  bias = 0
) {
  return (
    20 +
    Math.round(y * 0.6) +
    bias
  );
}

export function getInteractable(id) {
  return CAMP_INTERACTABLES.find(
    (item) => item.id === id
  );
}

export function getCampObjectPlacement(spot) {
  if (!spot) {
    return {
      style: undefined,
      className: "",
    };
  }

  return {
    style: {
      left: `${spot.x}%`,
      top: `${spot.y}%`,
      zIndex: getDepthZIndex(spot.y),
    },
    className: "camp-object-grounded",
  };
}

export function getInteractDistance(
  position,
  target
) {
  const dx = position.x - target.x;
  const dy = position.y - target.y;

  return Math.sqrt(dx * dx + dy * dy);
}

export function findNearestInteractable(position) {
  let nearest = null;
  let nearestDistance = Infinity;

  for (const spot of CAMP_INTERACTABLES) {
    const distance = getInteractDistance(
      position,
      spot
    );

    if (
      distance <= spot.radius &&
      distance < nearestDistance
    ) {
      nearest = spot;
      nearestDistance = distance;
    }
  }

  return nearest;
}

export function clampWalk(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function collides(pos, obstacles) {
  return obstacles.some((zone) => {
    const dx = pos.x - zone.x;
    const dy = pos.y - zone.y;

    return (
      Math.sqrt(dx * dx + dy * dy) <
      zone.radius
    );
  });
}

export function resolveWalkPosition(
  from,
  to,
  obstacles = WALK_OBSTACLES
) {
  const bounded = {
    x: clampWalk(
      to.x,
      WALK_BOUNDS.minX,
      WALK_BOUNDS.maxX
    ),
    y: clampWalk(
      to.y,
      WALK_BOUNDS.minY,
      WALK_BOUNDS.maxY
    ),
  };

  if (!collides(bounded, obstacles)) {
    return bounded;
  }

  const slideX = {
    x: bounded.x,
    y: from.y,
  };

  if (!collides(slideX, obstacles)) {
    return slideX;
  }

  const slideY = {
    x: from.x,
    y: bounded.y,
  };

  if (!collides(slideY, obstacles)) {
    return slideY;
  }

  return from;
}
