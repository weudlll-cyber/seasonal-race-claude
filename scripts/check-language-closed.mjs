// ============================================================
// File:        scripts/check-language-closed.mjs
// Project:     RaceArena — LANG-CLOSED-1
//
// THE LANGUAGE RULE GETS A GUARD. `CLAUDE.md` says every user-facing string, comment, identifier,
// log message, label and document in this repository is in ENGLISH, and on 2026-08-12 it CLOSED the
// owner-quotation exception and wrote a closing inventory of every verbatim German quotation the
// repository already carried. Until tonight nothing enforced either half: the rule was a paragraph,
// and the inventory was a list nobody re-checked.
//
// ── THE DETECTION RULE, AND WHY THIS ONE ────────────────────────────────────────────────────────
// Two signals, and a line trips on either:
//
//   1. AN UMLAUT — one of ä ö ü Ä Ö Ü ß. English does not use these characters. This is mechanical,
//      not a judgement, which is the property this repository keeps choosing (see inertChange.mjs).
//      Its only realistic false positive is a proper noun, and there are none in this tree.
//
//   2. TWO OR MORE DISTINCT GERMAN FUNCTION WORDS ON ONE LINE. Umlauts alone are not enough — "das
//      ist nicht spannend" has none, and a rule that misses a whole German sentence is worse than
//      one that occasionally over-fires. The threshold is TWO rather than one because a single
//      German-derived token is routinely a code identifier being discussed in English; requiring
//      two distinct words makes a German SENTENCE trip and a German-derived IDENTIFIER not.
//
// THE WORD LIST DELIBERATELY EXCLUDES words that are also English: die, war, hat, als, in, so,
// man, bin, rot, gut. `ist` is the painful omission — it is the commonest German verb — but the
// two-word threshold recovers most of what dropping these costs.
//
// AND IT EXCLUDES `soll` AND `Bereich` BY NAME, WITH A REASON, because they are COLUMN IDENTIFIERS
// in this repository — `sollRank`, `sollBereich`, the fairness band columns — and English prose
// legitimately names them. This was not foreseen; it was caught by this guard's own test, which
// asserted that ordinary English passes and found this line failing:
//
//     // the racer's `soll` rank falls inside their assigned Bereich
//
// Two German-looking words, one line, correct English. That is precisely the false positive the
// two-word threshold was supposed to prevent and did not. Excluding them by name with the reason
// recorded is the same move CONFIG-TRUTH-1 made for `duration` (VERIFY-RULES R11): when a guard
// disagrees with a true sentence, the guard is the first suspect.
//
// ── FALSE-POSITIVE BEHAVIOUR ON THE CURRENT TREE, MEASURED AND REPORTED HONESTLY ────────────────
// Run `--inventory`. On the tree this guard shipped against: every umlaut hit is genuinely German,
// and the word-pair signal contributes no hit that the umlaut signal did not already find in the
// same file. There is no line in this repository where the guard fires on correct English.
//
// ── WHAT IT CANNOT DO, and pretending otherwise would be worse ──────────────────────────────────
// A verbatim owner quotation IN ENGLISH is indistinguishable from ordinary prose by any mechanical
// test, and the closed exception permits exactly that ("recorded in English, attributed and
// dated"). So this guard enforces the quotation half only where a quotation is GERMAN — which is
// what every entry on the closing inventory actually is. That hole is declared rather than hidden.
//
// ── THE FROZEN ALLOWLIST ────────────────────────────────────────────────────────────────────────
// Each entry is a FILE and the NUMBER of hits it is allowed to have. The count is the point:
// file-level allowance alone would let an allowed file quietly gain new German, and a line-level
// anchor would break every time a line moved. If a file's count GROWS the guard fails; if it
// SHRINKS the guard fails too, and says to lower the number — because a stale allowance is the
// same drift in the other direction.
//
// ENTRIES MAY BE REMOVED, NEVER ADDED SILENTLY. `check-language-closed.test.mjs` asserts every
// allowlisted file is in a FROZEN set written down separately; a new entry fails that test, a
// removal does not. Adding an allowance therefore takes a deliberate edit in two files and shows
// up as one in review.
//
// ── LOUD-FAILURE RULE (Lesson 187) ──────────────────────────────────────────────────────────────
// FAILS rather than passing quietly when: ZERO files are scanned (the anchor is the tracked file
// list, and an empty one means it is pointed at the wrong tree); an allowed file GAINS German; or
// an allowed file that is still here has LOST its German and kept its permission.
//
// It does NOT fail on an allowance for a file that is not in the scanned tree — that permits German
// in a file that does not exist, which is dead configuration rather than a risk, and failing on it
// would make the guard untestable against any fixture smaller than the whole repository. Dead
// allowances are PRINTED on every run instead.
//
// Usage:
//   node scripts/check-language-closed.mjs              # the guard
//   node scripts/check-language-closed.mjs --inventory   # every hit, allowed or not, exit 0
//   node scripts/check-language-closed.mjs --root=<dir>  # scan a fixture (used by its test)
// ============================================================

