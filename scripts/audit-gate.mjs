// ============================================================
// File:        scripts/audit-gate.mjs
// Project:     RaceArena
// Description: Security-audit gate (HYGIENE-1). Runs `npm audit --json` in client/ and applies the
//              project audit policy:
//                • HIGH / CRITICAL  → FAIL the build, UNLESS the advisory is in the documented ALLOWLIST
//                                     below (each entry carries a justification + a remove-when condition).
//                • MODERATE / LOW   → advisory only; printed, never fails.
//              No dependencies (plain Node). Exit 1 on any un-allowlisted high/critical advisory.
// ============================================================

import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CLIENT = join(dirname(fileURLToPath(import.meta.url)), "..", "client");

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

const m = report.metadata?.vulnerabilities || {};
console.log(
  `audit-gate: totals — critical ${m.critical ?? 0}, high ${m.high ?? 0}, moderate ${m.moderate ?? 0}, low ${m.low ?? 0}`,
);
for (const a of advisory)
  console.log(`  advisory (${a.sev}): ${a.ghsa || a.url} — ${a.title}`);
for (const a of allowed)
  console.log(
    `  ALLOWLISTED (${a.sev}): ${a.ghsa} — ${a.title}\n    reason: ${ALLOWLIST[a.ghsa]}`,
  );
for (const b of blocking)
  console.error(`  BLOCKING (${b.sev}): ${b.ghsa || b.url} — ${b.title}`);

if (blocking.length) {
  console.error(
    `\nFAIL: ${blocking.length} un-allowlisted high/critical advisory(ies). Fix them, or add a justified ALLOWLIST entry in scripts/audit-gate.mjs.`,
  );
  process.exit(1);
}
console.log(
  "\nPASS: no un-allowlisted high/critical advisories (moderate/low are advisory only).",
);
