# SPRITE-AUDIT-DERIVATION-1 — the sprite audit reads its inputs now, and it turns out there are TWO measuring rules

> **A TOOL REPAIR THAT SHIPS NOTHING.** One file changed, `scripts/audit-sprite-crops.mjs`, which is
> outside the engine hull and imported by no product code. **No racer's values were corrected**, and
> the brief forbids it for a good reason: `bodyFillX`/`bodyFillY` reach the race.

**The headline is not the one that was expected.** Against the rule that actually produced the
registry's forty pinned values, **all twenty types agree exactly**. But the product has a *second*
rule, and against that one **five types disagree** — and it is the second rule that would run if
anyone re-measured a sprite in the Racer Editor tomorrow.

---

## 1. THE TOOL WAS MEASURING WINDOWS, NOT FRAMES

`scripts/audit-sprite-crops.mjs` carried a hardcoded twenty-row table of
`frameWidth`/`frameHeight`/`frameCount`/`displaySize`. CENSUS-DUPES-1 found it and established that
it **has never agreed with the registry**: it entered the tree in `11093fff` (2026-06-03), the same
commit that introduced the cropped sheets, and disagreed on **eight** frame geometries and **five**
`displaySize` values from that day.

The consequence is worse than a stale label. Run with those numbers the tool slices a 150-px-tall
sheet into 128-px windows and reports a fill ratio for **a window that is not a frame**. It returned
`bodyFillX = 1.000` for horse, snake, rocket, motorbike, luge, koi and snowmobile — seven types
reported as filling their frame edge to edge when none of them does.

### The repair: two sources, each asked only for what it owns

| input | now comes from | why |
|---|---|---|
| `frameWidth`, `frameHeight` | **the decoded PNG** | a sheet knows its own size; `info` was already in hand and was being discarded in favour of a copy |
| `frameCount` | **the registry** | the one input a PNG *cannot* yield — a strip of N frames looks exactly like a strip of 2N |
| `displaySize`, `spriteUrl`, recorded `bodyFillX/Y` | **the registry** | the values under test, and the file that owns them |

It **throws** rather than guessing if `width` is not divisible by `frameCount`: that combination
means the sheet and the registry disagree about how many frames the sheet holds, and there is no
honest default for it.

---

## 2. ★ THE FINDING THAT WAS NOT IN THE BRIEF: THERE ARE TWO RULES

Halfway through the repair the tool's own bounding box was replaced with the **product's**
`computeSpriteBoundingBox` (`client/src/modules/racer-types/backgroundRemoval.js`) — deriving from
the real source rather than a copy, the same move as the geometry above. **The answers changed on
five types.** That is what exposed the finding.

The two rules are genuinely different:

| | **plain** | **product** (`computeSpriteBoundingBox`) |
|---|---|---|
| what it does | the bare opaque bounding box, alpha ≥ 10 | the same box, then **iteratively sheds sparse edge strips** — any edge band of 3% thickness (clamped 2–8 px) holding under 5% opaque pixels is trimmed, repeatedly |
| who uses it | this audit tool, historically | the Racer Editor, via `measureBodyFill` → `RacerEditor.jsx:121` |

**Which one authored the registry? The plain one, and that is settled by dates, not by inference.**
The shedding entered `computeSpriteBoundingBox` in `d2c2ee6e` (**2026-05-28**). The forty
`bodyFillX/bodyFillY` values were pinned in `7ea80484` (**2026-06-04**), a week later. So the
shedding rule already existed when the values were written, and the values do not reflect it —
they match the plain box exactly on all twenty. The editor did not author them; this tool's
predecessor did.

The tool now computes **both** and reports both, because reporting only one would make a real
disagreement look like agreement, or the reverse.

---

## 3. THE DELIVERABLE: THE DISAGREEMENT LIST

Against the plain rule — **the rule that produced them** — twenty of twenty agree, to the three
decimals the registry stores. Frame geometry also agrees on all twenty: the registry's
`frameWidth`/`frameHeight` match the PNGs.

Against the **product** rule — what the editor would measure today — five differ:

