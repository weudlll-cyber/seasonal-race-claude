// ============================================================
// inertChange.test.mjs — the predicate that decides whether a guard may be skipped (VERIFY-COST-2)
//
// Run: node --test scripts/lib/inertChange.test.mjs
//
// WHAT BREAKS IF THIS IS DELETED: the only thing standing between "we skipped the world fingerprint
// because the edit was a comment" and "we skipped the world fingerprint". Every other guard in this
// repository can only fail to catch something; this one can actively decide not to look. It is the
// first predicate here whose FALSE POSITIVE is a missed defect rather than a wasted minute, so it is
// tested from the unsafe side: the traps below are all cases where a naive comment-stripper says
// "inert" and is wrong.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { isInertChange, tokenSignature, acorn, DIRECTIVE_PATTERNS } from "./inertChange.mjs";

const inert = (a, b, path = "x.js") => isInertChange(a, b, path).inert;
const why = (a, b, path = "x.js") => isInertChange(a, b, path).reason;

// ── TWO ENVIRONMENTS, AND THE SUITE ASSERTS IN BOTH ─────────────────────────────────────────────
//
// The tokenizer comes from the CLIENT tree, and CI's guard job deliberately does not install it —
// it runs `node --test` against the repo without `npm ci` in client/. So there are two worlds, and
// a suite that only knew one of them would either fail in CI (it did, on the first run) or skip
// silently, which this project treats as a defect in its own right.
//
//   WITH acorn    the predicate can say "inert" — the interesting half, asserted below.
//   WITHOUT it    it must say "not inert, cannot decide" for EVERYTHING. That is the safe default
//                 and it is the half that runs in CI, so it is asserted too, not skipped.
//
// The consequence, stated so nobody has to discover it: **in CI the rule never fires and the world
// fingerprint is never skipped.** The saving is local-only, by design.
const HAVE_ACORN = !!acorn();

test("the environment is STATED, and the right contract is asserted for it", () => {
  // Not a skip: whichever world this is, one of the two branches below runs real assertions.
  console.log(
    HAVE_ACORN
      ? "  tokenizer present — asserting the full predicate"
      : "  NO TOKENIZER (client/node_modules absent, as in CI) — asserting the fail-safe contract",
  );
  assert.equal(typeof HAVE_ACORN, "boolean");
});

// ── WITHOUT THE TOKENIZER: everything is "run the guard" ────────────────────────────────────────

test("with no tokenizer, nothing is ever inert — the fail-safe contract CI runs under", () => {
  if (HAVE_ACORN) return; // the other half of this pair is the block below
  for (const [a, b] of [
    ["const a = 1; // old\n", "const a = 1; // new\n"],
    ["const a=1;\n", "const a = 1;\n"],
    ["const a = 1;\n", "const a = 2;\n"],
  ]) {
    assert.equal(inert(a, b), false);
    assert.match(why(a, b), /cannot decide/);
  }
  // …and byte-identical is still inert, because that needs no tokenizer at all.
  assert.equal(inert("same\n", "same\n"), true);
});

// ── WITH THE TOKENIZER: WHAT MAY BE SKIPPED ─────────────────────────────────────────────────────

test("a comment-only edit is INERT", () => {
  if (!HAVE_ACORN) return;
  assert.equal(inert("const a = 1; // old\n", "const a = 1; // new words entirely\n"), true);
  assert.equal(
    inert("/** doc */\nexport const x = 2;\n", "/** BETTER doc */\nexport const x = 2;\n"),
    true,
  );
});

test("a whitespace-only edit is INERT", () => {
  if (!HAVE_ACORN) return;
  assert.equal(inert("const a=1;\nconst b=2;\n", "const a = 1;\n\n\nconst b = 2;\n"), true);
});

test("a comment REMOVED entirely is INERT", () => {
  if (!HAVE_ACORN) return;
  assert.equal(inert("// gone\nconst a = 1;\n", "const a = 1;\n"), true);
});

// ── WHAT MAY NOT — the traps a regex stripper fails ─────────────────────────────────────────────

// These all assert `false`, which is the answer in BOTH worlds — with the tokenizer because the
// tokens differ, without it because it cannot decide. They are the tests that matter most and they
// run everywhere. Only the REASON differs, so only the reason is gated.
test("a real code change is NOT inert", () => {
  assert.equal(inert("const a = 1;\n", "const a = 2;\n"), false);
  if (HAVE_ACORN) assert.match(why("const a = 1;\n", "const a = 2;\n"), /tokens/);
});

