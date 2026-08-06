// ============================================================
// File:        scripts/prove-changed.test.mjs
// Project:     RaceArena — CLEAN-STATE-1 stage 2
//
// The guard's own liveness. Every failure below is produced by a REAL child process with a real exit
// status writing to a real temp directory — nothing about `prove-changed.mjs` is stubbed, because a
// stub of a process wrapper only proves the stub.
//
// The pair rule (Lesson 203): a wrapper that failed unconditionally would satisfy every FAIL case
// here, so the BASELINE test is not optional decoration — it is the other position of the switch.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const GUARD = join(
  dirname(fileURLToPath(import.meta.url)),
  "prove-changed.mjs",
);

const withDir = (fn) => {
  const d = mkdtempSync(join(tmpdir(), "ra-pc-"));
  try {
    return fn(d);
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
};

/** Run the guard over `paths`, wrapping `command`. Returns {status, out}. */
const runGuard = (paths, command) => {
  const r = spawnSync(
    process.execPath,
    [GUARD, `--paths=${paths.join(",")}`, "--", ...command],
    { encoding: "utf8" },
  );
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
};

// ────────────────────────────────────────────────────────────
// BASELINE — the other position of the switch.
//   What breaks if deleted: nothing would stop the guard from being rewritten to fail always, and
//     every FAIL test below would still pass. The wrapper would then block real work.
//   What goes unnoticed without it: a guard nobody can satisfy, which gets removed within a week.
// ────────────────────────────────────────────────────────────
test("BASELINE: a command that really writes PASSES and names what moved", () => {
  withDir((d) => {
    const target = join(d, "report.md");
    writeFileSync(target, "before\n");
    const helper = join(d, "edit.mjs");
    writeFileSync(
      helper,
      `import {writeFileSync} from "node:fs"; writeFileSync(${JSON.stringify(target)}, "after\\n");`,
    );

    const { status, out } = runGuard([target], [process.execPath, helper]);
    assert.equal(status, 0, out);
    assert.match(out, /1 of 1 named path\(s\) moved/);
    assert.match(out, /changed:/);
    assert.equal(readFileSync(target, "utf8"), "after\n");
  });
});

// ────────────────────────────────────────────────────────────
// HALF 1 — THE INCIDENT, reproduced: assert first, write second.
//   What breaks if deleted: commit 7e6a8446's exact failure goes back to being silent.
//   What goes unnoticed without it: a helper that aborted before its write, reported as done.
// ────────────────────────────────────────────────────────────
test("THE INCIDENT: a helper that asserts BEFORE its write fails loudly and names the unproven path", () => {
  withDir((d) => {
    const target = join(d, "report.md");
    writeFileSync(target, "before\n");
    const helper = join(d, "assert-then-write.mjs");
    // The shape from 7e6a8446: sanity-check, THEN write. The check fails; the write never runs.
    writeFileSync(
      helper,
      `import assert from "node:assert/strict";\n` +
        `import {writeFileSync} from "node:fs";\n` +
        `assert.equal(1, 2, "the sanity check nobody expected to fail");\n` +
        `writeFileSync(${JSON.stringify(target)}, "after\\n");`,
    );

    const { status, out } = runGuard([target], [process.execPath, helper]);
    assert.notEqual(status, 0, "a dead helper must not exit 0");
    assert.match(out, /PROVE-CHANGED FAILED/);
    assert.match(out, /exited \d+/);
    assert.ok(out.includes(target), "must name the path that is now unproven");
    assert.match(out, /Do not report this step as done/);
    assert.equal(
      readFileSync(target, "utf8"),
      "before\n",
      "the file really was not written — this is the condition under test, not a mock",
    );
  });
});

// ────────────────────────────────────────────────────────────
// HALF 2 — the half an exit code cannot see.
//   What breaks if deleted: a silent no-op (a pattern that matched nothing) reads as success.
//   What goes unnoticed without it: exactly the "edit applied" claim that is false.
// ────────────────────────────────────────────────────────────
test("SILENT NO-OP: exit 0 with nothing changed is a FAILURE, not a pass", () => {
  withDir((d) => {
    const target = join(d, "report.md");
    writeFileSync(target, "before\n");
    const helper = join(d, "noop.mjs");
    writeFileSync(helper, `process.exit(0);`);

    const { status, out } = runGuard([target], [process.execPath, helper]);
    assert.equal(status, 1);
    assert.match(out, /exited 0 and changed NOTHING/);
    assert.match(out, /unchanged:/);
    assert.ok(out.includes(target));
  });
});

test("A MISSING FILE THAT STAYS MISSING is a no-op too — absent is a state, not an excuse", () => {
  withDir((d) => {
    const target = join(d, "never-created.md");
    const helper = join(d, "noop.mjs");
    writeFileSync(helper, `process.exit(0);`);

    const { status, out } = runGuard([target], [process.execPath, helper]);
    assert.equal(status, 1);
    assert.match(out, /changed NOTHING/);
    assert.match(out, /absent/);
    assert.equal(existsSync(target), false);
  });
});

// ────────────────────────────────────────────────────────────
// THE LINE-ENDING TRAP — found by sabotage, not by reasoning. The first version of the guard
// compared raw bytes and this case PASSED, which defeated half 2 for the commonest helper shape.
//   What breaks if deleted: a read-all/replace/write-all helper whose pattern matched NOTHING goes
//     back to passing on Windows, because rewriting 371 LF as CRLF is a byte change.
//   What goes unnoticed without it: precisely the incident this whole file exists for, wearing a
//     diff. It is the more dangerous form — it does not merely fail to catch, it reports success.
// ────────────────────────────────────────────────────────────
test("REWRITTEN, TEXT IDENTICAL: changing only line endings is a no-op, not an edit", () => {
  withDir((d) => {
    const target = join(d, "report.md");
    writeFileSync(target, "one\ntwo\nthree\n"); // LF
    const helper = join(d, "crlf.mjs");
    // The Python-on-Windows shape, reproduced without needing Python on the runner.
    writeFileSync(
      helper,
      `import {readFileSync, writeFileSync} from "node:fs";\n` +
        `const t = readFileSync(${JSON.stringify(target)}, "utf8");\n` +
        `writeFileSync(${JSON.stringify(target)}, t.replace("a string that does not occur", "x").replace(/\\n/g, "\\r\\n"));`,
    );

    const { status, out } = runGuard([target], [process.execPath, helper]);
    assert.equal(
      status,
      1,
      "a text no-op must fail even though the bytes moved",
    );
    assert.match(out, /changed NO TEXT/);
    assert.match(out, /rewritten, text identical/);
    assert.match(out, /LINE-ENDING TRAP/);
    // The condition really is a byte change — this is not a mocked situation.
    assert.notEqual(
      readFileSync(target, "utf8"),
      "one\ntwo\nthree\n",
      "the file's BYTES did change; the guard's verdict is about its TEXT",
    );
  });
});

test("CONSEQUENCE OF THE TRAP FIX: a real edit that ALSO changes line endings still passes", () => {
  // The pair. Folding newlines must not make the guard blind to an edit that happens to reformat.
  withDir((d) => {
    const target = join(d, "report.md");
    writeFileSync(target, "one\ntwo\n");
    const helper = join(d, "both.mjs");
    writeFileSync(
      helper,
      `import {readFileSync, writeFileSync} from "node:fs";\n` +
        `const t = readFileSync(${JSON.stringify(target)}, "utf8");\n` +
        `writeFileSync(${JSON.stringify(target)}, t.replace("two", "TWO").replace(/\\n/g, "\\r\\n"));`,
    );

    const { status, out } = runGuard([target], [process.execPath, helper]);
    assert.equal(status, 0, out);
    assert.match(out, /1 of 1 named path\(s\) moved/);
  });
});

// ────────────────────────────────────────────────────────────
// ZERO BYTES — the same signature `write-verified.mjs` exists for, at the process boundary.
//   What breaks if deleted: a truncated write passes as "changed".
//   What goes unnoticed without it: a template that rendered to nothing.
// ────────────────────────────────────────────────────────────
test("ZERO BYTES: a command that empties the file fails even though the bytes DID change", () => {
  withDir((d) => {
    const target = join(d, "report.md");
    writeFileSync(target, "before\n");
    const helper = join(d, "truncate.mjs");
    writeFileSync(
      helper,
      `import {writeFileSync} from "node:fs"; writeFileSync(${JSON.stringify(target)}, "");`,
    );

    const { status, out } = runGuard([target], [process.execPath, helper]);
    assert.equal(status, 1);
    assert.match(out, /ZERO BYTES/);
    assert.ok(out.includes(target));
  });
});

// ────────────────────────────────────────────────────────────
// SELF-ASSERTING INPUT (Lesson 187).
//   What breaks if deleted: the wrapper can be invoked with nothing to prove and print a verdict.
//   What goes unnoticed without it: a green line that means "I checked no files", indistinguishable
//     from "I checked and they moved" — the no-op trap this whole file is about.
// ────────────────────────────────────────────────────────────
test("NOTHING TO PROVE IS A FAILURE: no --paths, and no command, both refuse", () => {
  const noPaths = spawnSync(
    process.execPath,
    [GUARD, "--", "node", "-e", ";"],
    {
      encoding: "utf8",
    },
  );
  assert.equal(noPaths.status, 1);
  assert.match(noPaths.stderr, /nothing to prove/);

  const noCommand = spawnSync(process.execPath, [GUARD, "--paths=x.md"], {
    encoding: "utf8",
  });
  assert.equal(noCommand.status, 1);
  assert.match(noCommand.stderr, /no command after/);
});

// ────────────────────────────────────────────────────────────
// THE STATED LIMIT, asserted so it cannot quietly become untrue.
//   What breaks if deleted: the header could claim a limit the code no longer has, or vice versa.
//   What goes unnoticed without it: a reader trusting "it checks the content" — it does not.
// ────────────────────────────────────────────────────────────
test("IT DOES NOT CHECK CONTENT, and its own output says so", () => {
  withDir((d) => {
    const target = join(d, "report.md");
    writeFileSync(target, "before\n");
    const helper = join(d, "garbage.mjs");
    writeFileSync(
      helper,
      `import {writeFileSync} from "node:fs"; writeFileSync(${JSON.stringify(target)}, "total nonsense");`,
    );

    const { status, out } = runGuard([target], [process.execPath, helper]);
    assert.equal(status, 0, "wrong bytes still count as changed — by design");
    assert.match(
      out,
      /does NOT check the content is correct/,
      "the limit must be printed where the verdict is read, not only in the header",
    );
    assert.match(out, /cannot see a command nobody wrapped/);
  });
});