| type | registry records | editor would measure | moves | by |
|---|---|---|---|---|
| **dragon** | 0.836 / **0.898** | 0.836 / **0.867** | `bodyFillY` | **−0.031** |
| **plane** | 0.836 / **0.930** | 0.836 / **0.898** | `bodyFillY` | **−0.032** |
| **beetle** | **0.398** / 0.672 | **0.383** / 0.672 | `bodyFillX` | **−0.015** |
| **koi** | **0.578** / 0.914 | **0.543** / 0.914 | `bodyFillX` | **−0.035** |
| **manta** | 0.633 / **0.805** | 0.633 / **0.680** | `bodyFillY` | **−0.125** |

Every difference is in one axis only, and every one is **downward** — which is what shedding must
do, since it can only trim. **manta is the outlier by a factor of four**: 0.125 of frame height, or
about 16 px of a 128-px frame, meaning manta's sheet carries a long sparse tail that the plain box
counts as body and the product rule does not.

**The full twenty-row table is the tool's own output** — run `node scripts/audit-sprite-crops.mjs`.
It is not copied here, per the one-canonical-home rule.

---

## 4. WHY NOTHING WAS CORRECTED, AND WHY THAT IS NOT CAUTION

The brief forbade correcting any racer's values. That is not conservatism — `bodyFillX`/`bodyFillY`
are **race inputs**, not artwork metadata:

- `client/src/modules/headlessRaceSimulator.js:177-180` — `min(bodyFillX, bodyFillY)` and
  `max(...)` set the body's narrow and long extents
- `client/src/screens/RaceScreen/index.jsx:498-499` — the same pair, browser side
- `client/src/modules/rowLayout.js:236` — start rows are laid out in **visible body narrow units**

Moving manta's `bodyFillY` from 0.805 to 0.680 would change how much room manta occupies in a start
row and how it brakes on contact. **It would move the world fingerprint and it would change who
wins races.** He has judged neither the number nor the picture.

---

## 5. THE PROOF THAT THIS SHIPS NOTHING

| claim | how it was established |
|---|---|
| one file changed | `git status --porcelain` → `M scripts/audit-sprite-crops.mjs`, nothing else |
| outside the engine hull | `node scripts/engine-reach.mjs --check scripts/audit-sprite-crops.mjs` → *"none of 1 path(s) carry a change that can reach the race engine · 1 outside the hull (cannot reach the engine at all)"* |
| **no fingerprint can move** | all four fingerprint guards reported **`nothing changed`** — the file is in no fingerprint's import closure. This is mechanical, not an argument |
| imported by no product code | searched the tree: every other mention of the filename is a **comment or a document**. `crop-sprite-sheets.mjs:25` names it in prose only |
| guards green | `node scripts/verify.mjs --cheap` → **PASS 5 FAIL 0** |

**The direction of the new import is worth stating plainly**, because it looks like a coupling and
is not: the audit script now imports `backgroundRemoval.js`. A script reading a product module cannot
change that module, and nothing the product imports changed.

---

## 6. ONE THING FIXED IN PASSING

The tool's two halves had come to disagree with each other. The "Body" column and the `*** CROP`
flag ask *how much transparent margin is on this sheet* — a question about the artwork — while the
registry comparison asks *which rule reproduces the pin*. Once the product rule was wired in, the
first half silently inherited it and reported koi's body as `139x234` beside a fill percentage
computed from `148x234`. **The sheet-tightness half now uses the plain box throughout and says so
in a comment.** Mixing the two silently is how a 9-px disagreement hid inside one row.

---

## Limits

**This does not establish that either rule is the RIGHT one.** It establishes which rule produced
the recorded values and that a different rule is now wired into the editor. Whether shedding is the
better measure of a racer's body is a judgement about the picture, and nobody has made it.

**The five differences were not eye-checked against the artwork.** No sprite was opened and looked
at. What is measured is that two algorithms disagree on five sheets, not that either is visibly
wrong.

**The `*** CROP` flag count moved from twelve to eleven** relative to the 2026-06-03 record. That is
expected — those sheets were cropped after that measurement — but it was not verified against the
originals, so it is stated and not explained.

**`crop-sprite-sheets.mjs` was not touched.** It carries its own list of flagged types
(`crop-sprite-sheets.mjs:25`) credited to this tool. Whether that list still matches what this tool
now flags was not checked; it is a cropping instrument, it ships nothing, and it was outside the
brief.