// WHAT GOES UNNOTICED WITHOUT THIS: the one way whitespace changes MEANING. A stripper that
// normalised whitespace away would call these two files identical, and they return different values.
test("an ASI-relevant reflow is NOT inert — `return\\n x` is not `return x`", () => {
  assert.equal(inert("function f(){return\n1}\n", "function f(){return 1}\n"), false);
});

// WHAT GOES UNNOTICED: a stripper that treats `//` inside a STRING as the start of a comment would
// delete the rest of the line from both versions and call a real change invisible.
test("a change inside a string that LOOKS like a comment is NOT inert", () => {
  assert.equal(inert('const s = "// x";\n', 'const s = "// y";\n'), false);
  assert.equal(inert("const s = `a//${x}`;\n", "const s = `b//${x}`;\n"), false);
});

// WHAT GOES UNNOTICED: the regex-versus-division ambiguity. `/re/` containing `//` is the case a
// hand-written scanner gets wrong, and getting it wrong here means skipping a guard.
test("a change inside a REGEX LITERAL containing // is NOT inert", () => {
  const before = "const r = /a\\/\\/b/;\nexport { r };\n";
  const after = "const r = /a\\/\\/c/;\nexport { r };\n";
  assert.equal(inert(before, after), false);
});

test("a division that follows a paren is not mistaken for a regex", () => {
  if (!HAVE_ACORN) return;
  // If `/` after `)` were read as a regex start, the tokenizer would fail and the predicate would
  // say "cannot decide" — safe, but it would also mean it never skips anything real. This pins that
  // ordinary arithmetic still tokenizes, so the INERT cases above are reachable in real code.
  assert.notEqual(tokenSignature("const q = (a + b) / 2; // c\n"), null);
  assert.equal(inert("const q = (a + b) / 2; // c\n", "const q = (a + b) / 2; // d\n"), true);
});

// ── DIRECTIVE COMMENTS: read by a tool, so refused even though this guard runs no tool ──────────

test("a changed DIRECTIVE comment is never inert", () => {
  assert.equal(inert("const a = f();\n", "const a = /*#__PURE__*/ f();\n"), false);
  assert.equal(inert("const a = 1;\n", "// eslint-disable-next-line\nconst a = 1;\n"), false);
  assert.equal(inert("const a = 1;\n", "// @vitest-environment node\nconst a = 1;\n"), false);
  // The REASON is tokenizer-dependent (without one it never gets as far as the comments), the
  // ANSWER is not — which is why only this line is gated.
  if (HAVE_ACORN)
    assert.match(why("const a = f();\n", "const a = /*#__PURE__*/ f();\n"), /directive/);
});

test("the directive list is non-empty and covers the four tool families", () => {
  // A list that quietly emptied would make the check above vacuous.
  assert.ok(DIRECTIVE_PATTERNS.length >= 8);
  const joined = DIRECTIVE_PATTERNS.map(String).join(" ");
  for (const family of ["PURE", "vite-ignore", "vitest-environment", "eslint"])
    assert.ok(joined.includes(family), `no directive pattern mentions ${family}`);
});

// ── EVERY UNCERTAINTY RESOLVES TO "RUN THE GUARD" ───────────────────────────────────────────────

test("an unparseable version is NOT inert — a parse error is never a pass", () => {
  assert.equal(inert("const a = 1;\n", "const a = ;;;\n"), false);
  assert.match(why("const a = 1;\n", "const a = ;;;\n"), /cannot decide|tokens/);
});

test("a non-JavaScript file is NOT inert, whatever its contents", () => {
  assert.equal(inert("# a\n", "# b\n", "docs/X.md"), false);
  assert.equal(inert("{}\n", "{ }\n", "package.json"), false);
});

test("an added or deleted file is NOT inert", () => {
  assert.equal(inert(null, "const a = 1;\n"), false);
  assert.equal(inert("const a = 1;\n", null), false);
});

test("byte-identical is inert, and says so without needing the tokenizer", () => {
  assert.equal(inert("anything at all", "anything at all", "x.md"), true);
});
