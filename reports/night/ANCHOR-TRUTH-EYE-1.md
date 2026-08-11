# ANCHOR-TRUTH-EYE-1 — is there anything for his eye to judge? (2026-08-12)

**Branch** `diag/anchor-truth-eye`, off master `1cc99828`. **Measurement only.** No product code
changed; one temporary edit was made to run an arm and is reverted (§5).

**THE ANSWER, in one line each.**

- **§4a, the anchored corridor guarantee: THE DEBT CLOSES WITHOUT A SITTING.** It changes the shipped
  picture by **0.00 points of frame on every one of 50,407 frames**, on all ten tracks, in both field
  regimes. It is not "too small to see" — it is **exactly zero**, because a change the owner DID
  approve made it unreachable.
- **§4c, OVERVIEW's tracking time constant: VISIBLE, and the debt stands.** Inside OVERVIEW the
  picture sits **up to 44 points of frame apart**, with **28.8% of OVERVIEW frames more than 10 pp
  apart** and a p95 of **19.6 pp**. A fifth of a frame is not a subtle difference. A sitting is
  prepared in §6 and is **ten minutes on one track**.

---

## 1. WHAT THE WORK ACTUALLY SHIPPED, recovered from the reports and the commits

[CAMERA-ANCHOR-TRUTH-1](../evolution/CAMERA-ANCHOR-TRUTH-1.md) ran in five parts. Only two of them
put anything into the shipped picture.

| part | commit | what shipped | before → after |
| --- | --- | --- | --- |
| **§1a** the transition decision | `54fc50c1` | `decideTransition()` returns `{action, reason}` | **no behaviour**: both fingerprints bit-identical at the commit, run rather than argued |
| **§1b** documents | `d26901a7` | two stale ARCHITECTURE sections replaced by pointers | **no behaviour** |
| **§4a** the corridor guarantee | `5d6a4cdf` | `corridorGuarantee` measures **from the anchor's real screen position, to each side**, instead of dividing by `frameExtentAlong`, the frame's chord through its centre | a CODE form, not a value. No config key, no slider. **See §3 — it is inert today.** |
| **§4b** point-vs-nose framing | — | **nothing** — hypothesis refuted at 0.238%, the spec's own stop rule | n/a |
| **§4c** the OVERVIEW lag | `f82e1f5e` | `DEFAULT_CAMERA_CONFIG` OVERVIEW profile **`trackingTC` 1.5 → 0.25** | 1.5 → 0.25. `entryTC` deliberately **not** changed and still ships 1.5 |

**One part has no "before", and it is named rather than glossed:** §1a's `{action, reason}` return
value did not replace anything — the reason existed only as control flow. It cannot be A/B'd because
there is nothing to A/B against; what protects it is the +32 precedence tests and the two
bit-identical fingerprints, not an eye. **It is not eye-testable and should never have been on an
eye-test list.**

## 2. HOW THE DIFFERENCE WAS MEASURED

`scripts/exp-anchor-truth-ab.mjs`, added by this block. It drives the race and the director **exactly
as `scripts/camera-fingerprint.mjs` does** — same N=40, same race seed 5601, same camera seed, same
construction — and, instead of hashing `state | zoom | offsetX | offsetY | …`, writes them out. Two
dumps are then compared.

