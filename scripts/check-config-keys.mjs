// ============================================================
// File:        scripts/check-config-keys.mjs
// Project:     RaceArena — DEV-MARKERS-1
//
// THE DEV SCREEN AND THE DEFAULTS, CHECKED AGAINST EACH OTHER. Two rules, one scan region:
//
//   RULE (original) — A KEY THE RENDERER OR THE DEV SCREEN READS MUST EXIST IN THE DEFAULTS, OR IT
//                     CANNOT SURVIVE LOADING. Documented immediately below.
//   RULE C          — A DEV SCREEN CONTROL'S BOUNDS MUST CONTAIN THE VALUE ITS KEY SHIPS.
//                     Documented at its own banner further down, with its own blind spots.
//
// They are the same question one step apart: does the key exist, and can the control reach it. Rule C
// lives HERE rather than in a guard of its own because it needs exactly what this file already has —
// the Dev Screen's source and the defaults module — and a second script would be a second home for
// the same pairing.
//
// THE DEFECT IT EXISTS FOR, and it was found BY EYE, which is the whole problem. `highlightHeroes`
// — the green ring on a choreographed B1 hero, the red ring on a B2 attacker — is read by the draw
// path and offered as a Dev Screen checkbox, and had NO entry in `DEFAULT_CAMERA_CONFIG`. Since
// `d94a7b9d` the loader rebuilds the live config KEY BY KEY from the default keys:
//
//     for (const key of Object.keys(DEFAULT_CAMERA_CONFIG)) { ...take stored or default... }
//
// so a stored key with no default is silently DROPPED. The owner's stored `highlightHeroes: true`
// survived in localStorage and never reached the renderer. Nothing failed, nothing warned: the
// checkbox ticked, the value saved, and the rings stayed off. The loader's rule is a good one — it
// is what makes a retired key disappear — but it has this sharp edge, and only a machine reading
// both sides at once can see it.
//
// WHAT IT SCANS, and both patterns are deliberately UNAMBIGUOUS rather than clever:
//   1. `cameraConfig.<key>` anywhere under `client/src` — the live camera config, by its own name.
//   2. `set('<key>', …)` inside the Dev Screen's camera sections — the setter names the key it
//      writes, so a checkbox that writes a key nothing defaults is caught at the source.
//
// WHAT THIS GUARD DOES **NOT** CHECK, stated here rather than discovered later:
//   - **Config objects other than the camera one.** `dynamicsConfig` and `behaviorConfig` are merged
//     with `{ ...DEFAULT, ...stored }`, which does NOT drop unknown keys, so they cannot fail this
//     way and are out of scope. If either loader ever changes to the key-by-key form, widen this.
//   - **Destructured reads.** `const { highlightHeroes } = cameraConfig` names the key without the
//     `cameraConfig.` prefix and is invisible here. The codebase does not currently do it for camera
//     config; if it starts, this guard goes quiet without saying so. That is the biggest hole.
//   - **Computed keys** — `cameraConfig[name]` cannot be resolved statically.
//   - **Whether a default's VALUE is right.** Only that the key exists. `highlightHeroes: true`
//     would pass exactly as `false` does.
//   - **Whether anything still reads a key that HAS a default.** The reverse direction — a dead
//     default nobody reads — is not checked, and is a different (much cheaper) kind of wrong.
//   - **Non-client code.** Sim harnesses build their own config objects and are out of scope.
//
// LOUD-FAILURE RULE (Lesson 187): zero source files scanned, zero keys discovered, or an unreadable
// defaults module all FAIL. A guard that passes because it found nothing to check is a no-op.
//
// Usage:
//   node scripts/check-config-keys.mjs             # fail if a read key has no default
//   node scripts/check-config-keys.mjs --root=<d>  # scan a fixture (used by its test)
// ============================================================

