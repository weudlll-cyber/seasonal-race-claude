# AUDIT-DEAD-1 — knip says 41 dead things; after verification the number is ZERO, and one lint warning was mine

**Measured 2026-09-04 on master `99282bd4`.** Piece 4 of THE FULL AUDIT.

> **VERDICT ON THIS AXIS: CLEAN. Nothing was removed, because after verification nothing was
> provably dead.**
>
> **A real tool was used: `knip` — which this repository already has a config for.** It reported
> **2 unused files, 39 unused exports, 1 unused devDependency**. Verified against the whole tree:
> **0 of 41 are dead.** Every one is reached by something knip's scope cannot see.
>
> **ESLint: 8 warnings, 0 errors, over the whole client.** Five are in tests, two are in
> `CameraDirector.js` and are **reported not touched**, and **one was mine, added yesterday** — fixed.
>
> ★ **This confirms `DEAD-CODE-VERIFIED-1`'s central finding rather than repeating it: "no importer"
> is not "dead".** That report measured 87 candidates down to 8; this one measures 41 down to 0.

---

## 1. THE TOOL, AND WHAT IT CANNOT SEE

**`client/knip.config.js` exists.** ★ **The tool it configures is not a dependency and is not
installed** — `knip` appears in no `package.json` and in no `node_modules/.bin`. It was run here via
`npx --yes knip@5`, which touches nothing in the repository. **That is a finding in itself**: a
config for a tool nobody has, which has been sitting there working correctly for whoever thinks to
run it. *(Its five declared "intentional stub" components — Button, Modal, InputField, ColorPicker,
LogoUploader — were re-checked: **all five are still imported by zero files**, so the declaration is
still true.)*

**Knip's blind spots, every one of which fired here:**

| it cannot see | what that hid |
| --- | --- |
| **it was run with `cwd=client`** | every import from `scripts/` into `client/src` — **9 exports** |
| Playwright's `projects` graph | `e2e/auth.setup.js`, which `playwright.config.js` names |
| a `window.` global | `readViewerProbe`, which the browser sweep reads as `window.__viewerProbe` |
| a hook invoking a binary | `lint-staged`, run by the pre-commit hook |
| a hand-run instrument | `sweep-bufferPct-driver.mjs`, named in `ARCHITECTURE.md` and four reports |

