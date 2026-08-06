// ============================================================
// File:        scripts/lib/write-verified.test.mjs
// Project:     RaceArena — ONE-TRUTH-2 stage 6
//
// Both positions of the switch: a write that lands returns its size, and a write that does not land
// throws NAMING THE PATH. The failure cases are produced by real filesystem conditions, not by
// stubbing the module under test — a mock would only prove the mock.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeVerified } from "./write-verified.mjs";

const withDir = (fn) => {
  const d = mkdtempSync(join(tmpdir(), "ra-wv-"));
  try {
    return fn(d);
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
};

test("BASELINE: a real write returns the byte size and the content is on disk", () => {
  withDir((d) => {
    const p = join(d, "out.txt");
    const size = writeVerified(p, "hello", "the thing");
    assert.equal(size, 5);
    assert.equal(readFileSync(p, "utf8"), "hello");
  });
});

test("ZERO BYTES THROWS — the signature of a truncated stream or a template that rendered nothing", () => {
  // This is the case that matters: writeFileSync SUCCEEDS here. Without the size check the caller
  // would carry on and report the step as done, which is exactly the incident this exists for.
  withDir((d) => {
    const p = join(d, "empty.txt");
    assert.throws(
      () => writeVerified(p, "", "the generated block"),
      (e) => {
        assert.match(e.message, /ZERO BYTES/);
        assert.match(e.message, /the generated block/, "must name WHAT failed");
        assert.ok(e.message.includes(p), "must name the PATH");
        assert.match(e.message, /Do not report this step as done/);
        return true;
      },
    );
  });
});

test("AN UNWRITABLE PATH THROWS rather than being swallowed", () => {
  withDir((d) => {
    // A directory where a file is expected: the write itself fails at the OS level.
    const p = join(d, "adir");
    mkdirSync(p);
    assert.throws(() => writeVerified(p, "x", "a file"), /.+/);
  });
});

test("CONSEQUENCE: the same content written to a good path does NOT throw", () => {
  // The pair. Without it, a helper that threw unconditionally would pass every test above.
  withDir((d) => {
    assert.doesNotThrow(() =>
      writeVerified(join(d, "fine.txt"), "x", "a file"),
    );
  });
});
