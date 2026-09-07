# SELF-HOSTED-FONT-1 — the font ships with the package

**Branch** `feat/runtime-api-url-1` (continued, not a new branch) · **off** `dc1f252f` · **commit**
`e01109a4` · **2026-09-07** · **unmerged — his eye is owed on the whole branch at once.**

This closes **item 5** of [RUNTIME-API-URL-1](RUNTIME-API-URL-1.md)'s own *"what is still needed"*
list. That piece removed the address baked into the package; this removes the last runtime
dependency on somebody else's server.

---

## THE DEFECT, ESTABLISHED AT SOURCE

`client/index.html:16-18` preconnected to `fonts.googleapis.com` and linked `Inter` from it. Two
consequences, neither of them hypothetical:

- **A running instance could not draw its own text.** If that service is slow, blocked or down, the
  font is late or absent — on a machine the owner does not run and cannot fix.
- **Every visitor's browser called a third party before the game drew anything.**

---

## 1 · EVERY RUNTIME FETCH OF A THIRD-PARTY RESOURCE

Searched **every tracked file under `client/`** — `https?://`, protocol-relative `//host`, `@import`,
`url(`, and every fetch target — uncapped, all spellings, whole tree, CSS included. The complete
list, and what became of each:

| # | where | what | became |
|---|---|---|---|
| 1 | `client/index.html:16` | `<link rel="preconnect" href="https://fonts.googleapis.com">` | **REMOVED** |
| 2 | `client/index.html:17-20` | `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">` | **REMOVED** |
| 3 | `client/src/modules/racer-types/spriteLoader.js:34` | accepts an absolute `http(s)` sprite URL | **NAMED AND LEFT** |
| 4 | `client/package-lock.json` | `registry.npmjs.org`, `opencollective.com`, `github.com/sponsors` | **NAMED AND LEFT** — build-time resolution, never fetched at runtime |
| 5 | 14 `*.test.js` files | `http://test`, `example.com`, `example.invalid`, `cdn.example.com` | **NAMED AND LEFT** — fixtures behind `vi.mock`, never shipped |
| 6 | `client/src/services/api.js:61` | `https://host/` inside a comment | **NAMED AND LEFT** — prose, not a URL |
| 7 | inlined SVG | `www.w3.org` `xmlns` | **NAMED AND LEFT** — an XML namespace identifier, never fetched |
| 8 | vendored React / React Router | `reactjs.org`, `reactrouter.com`, `github.com` | **NAMED AND LEFT** — inside error-message strings; no code fetches them |

**There is no `@import` anywhere in `client/`, and before this piece no `url(` in any of the 19 CSS
files.** So entries 1–2 were the *only* runtime fetch of a third-party resource in the package.
Everything else on the list is either build-time, test-only, or an identifier that is never
dereferenced.

**On entry 3 — the one live outward-pointing code path.** `spriteLoader.js` will load a sprite from
an absolute URL if one is configured. That is **operator data, not a baked dependency**: it points
outward only if somebody types an outward-pointing URL into the racer editor. Removing it would take
away a capability rather than close a hole, so it is named and left.

---

## 2 · WHICH WEIGHTS SHIP, AND WHY

The old link asked for **400, 500, 600, 700**. Established from the stylesheets what is really
referenced, rather than trusting the link:

| weight | CSS sites | inline JSX sites | shipped? |
|---|---|---|---|
| 400 | 1 | 3 | **yes** |
| 500 | 14 | 2 | **yes** |
| 600 | 30 | 45 | **yes** |
| 700 | 20 (+13 × `bold`) | 31 | **yes** |
| 800 | 2 | 0 | **NO — deliberately** |

All four the link requested are genuinely used, so all four ship. **No italic ships**: nothing in the
client sets `font-style: italic` on this family, and the link never asked for one either.

### ★ THE 800 IS THE WHOLE FIDELITY ARGUMENT, AND IT DECIDED THE FILE FORMAT

Two sites ask for `font-weight: 800`:

- `WinnerCard.css:111` — on `'Segoe UI', system-ui, sans-serif`. **Inter never reaches it.**
- `CeremonyBrandCard.css:49` — `.ceremony-brand__title`, which sets no family and therefore
  **inherits `Inter` from `body`**.