**An AST pass was also written** (acorn, the repo's own devDependency) and **is reported as a
failure**: `acorn-jsx` is not installed, so **134 of 822 files would not parse** — every `.jsx` in the
tree. It was abandoned in favour of knip rather than patched, and the number is given so the
abandonment is visible.

---

## 2. THE 41, CLASSIFIED

### 2 unused FILES → **0 dead**

| | verdict |
| --- | --- |
| `client/e2e/auth.setup.js` | **ALIVE** — named by `playwright.config.js`, `e2e-env.js`, `authApi.js`, `AUTH.md`, `README.md` |
| `client/scripts/sweep-bufferPct-driver.mjs` | **ALIVE** — a hand-run instrument named in `ARCHITECTURE.md` and four reports. "No importer" is how an instrument is *supposed* to look |

### 39 unused EXPORTS → **0 dead**

Every one traced across the whole tree, not just `client/`:

| class | count | example |
| --- | ---: | --- |
| **LIVE via `scripts/`** — knip's scope stopped at `client/` | **9** | `runRaceHeadless`, `makeRaceIdentity`, `hashOutcome`, `BOARD_FADE_MS`, `RACER_COLORS` |
| **LIVE via a `window` global** | **1** | `readViewerProbe` → `window.__viewerProbe`, read by the browser sweep |
| **LIVE in product code** | **1** | `FIXED_DT` — 36 files |
| **TEST-ONLY importer** — a real reader | **3** | `readBuildInfo`, `gitIdentityPaths`, `CROWN_WIDTH_PX` |
| **used INSIDE ITS OWN FILE** — the `export` is unnecessary, the code is not | **18** | the six `pruneStored*Config`, `castHeroes`, `T_PRECISION`, `hexToRgba`, `drawFinishGate` |
| **NOTHING REFERENCES IT** | **0** | — |
| *(6 `default` exports duplicated with a named one — a style, not death)* | 6 | |

★ **The eighteen "exported but only used at home" are the only real residue, and they are not dead
code.** Deleting the `export` keyword would be safe; it would also touch twelve files, **two of them
inside the engine-reach hull**, for zero behavioural gain. **Reported, not done** — an audit is not
the place to move the public surface of hull modules.

### 1 unused devDependency → **0 dead**

`lint-staged` is invoked by the pre-commit hook, which knip does not read. **ALIVE**, and the hook is
itself guarded by `check-hooks-installed`.

---

## 3. THE OTHER DEAD-WEIGHT CLASSES

| class | measured | verdict |
| --- | --- | --- |
| **config keys nothing consumes** | `check-config-keys` — **0 unconsumed**, 4 "unresolved" that the guard names and explains, Rule E 5 ranges 0 disagree | **clean** |
| **assets nothing loads** | every one of the **31 racer sheets** is referenced from `client/src` or `scripts`; both favicons are referenced from `index.html` | **clean** |
| **reports nothing links** | `check-index` — **540 reports, 0 unindexed, 540 links, 0 dangling** | **clean** |
| **scripts nothing invokes** | **14 of 197** are named nowhere — no importer, no npm script, no document, no report. **All fourteen are `scripts/diag/`** | **settled ALIVE, see below** |
| **variables assigned never read / params never passed / unreachable branches** | ESLint over the whole client — **8 warnings, 0 errors** | **clean**, §4 |
| **dead files** | the five client backgrounds went two hours before this audit began (`DROP-DEAD-BACKGROUNDS-1`) | already done |

### The 14 diag scripts named nowhere

**`DEAD-OR-ALIVE-1` already adjudicated this class on 2026-09-02** — 11 then, 14 now — and found
them **ALIVE** on a stated discriminator: their default scratch paths exist on disk with data, and
re-running two summarisers reproduced published tables digit for digit.

**The discriminator was re-verified today rather than trusted**: `late-lead-axis.mjs` →
`c:/tmp/late-lead-hunt/p1` **exists**; `runin-contenders-sum.mjs` → `c:/tmp/runin-contenders`
**exists**. **Not removed.** This is exactly the case the brief's bar was written for — five of six
suspects were alive last time, so the bar is proof, not suspicion.

---

## 4. ESLINT — 8 WARNINGS, AND ONE OF THEM WAS MINE

| where | what | action |
| --- | --- | --- |
| `SetupScreen/quickTestCap.test.jsx:21` | `KEYS` imported, never used | ★ **FIXED — I added it yesterday** in QUICKTEST-CAP-1 |
| `CameraDirector.js:87` | `pairGuarantee` imported, never called | **REPORTED, NOT TOUCHED** |
| `CameraDirector.js:4518` | `framing` computed, never read | **REPORTED, NOT TOUCHED** |
| 5 test files | an unused local each (`BEFORE`, `trajectory`, `NUMBER_BOX`, `x`, `CANVAS_H`) | reported |

**Why the two `CameraDirector.js` warnings were not fixed**, though an unused import is as inert as a
change gets: **that file is the picture.** It sits in the camera and render fingerprint closures, and
the standing constraint is that an unattended audit does not touch what he judges by eye. Both are
harmless and both are now written down.

★ **`pairGuarantee` is worth one extra line, because an unused guarantee import could have been a
real defect** — a promise imported and never enforced. It is not: the file's own comment at line
2534 says `contenderGuarantee` **is** `pairGuarantee` over every pair and reduces to it at two, which
is what the pinned set holds. The import is a leftover of a deliberate replacement, not a dropped
guarantee. **Read before reporting, not assumed.**

---

## 5. WHAT THIS PIECE DOES NOT COVER

- **`server/` and `scripts/` were not run through knip** — only `client/`, which is where the config
  lives. The cross-tree verification covers imports *into* `client/`, not dead exports *within*
  `server/src` or `scripts/`. **That is an uncovered fraction and it is roughly 240 files of 479.**
- **Unreachable branches were not analysed.** ESLint's default set has no reachability rule beyond
  `no-unreachable` (which reported nothing); a branch that cannot be taken *because of a value* is
  invisible to it and to everything else here.
- **The AST pass failed on all 134 JSX files** and was abandoned rather than fixed (§1). Had knip not
  existed, this piece would have had a 16% hole in it.
- **"Named nowhere" is not "unused".** The 14 diag scripts are the standing proof: they are run by a
  person from a shell, which leaves no trace in the repository at all.
- **Nothing was removed.** That is the finding, not an omission — two prior passes had already taken
  the removable weight, and this one found the residue is zero.
