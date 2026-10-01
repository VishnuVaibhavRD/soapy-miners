/**
 * Guards the stylesheet split.
 *
 *  1. No selector may be defined in more than one module — that is how the
 *     old globals.css/camp.css pair silently fought each other.
 *  2. Every class in the CSS should be referenced somewhere in the JS,
 *     otherwise it is dead weight.
 *
 * Exits non-zero on duplicates; dead classes are reported as warnings.
 */
import {
  readFileSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";

const STYLE_DIR = "src/styles";
const SRC_DIR = "src";

/** Classes generated at runtime or owned by tooling. */
const ALLOW_UNUSED = new Set([
  "ui-panel",
  "ui-panel-lg",
  "ui-panel-sunken",
  "ui-eyebrow",
  "ui-btn-ghost",
  "ui-stat-lg",
  "ui-meter-full",
  "ui-tag-locked",
  "ui-msg-error",
  "ui-msg-success",
  "ui-msg-status",
  "camp-object-anchor-feet",
  "game-asset-fallback",
  "pixel-art",
  "selected",
  "locked",
  "active",
  "almost-full",
  "status-ready",
  "status-mining",
  "status-claimable",
  "status-resting",
  "status-unknown",
  // Reward mine status badges (built via statusName.toLowerCase())
  "created",
  "paused",
  "finished",
  "cancelled",
]);

function walk(dir) {
  const out = [];

  for (const entry of readdirSync(dir, {
    withFileTypes: true,
  })) {
    const full = join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }

  return out;
}

/** Keyframe steps are not selectors; drop those blocks before parsing. */
function stripKeyframes(css) {
  let out = "";
  let i = 0;

  while (i < css.length) {
    const at = css.indexOf(
      "@keyframes",
      i
    );

    if (at === -1) {
      out += css.slice(i);
      break;
    }

    out += css.slice(i, at);

    let depth = 0;
    let j = css.indexOf("{", at);

    for (; j < css.length; j++) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") {
        depth--;
        if (depth === 0) break;
      }
    }

    i = j + 1;
  }

  return out;
}

function selectorsOf(css) {
  const stripped = stripKeyframes(
    css.replace(/\/\*[\s\S]*?\*\//g, "")
  );

  const out = new Set();
  const re = /(^|[}\n])([^{}@]+)\{/g;
  let m;

  while ((m = re.exec(stripped))) {
    const raw = m[2].trim();

    if (
      !raw ||
      raw.startsWith("@") ||
      /^[\d.]+%$/.test(raw) ||
      raw === "from" ||
      raw === "to" ||
      raw.includes(":root")
    ) {
      continue;
    }

    for (const part of raw.split(",")) {
      const sel = part
        .trim()
        .replace(/\s+/g, " ");

      if (sel) out.add(sel);
    }
  }

  return out;
}

const modules = readdirSync(STYLE_DIR)
  .filter((f) => f.endsWith(".css"))
  .map((f) => ({
    name: f,
    sels: selectorsOf(
      readFileSync(
        join(STYLE_DIR, f),
        "utf8"
      )
    ),
  }));

/* --- 1. duplicate selectors across modules --- */

const owner = new Map();
const dupes = [];

for (const mod of modules) {
  for (const sel of mod.sels) {
    if (owner.has(sel)) {
      dupes.push(
        `${sel}  →  ${owner.get(sel)} + ${mod.name}`
      );
    } else {
      owner.set(sel, mod.name);
    }
  }
}

console.log(
  `Modules: ${modules
    .map(
      (m) => `${m.name}(${m.sels.size})`
    )
    .join(" ")}`
);

if (dupes.length) {
  console.log(
    `\nFAIL — selector defined in multiple modules (${dupes.length}):`
  );

  for (const d of dupes) {
    console.log(`  ${d}`);
  }
} else {
  console.log(
    "\nOK — every selector has exactly one owning module."
  );
}

/* --- 2. classes never referenced from JS --- */

const js = walk(SRC_DIR)
  .filter((f) => f.endsWith(".js"))
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");

const cssClasses = new Set();

for (const sel of owner.keys()) {
  for (const m of sel.matchAll(
    /\.([a-zA-Z0-9_-]+)/g
  )) {
    cssClasses.add(m[1]);
  }
}

const unused = [...cssClasses]
  .filter(
    (c) =>
      !ALLOW_UNUSED.has(c) &&
      !js.includes(c)
  )
  .sort();

if (unused.length) {
  console.log(
    `\nWARN — classes in CSS but not found in JS (${unused.length}):`
  );

  for (const c of unused) {
    console.log(
      `  .${c}  (${owner.get(
        [...owner.keys()].find((s) =>
          s.includes(`.${c}`)
        )
      )})`
    );
  }
} else {
  console.log(
    "OK — no dead classes."
  );
}

process.exit(dupes.length ? 1 : 0);
