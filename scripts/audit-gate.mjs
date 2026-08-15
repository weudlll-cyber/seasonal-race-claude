// ============================================================
// File:        scripts/audit-gate.mjs
// Project:     RaceArena
// Description: Security-audit gate (HYGIENE-1, extended by SERVER-AUDIT-1). Runs `npm audit --json`
//              in a package tree and applies the
//              project audit policy:
//                • HIGH / CRITICAL  → FAIL the build, UNLESS the advisory is in the documented ALLOWLIST
//                                     below (each entry carries a justification + a remove-when condition).
//                • MODERATE / LOW   → advisory only; printed, never fails.
//              No dependencies (plain Node). Exit 1 on any un-allowlisted high/critical advisory.
// ============================================================

import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ── SERVER-AUDIT-1: THE GATE TAKES A TREE ───────────────────────────────────────────────────────
//
// It scanned `client/` only, so the server tree — which carries its own dependencies and its own
// advisories — was audited by NOBODY. CHECK-AUDIT-1 named it; now that CI has a Server tests job
// there is an obvious home for it.
//
// ONE SCRIPT, NOT TWO (R13). The rule being added is "audit this tree too", which needs the same
// anchor (`npm audit --json`), the same failure message and the same blind list as the rule already
// here. A second script would have been a copy of this one with a different `cwd`, and the two would
// have drifted the first time the policy changed.
//
// `--report-only` PRINTS AND NEVER FAILS, and it exists for one specific, documented reason rather
// than as a general escape: see the CI wiring for the server tree, and reports/night for the
// advisories that made it necessary. It is not a way to silence the client gate — that one still
// blocks, and the default with no flags is unchanged in every respect.
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argOf = (name) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const TREE = argOf("tree") ?? "client";
const REPORT_ONLY = process.argv.includes("--report-only");
const CLIENT = join(ROOT, TREE);

// ── ALLOWLIST: advisories accepted as NOT-APPLICABLE or NOT-YET-FIXABLE, with justification. ──
// Keep this SMALL and JUSTIFIED. Each entry must say why it is safe here and when to remove it.
const ALLOWLIST = {
  "GHSA-qwww-vcr4-c8h2":
    "React Router RSC-mode CSRF. This app is a client-side Vite SPA using declarative <BrowserRouter> " +
    "with NO RSC / SSR / framework mode, so the RSC action pipeline the advisory targets is never used — " +
    "not exploitable here. No forward-fixed release exists (vulnerable range 7.12.0–8.2.0; latest published " +
    "is 7.18.2; npm audit fix would only DOWNGRADE below 7.12.0, reintroducing the moderate open-redirect " +
    "GHSAs). REMOVE this entry once react-router ships a patched >8.2.0 (or a 7.x backport) and bump to it.",
};

const ghsaOf = (url) => ((url && url.match(/GHSA-[0-9a-z-]+/i)) || [null])[0];

/** Every GHSA id an audit report mentions. Used to ask whether an advisory survives --omit=dev. */
function collectGhsa(rep) {
  const out = new Set();
  for (const v of Object.values(rep.vulnerabilities || {}))
    for (const via of v.via || [])
      if (typeof via === "object" && ghsaOf(via.url)) out.add(ghsaOf(via.url));
  return out;
}

let report;
try {
  const out = execSync("npm audit --json", { cwd: CLIENT, encoding: "utf8" });
  report = JSON.parse(out);
} catch (e) {
  // npm audit exits non-zero when vulnerabilities exist; the JSON is still on stdout.
  try {
    report = JSON.parse((e.stdout || "").toString());
  } catch {
    console.error("audit-gate: could not run/parse `npm audit --json`.");
    process.exit(2);
  }
}

// WHICH ADVISORIES CAN REACH THE RUNNING PRODUCT. A dev-only advisory lives in a build tool and is
// never loaded by the server or shipped to a browser; a production one is in the dependency graph
// the product actually runs. The gate's PASS/FAIL policy is unchanged — this only enriches what it
// PRINTS, because "high severity" and "reachable" are different questions and the reader needs both.
let prodGhsa = new Set();
try {
  const outProd = execSync("npm audit --omit=dev --json", { cwd: CLIENT, encoding: "utf8" });
  prodGhsa = collectGhsa(JSON.parse(outProd));
} catch (e) {
  try {
    prodGhsa = collectGhsa(JSON.parse((e.stdout || "").toString()));
  } catch {
    prodGhsa = null; // unknown rather than empty — never claim "dev-only" without having looked
  }
}

const vulns = report.vulnerabilities || {};
const blocking = []; // un-allowlisted high/critical advisory objects
const allowed = []; // allowlisted high/critical
const advisory = []; // moderate/low

const seen = new Set();
for (const v of Object.values(vulns)) {
  for (const via of v.via || []) {
    if (typeof via !== "object") continue; // string ref = transitive; the source advisory is handled on its own package
    const ghsa = ghsaOf(via.url);
    const key = ghsa || via.url || via.title;
    if (seen.has(key)) continue;
    seen.add(key);
    const sev = (via.severity || "").toLowerCase();
    const rec = { ghsa, sev, title: via.title, url: via.url };
    if (sev === "high" || sev === "critical") {
      if (ghsa && ALLOWLIST[ghsa]) allowed.push(rec);
      else blocking.push(rec);
    } else if (sev === "moderate" || sev === "low") {
      advisory.push(rec);
    }
  }
}

const reach = (g) =>
  prodGhsa === null ? "reachability UNKNOWN" : prodGhsa.has(g) ? "PRODUCTION" : "dev-only";

const m = report.metadata?.vulnerabilities || {};
console.log(
  `audit-gate [${TREE}]: totals — critical ${m.critical ?? 0}, high ${m.high ?? 0}, moderate ${m.moderate ?? 0}, low ${m.low ?? 0}`,
);
for (const a of advisory)
  console.log(`  advisory (${a.sev}): ${a.ghsa || a.url} — ${a.title}`);
for (const a of allowed)
  console.log(
    `  ALLOWLISTED (${a.sev}): ${a.ghsa} — ${a.title}\n    reason: ${ALLOWLIST[a.ghsa]}`,
  );
for (const b of blocking)
  console.error(
    `  ${REPORT_ONLY ? "REPORTED" : "BLOCKING"} (${b.sev}, ${reach(b.ghsa)}): ${b.ghsa || b.url} — ${b.title}`,
  );

if (blocking.length && !REPORT_ONLY) {
  console.error(
    `\nFAIL: ${blocking.length} un-allowlisted high/critical advisory(ies) in ${TREE}/. Fix them, or add a justified ALLOWLIST entry in scripts/audit-gate.mjs.`,
  );
  process.exit(1);
}
if (blocking.length) {
  // REPORT-ONLY: named, counted, reachability-annotated — and deliberately not fatal. This mode
  // exists for one documented situation and the reason lives at the CI step that passes the flag,
  // never here: a general-purpose "do not fail" switch with no stated cause is how a gate dies.
  console.error(
    `\nREPORT-ONLY: ${blocking.length} un-allowlisted high/critical advisory(ies) in ${TREE}/. ` +
      `NOT failing the build — see the note at the CI step that invoked this.`,
  );
  process.exit(0);
}
console.log(
  `\nPASS [${TREE}]: no un-allowlisted high/critical advisories (moderate/low are advisory only).`,
);