// ── VERIFY-ROUTING-2: this guard declares what it covers, so verify does not have to remember.
// `blind` is required and non-empty: the hole is written down by whoever knows it.
export const GUARD = {
  id: "check-config-keys",
  covers:
    "a key the renderer or the Dev Screen READS that has no entry in the defaults — the loader rebuilds the live config key by key, so such a key is silently dropped; and (RULE C) a Dev Screen control whose declared min/max cannot represent the value its key ships",
  blind: [
    "whether the key's VALUE is right — see check-fallback-agreement, which is the sibling that asks that",
    "config objects other than the camera one: dynamics and behaviour are spread-merged and cannot fail this way (the EXISTENCE rule only; RULE C reads every defaults object the Dev Screen imports)",
    "a key read by a computed expression rather than by name",
    "RULE C: a control whose bounds are expressions rather than literals — the numbers live in the caller's descriptor and are checked there, but the helper's own row is not",
    "RULE C: a value expression that is not pure arithmetic over one substituted default — reported unresolved, never assumed to pass",
    "RULE C: whether the LABEL's stated range matches min and max, and whether a tip names the shipped value — prose about a config value belongs to check-config-claims",
    "RULE C: `step` — whether the shipped value is REACHABLE by stepping from min, as opposed to merely inside the bounds",
  ],
  dirs: ["client/src/"],
  files: [],
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

const started = Date.now();

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const argOf = (name) =>
  process.argv
    .find((a) => a.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");

const ROOT =
  argOf("root") ?? join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULTS_REL = "client/src/modules/storage/defaults.js";
const SRC_REL = "client/src";
const DEV_CAMERA_SECTIONS = "client/src/screens/DevScreen/sections";

// `cameraConfig.js` is the MODULE FILENAME and appears in imports and prose. It is not a key, and
// excluding it by name — rather than by some cleverness about what a key looks like — keeps the
// guard's rule readable. Listed with its reason, as every exception in this repo is.
const NOT_KEYS = new Map([
  [
    "js",
    "`cameraConfig.js` is the module's own filename, in imports and comments",
  ],
]);

let failures = 0;
const fail = (msg) => {
  console.error(`\nFAIL: ${msg}`);
  failures++;
  process.exitCode = 1;
};

// ── the defaults, read from the ONE home ──────────────────────────────────────
let defaults;
try {
  defaults = await import(pathToFileURL(join(ROOT, DEFAULTS_REL)).href);
} catch (e) {
  console.error(`FAIL: cannot read ${DEFAULTS_REL} — ${e.message}`);
  process.exit(1);
}
const CAMERA = defaults.DEFAULT_CAMERA_CONFIG;
if (!CAMERA || Object.keys(CAMERA).length === 0) {
  console.error(
    "FAIL: DEFAULT_CAMERA_CONFIG is missing or empty. Nothing to check against. See Lesson 187.",
  );
  process.exit(1);
}

// ── every source file ─────────────────────────────────────────────────────────
// The defaults module itself is EXCLUDED: it is the record being checked against, not a reader of
// it. Scanning the record for readers of the record is incoherent — and leaving it in also made the
// zero-files failure below unreachable, which its own test caught.
const DEFAULTS_ABS = join(ROOT, DEFAULTS_REL);

const walk = (dir, out = []) => {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|jsx)$/.test(e) && !/\.test\./.test(e) && p !== DEFAULTS_ABS)
      out.push(p);
  }
  return out;
};

const files = walk(join(ROOT, SRC_REL));
if (files.length === 0) {
  console.error(
    `FAIL: scanned ZERO source files under ${SRC_REL}. The guard cannot have proved anything. See Lesson 187.`,
  );
  process.exit(1);
}

// ── the two patterns ──────────────────────────────────────────────────────────
const READ = /\bcameraConfig\.([A-Za-z_][A-Za-z0-9_]*)/g;
const SETTER = /\bset\(\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]/g;
const devSections = join(ROOT, DEV_CAMERA_SECTIONS);

