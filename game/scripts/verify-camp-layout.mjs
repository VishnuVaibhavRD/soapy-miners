import {
  CAMP_INTERACTABLES,
  DEFAULT_SPAWN,
  WALK_BOUNDS,
  WALK_OBSTACLES,
  findNearestInteractable,
  resolveWalkPosition,
} from "../src/components/game/campLayout.js";

const dist = (a, b) =>
  Math.hypot(a.x - b.x, a.y - b.y);

let ok = true;

for (const spot of CAMP_INTERACTABLES) {
  const walk = {
    x: spot.walkX,
    y: spot.walkY,
  };

  const inBounds =
    walk.x >= WALK_BOUNDS.minX &&
    walk.x <= WALK_BOUNDS.maxX &&
    walk.y >= WALK_BOUNDS.minY &&
    walk.y <= WALK_BOUNDS.maxY;

  const d = dist(walk, spot);
  const inRadius = d <= spot.radius;

  const blocked = WALK_OBSTACLES.filter(
    (o) => dist(walk, o) < o.radius
  ).length;

  const resolved = resolveWalkPosition(
    { x: 50, y: 50 },
    walk
  );
  const walkable =
    dist(resolved, walk) < 0.01;

  const nearest =
    findNearestInteractable(walk);
  const correct =
    nearest && nearest.id === spot.id;

  const pass =
    inBounds &&
    inRadius &&
    blocked === 0 &&
    walkable &&
    correct;

  if (!pass) ok = false;

  console.log(
    `${spot.id.padEnd(9)} bounds=${inBounds} dist=${d.toFixed(1)}/${spot.radius} blocked=${blocked} walkable=${walkable} nearest=${nearest ? nearest.id : "none"} ${pass ? "OK" : "FAIL"}`
  );
}

const spawn = resolveWalkPosition(
  { x: 50, y: 50 },
  DEFAULT_SPAWN
);
const spawnOk =
  dist(spawn, DEFAULT_SPAWN) < 0.01;

if (!spawnOk) ok = false;

console.log(`spawn     ${spawnOk ? "OK" : "FAIL"}`);
console.log(
  ok
    ? "ALL INVARIANTS PASS"
    : "FAILURES FOUND"
);

process.exit(ok ? 0 : 1);