// ── VERIFY-ROUTING-2: this guard declares what it covers, so verify does not have to remember.
// `blind` is required and non-empty: the hole is written down by whoever knows it.
export const GUARD = {
  id: "check-language-closed",
  covers:
    "German text, and the German owner quotations the 2026-08-12 closed exception froze, anywhere in tracked source, scripts and documents",
  blind: [
    "a verbatim owner quotation IN ENGLISH — mechanically indistinguishable from prose, and the closed exception permits exactly that form",
    "reports/ — the lab journal, most of it GENERATED by a German-language sim observer that is its own block",
    "German with neither an umlaut nor two distinct function words on one line — a single German word standing alone passes",
    "whether an ALLOWED file's German is still the same German: it counts hits, it does not fingerprint them",
  ],
  dirs: ["client/", "server/", "scripts/", "docs/", ".claude/"],
  files: ["CLAUDE.md"],
};
if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

const started = Date.now();

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const argOf = (name) =>
  process.argv
    .find((a) => a.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");

const ROOT = argOf("root") ?? join(dirname(fileURLToPath(import.meta.url)), "..");
const INVENTORY = process.argv.includes("--inventory");
const NL = String.fromCharCode(10);
const NUL = String.fromCharCode(0);

// ── THE TWO SIGNALS ─────────────────────────────────────────────────────────────────────────────
const UMLAUT = /[äöüÄÖÜß]/;
const GERMAN_WORDS =
  /\b(und|oder|nicht|nichts|aber|auch|noch|schon|sehr|immer|wieder|jetzt|dann|wenn|weil|dass|das|der|den|dem|des|ein|eine|einen|einem|einer|kein|keine|keinen|mehr|sein|sind|wird|werden|wurde|haben|hatte|hatten|kann|muss|sollte|sollten|beim|vom|zum|zur|durch|gegen|ohne|unter|zwischen|damit|dabei|deshalb|sowie|jedoch|bereits|etwa|genau|richtig|falsch|Fehler|Zeile|Datei|Anzahl|Rennen|Strecke|Fahrer|Startreihe|Abstand|Ziel|Bild|erst|nur|bei|mit|auf|von|fuer|ueber|ich|mich|mir|uns|euch|ihm|ihn|habe|gesehen|gemacht|gesagt|kommt|kommen|geht|gehen|steht|stehen|bleibt|bleiben|alle|alles|etwas|vielleicht|eigentlich|wirklich|spannend|besser|schlechter|passt|gleiche|gleichen|wenig|viel|ganz|hier|dort|diese|dieser|dieses|diesem|werden|wollen|will|moechte|zeigt|zeigen|liefert|erwartet|laeuft)\b/gi;
const GERMAN_WORD_THRESHOLD = 2;

/** Why a line trips, or null. Two signals; the second needs a SENTENCE, not a word. */
function germanSignal(line) {
  if (UMLAUT.test(line)) return "umlaut";
  const found = new Set((line.match(GERMAN_WORDS) ?? []).map((w) => w.toLowerCase()));
  if (found.size >= GERMAN_WORD_THRESHOLD)
    return `${found.size} German words: ${[...found].slice(0, 5).join(", ")}`;
  return null;
}

// ── THE FROZEN ALLOWLIST ────────────────────────────────────────────────────────────────────────
// Every entry names WHY it is allowed and WHEN it was frozen. Two kinds only:
//   GRANDFATHERED — on CLAUDE.md's closing inventory of 2026-08-12. Already written into ships,
//                   fingerprints and tags; editing them would rewrite the evidence for verdicts
//                   that have already been acted on.
//   PRE-EXISTING  — German this guard FOUND rather than permitted. Each is a real violation of the
//                   language rule, allowed here only so the guard can ship green, and each is its
//                   own block. These are the entries that should shrink over time.
// EVERY COUNT BELOW WAS TAKEN FROM `--inventory` ON THIS TREE, not estimated. The first draft was
// written from a hand count and was wrong in fourteen of twenty-five entries in BOTH directions,
// which the guard caught immediately — which is the argument for a count rather than a bare
// file-level allowance, made against the guard's own author.
export const ALLOWLIST = [
  // ── GRANDFATHERED: CLAUDE.md's closing inventory, 2026-08-12 ──
  { file: "docs/CONCEPT-COHESION.md", hits: 1, why: "GRANDFATHERED — the bounded brake", since: "2026-08-12" },
  { file: "docs/TAGS.md", hits: 2, why: "GRANDFATHERED — the company guarantee and the framing failure", since: "2026-08-12" },
  { file: "docs/SHIP-CEREMONY.md", hits: 1, why: "GRANDFATHERED — the runaway budget", since: "2026-08-12" },
  { file: "client/src/modules/storage/defaults.js", hits: 4, why: "GRANDFATHERED — the podium build-up's tempo, and the zoom default", since: "2026-08-12" },
  { file: "docs/CAMERA_DIRECTOR.md", hits: 3, why: "GRANDFATHERED — the leader shot's bounding, the company guarantee retiring, and having seen all the races", since: "2026-08-12" },
  { file: "docs/FAIRNESS.md", hits: 1, why: "GRANDFATHERED — the 2026-08-12 verdict on the disproportionate-chaos watchdog", since: "2026-08-12" },
  { file: "client/src/modules/autoSpriteScale.test.js", hits: 1, why: "GRANDFATHERED — the sprite-scaling rule", since: "2026-08-12" },
  { file: "client/src/modules/camera/framingRule.js", hits: 1, why: "GRANDFATHERED — the framing failure", since: "2026-08-12" },
  { file: "client/src/modules/camera/framingRule.test.js", hits: 1, why: "GRANDFATHERED — the framing failure", since: "2026-08-12" },
  { file: "docs/ENDING-PHASES.md", hits: 3, why: "GRANDFATHERED — the zoom-out's trigger and the hold after the last crossing", since: "2026-08-13" },
  { file: "client/src/modules/camera/zoomUnit.js", hits: 2, why: "GRANDFATHERED — the zoom unit's design in his own words", since: "2026-08-13" },

  // ── PRE-EXISTING VIOLATIONS: found by this guard, each its own block, none fixed tonight ──
  { file: ".claude/skills/dev-start/SKILL.md", hits: 20, why: "PRE-EXISTING — an entirely German skill document", since: "2026-08-15" },
  { file: "scripts/sim/observers/report.mjs", hits: 6, why: "PRE-EXISTING — the German-language sim report observer; named by the night spec as its own block", since: "2026-08-15" },
  { file: "client/scripts/sweep-bufferPct-driver.mjs", hits: 8, why: "PRE-EXISTING — German summary strings in a one-off sweep driver", since: "2026-08-15" },
  { file: "client/src/screens/DevScreen/sections/BrandingProfiles.jsx", hits: 1, why: "PRE-EXISTING — a German USER-FACING alert; the worst of these and the first that should go", since: "2026-08-15" },
  { file: "client/src/screens/DevScreen/sections/BrandingProfiles.test.jsx", hits: 7, why: "PRE-EXISTING — German test names asserting the German alert above", since: "2026-08-15" },
  { file: "client/src/screens/DevScreen/sections/PlayerGroupsManager.jsx", hits: 1, why: "PRE-EXISTING — a German USER-FACING alert", since: "2026-08-15" },
  { file: "client/src/screens/DevScreen/sections/PlayerGroupsManager.test.jsx", hits: 7, why: "PRE-EXISTING — German test names asserting the German alert above", since: "2026-08-15" },
  { file: "client/src/screens/DevScreen/sections/TrackManager.jsx", hits: 1, why: "PRE-EXISTING — a German USER-FACING alert", since: "2026-08-15" },
  { file: "client/src/screens/DevScreen/sections/TrackManager.test.jsx", hits: 7, why: "PRE-EXISTING — German test names asserting the German alert above", since: "2026-08-15" },
  { file: "client/e2e/vre-2-ux-verification.spec.js", hits: 1, why: "PRE-EXISTING — a German file description", since: "2026-08-15" },
  { file: "server/src/auth/session.js", hits: 2, why: "PRE-EXISTING — German review markers in comments", since: "2026-08-15" },
  { file: "server/src/auth/session.test.js", hits: 1, why: "PRE-EXISTING — a German review marker in a comment", since: "2026-08-15" },
  { file: "docs/BACKLOG.md", hits: 1, why: "PRE-EXISTING — a German tool name in a backlog line", since: "2026-08-15" },
  { file: "docs/archive/cleanup-audit-pr98.md", hits: 1, why: "PRE-EXISTING — a German tooltip quoted in an archived audit", since: "2026-08-15" },
];

const SKIP_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".ico", ".gif", ".webp", ".svg",
  ".sqlite", ".woff", ".woff2", ".ttf", ".zip", ".gz", ".mp3", ".wav", ".pdf",
]);

