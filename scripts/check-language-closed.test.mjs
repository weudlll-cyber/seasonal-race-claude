// ============================================================
// File:        scripts/check-language-closed.test.mjs
// Project:     RaceArena — LANG-CLOSED-1
//
// Against real fixture repositories (real `git init`), because the guard shells out to
// `git ls-files` — plus one test that runs it against THIS repository, because every other test
// here uses a fixture and the shipped allowlist could rot while all of them stayed green.
//
// THE TEST THAT MATTERS MOST is FROZEN_ALLOWLIST below: it is the second place an allowance has to
// be written, and it is one-directional on purpose. A new entry fails it; a removal does not. That
// is the asymmetry CLAUDE.md's closed exception asks for — entries may leave, never arrive quietly.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ALLOWLIST } from "./check-language-closed.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const GUARD = join(HERE, "check-language-closed.mjs");
const ROOT = join(HERE, "..");

/**
 * THE FROZEN SET — the second home an allowance must be written in.
 *
 * This is deliberately a bare list of paths with no counts and no reasons: it is not a copy of the
 * allowlist, it is the RECORD OF WHICH FILES WERE EVER ALLOWED. A file appearing in the guard and
 * not here fails; a file here and no longer in the guard does not. Removing an allowance is the
 * direction this list is meant to move in, and it takes one deletion in the guard and none here.
 */
const FROZEN_ALLOWLIST = new Set([
  // the 2026-08-12 closing inventory
  "docs/CONCEPT-COHESION.md",
  "docs/TAGS.md",
  "docs/SHIP-CEREMONY.md",
  "client/src/modules/storage/defaults.js",
  "docs/CAMERA_DIRECTOR.md",
  "docs/FAIRNESS.md",
  "client/src/modules/autoSpriteScale.test.js",
  "client/src/modules/camera/framingRule.js",
  "client/src/modules/camera/framingRule.test.js",
  "docs/ENDING-PHASES.md",
  "client/src/modules/camera/zoomUnit.js",
  // pre-existing violations found on 2026-08-15, each its own block
  ".claude/skills/dev-start/SKILL.md",
  "scripts/sim/observers/report.mjs",
  "client/scripts/sweep-bufferPct-driver.mjs",
  "client/src/screens/DevScreen/sections/BrandingProfiles.jsx",
  "client/src/screens/DevScreen/sections/BrandingProfiles.test.jsx",
  "client/src/screens/DevScreen/sections/PlayerGroupsManager.jsx",
  "client/src/screens/DevScreen/sections/PlayerGroupsManager.test.jsx",
  "client/src/screens/DevScreen/sections/TrackManager.jsx",
  "client/src/screens/DevScreen/sections/TrackManager.test.jsx",
  "client/e2e/vre-2-ux-verification.spec.js",
  "server/src/auth/session.js",
  "server/src/auth/session.test.js",
  "docs/BACKLOG.md",
  "docs/archive/cleanup-audit-pr98.md",
]);