So one shipped heading asks Inter for a weight the Google link has never supplied. With only four
faces available the browser selects the **700**, and that is what the owner has always seen.

**This is why the faces shipped are STATIC INSTANCES and not the variable font.** A variable Inter
carries a continuous 100–900 axis and would answer `font-weight: 800` with a *real* 800 — a heavier
ceremony title than has ever been on screen. That is precisely the visible change this piece was
told not to make. Verified structurally rather than assumed: the woff2 table directories were parsed
and carry **`glyf`/`loca` outlines and no `fvar`, `gvar`, `avar`, `HVAR` or `MVAR`**. (They do carry
`STAT`, which is *not* variability — it is the style's position in the family design space, normal
for an instance cut from a variable master. That distinction was checked, not guessed.)

### Subsets: latin, latin-ext, greek

`unicode-range` is kept per subset, exactly as the Google stylesheet had it, so a browser downloads a
subset **only when it actually paints a character from it** — the same network shape as before, minus
the third party.

Which subsets are needed was established from the repository's own text, not assumed. Every non-ASCII
character in shipped UI strings and data falls into:

- **latin** — `Ü ä ö ü § ° ± × ÷ ²³¹ ·`, plus the `U+2000-206F` punctuation (`– — ’ “ ” • …`).
- **greek** — `Δ Σ α θ μ π τ`, in the Dev Screen's statistics labels. **No other subset covers
  these**, so greek is load-bearing rather than decorative.
- Arrows, box-drawing, maths symbols and emoji (`← → ↻ ⇒ √ ≈ ≥ ─ █ ▶ ★ 🏁 🐌 …`) are **in no Inter
  subset at all** and already fell back to a system font before this piece. Unchanged.

**latin-ext ships although the repository contains no character from it.** Racer names and brand
titles are free text the operator types, and that is the one input this project cannot enumerate: a
name like `Łukasz` renders in Inter today and would have fallen back to `system-ui` had it been
dropped. It costs image bytes and, because of `unicode-range`, **zero runtime bytes** on a page that
never uses it.

**cyrillic and vietnamese are NOT shipped** — a genuinely different script with no sign of use here.
That saves 31,488 B and 20,288 B respectively. If either is ever wanted it is four files and one
`@font-face` block per subset.

### Format: woff2 only

The app is delivered as `<script type="module">`. Every browser that can run an ES module can decode
woff2 — the two landed in the same generation. A `.woff` or `.ttf` fallback chain would roughly
double these bytes **for browsers that could not start the app in the first place**.

---

## 3 · THE LICENCE

**SIL Open Font License, Version 1.1 (OFL-1.1)** — `Copyright 2016 The Inter Project Authors
(https://github.com/rsms/inter)`.

Its full text lives at **`client/public/fonts/LICENSE-Inter.txt`** (4,477 bytes), beside the font
files it covers. That location is deliberate rather than convenient: everything under
`client/public/` is copied verbatim into `client/dist/`, and `client/dist/` is copied whole into the
image — so **the licence travels with the font into the package**, which is what OFL 1.1 requires of
a redistributor. Confirmed present in the image and served by the running container (below). It
follows the precedent already set by `client/public/assets/racers/CREDITS.md`.

### Which Inter, exactly

**Inter 4.001 (`git-66647c0bb`)** — read out of each file's `name` table, not taken on trust.
Obtained from `@fontsource/inter@5.3.0`, whose metadata declares `"type": "google"` and
`"version": "v20"`: Fontsource repackages the Google Fonts API, so these are the same release the old
`<link>` was fetching. Family name `Inter`, so **nothing that references the family changed**.

`font-display: swap` matches the old link's `&display=swap`, so first paint behaves exactly as it
did — fallback text immediately, swapped when the face arrives. **This piece cannot be blamed for a
flash the owner notices.**

---

## 4 · THE ADDED BYTES

**The font files themselves** — 12 × woff2, `271,832 B`; licence `4,477 B`; **total `276,309 B`.**