// reports/ is OUT OF SCOPE and it is the repo's existing line, not a new one: check-doc-links and
// check-measured-stamps draw it in the same place. The journal is append-only by rule and most of
// its German is machine-written by the observer above.
const inScope = (f) =>
  !f.startsWith("reports/") &&
  !f.includes("node_modules/") &&
  f !== "package-lock.json" &&
  !SKIP_EXT.has(extname(f).toLowerCase());

let tracked;
try {
  tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
    .split(NL)
    .map((s) => s.trim())
    .filter(Boolean);
} catch (e) {
  console.error(`FAIL: cannot list tracked files in ${ROOT} — ${e.message}`);
  process.exit(1);
}

const files = tracked.filter(inScope);

// LOUD FAILURE (Lesson 187): a guard that scanned nothing has not found nothing.
if (files.length === 0) {
  console.error(
    `FAIL: zero in-scope files found under ${ROOT}.${NL}` +
      `      This guard's anchor is the tracked file list; an empty one means it is pointed at the ` +
      `wrong tree${NL}      or the scope filter has eaten everything. Refusing to report a clean ` +
      `repository.`,
  );
  process.exit(1);
}

const hitsByFile = new Map();
for (const f of files) {
  let text;
  try {
    text = readFileSync(join(ROOT, f), "utf8");
  } catch {
    continue;
  }
  if (text.includes(NUL)) continue; // binary that slipped the extension filter
  text.split(NL).forEach((line, i) => {
    const why = germanSignal(line);
    if (!why) return;
    if (!hitsByFile.has(f)) hitsByFile.set(f, []);
    hitsByFile.get(f).push({ line: i + 1, why, text: line.trim().slice(0, 110) });
  });
}

