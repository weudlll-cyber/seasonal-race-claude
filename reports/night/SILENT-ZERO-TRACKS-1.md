# SILENT-ZERO-TRACKS-1 — a sweep that measures nothing must not exit clean

**Block:** PIECE E of the night chain of 2026-09-04. Branch `night/2026-09-04`, off master `6953722d`.
**Answers:** `docs/BACKLOG.md` — the silent-zero entry from the night of 2026-08-25, which now carries
this as its next occurrence.

**Nothing in the picture, the race, a default or a threshold moved. No fingerprint was minted.**
One guard was added to one harness. It is **not** wired into CI, verify or a hook — that is its own
order and has not been given.

---

## 1. The headline

**The harness did not merely fail to answer. It answered PASS.**

That is the finding, and it is worse than the incident as recorded. The backlog entry said the run
"reported 0 races in 52 s and exited clean". Measured tonight by removing the new guard and running
the incident again:

```
viewer-invariants: 0 race(s) in 43s — 0 window violation(s) in 0 race(s), 0 crossing violation(s)
Every frame of every race swept satisfied all five invariants. PASS
```

Exit code **0**. Wall clock **43 s**. A run that looked at nothing printed the sentence the gate
prints when it has looked at everything and found everything well.

**The cost is not the 43 seconds.** It is that, on the way out, a sweep that measured nothing is
indistinguishable from a sweep that measured everything.

---

## 2. The mechanism, at source

`scripts/viewer-invariants.mjs`, the line as it stood:

```js
const TRACKS = geometries().filter((g) => (trackArg ? trackArg.split(",").includes(g.id) : true));
```

`geometries()` reads `server/data/tracks/*.json` and returns records with an `id`. No record has the
id `all`. So `--tracks=all` produced an empty `TRACKS`, `WORK` (the product `ARMS × TRACKS × SEEDS`)
was empty, the run loop had nothing to iterate, and every counter it prints was legitimately zero.
**Nothing in the file was broken.** It was correctly reporting a scope of nothing.

There is no `all` token in this harness. Omitting `--tracks` is what runs every track.

---

## 3. ★ THE FIX ALREADY EXISTED IN THIS REPOSITORY AND NEVER TRAVELLED

This is the part worth more than the guard itself. `scripts/company-spread-sweep.mjs:158-169`:

```js
// matched nothing, and the first run of this script printed a header, wrote an empty JSON file and
// exited 0. That is the shape VERIFY-BASE-1 exists to forbid, so it refuses instead.
const geos = loadTracks().filter((g) => TRACKS.includes(g.id));
if (geos.length !== TRACKS.length) {
  const missing = TRACKS.filter((t) => !geos.some((g) => g.id === t));
  console.error(
    `REFUSED: ${missing.length} of ${TRACKS.length} requested track(s) not found: ${missing.join(", ")}\n` +
      `  available: ${loadTracks().map((g) => g.id).join(", ")}`,
  );
  process.exit(2);
}
```

Same defect, same diagnosis, same remedy — **found once, fixed once, in one file, and never applied
to the harness that gates the ship.** The guard added tonight is deliberately the same shape and the
same message form, so this is now a repeated idiom rather than a second invention.

---

## 4. What was built

Two checks, both **before** the client build (72 s) and the browser launch, so a refusal costs
nothing:

| check | fires on | message names |
| --- | --- | --- |
| unknown / empty `--tracks` | any name no geometry carries; an empty value | what was asked for, every id this repository has, and that there is no `all` |
| zero scope | `TRACKS` or `SEEDS` empty from any cause | all three lists (arms, tracks, seeds) and where each came from |

The second exists because the first can only see the cause that has actually happened. An empty
`server/data/tracks`, or `--seeds=5-1`, produce the same silent zero by a different road.

### ★ One limb was written, measured to be unreachable, and removed

The zero-scope check was first written as
`ARMS.length === 0 || TRACKS.length === 0 || SEEDS.length === 0`. **The `ARMS` limb can never fire:**
`ARG("arm", …).split(",")` returns `[""]` for `--arm=`, never `[]`. It was caught by running it —
the sabotage run with `--arm=` did not trip the guard, it built the client and started a race.

An unreachable limb inside a guard against unreachable code is the defect wearing the guard's own
clothes, so it was taken out rather than left looking protective. **What `--arm=` actually produces
is one arm NAMED `""`, which runs and scores** — silent GARBAGE, not a silent zero. It is a different
defect, it is out of this piece's scope, and it is named here rather than half-covered.

