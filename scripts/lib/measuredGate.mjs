// ============================================================
// File:        scripts/lib/measuredGate.mjs
// Project:     RaceArena — GATE-MEASURES-1 (fix/viewer-invariants-gate, 2026-10-12)
//
// WHAT THIS OWNS: the two things a gate needs before its PASS means anything. (a) is for the
// browser gate (`viewer-invariants.mjs`); (b) is shared by every gate that can run having measured
// nothing — `viewer-invariants.mjs`, `check-runin-frame.mjs` and `check-ending-frame.mjs`.
//
// ★ IN THE RACE HULL, because `check-ending-frame.mjs` drives a race and a driver's imports count
// (`engine-reach.mjs`). It changes no race; a change here runs the fingerprints all the same.
//
//   (a) `enterWithTestAidsOn` — open a route of the app only once the test-aids switch has been
//       ANSWERED ON in that very document. Every console-only probe (`viewerProbe.js`,
//       `rAFProbe.js`, …) starts a run only while `testAidsOn()` is true, and the client holds that
//       value in module state that starts at `unknown` and is set when `/api/settings/test-aids`
//       answers (`client/src/modules/testAids.js`, OFF until answered by design). A page that
//       loads a probe route DIRECTLY mounts the screen before that answer arrives, the probe stays
//       off, and nothing is recorded.
//   (b) `unmeasured` / `refuseUnmeasured` — count what a run actually measured against the minimum
//       the gate's own logic needs to judge anything, and say so in plain words when it falls
//       short, so the caller FAILS instead of printing PASS.
//
// ── WHY IT EXISTS ─────────────────────────────────────────────────────────────────────────────
//
// On 2026-10-12, re-measuring A2-50, `node scripts/viewer-invariants.mjs --gate` printed
// `0 frames clean` for both races, "no in-window frames were recorded", both acceptance-sheet rows
// NOT SCORABLE — and "Every frame of every race swept satisfied every invariant. PASS", exit 0.
// The harness opened `/race` directly, so (a) never happened; and nothing counted, so (b) never
// happened. A gate that measured nothing must never say PASS: that is the silent-zero class
// `trackScope.mjs` refuses at the argument level, here refused at the measurement level.
//
// ── WHY "WAIT", NOT "SET THE STATE" ────────────────────────────────────────────────────────────
//
// The client exposes no way to set the switch from outside (its `_setTestAidsForTests` seam is a
// unit-test import, not a window hook), and adding one would put a test door into the shipped
// bundle. The SERVER value is already set ON through the real endpoint by the caller (the same
// `PUT /api/settings/test-aids` `client/e2e/testAids.setup.js` uses). What was missing is only the
// ORDER: the answer must have reached the page before the screen mounts. So this loads `/`, waits
// for the answer AND for the app's own visible sign that it applied it — the Quick Test button,
// item 9 of reports/release/DEV-DISPLAYS-1.md, rendered only while `testAidsOn()` is true, the very
// signal the e2e specs act on — and then enters the route by client-side navigation inside the
// SAME document, so the module state survives (the probe's own sessionStorage flag is designed for
// exactly this SPA navigation; see `viewerProbe.js`'s header).
// ============================================================

/** The endpoint the client asks for the switch (`client/src/services/settingsApi.js`). */
export const TEST_AIDS_PATH = "/api/settings/test-aids";

/**
 * Open `${base}/`, wait until the test-aids switch has been answered ON and applied in that page,
 * then navigate to `route` inside the same document.
 *
 * Throws, naming what was seen, when the answer is anything but `{ enabled: true }` — a run that
 * went on would record nothing.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ base: string, route: string, timeoutMs?: number }} opts
 */
export async function enterWithTestAidsOn(page, { base, route, timeoutMs = 30_000 }) {
  // Registered BEFORE the navigation: the request starts during it.
  const answered = page.waitForResponse(
    (r) => new URL(r.url()).pathname === TEST_AIDS_PATH && r.request().method() === "GET",
    { timeout: timeoutMs }
  );
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  const res = await answered;
  const body = await res.json().catch(() => null);
  if (!res.ok() || body?.enabled !== true) {
    throw new Error(
      `the test-aids switch answered ${res.status()} ${JSON.stringify(body)} — not ON. Every ` +
        `console-only probe stays off without it, so this run would record nothing.`
    );
  }
  // The response reaching the network layer is not the client having APPLIED it. The Quick Test
  // button renders only while `testAidsOn()` is true in this document.
  await page
    .getByRole("button", { name: /Quick Test/ })
    .first()
    .waitFor({ state: "attached", timeout: timeoutMs })
    .catch(() => {
      throw new Error(
        `the server answered the test-aids switch ON, but the page never showed it applied ` +
          `(no Quick Test button on ${page.url()} within ${timeoutMs} ms).`
      );
    });
  // Client-side navigation: React Router follows popstate, the document and its module state stay.
  await page.evaluate((to) => {
    window.history.pushState(null, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, route);
  await page.waitForURL((u) => u.pathname === route, { timeout: timeoutMs });
}

/**
 * What each case is short of. A case is `{ label, have: {name: count}, need: {name: minimum} }`;
 * every `need` key missing from `have` counts as 0. Returns one plain sentence per shortfall —
 * empty when every case measured enough.
 *
 * @param {{label: string, have: Record<string, number>, need: Record<string, number>}[]} cases
 * @param {Record<string, string>} [why]  per count name, why the gate needs that minimum
 * @returns {string[]}
 */
export function unmeasured(cases, why = {}) {
  const out = [];
  if (!cases.length) out.push("no case ran at all");
  for (const c of cases)
    for (const [k, min] of Object.entries(c.need)) {
      const n = Number(c.have?.[k] ?? 0);
      if (!(n >= min))
        out.push(`${c.label}: ${n} ${k}, needs at least ${min}${why[k] ? ` — ${why[k]}` : ""}`);
    }
  return out;
}

/**
 * Print the shortfalls as a refusal and report whether there were any. The caller exits non-zero
 * on `true`; this never exits itself, so a caller can still print what it did measure first.
 *
 * @param {string} tool
 * @param {string[]} shortfalls  from `unmeasured`
 * @returns {boolean} true when the run must FAIL
 */
export function refuseUnmeasured(tool, shortfalls) {
  if (!shortfalls.length) return false;
  console.log(`\n${tool}: NOT MEASURED — this run cannot pass, because it did not measure enough to judge:`);
  for (const s of shortfalls) console.log(`  ${s}`);
  console.log(
    "A gate that measured nothing must not report PASS; that is how a silent zero is read as a clean result."
  );
  return true;
}