const allowed = new Map(ALLOWLIST.map((a) => [a.file, a]));
let failures = 0;

if (INVENTORY) {
  console.log(
    `check-language-closed --inventory: ${hitsByFile.size} file(s) with German, ${files.length} scanned`,
  );
  for (const [f, hs] of [...hitsByFile].sort()) {
    const a = allowed.get(f);
    console.log(`${NL}${f}  —  ${hs.length} hit(s)  ${a ? `[allowed ${a.hits}: ${a.why}]` : "[NOT ALLOWED]"}`);
    for (const h of hs) console.log(`  ${String(h.line).padStart(6)}  (${h.why})  ${h.text}`);
  }
  console.log(`${NL}[ra-elapsed-ms ${Date.now() - started}]`);
  process.exit(0);
}

// 1. German where none is allowed, or more than is allowed.
for (const [f, hs] of [...hitsByFile].sort()) {
  const a = allowed.get(f);
  if (!a) {
    failures++;
    console.error(
      `FAIL: ${f} contains German in ${hs.length} line(s), and is not on the frozen allowlist.${NL}` +
        `      ${f}:${hs[0].line}  ${hs[0].text}${NL}` +
        `      Write it in English. CLAUDE.md's language rule is permanent, and the owner-quotation ` +
        `exception CLOSED on 2026-08-12:${NL}` +
        `      a verdict is recorded in ENGLISH, attributed and dated — not transcribed.`,
    );
    continue;
  }
  if (hs.length > a.hits) {
    failures++;
    console.error(
      `FAIL: ${f} has ${hs.length} German line(s); the frozen allowlist permits ${a.hits}.${NL}` +
        `      ${a.why}${NL}` +
        `      An allowed file may not GAIN German. The allowance is a count on purpose: file-level ` +
        `alone would let${NL}      an already-allowed file quietly grow. New German here goes in ` +
        `English instead.`,
    );
  } else if (hs.length < a.hits) {
    failures++;
    console.error(
      `FAIL: ${f} has ${hs.length} German line(s); the frozen allowlist still permits ${a.hits}.${NL}` +
        `      German was REMOVED and the allowance was not. Lower the count to ${hs.length} (or ` +
        `delete the entry${NL}      entirely if it is now 0) — a stale allowance is the same drift ` +
        `in the other direction.`,
    );
  }
}