| subset | 400 | 500 | 600 | 700 | subtotal |
|---|---|---|---|---|---|
| latin | 23,664 | 24,272 | 24,452 | 24,356 | **96,744** |
| latin-ext | 35,000 | 36,024 | 36,260 | 36,244 | **143,528** |
| greek | 7,776 | 7,920 | 7,944 | 7,920 | **31,560** |

**The built bundle, measured before and after:**

| | before | after | delta |
|---|---|---|---|
| `client/dist` total | **3,358,111 B** (39 files) | **3,637,524 B** (52 files) | **+279,413 B (+8.3%)** |
| `assets/*.js` | 912.12 kB | 912.12 kB | **unchanged** |
| `assets/*.css` | 55.52 kB | 58.83 kB | +3.3 kB — the 12 `@font-face` rules |
| `index.html` | 1.08 kB | 0.88 kB | −0.2 kB — the removed link and preconnect |
| `dist/fonts/` | — | 276,309 B | new |

**★ The runtime cost is not 276 KB, and reporting only the package figure would overstate it.**
`unicode-range` means a browser fetches only the subsets it paints and only the weights it uses. The
measured first paint of `/` pulled **6 files**: the four latin weights, one latin-ext and one greek —
and the last two only because the audit deliberately renders text that needs them. A plain Latin page
fetches the four latin faces, **96,744 B**, once, then caches them. Against the old behaviour it
trades roughly that much first-load transfer *from a third party* for the same transfer *from the app
itself*, and removes a DNS lookup, a TCP connection and a TLS handshake to an outside host.

---

## 5 · THE PROOF: IT WORKS WITH THE OUTSIDE WORLD SWITCHED OFF

`scripts/audit-offline-render.mjs` — **the requirement stated as a check.** Not "the link is gone",
which a grep could say and which would not survive somebody adding an `@import` to a stylesheet
nobody reads. It **builds the client**, serves the real `client/dist` to a real Chromium, **aborts
every request to a non-loopback host at the network layer**, and then asks the page whether it is
drawing in Inter.

**How it decides.** `document.fonts.check()` alone is not enough — it can be true for a face the page
never paints with. So the deciding assertion is a **width comparison**: identical text at identical
size, once as `'Inter', 'Courier New', monospace` and once as the control alone. If Inter loaded the
widths **differ**; if it failed, both fall back to the control and the widths are **identical** —
which is exactly what the old Google link produced whenever that service was unreachable.

```
audit-offline-render: origin http://127.0.0.1:60551, build client/dist
  external requests attempted : 0
  font files served by us     : 6
      /fonts/inter-latin-400-normal.woff2      /fonts/inter-latin-700-normal.woff2
      /fonts/inter-latin-600-normal.woff2      /fonts/inter-latin-500-normal.woff2
      /fonts/inter-latin-ext-400-normal.woff2  /fonts/inter-greek-400-normal.woff2
  body font-family            : Inter, system-ui, sans-serif
  ok  latin 400      inter= 520.375px  control=576.09375px
  ok  latin 500      inter=528.5625px  control=576.09375px
  ok  latin 600      inter= 536.625px  control=576.09375px
  ok  latin 700      inter=544.8125px  control=576.09375px
  ok  latin umlauts  inter=449.65625px  control=499.28125px
  ok  latin-ext      inter=402.65625px  control=499.28125px
  ok  greek          inter=383.96875px  control=499.28125px

audit-offline-render: PASS — every non-origin request aborted, 6 Inter face(s) served by the
app itself, all 7 probes painted in Inter.
```

**Exit 0.** Note the four latin weights measure **four different widths** — 520.375, 528.5625,
536.625, 544.8125 px. That is four *distinct faces* each really being applied, not one face reused
for all four requests, which is what a partially-shipped family would look like.

**★ The line is drawn at the HOST, not the origin, and that took a correction.** The first run
reported two "external" requests: `http://localhost:4000/api/auth/me` and `/api/auth/setup-needed`.
Those are **this install's own API** — a different origin only because it is a different port
(RUNTIME-API-URL-1 made its address configurable). An origin test calls that a third party and fails
for the one reason that is not a defect. What this piece is about is *somebody else's machine*, so
loopback continues and every remote host is aborted and recorded.

### ★ The sabotage — once, and it went red

Pointed the four latin `@font-face` rules back at `fonts.gstatic.com`, rebuilt, re-ran:

