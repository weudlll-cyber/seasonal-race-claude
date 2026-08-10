// ============================================================
// check-standings-invariant.test.mjs — the guard can FAIL, and on the right things (STANDINGS-RULE)
//
// Run: node --test scripts/check-standings-invariant.test.mjs
//
// WHAT BREAKS IF THIS IS DELETED: the guard becomes a decoration. It ships green on a tree that
// already obeys the rule, which is exactly the shape that rots into an always-green tick — and the
// only way to see it red otherwise is to break the real repository.
//
// It exercises the SOURCE half end-to-end, against fixtures, because that half is a lexical
// approximation and approximations are what go wrong (VERIFY-RULES R11). The MEASURED half is not
// re-tested here: it is a vitest file that carries its own sabotage case, and running it twice would
// buy nothing but seconds.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(ROOT, "scripts/check-standings-invariant.mjs");

/** The three files of a healthy two-layer standings, reduced to what the guard reads. */
const HEALTHY = {
  "ScoreboardCard.jsx": `
    import { memo } from 'react';
    function ScoreboardCardInner({ identity, finished, finishTimeMs, attach }) {
      return <div ref={(el) => attach(identity.index, el)} className="scoreboard-card" />;
    }
    export const ScoreboardCard = memo(ScoreboardCardInner);
  `,
  "ScoreboardSlots.jsx": `
    import { rankLabel, rankTextColor } from './scoreboardLayout.js';
    function ScoreboardSlotsInner({ count }) { return <div>{rankLabel(count)}{rankTextColor(1)}</div>; }
  `,
  "Scoreboard.jsx": `
    export default function Scoreboard({ cards, attach }) {
      return (
        <div>
          {cards.map((card) => (
            <ScoreboardCard key={card.index} identity={card.identity} attach={attach} />
          ))}
          <ScoreboardSlots count={cards.length} />
        </div>
      );
    }
  `,
};

/** Write a fixture tree and run the guard's source half over it. */
function run(files) {
  const dir = mkdtempSync(join(tmpdir(), "ra-standings-"));
  try {
    for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
    try {
      const out = execFileSync(process.execPath, [SCRIPT, "--source", `--src=${dir}`], {
        cwd: ROOT,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      return { code: 0, out };
    } catch (e) {
      return { code: e.status ?? 1, out: `${e.stdout ?? ""}` };
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const withCard = (body) => ({ ...HEALTHY, "ScoreboardCard.jsx": body });

test("a healthy two-layer standings PASSES — or every failure below proves nothing", () => {
  const r = run(HEALTHY);
  assert.equal(r.code, 0, r.out);
});

test("THE UNDO: the place put back onto the card is caught, by its helper", () => {
  const r = run(
    withCard(`
    import { rankLabel } from './scoreboardLayout.js';
    function ScoreboardCardInner({ identity, rank, attach }) {
      return <div className="scoreboard-card">{rankLabel(rank)}</div>;
    }
  `),
  );
  assert.equal(r.code, 1);
  assert.match(r.out, /uses `rankLabel`/);
});

test("…and by the PROP, even when the label is spelled out by hand", () => {
  // The helper is one way in. A card that formats the place itself has the same defect, so the prop
  // is checked independently rather than relying on the import.
  const r = run(
    withCard(`
    function ScoreboardCardInner({ identity, place, attach }) {
      return <div className="scoreboard-card">{'#' + place}</div>;
    }
  `),
  );
  assert.equal(r.code, 1);
  assert.match(r.out, /takes a prop `place`/);
});

test("…and by what the COMPOSITION hands it, which is where a re-render would actually start", () => {
  const r = run({
    ...HEALTHY,
    "Scoreboard.jsx": HEALTHY["Scoreboard.jsx"].replace(
      "identity={card.identity}",
      "identity={card.identity} rank={card.rank}",
    ),
  });
  assert.equal(r.code, 1);
  assert.match(r.out, /passes `rank` to ScoreboardCard/);
});

test("a layer that disappears is caught, not silently skipped", () => {
  const r = run({
    ...HEALTHY,
    "Scoreboard.jsx": HEALTHY["Scoreboard.jsx"].replace("<ScoreboardSlots count={cards.length} />", ""),
  });
  assert.equal(r.code, 1);
  assert.match(r.out, /no longer renders <ScoreboardSlots>/);
});

test("LOUD FAILURE — a missing file fails rather than passing quietly (Lesson 187)", () => {
  const { "ScoreboardCard.jsx": _gone, ...rest } = HEALTHY;
  const r = run(rest);
  assert.equal(r.code, 1);
  assert.match(r.out, /ScoreboardCard\.jsx is missing/);
});

test("`raceNumber` is NOT a place — the guard must not fire on the card's real props", () => {
  // The near-miss that would make this guard a nuisance: a start number is racer-bound and belongs
  // on the card. `number`, `raceNumber` and `index` must all pass.
  const r = run(
    withCard(`
    function ScoreboardCardInner({ identity, raceNumber, index, finished, attach }) {
      return <div className="scoreboard-card">{raceNumber}</div>;
    }
  `),
  );
  assert.equal(r.code, 0, r.out);
});

test("the DECLARATION names its blind spots, which is what verify prints on a green run", () => {
  // Asked the way scripts/lib/routing.mjs asks it — by SPAWNING `--declare` rather than importing
  // the module. Importing it would run the guard, including its measured half, which is the very
  // reason the router does not import guards either.
  const raw = execFileSync(process.execPath, [SCRIPT, "--declare"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const GUARD = JSON.parse(raw.split("\n").find((l) => l.trim().startsWith("{")));
  assert.equal(GUARD.id, "check-standings-invariant");
  assert.ok(GUARD.blind.length > 0, "a guard with no declared holes is claiming to have none");
  assert.ok(
    GUARD.files.includes("docs/STANDINGS-ARCHITECTURE.md"),
    "the rule's document must select the guard that enforces it",
  );
});
