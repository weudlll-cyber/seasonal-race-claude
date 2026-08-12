// ============================================================
// File:        scripts/check-standings-invariant.mjs
// Project:     RaceArena — STANDINGS-RULE
//
// THE GUARD FOR THE TWO-LAYER STANDINGS. The rule is in docs/STANDINGS-ARCHITECTURE.md, which is its
// one home; this file does not restate it, it enforces it.
//
// WHY IT EXISTS. The architecture was argued in four reports and recorded in the tag register, and
// that is all it was. **A report explains; it does not prevent** — a rebuild in June re-introduced
// something a report had already rejected, for exactly this reason. So the invariant stops being an
// argument somebody has to have read and becomes a number somebody's build fails on.
//
// ── TWO CHECKS, AND THEY COVER DIFFERENT HALVES ─────────────────────────────────────────────────
//
//   SOURCE   — the place is SLOT-BOUND. `ScoreboardCard.jsx` may not import a rank helper, may not
//              take a rank-ish prop, and may not be handed one. Milliseconds, no browser. This is
//              the half that catches the obvious undo: putting the place number back on the card.
//
//   MEASURED — the invariant as a NUMBER. It drives the real components through a real ranking churn
//              under a real MutationObserver and counts what the browser was asked to do: zero text
//              mutations, zero structural mutations, every attribute write `style` on a card. It
//              lives in `client/src/screens/RaceScreen/standingsInvariant.test.jsx`, because the
//              apparatus for mounting the real thing already exists there — jsdom, Testing Library
//              and the components' own tests — and a second one would be a browser bench nobody runs.
//
// THE SOURCE HALF IS NOT REDUNDANT WITH THE MEASURED ONE, and this was the finding that shaped the
// file. A card that displays its place has to RE-RENDER to say so, which means a rank prop coming
// down from the screen — and a mounted harness only sees what it is handed. The measurement would
// stay green while the architecture was gone. The lexical check is what closes that.
//
// ── WHAT THIS GUARD IS BLIND TO ─────────────────────────────────────────────────────────────────
//
//   - ANYTHING REQUIRING LAYOUT. jsdom measures no text, so nothing here proves the two layers line
//     up on screen. Those constants are pinned by `scripts/scoreboard-parity.test.mjs`.
//   - WHICH RACER IS AT WHICH PLACE. That is the parity test's question, over a real race. This one
//     asks only whether the standings are still CHEAP.
//   - WASTED RE-RENDERS THAT PRODUCE IDENTICAL DOM. A mutation count cannot see them; the bench
//     (`scripts/scoreboard-bench.mjs`) can.
//   - A RANK REACHING THE CARD UNDER A NAME THIS FILE DOES NOT KNOW. The lexical list below is an
//     approximation of an intent (VERIFY-RULES R11), and it is stated as one.
//
// Usage:
//   node scripts/check-standings-invariant.mjs            # both halves
//   node scripts/check-standings-invariant.mjs --source   # the lexical half only (milliseconds)
//   node scripts/check-standings-invariant.mjs --src=<dir> # read a fixture instead of the real tree
// ============================================================