const withRepo = (files, fn) => {
  const root = mkdtempSync(join(tmpdir(), "ra-lang-"));
  try {
    for (const [name, text] of Object.entries(files)) {
      const p = join(root, name);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, text);
    }
    for (const args of [
      ["init", "-q"],
      ["config", "user.email", "t@t"],
      ["config", "user.name", "t"],
      ["add", "-A"],
    ])
      spawnSync("git", args, { cwd: root });
    const r = spawnSync(process.execPath, [GUARD, `--root=${root}`], {
      encoding: "utf8",
    });
    return fn({ code: r.status, out: (r.stdout ?? "") + (r.stderr ?? "") });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

// DELETE THIS and the allowlist stops being frozen. It is the entire mechanism by which an
// allowance cannot be ADDED quietly: a new entry in the guard and not here fails the suite, so
// permitting new German takes a deliberate edit in two files and reads as one in review.
test("FROZEN: every allowlisted file is in the frozen set — additions fail, removals do not", () => {
  for (const a of ALLOWLIST)
    assert.ok(
      FROZEN_ALLOWLIST.has(a.file),
      `${a.file} was ADDED to the allowlist. CLAUDE.md's owner-quotation exception is CLOSED and ` +
        `the language rule is permanent. If this is genuinely grandfathered, add it here too and ` +
        `say why in the commit message.`
    );
});

// DELETE THIS and an entry could be allowed with no stated reason or date, which is how an
// allowlist turns into a list nobody can audit.
test("every allowance carries a reason and a date", () => {
  for (const a of ALLOWLIST) {
    assert.ok(a.why && a.why.length > 10, `${a.file} needs a reason`);
    assert.match(a.since, /^\d{4}-\d{2}-\d{2}$/, `${a.file} needs a frozen-on date`);
    assert.ok(Number.isInteger(a.hits) && a.hits > 0, `${a.file} needs a positive hit count`);
  }
});

// DELETE THIS and the guard's primary job is untested: it must CATCH German that nobody allowed.
test("SABOTAGE: German in an unlisted file FAILS", () => {
  withRepo({ "src/thing.js": "// Das ist nicht spannend, oder?\n" }, ({ code, out }) => {
    assert.equal(code, 1, "unallowed German must fail");
    assert.match(out, /src\/thing\.js/);
    assert.match(out, /not on the frozen allowlist/);
  });
});

// DELETE THIS and the umlaut signal alone would be untested — the one that needs no word list and
// carries the guard on files whose German is a single word like "Plätze".
test("SABOTAGE: a single umlaut is enough, with no German words at all", () => {
  withRepo({ "src/thing.js": "const label = 'Plätze';\n" }, ({ code, out }) => {
    assert.equal(code, 1);
    assert.match(out, /umlaut|German/);
  });
});

// DELETE THIS and the guard could be failing on ordinary English — the failure mode that would get
// it disabled within a week. This is the other half of proving it in both directions.
test("RESTORED: ordinary English prose PASSES, including the words that look German", () => {
  withRepo(
    {
      // `soll` and `Bereich` are CODE IDENTIFIERS here (sollRank, sollBereich). One German-looking
      // word on a line must never be enough, or the guard fires on its own repository's prose.
      "src/a.js": "// the racer's soll rank falls inside their assigned Bereich\n",
      "docs/b.md": "The band-reach gate is measured per start row and minimised.\n",
      "src/c.js": "// Die Cast, war memorial, hat trick, man page, in so far as it goes.\n",
    },
    ({ code, out }) => {
      assert.equal(code, 0, `English must pass — got:\n${out}`);
      assert.match(out, /0 failure/);
    }
  );
});

// DELETE THIS and an allowed file could quietly GAIN German — the exact drift a bare file-level
// allowance permits, and the reason the allowance is a count.
test("an allowed file may not gain German: exceeding the count FAILS", () => {
  const r = spawnSync(process.execPath, ["-e", "process.exit(0)"]);
  assert.equal(r.status, 0); // guard against a broken node in the harness itself
  // TAGS.md is allowed exactly 2 in the shipped list. Three German lines must fail.
  withRepo(
    { "docs/TAGS.md": "das ist nicht spannend\nnoch eine deutsche Zeile hier\nund hier ist noch eine\n" },
    ({ code, out }) => {
      assert.equal(code, 1);
      assert.match(out, /may not GAIN German/);
    }
  );
});

// DELETE THIS and a stale allowance — the file still here, its German gone, the permission left
// behind — would pass forever, which is the same drift pointing the other way.
test("a stale allowance whose file has lost its German FAILS and says to delete it", () => {
  withRepo({ "docs/TAGS.md": "All English in here now.\n" }, ({ code, out }) => {
    assert.equal(code, 1);
    assert.match(out, /which now has none/);
    assert.match(out, /Delete the entry/);
  });
});

// DELETE THIS and the guard becomes untestable against any tree smaller than the whole repository:
// an allowance for a file that is simply ABSENT is dead configuration, not drift, and failing on it
// would force every fixture to reproduce all 25 allowlisted files.
test("an allowance for a file not in the tree is reported as DEAD, not failed", () => {
  withRepo({ "src/ok.js": "// plain english\n" }, ({ code, out }) => {
    assert.equal(code, 0, `a dead allowance must not fail:\n${out}`);
    assert.match(out, /DEAD allowance/);
  });
});

// DELETE THIS and the guard could scan nothing and report a clean repository — the Lesson-187
// no-op, which for a language guard would look exactly like success.
test("zero in-scope files FAILS rather than reporting a clean tree", () => {
  withRepo({ "reports/x.md": "Alles auf Deutsch hier drin.\n" }, ({ code, out }) => {
    assert.equal(code, 1);
    assert.match(out, /zero in-scope files/);
  });
});

// DELETE THIS and nothing checks that verify's router knows about this guard. An undeclared guard
// is never run by the router — it would sit in the tree looking like coverage.
test("it declares itself for verify routing, with a non-empty blind list", () => {
  const r = spawnSync(process.execPath, [GUARD, "--declare"], { encoding: "utf8" });
  assert.equal(r.status, 0);
  const d = JSON.parse(r.stdout);
  assert.equal(d.id, "check-language-closed");
  assert.ok(d.blind.length > 0);
  assert.ok(d.dirs.includes("docs/") && d.dirs.includes("client/"));
});

// DELETE THIS and every case above still passes on fixtures while the REAL allowlist rots against
// the real tree — the only test here that touches the repository this guard actually guards.
test("THE REAL TREE: the shipped allowlist matches the repository exactly", () => {
  const r = spawnSync(process.execPath, [GUARD], { cwd: ROOT, encoding: "utf8" });
  assert.equal(
    r.status,
    0,
    `the shipped tree must be green against its own allowlist:\n${r.stdout}${r.stderr}`
  );
  assert.match(r.stdout, /0 failure/);
});
