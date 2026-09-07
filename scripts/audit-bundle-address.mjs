// ============================================================
// File:        scripts/audit-bundle-address.mjs
// Project:     RaceArena — RUNTIME-API-URL-1
// Created:     2026-09-07
//
// THE REQUIREMENT, STATED AS A CHECK: the built package carries no deployment address.
//
// ★ WHAT IT OWNS: reading `client/dist` and failing if the bundle names a host that would tie the
// artefact to one installation. Run it after `npm run build`:
//     node scripts/audit-bundle-address.mjs [--dist=client/dist]
//
// ★ WHAT IT DELIBERATELY DOES NOT DO: build anything, and it is NOT a routed guard.
//
// It is named `audit-` rather than `check-` ON PURPOSE. `scripts/lib/routing.mjs:343` discovers
// every top-level `check-*.mjs` as a guard that must declare itself and be routed by `verify` — and
// this one must not be, because it judges `client/dist`, an artefact `verify` does not build.
// Routing it would redden `verify` on any tree without a fresh client build, which is a guard
// failing for a reason that is not a defect. It sits beside `audit-gate.mjs`, `audit-local.mjs` and
// `audit-sprite-crops.mjs`, which are run deliberately for the same kind of reason.
//
// ★ It FAILS on a missing build rather than skipping (Lesson 187): a check with nothing to look at
// is indistinguishable from one that cannot fail, so it must not pass quietly.
//
// The cost of not routing it, stated rather than left implicit: nothing runs this automatically, so
// a build with an address baked in would only be caught by somebody running it. Wiring it in means
// deciding whether `verify` should build the client — the owner's call, and it is in the report's
// "still needed" list.
//
// ── WHAT IS ALLOWED, AND WHY EACH ───────────────────────────────────────────────────────────────
//
//   · `http://localhost:4000` — the fallback the brief requires to stay: with nothing configured
//     the client must behave exactly as it does today. It is a loopback literal, not a deployment
//     address, and it ties the package to nothing.
//   · `fonts.googleapis.com` / `fonts.gstatic.com` — a font stylesheet linked from
//     `client/index.html`, PRE-DATING this piece. Not an install address and not something this
//     piece introduced or removed. It IS reported, because it is a real external dependency of the
//     package and an air-gapped install would get no fonts — see the report.
//
// Anything else that looks like a host is a FAILURE, because the only way one gets in is a
// build-time bake, which is the thing being removed.
// ============================================================

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
const DIST = join(ROOT, arg('dist', 'client/dist'));

/**
 * Hosts the package may carry, each with the reason it is not a deployment address.
 *
 * ★ EVERY ENTRY WAS READ IN CONTEXT BEFORE IT WAS ADDED, not guessed from the name. The three
 * library hosts are inside ERROR-MESSAGE STRINGS in vendored dependencies — a person only ever sees
 * them by hitting the error — and no code fetches them. Their contexts, verbatim from the bundle:
 *
 *   reactjs.org      `https://reactjs.org/docs/error-decoder.html?invariant=` + code
 *   reactrouter.com  `${e} must be used within a data router. See https://reactrouter.com/…`
 *   github.com       `…we recommend you load a polyfill such as https://github.com/ungap/…`
 *
 * They belong to React and React Router, this piece neither introduced nor can remove them, and
 * none of them is an address this install is reached at. Listing them is what keeps the check
 * honest: an allow-list with a reason per entry, so a NEW host fails and has to be judged.
 */
export const ALLOWED = [
  { host: 'localhost', why: 'the required fallback — today’s behaviour with nothing configured' },
  { host: '127.0.0.1', why: 'loopback, same reason as localhost' },
  { host: 'fonts.googleapis.com', why: 'font stylesheet linked from index.html, pre-dates this piece' },
  { host: 'fonts.gstatic.com', why: 'where that stylesheet loads its font files from' },
  { host: 'www.w3.org', why: 'XML namespace URI in inlined SVG — an identifier, never fetched' },
  { host: 'reactjs.org', why: 'React error-decoder link inside a vendored error string' },
  { host: 'reactrouter.com', why: 'React Router docs link inside a vendored error string' },
  { host: 'github.com', why: 'polyfill suggestion inside a vendored React Router error string' },
];

/** Every `scheme://host` occurrence in a text, as bare hostnames. */
export function hostsIn(text) {
  const out = new Map();
  for (const m of text.matchAll(/https?:\\?\/\\?\/([A-Za-z0-9._-]+)(:\d+)?/g)) {
    const host = m[1];
    out.set(host, (out.get(host) ?? 0) + 1);
  }
  return out;
}

function filesUnder(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...filesUnder(p));
    else if (/\.(js|css|html|map)$/.test(entry.name)) found.push(p);
  }
  return found;
}

const started = Date.now();
if (!existsSync(join(DIST, 'index.html'))) {
  console.error(
    `audit-bundle-address: FAIL — no build at ${DIST}. ` +
      'Run `npm run build` in client/ first. A check with nothing to look at does not pass.'
  );
  process.exit(1);
}

const allowed = new Set(ALLOWED.map((a) => a.host));
const offenders = new Map();
let scanned = 0;
for (const file of filesUnder(DIST)) {
  scanned++;
  for (const [host, count] of hostsIn(readFileSync(file, 'utf8'))) {
    if (allowed.has(host)) continue;
    const rel = file.slice(DIST.length + 1);
    offenders.set(host, [...(offenders.get(host) ?? []), `${rel} x${count}`]);
  }
}

if (offenders.size) {
  console.error(`audit-bundle-address: FAIL — the package names ${offenders.size} host(s) it must not:`);
  for (const [host, where] of offenders) console.error(`  ${host}  —  ${where.join(', ')}`);
  console.error(
    '\nA host in the bundle means the address was baked in at BUILD time, so this artefact can only\n' +
      'be installed where that host is. The address belongs at install time: `npm run configure`.'
  );
  process.exit(1);
}

console.log(
  `audit-bundle-address: ${scanned} file(s) in ${DIST.slice(ROOT.length + 1)} — no deployment address. ` +
    `(${Date.now() - started} ms)`
);