---

## 5. The sabotage

Required by the piece, and it is what produced §1. The guard was removed from the file, the incident
was re-run, and the file was restored and verified byte-identical (59,010 bytes, `Buffer.equals`).

| | with the guard | with the guard removed |
| --- | --- | --- |
| `--tracks=all` | exit **2**, refuses in <1 s, before the build | exit **0**, 43 s, **prints PASS over 0 races** |

Three positive cases fire with the guard in place: `--tracks=all`, `--tracks=` (empty), and
`--seeds=5-1` (a backwards range, caught by the zero-scope check with `arms (1) / tracks (1) /
seeds (0)` printed).

---

## 6. The other entry points — NAMED, and deliberately not guarded

The piece's rule is to guard the one harness and name the rest. **Thirty other scripts accept a
`--tracks` argument.** They fall into three groups, classified by reading the filter line rather than
by pattern-matching the file:

**A · the same defect, unguarded (an unknown name filters to nothing):**
`endgame-width-truth.mjs:214` · `line-visible-truth.mjs:193` · `pan-lag-account.mjs:215` ·
`diag/endgame-spec.mjs:113` · `diag/company-ceiling-who.mjs:53` · `diag/company-under-floor.mjs:42` ·
`diag/corridor-default-sum.mjs:24` · `diag/headcount-price-sum.mjs:10` · `diag/leader-lag-sum.mjs:18` ·
`diag/leader-lag-tc.mjs:20` · `diag/leader-lateral-ba.mjs:18` · `diag/leader-lateral-sum.mjs:19` ·
`diag/leader-setback-sum.mjs:16` · `diag/midrace-clip-by-state.mjs:25` · `diag/midrace-clip-sum.mjs:15` ·
`diag/runin-track-sweep.mjs:22` · `diag/sprite-premise.mjs:71` · `company-bind-truth.mjs:50` ·
`label-degrade-truth.mjs:73` · `label-occlusion-truth.mjs:83` · `outcome-phase-window.mjs:45` ·
`sim-race-visual.mjs:39` · `exp-roster-matrix.mjs:82` · `exp-fair-arrival.mjs:54` ·
`diag/aim-levers-sum.mjs:9` · `diag/margin-both-axes-sum.mjs:39` · `diag/room-floor-estimate.mjs:55` ·
`pair-reach-census.mjs`

**B · already guarded, and the source of the idiom above:** `company-spread-sweep.mjs:160`.

**C · A THIRD VARIANT, and it is not a silent zero — it is a silent DEFAULT.**
`scripts/sim-fairness.mjs` parses **`track`** (singular) and **does not parse `tracks` at all**
(established by extracting its 87 `argVal` keys from its source). `argVal` returns the default for an
unknown key, so `--tracks=whatever` there is **silently ignored** and the run proceeds on the default
track, reporting confidently about a track nobody asked for. That is the flag-typo trap
`ACTION-KEYS-1 §2b` recorded, still open, on the project's primary sweep.

**Not fixed here.** Twenty-eight files is a change of a different size and needs its own order; and
group C is a different defect that a track-name check would not touch.

---

## 7. Source hygiene

| file | before | after | what changed |
| --- | --- | --- | --- |
| `scripts/viewer-invariants.mjs` | 1,023 | 1,112 | +89: the two guards and their reasoning (+66), plus the `ALL_GEOMETRIES` binding so the filter and the check read the same list. Piece K2's `GATE_TRACKS` comment is in the same commit and is +23 of that total. |

Nothing was removed. No scratch file entered the repository; the sabotage copy lived in `C:/tmp`.

**Noticed and deliberately left:** the `--arm=` silent-garbage case (§4); the twenty-eight entry
points in §6-A; the `sim-fairness` unknown-flag case in §6-C.

`node scripts/engine-reach.mjs --check scripts/viewer-invariants.mjs`, verbatim:

```
ENGINE REACH: none of 1 path(s) carry a change that can reach the race engine.
  1 outside the hull (cannot reach the engine at all): scripts/viewer-invariants.mjs
```

All four fingerprints were run on the changed tree and are **UNMOVED**: world `8a1977187e9c99b4`,
world-off `aa09ed97a3a32689`, camera `152cf295c4c9ff54`, render `733b3f100d6a819f`.
