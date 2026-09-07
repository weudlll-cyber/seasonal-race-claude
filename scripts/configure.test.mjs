// ============================================================
// configure.test.mjs — the file rule behind `npm run configure` (RUNTIME-API-URL-1).
//
// Run: node --test scripts/configure.test.mjs
//
// ★ WHAT IS PINNED, and it is the one rule with a real cost if it breaks: running configure twice
// must not leave two `RA_PUBLIC_ORIGIN` entries. Compose would take one of them and the operator
// could not tell which — a configured install pointing somewhere nobody chose, which is exactly the
// silent failure this whole piece removes. The second rule is that everything ELSE in the operator's
// file survives untouched: it holds their session secret.
//
// The prompt itself is deliberately NOT tested: it is `readline/promises` against a TTY, and a test
// of it would be a test of Node. The refusals around it are exercised from the command line in the
// report instead (`--origin=` with a bad value, and no-TTY with no value).
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { withPublicOrigin } from "./configure.mjs";

const OWNERS_FILE = [
  "# Local dev only. Gitignored — never committed.",
  "services:",
  "  server:",
  "    environment:",
  "      - RA_SESSION_SECRET=dev-secret-not-for-production",
  "      - RA_CLIENT_ORIGIN=http://localhost:5173,http://localhost:4173",
].join("\n");

test("creates a usable override when there is no file", () => {
  const out = withPublicOrigin(null, "https://races.example.com");
  for (const needed of ["services:", "  server:", "    environment:"]) {
    assert.ok(out.includes(needed), `missing ${needed}`);
  }
  assert.ok(out.includes("      - RA_PUBLIC_ORIGIN=https://races.example.com"));
});

test("★ adds ONE line to an existing file and changes nothing else", () => {
  const out = withPublicOrigin(OWNERS_FILE, "https://races.example.com");
  const before = OWNERS_FILE.split("\n");
  const after = out.split("\n");
  assert.equal(after.length, before.length + 1);
  for (const line of before) assert.ok(after.includes(line), `lost: ${line}`);
  assert.ok(out.includes("      - RA_PUBLIC_ORIGIN=https://races.example.com"));
});

test("★ run twice, there is exactly ONE entry and it is the newer address", () => {
  const once = withPublicOrigin(OWNERS_FILE, "https://first.example.com");
  const twice = withPublicOrigin(once, "https://second.example.com");
  const entries = twice.split("\n").filter((l) => l.includes("RA_PUBLIC_ORIGIN="));
  assert.equal(entries.length, 1);
  assert.ok(entries[0].includes("https://second.example.com"));
  assert.equal(twice.split("\n").length, OWNERS_FILE.split("\n").length + 1);
});

test("★ refuses rather than guessing when there is no `environment:` block to extend", () => {
  assert.equal(withPublicOrigin("services:\n  server:\n    image: x\n", "https://a.example.com"), null);
});

test("the secrets already in the file survive", () => {
  const out = withPublicOrigin(OWNERS_FILE, "https://races.example.com");
  assert.ok(out.includes("RA_SESSION_SECRET=dev-secret-not-for-production"));
  assert.ok(out.includes("RA_CLIENT_ORIGIN=http://localhost:5173,http://localhost:4173"));
});