```
FAIL: audit-offline-render — the built app does not render on its own:
      - 4 request(s) to a host that is not the app's own origin:
        https://fonts.gstatic.com/s/inter/v20/inter-latin-400-normal.woff2   (+500, 600, 700)
      - document.fonts.check failed for latin 400 ("Hamburgefonstiv")
      - latin 400: text is NOT painted in Inter — width with Inter (576.09375px) equals the
        control fallback (576.09375px), which is what a font that failed to load looks like
      ... every one of the 7 probes, identically
```

**Exit 1.** Every probe collapsed onto the control width. The check is not inert. The sabotage was
reverted and the rebuild produced **byte-identical asset hashes** to the pre-sabotage build, which is
how the revert was confirmed rather than assumed.

A second, independent guard also goes red now — see §7.

---

## 6 · THE FONT FILES ARE IN THE IMAGE

Checked **inside the image, not in the build context**, because those are different claims and the
night of 2026-09-06 was caught by exactly that gap.

**No `Dockerfile` or `.dockerignore` change was needed, and that is worth stating rather than
leaving as luck.** The root `.dockerignore` is an allow-list and the Dockerfile COPYs per file — but
`client/dist` does not arrive that way. It comes through a **named build context**
(`COPY --from=client dist/ ./client-dist/`, `additional_contexts: { client: ./client }`), which is a
separate context the root `.dockerignore` does not filter. Anything Vite puts in `client/dist`
therefore enters the image whole. **The per-file trap that caught SHARED-CANONICAL-1 does not apply
to this path** — so this piece adds no new entry to either list, and `check-image-starts` passed
unchanged inside `verify`.

Inside the built image, all 13 files present at `/app/client-dist/fonts/`, and **no `googleapis` or
`gstatic` string anywhere under the served client**. Then the container was started and *asked*,
because "the file is in a layer" and "the server serves it" are not the same claim:

```
200  font/woff2                  23664 B  /fonts/inter-latin-400-normal.woff2   magic=wOF2
200  font/woff2                   7920 B  /fonts/inter-greek-700-normal.woff2   magic=wOF2
200  text/plain; charset=UTF-8    4477 B  /fonts/LICENSE-Inter.txt              magic=Copy
index.html mentions google: false
```

Correct MIME type, correct woff2 magic number, exact byte counts, and **the licence is reachable in
the shipped package**. The test image was deleted afterwards.

---

## 7 · A DEAD ALLOWANCE REMOVED

`scripts/audit-bundle-address.mjs` — built by RUNTIME-API-URL-1 — carried an explicit allow-list
entry:

> `fonts.googleapis.com` / `fonts.gstatic.com` — a font stylesheet linked from `client/index.html`,
> **PRE-DATING this piece**.

That allowance now has **no subject left**, so it is removed rather than left as a harmless-looking
line. Removing it is what makes that file **refuse** a re-added Google link instead of waving it
through. Confirmed in both directions: it passes on the current bundle *without* the allowance, and
patching a `gstatic` URL back into the built CSS produces

```
audit-bundle-address: FAIL — the package names 1 host(s) it must not:
  fonts.gstatic.com  —  assets\index-ucWHj0Wl.css x1
```

So the property is now defended by **two** independent checks: one that reads the built text, and one
that renders it in a browser.

---

## 8 · CHECKS

| check | result |
|---|---|
| client suite | **PASS** — 254 files, 4630 tests, 254.5 s |
| `npm run verify` (plain) | **PASS 23 · FAIL 0 · SKIP 10**, wall clock 400.4 s, exit 0 |
| golden races | **PASS** — 2 races, every finishing position and time as recorded |
| `check-image-starts` | **PASS** (96.0 s, inside `verify`) |
| `world-fingerprint` | **PASS** — the shipped world is unchanged |
| `audit-offline-render` | **PASS**, exit 0 · **red under sabotage**, exit 1 |
| `audit-bundle-address` | **PASS** without its font allowance · **red** on a re-added host |
| pre-commit hook | **GUARDS: PASS 9 FAIL 0** |

Golden races are reported separately because `verify`'s routing did not select them — nothing this
piece touched can reach the engine — and the brief asked for them by name.