// ── VERIFY-ROUTING-2: this guard declares what it covers, so verify does not have to remember.
export const GUARD = {
  id: "check-standings-invariant",
  covers:
    "the two-layer standings being undone — the place moving back onto the racer card, or a rank change writing text or structure instead of one transform",
  blind: [
    "anything needing LAYOUT: jsdom measures no text, so it cannot prove the two layers line up on screen — scripts/scoreboard-parity.test.mjs pins the CSS inputs instead",
    "WHICH racer is drawn at which place — that is the parity test's question, over a real race",
    "a re-render that produces identical DOM: wasted work is invisible to a mutation count, and scripts/scoreboard-bench.mjs is what prices it",
    "a rank reaching the card under a name this guard's lexical list does not know",
  ],
  dirs: ["client/src/screens/RaceScreen/"],
  files: ["docs/STANDINGS-ARCHITECTURE.md"],
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

const __t0 = Date.now();
process.on("exit", () => {
  // NIGHT-TOOLS-1: machine-readable, so the ceremony's cost column is generated rather than typed.
  const ms = Date.now() - __t0;
  process.stderr.write(`[ra-elapsed-ms ${ms}] (${(ms / 1000).toFixed(1)}s)\n`);
});

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// `--src=<dir>` reads somewhere else, and it exists for ONE reason — the same reason
// `check-fallback-agreement.mjs --src=` and `check-tags.mjs --tags-file=` exist: without it, the
// only way to prove this guard can FAIL is to break the real repository. A guard that has never been
// seen red is a guard nobody has any evidence about.
const SRC = (() => {
  const a = process.argv.find((x) => x.startsWith("--src="));
  // `resolve`, not `join`: the test writes its fixture into the system temp directory, which is an
  // ABSOLUTE path on a different drive letter on this machine.
  return a
    ? resolve(ROOT, a.slice(6))
    : join(ROOT, "client/src/screens/RaceScreen");
})();
const SOURCE_ONLY = process.argv.includes("--source");

const TEST_FILE = "src/screens/RaceScreen/standingsInvariant.test.jsx";

// ── THE LEXICAL LIST, AND IT IS AN APPROXIMATION OF AN INTENT ───────────────────────────────────
//
// Everything a PLACE is expressed with in this codebase. The card may name none of them: the moment
// it does, the place has stopped belonging to the slot. Kept as one list because it is quoted in two
// directions below — what the card imports, and what the card is handed.
const RANK_SYMBOLS = [
  "rankLabel",
  "rankTextColor",
  "rankBorderColor",
  "slotOffsetPx",
  "RANK_PALETTE",
];
/** Prop names a place would arrive under. Word-boundary matched, so `raceNumber` is not a hit. */
const RANK_PROPS = ["rank", "place", "position", "standing", "podium"];

const problems = [];
const notes = [];

/** Read one file of the standings, or record its absence as a finding rather than skipping it. */
function read(name) {
  const p = join(SRC, name);
  if (!existsSync(p)) {
    problems.push(
      `${name} is missing from ${SRC}. The two-layer standings are named in ` +
        `docs/STANDINGS-ARCHITECTURE.md; a layer cannot simply disappear without that document moving too.`,
    );
    return null;
  }
  return readFileSync(p, "utf8");
}

// ── CHECK 1 — BOTH LAYERS EXIST, AND THE COMPOSITION IS ONE PLACE ────────────────────────────────
const card = read("ScoreboardCard.jsx");
const slots = read("ScoreboardSlots.jsx");
const board = read("Scoreboard.jsx");

if (board) {
  for (const layer of ["ScoreboardCard", "ScoreboardSlots"]) {
    if (!new RegExp(`<${layer}\\b`).test(board)) {
      problems.push(
        `Scoreboard.jsx no longer renders <${layer}>. The standings are TWO layers; ` +
          `one of them has gone, and with it the reason the other is cheap.`,
      );
    }
  }
}

// ── CHECK 2 — THE CARD NAMES NO PLACE ────────────────────────────────────────────────────────────
if (card) {
  // Comments argue ABOUT the rank — the card's own header does, at length — so only code counts.
  const code = stripComments(card);
  for (const sym of RANK_SYMBOLS) {
    if (new RegExp(`\\b${sym}\\b`).test(code)) {
      problems.push(
        `ScoreboardCard.jsx uses \`${sym}\`. THE PLACE BELONGS TO THE SLOT: a card that can name a ` +
          `place can display one, and a card that displays one must re-render when it changes. ` +
          `docs/STANDINGS-ARCHITECTURE.md.`,
      );
    }
  }
  const props = destructuredProps(code);
  if (props === null) {
    // LOUD FAILURE (Lesson 187): a guard that cannot find what it checks must not pass quietly.
    problems.push(
      `ScoreboardCard.jsx's props could not be read — this guard cannot tell whether a place is ` +
        `among them, and a check that silently found nothing is worse than one that is missing.`,
    );
  } else {
    notes.push(`ScoreboardCard props: ${props.join(", ") || "(none)"}`);
    for (const p of props) {
      if (
        RANK_PROPS.some((r) =>
          new RegExp(`(^|[^a-z])${r}s?([^a-z]|$)`, "i").test(p),
        )
      ) {
        problems.push(
          `ScoreboardCard.jsx takes a prop \`${p}\`. The card is racer-bound; nothing about a place ` +
            `may reach it. docs/STANDINGS-ARCHITECTURE.md.`,
        );
      }
    }
  }
}

// ── CHECK 3 — AND NOBODY HANDS IT ONE ────────────────────────────────────────────────────────────
if (board) {
  const el = /<ScoreboardCard\b([\s\S]*?)\/>/.exec(stripComments(board));
  if (!el) {
    problems.push(
      `Scoreboard.jsx's <ScoreboardCard> element could not be read, so what it is handed is ` +
        `unknown. Loud rather than quiet.`,
    );
  } else {
    const given = [...el[1].matchAll(/(\w+)\s*=/g)].map((m) => m[1]);
    notes.push(`Scoreboard hands the card: ${given.join(", ")}`);
    for (const p of given) {
      if (
        RANK_PROPS.some((r) =>
          new RegExp(`(^|[^a-z])${r}s?([^a-z]|$)`, "i").test(p),
        )
      ) {
        problems.push(
          `Scoreboard.jsx passes \`${p}\` to ScoreboardCard. A rank travelling as a prop re-renders ` +
            `every card that moved — the exact cost the two layers removed.`,
        );
      }
    }
  }
}

// ── CHECK 4 — THE SLOT LAYER STILL DRAWS THE PLACES ──────────────────────────────────────────────
if (slots) {
  const code = stripComments(slots);
  const named = RANK_SYMBOLS.filter((s) => new RegExp(`\\b${s}\\b`).test(code));
  if (named.length === 0) {
    problems.push(
      `ScoreboardSlots.jsx names no rank helper at all. The places have to be drawn SOMEWHERE, and ` +
        `this is the layer that owns them.`,
    );
  } else {
    notes.push(`ScoreboardSlots draws places with: ${named.join(", ")}`);
  }
}

/** Strip line and block comments. Crude, and it does not need to be better: it reads two files. */
function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/** The destructured prop names of the first component function in a file, or null if unreadable. */
function destructuredProps(code) {
  const m = /function\s+\w+\s*\(\s*\{([\s\S]*?)\}\s*\)/.exec(code);
  if (!m) return null;
  return m[1]
    .split(",")
    .map((s) => s.split(/[:=]/)[0].trim())
    .filter(Boolean);
}

// ── THE MEASURED HALF ────────────────────────────────────────────────────────────────────────────
let measured = "skipped (--source)";
if (!SOURCE_ONLY && problems.length === 0) {
  // Only when the source half is clean: a red source check already answers the question, and the
  // measurement costs seconds. If the source is broken, saying so immediately is the better report.
  const t = Date.now();
  try {
    execFileSync(
      process.execPath,
      [join(ROOT, "client/node_modules/vitest/vitest.mjs"), "run", TEST_FILE],
      {
        cwd: join(ROOT, "client"),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    measured = `PASS in ${((Date.now() - t) / 1000).toFixed(1)}s`;
  } catch (e) {
    const out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    problems.push(
      `the MEASURED half failed — a rank change wrote something other than a card's \`style\`:\n` +
        out.split("\n").slice(-30).join("\n"),
    );
    measured = "FAIL";
  }
} else if (!SOURCE_ONLY) {
  measured = "not run — the source half already failed";
}

// ── THE VERDICT ──────────────────────────────────────────────────────────────────────────────────
console.log("STANDINGS INVARIANT — docs/STANDINGS-ARCHITECTURE.md");
for (const n of notes) console.log(`  · ${n}`);
console.log(`  · measured half: ${measured}`);
if (problems.length) {
  console.log("");
  for (const p of problems) console.log(`  FAIL  ${p}`);
  console.log(
    `\n  ${problems.length} violation(s). The rule and its reasoning: docs/STANDINGS-ARCHITECTURE.md\n`,
  );
  process.exit(1);
}
console.log(
  "\n  OK — the place is slot-bound, and a rank change is one transform.\n",
);
