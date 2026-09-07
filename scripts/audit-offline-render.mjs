// ============================================================
// File:        scripts/audit-offline-render.mjs
// Project:     RaceArena — SELF-HOSTED-FONT-1
//
// THE PACKAGE MUST FETCH NOTHING FROM ANYBODY ELSE'S SERVER. `client/index.html` used to
// <link> the 'Inter' family from fonts.googleapis.com, so every visitor's browser called a
// machine the owner does not run, before the game drew anything — and the text was late or
// absent if that service was slow, blocked or down.
//
// ── WHY THIS CHECK IS A BROWSER AND NOT A GREP ──────────────────────────────────────────────────
//
// "The <link> is gone" is not the requirement. The requirement is "it works with the outside
// world switched off", and a grep for `googleapis` does not survive somebody adding an @import
// to a stylesheet, a webfont in a CSS file nobody reads, or a `url()` inside a bundled
// dependency. This file cannot be fooled by any of those, because it serves the real build to a
// real browser with every remote request ABORTED at the network layer, and then asks the page
// whether it is drawing in Inter.
//
// A grep also cannot answer the half that actually matters to the owner: with Google
// unreachable, does the app still LOOK the way it looks today? That is a rendering question.
//
// ── HOW IT PROVES THE FONT IS REALLY THERE ──────────────────────────────────────────────────────
//
// `document.fonts.check()` alone is not enough — it can be true for a face the page never
// paints with. So the decisive assertion is a WIDTH COMPARISON: two spans with identical text
// and size, one asking for `'Inter', <control>` and one asking for `<control>` alone, where the
// control is a font that looks nothing like Inter. If Inter loaded, the widths DIFFER. If Inter
// failed to load, BOTH fall back to the control and the widths are IDENTICAL — which is exactly
// the state the old Google <link> produced whenever that service was unreachable.
//
// Each of the three shipped SUBSETS is proved with text only that subset covers: Latin letters,
// a latin-ext letter, and Greek letters (the Dev Screen's statistics labels use Greek, so that
// subset is load-bearing rather than decorative).
//
// ── WHERE IT RUNS, AND WHERE IT DELIBERATELY DOES NOT ───────────────────────────────────────────
//
// It is named `audit-` rather than `check-` ON PURPOSE, and the name is the whole decision.
// `scripts/lib/routing.mjs:343` discovers every top-level `check-*.mjs` as a guard that `verify`
// must route. This one MUST NOT be routed, for the reason `audit-bundle-address.mjs` states beside
// it: it judges `client/dist`, an artefact `verify` does not build. Routing it would mean `verify`
// builds the client — and RUNTIME-API-URL-1 put exactly that question on the owner's list (item 7)
// rather than answering it. This piece does not answer it either.
//
// It sits beside `audit-bundle-address.mjs`, `audit-gate.mjs`, `audit-local.mjs` and
// `audit-sprite-crops.mjs`, which are run deliberately for the same kind of reason.
//
// THE COST OF NOT ROUTING IT, stated rather than left implicit: nothing runs this automatically. A
// re-added Google <link> would be caught by `audit-bundle-address.mjs` — whose allowance for the
// two font hosts this piece REMOVED, so that file now refuses them — but only when somebody runs
// that either. Neither is a CI step: `.github/workflows/ci.yml` names each guard explicitly and
// installs no Playwright browsers.
//
// ★ IT BUILDS BEFORE IT LOOKS, which `audit-bundle-address.mjs` deliberately does not. The
// difference is that this one is about RENDERING rather than about text in a file: it has to serve
// the app to a browser regardless, so the build is not an extra dependency it could have avoided,
// and a stale `client/dist` would let it pass on source that no longer exists. `--no-build` is
// there for the case where the build is the thing under inspection.
//
// LOUD-FAILURE RULE (Lesson 187, proof-of-live): a failed build, a missing browser, or a page that
// yields ZERO font-file responses FAILS rather than passing. A check that passes because it did
// nothing is indistinguishable from a no-op, and this one's whole job is to notice an absence.
//
// Usage:
//   node scripts/audit-offline-render.mjs
//   node scripts/audit-offline-render.mjs --no-build   (judge the existing client/dist as it is)
// ============================================================

import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "client", "dist");

