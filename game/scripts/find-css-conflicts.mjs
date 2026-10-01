/**
 * Reports selectors defined in more than one stylesheet, which is where
 * cascade conflicts hide.
 */
import { readFileSync } from "node:fs";

const FILES = [
  "src/app/globals.css",
  "src/app/camp.css",
];

function selectors(css) {
  const stripped = css.replace(
    /\/\*[\s\S]*?\*\//g,
    ""
  );

  const found = new Map();
  const re = /(^|[}\n])([^{}@]+)\{/g;
  let m;

  while ((m = re.exec(stripped))) {
    const raw = m[2].trim();

    if (
      !raw ||
      raw.startsWith("@") ||
      /^[\d.]+%$/.test(raw) ||
      raw === "from" ||
      raw === "to"
    ) {
      continue;
    }

    for (const part of raw.split(",")) {
      const sel = part
        .trim()
        .replace(/\s+/g, " ");

      if (!sel || sel.includes(":root"))
        continue;

      found.set(
        sel,
        (found.get(sel) || 0) + 1
      );
    }
  }

  return found;
}

const maps = FILES.map((f) => ({
  file: f,
  sels: selectors(
    readFileSync(f, "utf8")
  ),
}));

const [a, b] = maps;
const shared = [...a.sels.keys()]
  .filter((s) => b.sels.has(s))
  .sort();

console.log(
  `${a.file}: ${a.sels.size} selectors`
);
console.log(
  `${b.file}: ${b.sels.size} selectors`
);
console.log(
  `\nDefined in BOTH files (${shared.length}):\n`
);

for (const s of shared) {
  console.log(`  ${s}`);
}