// 2. A STALE allowance: the file is here, and its German is not. That is real drift — a permission
//    outliving the thing it permitted — and it fails.
//
//    AN ALLOWANCE FOR A FILE THAT IS NOT IN THIS TREE IS A DIFFERENT THING and does NOT fail. It
//    permits German in a file that does not exist, which is dead configuration rather than a risk,
//    and failing on it would make the guard untestable against any fixture smaller than the whole
//    repository — which is how a guard ends up with no tests. It is PRINTED on every run instead,
//    so dead entries are visible and can be swept deliberately.
const inTree = new Set(files);
const deadAllowances = [];
for (const a of ALLOWLIST) {
  if (hitsByFile.has(a.file)) continue;
  if (!inTree.has(a.file)) {
    deadAllowances.push(a);
    continue;
  }
  failures++;
  console.error(
    `FAIL: the allowlist permits ${a.hits} German line(s) in ${a.file}, which now has none.${NL}` +
      `      German was REMOVED and the allowance was not. Delete the entry — that is the ` +
      `direction this list${NL}      is meant to move in, and a permission outliving what it ` +
      `permitted is the same drift as one arriving.`,
  );
}

console.log(
  `check-language-closed: ${files.length} in-scope file(s) scanned, ${hitsByFile.size} with German, ` +
    `${ALLOWLIST.length} frozen allowance(s), ${failures} failure(s). ` +
    `(BLIND to an owner quotation in ENGLISH, to reports/, and to a lone German word — see GUARD.blind.)`,
);

// EVERY ALLOWANCE IS PRINTED, ALWAYS. A decision to yield that nobody can see is indistinguishable
// from a guard that is not working — the same reason `verify` prints its skips as loudly as its runs.
for (const a of ALLOWLIST)
  if (!deadAllowances.includes(a))
    console.log(`  allowed ${String(a.hits).padStart(3)} in ${a.file}  —  ${a.why} (${a.since})`);

for (const a of deadAllowances)
  console.log(
    `  DEAD allowance (file not in this tree): ${a.file} — ${a.why} (${a.since}). Harmless, and ` +
      `worth sweeping.`,
  );

console.log(`[ra-elapsed-ms ${Date.now() - started}]`);
if (failures > 0) process.exit(1);
