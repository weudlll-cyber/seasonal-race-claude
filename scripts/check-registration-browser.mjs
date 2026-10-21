// ============================================================
// File:        scripts/check-registration-browser.mjs
// Project:     RaceArena — REGISTRATION-1 (the owner's decision of 2026-10-21)
//
// THE THREE REGISTRATION BROWSER SPECS, RUN ONLY WHEN SOMETHING RELEVANT TO REGISTRATION CHANGED.
//
//   e2e/join-page.spec.js            the public join page on a phone, signed out
//   e2e/registration-director.spec.js  the director's panel: open, share, watch, close, use, delete
//   e2e/registration-list.spec.js    coming back after a reload; the numbered list at 390 px
//
// They are not in the Browser gate's curated quick set (`test:e2e:prod:fast`), which stays as it is.
// The owner decided on 2026-10-21 that they run on their own, and only when the change could reach
// what they check.
//
// ── ONE DECLARATION, TWO READERS ────────────────────────────────────────────────────────────────
// `GUARD` below is the ONE statement of what selects these specs, in the shape every `verify` guard
// declares itself (scripts/lib/routing.mjs). Both places that decide read it:
//   · `npm run verify` / `--premerge` discovers this file like any other `check-*.mjs` guard and
//     selects it by the diff — the existing selection, not a second one;
//   · the Browser gate workflow asks `--selects`, which resolves the same declaration with the same
//     resolver (`resolveGuard`) against the push's changed paths, computed by the push-range diff CI
//     already uses (`changedFiles` in scripts/ci-docs-only.mjs).
// So the path list cannot differ between the two.
//
// Like every guard it ALSO depends on its own import closure (routing's SELF rule): a change to
// this file or to the routing code it imports selects it too.
//
// Usage:
//   node scripts/check-registration-browser.mjs              run the three specs (needs client/dist)
//   node scripts/check-registration-browser.mjs --declare    print the declaration (verify reads this)
//   node scripts/check-registration-browser.mjs --selects    true/false for BASE_SHA..HEAD_SHA
//   node scripts/check-registration-browser.mjs --selects a b c   true/false for the given paths
// ============================================================

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const GUARD = {
  id: "check-registration-browser",
  covers:
    "player registration in a real browser on the production build: the public join page on a phone, the director's panel, and coming back after a reload",
  blind: [
    "every other screen — the Browser gate's curated quick set covers those, this guard does not",
    "a registration change outside the declared paths below: the declaration is a list, and a new registration file must be added to it",
    "the race itself — none of the three specs runs a race to its end",
  ],
  dirs: [
    "client/src/screens/Join/",
    "client/src/modules/registration/",
    "server/src/registrations/",
  ],
  files: [
    "client/src/screens/SetupScreen/RegistrationPanel.jsx",
    "client/src/screens/SetupScreen/RegistrationPanel.module.css",
    "client/src/screens/SetupScreen/RegistrationPanel.test.jsx",
    "client/src/screens/SetupScreen/SetupScreen.jsx",
    "client/src/services/registrationApi.js",
    "server/src/routes/registrations.js",
    "server/src/routes/registrations.test.js",
    "server/src/routes/registrationsSecurity.integration.test.js",
    "server/src/routes/join.js",
    "server/src/routes/joinSecurity.integration.test.js",
    "server/src/routes/integrations.js",
    "server/src/auth/guards.js",
    "server/src/auth/rateLimit.js",
    "server/src/app.js",
    "scripts/backup.mjs",
    "client/e2e/join-page.spec.js",
    "client/e2e/registration-director.spec.js",
    "client/e2e/registration-list.spec.js",
    // The Playwright configuration they run under, and the two modules it imports.
    "client/playwright.prod.config.js",
    "client/e2e/prod-ports.js",
    "client/e2e/e2e-env.js",
  ],
  notDirs: [],
  reach: [],
};

if (process.argv.includes("--declare")) {
  console.log(JSON.stringify(GUARD));
  process.exit(0);
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SELF = "scripts/check-registration-browser.mjs";
/** The three spec files, named once — the run below and the workflow both go through this file. */
const SPECS = GUARD.files.filter((f) => f.startsWith("client/e2e/") && f.endsWith(".spec.js"));

if (process.argv.includes("--selects")) {
  // Loaded only here: running the specs needs none of the routing code.
  const { resolveGuard } = await import("./lib/routing.mjs");
  const { changedFiles } = await import("./ci-docs-only.mjs");
  const given = process.argv.slice(process.argv.indexOf("--selects") + 1);
  let files = given;
  if (!given.length) {
    const got = changedFiles(process.env.BASE_SHA, process.env.HEAD_SHA);
    if (!got.computed) {
      // FAIL OPEN, as the docs-only decision does: when the range cannot be computed, run them.
      console.error(`check-registration-browser: SELECTED — ${got.why}; running rather than guessing`);
      console.log("true");
      process.exit(0);
    }
    files = got.files;
  }
  const g = resolveGuard({ ...GUARD, source: SELF });
  const hits = files.filter((f) => g.matches(f));
  console.error(
    `check-registration-browser: ${hits.length ? "SELECTED" : "not selected"} — ${hits.length} of ${files.length} changed path(s) reach registration${hits.length ? `: ${hits.slice(0, 8).join(", ")}` : ""}`
  );
  console.log(hits.length ? "true" : "false");
  process.exit(0);
}

// ── run the three specs on the production arm ─────────────────────────────────────────────────────
if (!existsSync(join(ROOT, "client", "dist", "index.html"))) {
  console.error(
    "check-registration-browser: there is no built client at client/dist — build it first (verify pulls in check-client-build for this)."
  );
  process.exit(1);
}
const res = spawnSync(
  "npx",
  [
    "playwright",
    "test",
    "--config=playwright.prod.config.js",
    ...SPECS.map((f) => f.replace(/^client\//, "")),
  ],
  { cwd: join(ROOT, "client"), stdio: "inherit", shell: process.platform === "win32" }
);
process.exit(res.status ?? 1);