// ── WHAT IT IS BLIND TO, named so the coverage is not overread ──────────────────────────────────
//
//   · Anything not reachable from the first paint of `/`. A font referenced only by a screen this
//     audit never navigates to would not be noticed.
//   · WHICH Inter. It proves the family is drawing, not that these faces match the ones Google
//     served — that claim rests on the version recorded in `client/src/styles/fonts.css`.
//   · The cyrillic and vietnamese subsets, which this project deliberately does not ship.
//   · Anything this install legitimately serves from loopback. The line is drawn at the HOST, so
//     the API on another port is allowed through and never inspected; a misconfigured apiBaseUrl
//     pointing at a REMOTE host would be reported here as an external fetch rather than as the
//     configuration fault it actually is.
//   · A build that differs from the one an operator ships. It builds with this tree's own config.

const __t0 = Date.now();
process.on("exit", () => {
  const ms = Date.now() - __t0;
  process.stderr.write(`[ra-elapsed-ms ${ms}] (${(ms / 1000).toFixed(1)}s)\n`);
});

const fail = (msg) => {
  console.error(`\nFAIL: audit-offline-render — ${msg}`);
  process.exit(1);
};

// ── ★ IT BUILDS, RATHER THAN TRUSTING WHATEVER `client/dist` HAPPENS TO HOLD ─────────────────────
//
// A stale build is the one way this check could pass while being wrong: somebody re-adds a Google
// <link> to `client/index.html`, the guard serves yesterday's dist, sees no external request and
// says PASS. The property is about the CURRENT source, so the build is part of the measurement —
// the same reason `verify` measures the working tree rather than the last commit. It costs about a
// second.
//
// SPAWN HYGIENE: stdio captured, an explicit timeout, and the OUTPUT is checked — a build that
// fails silently must not read as a build that succeeded.
if (!process.argv.includes("--no-build")) {
  const built = spawnSync("npm", ["run", "build"], {
    cwd: join(ROOT, "client"),
    encoding: "utf8",
    timeout: 300_000,
    shell: process.platform === "win32",
  });
  if (built.error) fail(`could not run the client build: ${built.error.message}`);
  if (built.status !== 0)
    fail(`the client build failed (exit ${built.status}):\n${built.stderr || built.stdout}`);
}

if (!existsSync(join(DIST, "index.html")))
  fail("no build at client/dist, and the build produced none.");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

// ── The app's own origin: a plain static server over the real build, and nothing else. ───────────
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join(DIST, path === "/" ? "index.html" : path.replace(/^\/+/, ""));
  if (!file.startsWith(DIST)) return res.writeHead(403).end();
  // SPA: an unknown path is the shell, exactly as the real server serves it.
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(DIST, "index.html");
  res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
});

const listen = () =>
  new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });

let chromium;
try {
  chromium = createRequire(join(ROOT, "client", "package.json"))("playwright").chromium;
} catch (e) {
  fail(`no Playwright in client/node_modules (${e.message}). This check needs a Chromium.`);
}

const port = await listen();
const ORIGIN = `http://127.0.0.1:${port}`;

let browser;
try {
  browser = await chromium.launch({ headless: true });
} catch (e) {
  server.close();
  fail(`could not launch Chromium: ${e.message}`);
}

const external = []; // every request aimed at a host that is not ours
const fontResponses = []; // the font files our own origin actually served