### Fingerprints — verbatim

```
node scripts/engine-reach.mjs --check client/index.html client/src/main.jsx \
  client/src/styles/fonts.css client/public/fonts/ scripts/audit-offline-render.mjs

ENGINE REACH: none of 5 path(s) carry a change that can reach the race engine.
  5 outside the hull (cannot reach the engine at all): client/index.html, client/src/main.jsx,
  client/src/styles/fonts.css, client/public/fonts/, scripts/audit-offline-render.mjs
```

**Nothing moved.** A font is not a race — and structurally it cannot be one here: every `ctx.font` in
the drawing layer is `sans-serif`, `serif` or `monospace`. **The canvas never names `Inter`**, so the
race cannot see this change at all.

### The build badge

Read out of the served bundle rather than off a screen — `assets/index-TKA5mQBL.js`:

```js
{ commit: `e01109a4`, branch: `feat/runtime-api-url-1`, dirty: !1, reason: null }
```

**`e01109a4`, clean, no `+dirty`.**

### The ports, as left

**Untouched.** 4000, 4173 and 5173 are exactly as they were; nothing was started on them and nothing
was reassigned. `audit-offline-render` binds an **ephemeral** port chosen by the OS and closes it;
the image check used 45999 and stopped its container.

---

## SOURCE HYGIENE

| file | before | after | what changed |
|---|---|---|---|
| `client/index.html` | 26 | 21 | the preconnect and the stylesheet link removed — nothing points at Google |
| `client/src/main.jsx` | 29 | 30 | imports `./styles/fonts.css` before `./styles/main.css` |
| `client/src/styles/fonts.css` | — | 176 | **new** — 12 `@font-face` rules and the reasoning |
| `client/public/fonts/` | — | 13 files | **new** — 12 woff2 + the OFL text |
| `scripts/audit-offline-render.mjs` | — | 302 | **new** — the blocked-network proof |
| `scripts/audit-bundle-address.mjs` | 134 | 135 | the dead font-host allowance removed |

**Removed:** the `preconnect` and the stylesheet `<link>` (both dead the moment the faces were
self-hosted), and the two-entry font allowance in `audit-bundle-address.mjs`. **Nothing dead is left
behind within what this piece touched.**

**★ Named as a correction, because it nearly went the wrong way.** The audit was first written as
`scripts/check-offline-render.mjs`. `routing.mjs:343` discovers every top-level `check-*.mjs` as a
guard, so that name would have put a Chromium **and a client build** inside `npm run verify` — and
RUNTIME-API-URL-1 explicitly reserved *"whether `verify` should build the client"* for the owner
(item 7 of its own list). It was renamed to `audit-` to match the convention that piece established
beside `audit-bundle-address.mjs`. **This piece does not answer a question the previous one left
open.**

**Noticed and deliberately left:**

- **`client/public/index.html` is dead.** A second HTML shell, shadowed by the Vite root
  `client/index.html`; it never reaches `dist/`. Pre-existing and unrelated to fonts, so it is named
  rather than deleted.
- `spriteLoader.js`'s absolute-URL support — entry 3 above. Operator data, not a dependency.
- The `>500 kB chunk` build warning — pre-existing, and not this piece's business.

**No scratch files entered the repository.** The font package was unpacked in a scratch directory
outside the tree; the test image was deleted; the sabotage was reverted and confirmed byte-identical.
**`git stash` was not used on this tree.**

---

## WHAT THIS DOES NOT DO

- It does **not** change any other styling, size, weight or spacing.
- It does **not** add a font loader, a preload strategy, or a fallback stack beyond what existed.
- It does **not** touch the engine, the camera, the store, or anything that draws the race.
- It does **not** wire the browser audit into CI. CI names each guard as its own step and installs no
  Playwright browsers — the same reason the e2e suite is night work and `check-image-starts` is
  unwired. Wiring it means paying for a browser in CI, which is the owner's call.

## ★ HIS EYE IS OWED

A race on his machine, and **that the text looks as it did**. The one thing that could have changed
visibly is the ceremony brand title, and the static-instance decision in §2 is what protects it — but
that is an argument, and the screen is the judge.
