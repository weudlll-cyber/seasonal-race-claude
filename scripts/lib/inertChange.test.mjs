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

// The tokenizer comes from the CLIENT tree. If it is absent the predicate must degrade to "run the
// guard", so the suite states which world it is asserting in rather than skipping silently.
const HAVE_ACORN = !!acorn();

test("the tokenizer is present here — otherwise every assertion below is about the fallback", () => {
  assert.equal(HAVE_ACORN, true, "acorn not resolvable from client/node_modules; run npm ci there");
});

// ── WHAT MAY BE SKIPPED ─────────────────────────────────────────────────────────────────────────

test("a comment-only edit is INERT", () => {
  assert.equal(inert("const a = 1; // old\n", "const a = 1; // new words entirely\n"), true);
  assert.equal(inert("/** doc */\nexport const x = 2;\n", "/** BETTER doc */\nexport const x = 2;\n"), true);
});

test("a whitespace-only edit is INERT", () => {
  assert.equal(inert("const a=1;\nconst b=2;\n", "const a = 1;\n\n\nconst b = 2;\n"), true);
});

test("a comment REMOVED entirely is INERT", () => {
  assert.equal(inert("// gone\nconst a = 1;\n", "const a = 1;\n"), true);
});

// ── WHAT MAY NOT — the traps a regex stripper fails ─────────────────────────────────────────────

test("a real code change is NOT inert", () => {
  assert.equal(inert("const a = 1;\n", "const a = 2;\n"), false);
  assert.match(why("const a = 1;\n", "const a = 2;\n"), /tokens/);
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