**No new unit is invented.** `offsetX` is a canvas-px pan offset (`projection.js`'s `toScreen`), so a
difference in it is literally how far the picture slid; expressed as **percentage points of frame**,
that is `scripts/tracking-lag.mjs`'s own unit. Zoom is compared as a percentage of the shipped
`cam.zoom`, the fingerprint's own quantity. The single derived number is the **shot-centre
displacement**: the world point at the centre of arm A's frame, asked where arm B puts it on screen —
which folds a zoom difference and a pan difference into the one thing a viewer sees.

**Both regimes, on every track.** Each frame carries the field spread (leader-to-last progress among
unfinished racers); the comparison is reported for the **tight** half and the **torn-apart** half
separately, split at each track's own median so both halves are populated everywhere and no threshold
has to be defended. **Ten tracks**, well past the three asked for.

## 3. §4a — ZERO. And the reason is a change he DID approve

| comparison | shot centre | zoom | camera state |
| --- | --- | --- | --- |
| shipped vs corridor-measured-from-the-centre | **0.00 pp median, 0.00 p95, 0.00 max**, on all 50,407 frames | 0.00% | identical on 100.0% of frames |

Not "small": **identical**. `scripts/corridor-truth.mjs` agrees from the other side — its whole
ten-track table, down to the last decimal, is byte-identical with the change in and out.

**WHY, and it is in the source.** `CameraDirector._guaranteeCeiling` opens with

```
if (kind !== GUARANTEE.PAIR) return Infinity;
```

**CAMERA-COMPANY-ONLY-3 — the block the owner approved on 2026-08-05 with _"nein das passt"_ —
removed the corridor as a ceiling for LEADER, OVERVIEW and COMEBACK entirely.** What is left is a
fallback inside the PAIR states, reached only when a pair state has fewer than two contenders, and
the code's own comment records that it "fired on 0 of 11,813 pair frames across ten tracks, so it is
DEFENSIVE, not load-bearing". This measurement is the independent confirmation of that sentence:
across 50,407 frames the anchored and the centred corridor never once produced a different picture.

**So §4a's eye-test debt is not work he has not seen. It is work that is not on screen.** The verdict
he gave in August is what took it off screen. Closing the debt costs nothing and is done in §7.

**What this does NOT say:** the anchored form is not useless. It is the correct form should the
corridor ever return to the single-anchor states — and if that happens, it changes the picture again
and needs the eye then. That is a live risk worth one line in the doc rather than a silent removal.

## 4. §4c — VISIBLE, and only in OVERVIEW

Shipped (`trackingTC` 0.25) against the old value (1.5), everything else held:

| pooled over ten tracks | median | p95 | max | frames over 1 / 5 / 10 pp |
| --- | --- | --- | --- | --- |
| all frames | 0.00 pp | 10.11 pp | 44.05 pp | 8.1% / 6.8% / 5.0% |
| tight pack | 0.00 pp | 9.62 pp | 44.05 pp | 8.0% / 7.0% / 4.8% |
| torn-apart field | 0.00 pp | 11.13 pp | 24.52 pp | 8.3% / 6.6% / 5.3% |

**The regime does not decide it** — tight and torn are within half a point of each other. **The
camera STATE does**, and this is why a pooled median is worthless here:

| state | frames | median | p95 | max | over 1 / 5 / 10 pp |
| --- | --- | --- | --- | --- | --- |
| **OVERVIEW** | 8,318 | 0.00 pp | **19.56 pp** | **44.05 pp** | **45.0% / 38.4% / 28.8%** |
| LEADER_ZOOM | 19,427 | 0.00 | 0.00 | 28.25 | 1.0% / 0.6% / 0.4% |
| BATTLE_ZOOM | 11,043 | 0.00 | 0.00 | 22.29 | 0.9% / 0.7% / 0.4% |
| LEAD_CHANGE | 8,669 | 0.00 | 0.00 | 20.77 | 0.6% / 0.5% / 0.3% |
| PHOTO_FINISH | 2,135 | 0.00 | 0.00 | 0.00 | 0% |
| COMEBACK_ZOOM | 815 | 0.00 | 0.00 | 0.00 | 0% |

Two things follow, and both matter for the sitting.

- **The change is confined to OVERVIEW, which is 16.5% of a race** — so 83.5% of what he watches is
  unaffected and a sitting that does not wait for an OVERVIEW cut shows him nothing.
- **The small tails in the other states are real and are a carry-over**, not noise: after a laggier
  OVERVIEW hands over, the next state starts from a different place. `trackingTC` was changed for
  OVERVIEW only.

**`cam.zoom` is identical to 0.00% everywhere, and the director takes the same shots at the same
times on 100.0% of frames.** This is purely how fast the camera catches up, not what it decides to
look at.

**Per track — where the difference is worth watching:**

| track | OVERVIEW frames | share of race | median | p95 | max | over 10 pp |
| --- | --- | --- | --- | --- | --- | --- |
| **ice-track** | 833 | 17.5% | **13.11 pp** | **36.11 pp** | **44.05 pp** | **58.0%** |
| **searound** | 864 | 21.0% | 12.81 pp | 18.97 pp | 26.72 pp | 55.6% |
| luger-hill | 778 | 20.7% | 9.23 pp | 15.54 pp | 19.54 pp | 38.4% |
| space-sprint | 775 | 20.5% | 0.00 pp | 23.46 pp | 24.52 pp | 30.6% |
| seatrack | 783 | 20.7% | 0.00 pp | 20.08 pp | 20.80 pp | 29.8% |
| dirt-oval | 880 | 15.7% | 0.00 pp | 17.58 pp | 17.72 pp | 25.9% |
| city-circuit | 894 | 17.7% | 0.00 pp | 12.33 pp | 12.40 pp | 22.5% |
| river-run | 862 | 22.3% | 0.00 pp | 13.13 pp | 14.30 pp | 14.5% |
| mountainstreet | 749 | 20.0% | 0.00 pp | 13.92 pp | 14.99 pp | 14.4% |
| garden-path | 900 | 7.5% | 2.84 pp | 6.02 pp | 6.05 pp | **0.0%** |

## 5. THE TEMPORARY EDIT, AND THE PROOF IT IS GONE

§4a has no config knob, so its old arm needed a code edit. **One line**, in
`client/src/modules/camera/framingRule.js`:

```
const at = anchorAt ?? { x: frameW / 2, y: frameH / 2 };   // shipped
const at = { x: frameW / 2, y: frameH / 2 };               // the arm
```

**It is an exact revert and this is not my claim** — CAMERA-ANCHOR-TRUTH-1 asserts that with the
anchor centred the new two-sided form reduces to the old expression **to 10 decimal places at every
1° of heading on all three projections**, and that assertion is a living test. Forcing the centre is
therefore the old behaviour by proof rather than by reconstruction.

Reverted with `git checkout --` immediately after the two dumps; `git status` showed only the new
untracked harness, and `grep -c "TEMP A/B"` returned **0**.

## 6. THE SITTING — prepared, not run. Ten minutes, one track

**Only §4c needs it.** Everything is reachable from the UI; this was checked in the source, not
assumed.

- **Dev Screen → Camera Advanced → per-state profiles → OVERVIEW → "Tracking TC (s)"**, a slider with
  `min 0.05, max 5, step 0.05` (`CameraAdvancedSection.jsx`; `CAM_STATES_FOR_PROFILES` includes
  OVERVIEW). Both arms are on the slider. **Nothing needs building.**
- **Track: ice-track.** It has the largest separation of any track — a median of 13 pp and 58% of its
  OVERVIEW frames more than 10 pp apart — so a single race shows the effect rather than one lucky cut.
  **searound is the second choice** and is a track he already knows.
- **Seed: 5601**, the seed every camera measurement in this project uses, so what he sees is the run
  the numbers above describe.
- **Field: 40 racers, 60 s.** Watch **only the OVERVIEW cuts** — there are about two per race and they
  are ~20% of it. The rest of the race is identical in both arms by measurement.

| arm | set OVERVIEW Tracking TC to | what to watch for, in one sentence |
| --- | --- | --- |
| **A — shipped** | **0.25** | On the wide cut the field sits where the framing puts it and stays there as the pack moves. |
| **B — before** | **1.50** | On the wide cut the camera trails the pack, so the field drifts toward one edge of the frame — by up to a fifth of the frame — before it catches up. |

**Leave `Entry TC` alone in both arms**; it ships at 1.5 and was deliberately not changed, and moving
it would make the two arms differ in two ways at once.

**Serve a production build on 4173** (VERIFY-RULES R10) and read the build pill before judging.

## 7. WHAT THIS BLOCK CHANGES IN THE RECORD

`docs/CAMERA_DIRECTOR.md` §8.1 — the §4a half of the eye-test debt is **closed on the measurement**,
with the number behind it, and the §4c half is left standing and pointed at this report. The row is
not deleted: an approval that quietly covered adjacent work is what the narrowing was for, and
replacing it with a silence would lose the same information a different way.

## 8. NOTICED AND LEFT

- **`scripts/corridor-truth.mjs` still measures a guarantee that no longer binds.** Its numbers are
  honest about how many track widths fit across the frame, but a reader will take "PROMISE BROKEN on
  73.7% of corridor frames" as a defect in a live rule. It is not — the rule was retired from the
  single-anchor states by the owner's own verdict. That is a one-sentence header fix, not this
  block's.
- **The corridor numbers have moved a long way since the report that quotes them** (73.7% broken and
  a 2.179× spread today against 41.6% and 1.080× on 2026-08-04). That is nine days of camera work in
  between, not a regression in §4a — and it is only visible because the instrument was run again.