const found = new Map(); // key -> Set of files
const note = (key, file) => {
  if (NOT_KEYS.has(key)) return;
  if (!found.has(key)) found.set(key, new Set());
  found
    .get(key)
    .add(file.replace(ROOT, "").replace(/\\/g, "/").replace(/^\//, ""));
};

for (const f of files) {
  const text = readFileSync(f, "utf8");
  for (const m of text.matchAll(READ)) note(m[1], f);
  // The setter pattern is only meaningful in the Dev Screen's camera sections: `set('key', …)` is a
  // common local helper name elsewhere and would mean something different there.
  if (f.startsWith(devSections) && /cameraConfig|CAMERA_CONFIG/.test(text))
    for (const m of text.matchAll(SETTER)) note(m[1], f);
}

if (found.size === 0) {
  console.error(
    "FAIL: discovered ZERO camera-config keys in the source. Either the patterns stopped matching or\n" +
      "      the code moved; either way this guard proved nothing. See Lesson 187.",
  );
  process.exit(1);
}

// ── verdict ───────────────────────────────────────────────────────────────────
const missing = [...found].filter(([k]) => !(k in CAMERA));

for (const [key, where] of missing)
  fail(
    `\`${key}\` is read from the camera config but has NO default in DEFAULT_CAMERA_CONFIG.\n` +
      [...where].map((w) => `      read at: ${w}\n`).join("") +
      `      \`loadCameraConfig()\` rebuilds the live config key-by-key from the DEFAULT keys, so a\n` +
      `      stored value for this key is SILENTLY DROPPED on every load — the control appears to\n` +
      `      work and the value never reaches the code that reads it. Add it to DEFAULT_CAMERA_CONFIG\n` +
      `      (with the value it should have when nobody has set it), or stop reading it.`,
  );

console.log(
  `check-config-keys: ${found.size} camera key(s) read across ${files.length} source file(s), ` +
    `${missing.length} without a default. ` +
    `(Camera config only — the other loaders spread stored over defaults and cannot fail this way. ` +
    `Destructured and computed reads are invisible; see the header.)`,
);

// ══════════════════════════════════════════════════════════════════════════════
// RULE C — A DEV SCREEN CONTROL'S BOUNDS MUST CONTAIN THE VALUE ITS KEY SHIPS.
//
// Same two sides as the rule above (the Dev Screen, and the defaults), one step further in: the rule
// above asks whether the key EXISTS, this one asks whether the control can REACH it.
//
// THE DEFECT IT EXISTS FOR, found by eye on 2026-09-02 and repaired as CONTROL-BOUNDS-1:
// `choreoOutcomeStart` ships 0.6 and its slider declared `max: 0.55`. The control clamped to 0.55 the
// moment the card opened — so touching it LOST the shipped value with no way back, while the card's
// own Reset restored 0.6, a value the slider could not then display. Nothing failed and nothing
// warned; an operator simply could not see where the game runs.
//
// WHAT A CONTROL'S BOUNDS ARE A CLAIM ABOUT, and this is the whole subtlety: the DISPLAYED number,
// not the stored one. Several controls render a unit conversion — `nameTagAllUntilMs` ships 8000 and
// its box reads 8 (seconds) against min 0 / max 30. So the value expression is EVALUATED with the
// shipped default substituted in, and the result is what must lie inside the bounds. Comparing the
// stored value against the bounds would report five false positives on today's tree.
//
// DISCOVERY, NOT A LIST (constraint 3): the controls are found by their shape, the defaults homes by
// following the Dev Screen's OWN imports. Nothing here enumerates a control, a key or a module, so a
// control added tomorrow is checked tomorrow without anyone remembering to add it.
//
// WHAT RULE C CANNOT SEE, stated here rather than discovered later:
//   - **A control whose bounds are expressions** (`min={min}` inside a shared row helper). The numbers
//     live in the caller's object literal and ARE checked there; the helper's own row is skipped.
//   - **A value expression that is not pure arithmetic** over one substituted default — a conditional,
//     a lookup, a formatter. It is reported as unresolved, never assumed to pass.
//   - **A key whose default lives outside the modules the Dev Screen imports** — per-racer effect
//     fields and branding-profile form fields have no shipped default at all and are out of scope.
//   - **Whether the LABEL's stated range matches min and max**, and whether a tip names the shipped
//     value. Those are claims in prose about the same numbers and are a different rule; see
//     `check-config-claims`, which owns prose-versus-config.
//   - **`step`** — whether the shipped value is reachable BY STEPPING from min. A control can contain
//     its default and still be unable to land on it. Not checked.
// ══════════════════════════════════════════════════════════════════════════════

const DEV_SCREEN_REL = "client/src/screens/DevScreen";
const devRoot = join(ROOT, DEV_SCREEN_REL);

const devFiles = walk(devRoot).filter((p) => /\.jsx$/.test(p));

let ruleCChecked = 0;
const ruleCUnresolved = [];

if (devFiles.length === 0) {
  console.error(
    `FAIL: RULE C scanned ZERO Dev Screen files under ${DEV_SCREEN_REL}. Either the screen moved or\n` +
      `      the walk stopped matching; either way no control was checked. See Lesson 187.`,
  );
  process.exit(1);
}

// ── the defaults homes, discovered by following the Dev Screen's own imports ──
const namedHomes = new Map(); // DEFAULT_X -> object
const flatHomes = new Map(); // key -> [{ path, value }]
const absorbHome = (obj, path, depth) => {
  if (depth > 3 || !obj || typeof obj !== "object" || Array.isArray(obj)) return;
  for (const [k, v] of Object.entries(obj)) {
    if (!flatHomes.has(k)) flatHomes.set(k, []);
    flatHomes.get(k).push({ path: `${path}.${k}`, value: v });
    if (v && typeof v === "object") absorbHome(v, `${path}.${k}`, depth + 1);
  }
};

const IMPORT = /import\s+(\{[^}]*\}|[A-Za-z_$][\w$]*)\s+from\s+['"](\.[^'"]*)['"]/g;
const importedModules = new Set();
for (const f of devFiles) {
  const text = readFileSync(f, "utf8");
  for (const m of text.matchAll(IMPORT)) {
    if (!/DEFAULT_[A-Z_]/.test(m[1])) continue;
    importedModules.add(join(dirname(f), m[2]));
  }
}
for (const mod of importedModules) {
  let ns;
  try {
    ns = await import(pathToFileURL(mod).href);
  } catch {
    continue; // a module the Dev Screen imports but node cannot load alone is not a defaults home
  }
  for (const [name, val] of Object.entries(ns)) {
    if (!/^DEFAULT_[A-Z_]+$/.test(name)) continue;
    if (!val || typeof val !== "object" || Array.isArray(val)) continue;
    // A defaults object is commonly RE-EXPORTED by the module that consumes it, so the same object
    // arrives twice under two module paths. Absorb it once, or every finding about it is printed twice.
    if (namedHomes.has(name)) continue;
    namedHomes.set(name, val);
    absorbHome(val, name, 1);
  }
}
if (namedHomes.size === 0) {
  console.error(
    `FAIL: RULE C discovered ZERO defaults objects from the Dev Screen's imports. It cannot have\n` +
      `      checked any control against anything. See Lesson 187.`,
  );
  process.exit(1);
}

// ── reading one JSX attribute's expression, braces balanced ───────────────────
const jsxAttr = (block, name) => {
  const i = block.search(new RegExp(`(?:^|\\s)${name}=\\{`));
  if (i < 0) return null;
  const j = block.indexOf("{", i);
  let depth = 0;
  for (let k = j; k < block.length; k++) {
    if (block[k] === "{") depth++;
    else if (block[k] === "}") {
      depth--;
      if (depth === 0) return block.slice(j + 1, k).trim();
    }
  }
  return null;
};
const numeric = (e) =>
  e != null && /^-?\d+(\.\d+)?$/.test(String(e).trim()) ? Number(e) : null;

// Substitute every `x.key` / `x.key ?? DEFAULT_Y.key` with the shipped number.
const substituteDefaults = (expr) => {
  const used = [];
  let out = expr.replace(
    /([A-Za-z_$][\w$]*)\s*\.\s*([A-Za-z_$][\w$]*)\s*\?\?\s*(DEFAULT_[A-Z_]+)\s*\.\s*([A-Za-z_$][\w$]*)/g,
    (all, _lhs, k1, D, k2) => {
      const home = namedHomes.get(D);
      if (k1 !== k2 || !home || typeof home[k1] !== "number") return all;
      used.push({ key: k1, home: `${D}.${k1}`, value: home[k1] });
      return String(home[k1]);
    },
  );
  out = out.replace(
    /([A-Za-z_$][\w$]*)\s*\.\s*([A-Za-z_$][\w$]*)/g,
    (all, lhs, k) => {
      if (lhs === "Math") return all;
      const vals = [
        ...new Set(
          (flatHomes.get(k) ?? [])
            .filter((h) => typeof h.value === "number")
            .map((h) => h.value),
        ),
      ];
      if (vals.length !== 1) return all; // unknown, or two homes disagree — do not guess
      used.push({ key: k, home: flatHomes.get(k)[0].path, value: vals[0] });
      return String(vals[0]);
    },
  );
  return { out, used };
};

// Pure arithmetic only, over the four Math helpers a unit conversion actually uses.
const evalArith = (expr) => {
  const stripped = expr.replace(/Math\.(round|floor|ceil|abs|min|max)/g, "");
  if (!/^[-+*/(),.\s0-9]*$/.test(stripped)) return null;
  try {
    const v = Function(`"use strict"; return (${expr});`)();
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
};

const relOf = (p) =>
  p.replace(ROOT, "").replace(/\\/g, "/").replace(/^\//, "");

for (const f of devFiles) {
  const src = readFileSync(f, "utf8");
  const rel = relOf(f);
  const lineAt = (i) => src.slice(0, i).split("\n").length;
  const controls = [];

  // FORM 1 — a JSX numeric input: `<input type="number|range" min={…} max={…} value={…} />`
  for (let i = src.indexOf("<input"); i >= 0; i = src.indexOf("<input", i + 6)) {
    const end = src.indexOf("/>", i);
    const block = src.slice(i, end < 0 ? i + 900 : end);
    const kind = (block.match(/type="(\w+)"/) ?? [])[1];
    if (kind !== "number" && kind !== "range") continue;
    controls.push({
      line: lineAt(i),
      min: numeric(jsxAttr(block, "min")),
      max: numeric(jsxAttr(block, "max")),
      valueExpr: jsxAttr(block, "value"),
    });
  }

  // FORM 2 — a control descriptor in an array the file maps over:
  // `{ key: 'x', label: …, min: n, max: n, step: n, tip: … }`. Its rendered value is `config[key]`,
  // so the shipped default is the displayed number and there is no transform to evaluate.
  for (const m of src.matchAll(/\{\s*key:\s*['"]([A-Za-z_$][\w$]*)['"]/g)) {
    const start = src.lastIndexOf("{", m.index + 1);
    let depth = 0;
    let close = -1;
    for (let k = start; k < src.length; k++) {
      if (src[k] === "{") depth++;
      else if (src[k] === "}") {
        depth--;
        if (depth === 0) {
          close = k;
          break;
        }
      }
    }
    const block = src.slice(start, close + 1);
    const field = (n) =>
      numeric((block.match(new RegExp(`(?:^|[{,\\s])${n}:\\s*([^,\\n]+)`)) ?? [])[1]);
    const min = field("min");
    const max = field("max");
    if (min === null && max === null) continue;
    controls.push({ line: lineAt(m.index), min, max, descriptorKey: m[1] });
  }

  for (const c of controls) {
    const where = `${rel}:${c.line}`;
    if (c.min === null && c.max === null) {
      ruleCUnresolved.push(
        `${where} — bounds are expressions (a shared row helper; the caller's descriptor carries the numbers and IS checked)`,
      );
      continue;
    }
    const lo = c.min ?? -Infinity;
    const hi = c.max ?? Infinity;

    // Every shipped value this control is a claim about, and where each one lives.
    let shipped;
    if (c.descriptorKey) {
      const hits = (flatHomes.get(c.descriptorKey) ?? []).filter(
        (h) => typeof h.value === "number",
      );
      if (hits.length === 0) {
        ruleCUnresolved.push(
          `${where} — \`${c.descriptorKey}\` has no numeric default in any module the Dev Screen imports`,
        );
        continue;
      }
      // One entry per DISTINCT shipped value. Two homes agreeing is one fact; two homes DISAGREEING
      // is two, and the control has to contain both — so that case is reported twice, deliberately.
      shipped = [...new Set(hits.map((h) => h.value))].map((v) => ({
        value: v,
        home: hits
          .filter((h) => h.value === v)
          .map((h) => h.path)
          .join(", "),
      }));
    } else {
      if (!c.valueExpr) {
        ruleCUnresolved.push(`${where} — the input declares no value expression`);
        continue;
      }
      const { out, used } = substituteDefaults(c.valueExpr);
      if (used.length === 0) {
        ruleCUnresolved.push(
          `${where} — its value names no config key with a numeric default (a preview or a form field)`,
        );
        continue;
      }
      const shown = evalArith(out);
      if (shown === null) {
        ruleCUnresolved.push(
          `${where} — its value is not pure arithmetic over the default: ${out.slice(0, 60)}`,
        );
        continue;
      }
      shipped = [
        {
          value: shown,
          home: used.map((u) => `${u.home} = ${u.value}`).join(", "),
        },
      ];
    }

    ruleCChecked++;
    for (const s of shipped) {
      if (s.value >= lo && s.value <= hi) continue;
      fail(
        `RULE C — the control at ${where} CANNOT REPRESENT ITS SHIPPED VALUE.\n` +
          `      it accepts [${c.min ?? "-inf"}, ${c.max ?? "+inf"}] and the value is ${s.value}\n` +
          `      shipped: ${s.home}\n` +
          `      A control whose bounds exclude its own default clamps to an edge the moment the card\n` +
          `      opens: touching it LOSES the shipped value with no way back, while Reset restores a\n` +
          `      value the control cannot then display. Widen the bounds to the VALIDATED range for\n` +
          `      that key — do not move the shipped value to fit the control.`,
      );
    }
  }
}

if (ruleCChecked === 0) {
  console.error(
    `FAIL: RULE C resolved ZERO controls across ${devFiles.length} Dev Screen file(s). The patterns\n` +
      `      stopped matching or the controls changed shape; either way nothing was proved. See Lesson 187.`,
  );
  process.exit(1);
}

console.log(
  `check-config-keys RULE C: ${ruleCChecked} control(s) checked against their shipped value across ` +
    `${devFiles.length} Dev Screen file(s), ${ruleCUnresolved.length} not resolvable ` +
    `(listed below — they are NOT coverage).`,
);
for (const u of ruleCUnresolved) console.log(`  unresolved: ${u}`);

console.log(`[ra-elapsed-ms ${Date.now() - started}]`);
if (failures > 0) process.exit(1);