try {
  const page = await browser.newPage();

  // ── THE OUTSIDE WORLD, SWITCHED OFF. ──────────────────────────────────────────────────────────
  //
  // ★ THE LINE IS DRAWN AT THE HOST, NOT AT THE ORIGIN, and getting that wrong is easy. This
  // install's API is a DIFFERENT ORIGIN from the app — a different port on the same machine
  // (RUNTIME-API-URL-1 made its address configurable), so an origin test reports `/api/auth/me`
  // as a third party and the check fails for the one reason that is not a defect. What this
  // piece is about is somebody ELSE'S MACHINE. So loopback continues — and reaches whatever is
  // or is not listening, exactly as it would with the API stopped — and every remote host is
  // aborted and recorded as a violation.
  const OWN_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0"]);
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith("data:") || url.startsWith("blob:")) return route.continue();
    let host = "";
    try {
      host = new URL(url).hostname;
    } catch {
      /* an unparseable URL is not ours */
    }
    if (OWN_HOSTS.has(host)) return route.continue();
    external.push(url);
    return route.abort();
  });

  page.on("response", (r) => {
    if (r.url().startsWith(ORIGIN) && r.url().endsWith(".woff2"))
      fontResponses.push(r.url().slice(ORIGIN.length));
  });

  await page.goto(ORIGIN, { waitUntil: "load", timeout: 30_000 });

  // ── THE ASSERTIONS, run in the page. ──────────────────────────────────────────────────────────
  const probes = [
    { name: "latin 400", weight: 400, text: "Hamburgefonstiv" },
    { name: "latin 500", weight: 500, text: "Hamburgefonstiv" },
    { name: "latin 600", weight: 600, text: "Hamburgefonstiv" },
    { name: "latin 700", weight: 700, text: "Hamburgefonstiv" },
    { name: "latin umlauts", weight: 400, text: "Grun Ol Ubung" },
    { name: "latin-ext", weight: 400, text: "Łukasz Křižík" },
    { name: "greek", weight: 400, text: "Δ Σ α θ μ π τ" },
  ];

  const result = await page.evaluate(async (probes) => {
    const CONTROL = "'Courier New', monospace";
    const measure = (family, weight, text) => {
      const s = document.createElement("span");
      s.style.cssText =
        "position:absolute;left:-9999px;top:0;white-space:pre;font-size:64px;" +
        `font-family:${family};font-weight:${weight}`;
      s.textContent = text;
      document.body.appendChild(s);
      const w = s.getBoundingClientRect().width;
      s.remove();
      return w;
    };
    const out = [];
    for (const p of probes) {
      try {
        await document.fonts.load(`${p.weight} 64px Inter`, p.text);
      } catch {
        /* the width comparison below is what decides */
      }
      out.push({
        name: p.name,
        text: p.text,
        checked: document.fonts.check(`${p.weight} 64px Inter`, p.text),
        withInter: measure(`'Inter', ${CONTROL}`, p.weight, p.text),
        controlOnly: measure(CONTROL, p.weight, p.text),
      });
    }
    await document.fonts.ready;
    return { probes: out, bodyFamily: getComputedStyle(document.body).fontFamily };
  }, probes);

  // ── VERDICT ───────────────────────────────────────────────────────────────────────────────────
  const problems = [];

  if (external.length)
    problems.push(
      `${external.length} request(s) to a host that is not the app's own origin:\n` +
        [...new Set(external)].map((u) => `        ${u}`).join("\n")
    );

  if (!fontResponses.length)
    problems.push(
      "the page fetched ZERO font files from its own origin — nothing was proved (proof-of-live)"
    );

  if (!/Inter/.test(result.bodyFamily))
    problems.push(`body font-family does not name Inter: ${result.bodyFamily}`);

  for (const p of result.probes) {
    if (!p.checked) problems.push(`document.fonts.check failed for ${p.name} ("${p.text}")`);
    if (p.withInter === p.controlOnly)
      problems.push(
        `${p.name}: text is NOT painted in Inter — width with Inter (${p.withInter}px) equals ` +
          `the control fallback (${p.controlOnly}px), which is what a font that failed to load looks like`
      );
  }

  console.log(`audit-offline-render: origin ${ORIGIN}, build client/dist`);
  console.log(`  external requests attempted : ${external.length}`);
  console.log(`  font files served by us     : ${fontResponses.length}`);
  for (const f of fontResponses) console.log(`      ${f}`);
  console.log(`  body font-family            : ${result.bodyFamily}`);
  for (const p of result.probes)
    console.log(
      `  ${p.checked ? "ok" : "NO"}  ${p.name.padEnd(14)} ` +
        `inter=${String(p.withInter).padStart(8)}px  control=${String(p.controlOnly).padStart(8)}px  ` +
        `${p.withInter === p.controlOnly ? "<-- IDENTICAL" : ""}`
    );

  if (problems.length)
    fail("the built app does not render on its own:\n      - " + problems.join("\n      - "));

  console.log(
    `\naudit-offline-render: PASS — every non-origin request aborted, ` +
      `${fontResponses.length} Inter face(s) served by the app itself, ` +
      `all ${result.probes.length} probes painted in Inter.`
  );
} finally {
  await browser?.close();
  server.close();
}
