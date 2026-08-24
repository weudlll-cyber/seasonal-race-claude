# RUNIN-CONTENDERS-1 — is the contender set wrong, or merely generous? Measured: NEITHER

**Date:** 2026-08-24 · **Branch:** `diag/runin-contenders-1` (off `master` at `f994210e`) ·
**MEASURE ONLY — no camera code, no default, no rule and no threshold was changed.**

**THE ANSWER, in one paragraph.** The numbers support **neither A nor B**, and the term that sets
the width is named instead. Over the closing stretch the shot's width is set by **the active
state's own zoom factor on 94.6% of frames at 20 racers and 97.2% at 40** — `_stateCamZoom()`, the
thing the endgame schedule closes *to*. The contender guarantee sets it on **5.4% and 2.9%**. So the
contender set is not, in the ordinary case, the thing deciding how wide the finish is, and adjusting
its membership in either direction would leave ~95% of closing frames exactly as they are. Case B is
close to non-existent on the evidence: of 324 set members across 144 finishing races, **one** (0.3%)
finished more than five body lengths back, and the median width a member costs is **0.00000 ln** —
the set is almost always exactly the top two, which cannot be trimmed. Case A is *real but small and
mostly harmless*: the winner is outside the set in **4 of 144 races (2.8%)**, and in **29.2% of
20-racer races** at least one non-set racer finishes within one body length. **And on the owner's own
case the contender set is innocent entirely** — the eventual winner was off canvas for 481 frames at
progress 0.815–0.908, on frames where the set **did not yet exist**, while the camera was locked on
a COMEBACK subject; by the time he took the lead at 0.979 he was on canvas within 0.02 of centre.

---

## Why no fingerprints, no browser gate, no client suite

**Nothing was changed, so there is nothing for them to measure.** This block adds a report, an INDEX
line and three read-only diagnostics under `scripts/diag/`. The four fingerprints hash the RACE, the
DIRECTOR's decisions and the DRAW CALL SEQUENCE **from the shipped defaults**; they cannot see a
measurement that alters nothing, and by their own declarations they are blind to configs other than
the default. The client suite tests client code, of which none changed. The doc guards are the
instrument that applies here and they are green (§7).

**Machine and pool.** `os.cpus().length` reported **14 logical cores**; the sweep sized its pool at
`min(16, cores − 2) = 12`, the project's own convention. **160 races in 170 s.**

---

## 1. The corpus, and what it could not support

| | |
| --- | --- |
| tracks | **10** — 5 closed (city-circuit, dirt-oval, garden-path, ice-track, searound) and 5 open (luger-hill, mountainstreet, river-run, seatrack, space-sprint) |
| seeds | 1, 2, 3, 9, 42, 777, 2024, **9888** |
| field sizes | **20 and 40** |
| races run | **160**, 0 errors |
| **races usable** | **144** |

**WHAT THE N COULD NOT SUPPORT, stated before the findings that rest on it:**

- **`garden-path` produced no winner in any of its 16 races** — it does not finish inside the
  harness's frame budget. Every figure below therefore rests on **nine** tracks, not ten, and
  garden-path is unmeasured rather than clean. It is the same track that failed to finish in two
  earlier probes this week.
- **Case B could barely be priced at all.** Pricing a passenger needs a set with **three or more**
  live members, because dropping one from a set of two leaves no pair to guarantee. Only **23 of 144
  races** ever met that condition. The "median cost 0.00000" below is therefore a statement about a
  set that is nearly always two, not a claim that a third member is free — see §4 for what the
  priced members *did* cost.
- **Four winner-outside-set races is four races.** The 2.8% rate has an N of 144; it is enough to say
  "this is not routine" and not enough to characterise when it happens.
- **Everything here is headless.** The camera fingerprint's own record says no instrument has ever
  run the browser's camera, and the harness drives the real `CameraDirector` but not the real frame
  loop. A frame-timing-dependent effect would not appear.

---

## 2. (a) The set as built — established at source

`_abreastContenders(ordered)` — `client/src/modules/camera/CameraDirector.js:2689`. **Two conditions,
both geometric, no lap fractions and no new numbers:**

1. **NEARLY LEVEL** — `shortestArcDeltaT(leader.t, r.t) * pathLengthPx <= contactLength`, where
   `contactLength` is `(leaderBodyLen + rBodyLen) / 2`, i.e. **one body length** between two equal
   racers. Anyone further back is refused.
2. **ON A FREE LANE** — refused if laterally within a body width of somebody already admitted.

**Fallbacks:** fewer than two survivors, or a racer carrying no geometry, returns `ordered.slice(0, 2)`
— the top two.

**WHEN IT IS FORMED, AND THAT IT IS NEVER RE-FORMED.** The set is captured once, at the transition
into `PHOTO_FINISH` (`:1622`), stored **by index**, and looked up live thereafter — the source calls
this out in its own words: *"CAPTURED ONCE, NEVER RE-SORTED."*

**MEASURED, and it agrees:**

| N | races | set-size histogram | median | captured at leader progress (median) | re-formed |
| --- | --- | --- | --- | --- | --- |
| 20 | 72 | 2:**54**, 3:12, 4:4, 5:2 | **2** | **0.9701** | **0 races** |
| 40 | 72 | 2:**67**, 3:2, 4:1, 5:2 | **2** | **0.9701** | **0 races** |

**The single most consequential fact in this table is that the set is almost always TWO** — 75% of
20-racer races and 93% of 40-racer races — which means the geometric rule usually admits nobody and
the *fallback pair* is what runs. It is captured at ~97% of the race and never revisited while the
field is still compressing.

---

## 3. (b) Case A — is the set TOO SMALL?

| N | races | **winner outside the set** | races with ≥1 non-set racer within 1 body length | mean non-set close | max |
| --- | --- | --- | --- | --- | --- |
| 20 | 72 | **3** | **21 (29.2%)** | 0.43 | 3 |
| 40 | 72 | **1** | **14 (19.4%)** | 0.32 | 4 |
| **all** | **144** | **4 (2.8%)** | 35 (24.3%) | 0.38 | 4 |

**The four races where the eventual WINNER was not in the set:**

| track | N | seed | set | winner |
| --- | --- | --- | --- | --- |
| dirt-oval | 20 | 3 | 12, 16 | 18 |
| ice-track | 20 | 1 | 7, 6, 14 | 18 |
| luger-hill | 20 | 2024 | 0, 7, 6, 9 | 12 |
| seatrack | 40 | 777 | 38, 36 | 18 |

**The brief asked for the distinction and here it is: this is a ROUTINE RATE, not a one-off defect.**
2.8% of races put the winner outside the set. Three of the four are 20-racer races. **But note what
it is not:** being outside the set did not put any of them off the canvas in the owner's case, and
the set is not what sets the width anyway (§5).

---

## 4. (c) Case B — is the set TOO GENEROUS?

**Essentially not, on this evidence.**

| | |
| --- | --- |
| set members across 144 races | **324** |
| of those, finishing >5 body lengths back ("passengers") | **1 (0.3%)** |
| races priceable at all (≥3 live members) | **23 of 144** |
| median per-member width cost, `ln(without / with)` | **0.00000** |
| median passenger cost | **— none priceable** |

**Where set members actually finish, relative to the winner:**

| gap (body lengths) | members | share |
| --- | --- | --- |
| 0 – 0.5 | 38 | 11.7% |
| 0.5 – 1 | 38 | 11.7% |
| 1 – 2 | 79 | 24.4% |
| 2 – 5 | 28 | 8.6% |
| 5 – 10 | **1** | **0.3%** |
| >10 | **0** | **0.0%** |

**Nothing in the set finishes more than ten body lengths back, ever, in 144 races.** The membership
rule is doing its job: it admits racers who are genuinely at the front.

**BUT THE MEDIAN OF ZERO MUST NOT BE READ AS "A MEMBER IS FREE".** Of the 82 members that could be
priced, **48 cost more than 0.01 ln at their worst frame**, and the largest costs seen are
**2.23, 1.59, 1.48, 1.40, 1.34 ln** — very large widths. The honest statement is: **when the set is
larger than two AND the guarantee is the binding term, a member is expensive; that conjunction is
rare.** The median is zero because the set is usually two, where no member can be dropped at all.

---

## 5. The finding — which term actually sets the width

**This is the answer to the brief's third possibility, and it is the reason A and B are both the
wrong question.**

Over every frame at leader progress ≥ 0.95, by the director's own `_framingProbe.binding`:

| N | closing frames | `state` | `guarantee` | `guarantee-after-cap` |
| --- | --- | --- | --- | --- |
| 20 | 43,743 | **41,374 (94.6%)** | 1,544 (3.5%) | 825 (1.9%) |
| 40 | 49,924 | **48,515 (97.2%)** | 584 (1.2%) | 825 (1.7%) |

**`state` is `_stateCamZoom()`** — `_leaderZoom`, `_photoFinishZoom`, `_comebackZoom` and the rest,
i.e. the active shot's own zoom factor, which is exactly what the endgame schedule closes *to*
(`_scheduleClose`'s `endZoom`). **On 95% of closing frames the width is that factor and nothing
else.** The contender guarantee — the term the contender set feeds — decides the width on **one frame
in twenty at 20 racers and one in thirty-four at 40**.

**So the contender set is not the author of the finish's width in the ordinary case.** A set made
stricter would tighten ~3% of frames; a set made more generous would widen ~3% of frames. Neither is
the reason a finish reads far away, and neither is the reason a racer is out of frame.

---

## 6. (d) The owner's case, worked — seed 9888, dirt-oval, 20 racers

**The set:** captured at leader progress **0.9702**, members **[16, 13]**, never re-formed.
**The winner is 13 — and he was IN the set from the moment it was captured**, before he ever led.

**He took the lead at progress 0.9791**, and at that instant he was at screen **x = 0.511, y = 0.569**
— on canvas, within 0.02 of centre-x.

**HE WAS NEVERTHELESS OUT OF THE PICTURE, and the owner is right about that.** Over a trace from
progress 0.50 to the line (3,407 frames) he is off canvas on **481 frames, in ONE contiguous window,
progress 0.8149 → 0.9084** — roughly eight seconds.

**What was happening in that window:**

| | |
| --- | --- |
| states | **COMEBACK_ZOOM 469 frames**, LEADER_ZOOM 12 |
| binding term | **`state` on all 481 frames** |
| contender set | **did not exist on a single one of them** — `PHOTO_FINISH` had not begun |
| camera anchor | **racer 12** on 469 frames (as the locked COMEBACK subject), racer 16 on 12 |
| how far off | off the **TOP** of the frame — y from −0.271 to −0.005; x stayed on canvas |

**The picture, frame by frame at the marks that matter:**

| progress | state | anchor | winner x | winner y | on canvas |
| --- | --- | --- | --- | --- | --- |
| 0.8149 | COMEBACK_ZOOM | 12 | −0.020 | 0.462 | **no** |
| 0.8502 | COMEBACK_ZOOM | 12 | −0.059 | −0.231 | **no** |
| 0.8801 | COMEBACK_ZOOM | 12 | 0.377 | −0.390 | **no** |
| 0.9084 | LEADER_ZOOM | 16 | 0.669 | −0.005 | **no** |
| 0.9501 | LEADER_ZOOM | 16 | 0.309 | 0.522 | yes |
| 0.9702 | PHOTO_FINISH | — | 0.468 | 0.545 | yes (set captured here) |
| **0.9791** | PHOTO_FINISH | — | **0.511** | **0.569** | **yes — takes the lead** |
| 1.0000 | PHOTO_FINISH | — | 0.632 | 0.880 | yes |

**THE MECHANISM, PLAINLY: the camera was following a DIFFERENT comeback subject.** For 469 frames the
shot was locked on racer 12 while the eventual winner ran off the top of the frame. **And racer 12
was himself a genuine contender** — he finished 0.894 body lengths behind the winner — so this is not
the camera following the wrong man. It is the camera being able to follow only one.

**The contender set never had a chance to help**: it is not formed until 0.9702, which is 0.06 of the
race *after* the winner came back into frame on his own.

**One correction to the framing this block was given.** The brief says the winner "was not in the
picture when he took the lead". Measured, he was **on canvas and centred** at the lead change; he was
out of the picture for the eight seconds *before* it. The complaint is well-founded and the moment is
different, and that difference is what moves the cause from the contender set to the comeback shot.

**`RUNIN-LATE-LEAD-1` could not be checked.** It is cited in the brief as having established the
"never released, never centred" reading, and **it exists nowhere in this repository** — not in
`reports/`, not in `docs/`, not in source. Its conclusions are neither confirmed nor disputed here;
what is above was measured from scratch.

---

## 7. (e) Field size — does the case hold at 20 and not at 40?

**In aggregate it leans that way; per track it does not hold.**

| N | races | median set size | mean racers within 1 body of the winner | mean non-set close |
| --- | --- | --- | --- | --- |
| 20 | 72 | 2 | **2.01** | **0.43** |
| 40 | 72 | 2 | 1.74 | 0.32 |

**Per track, mean non-set-close, 20 vs 40** — the pattern reverses on four of nine:

| track | 20 | 40 | |
| --- | --- | --- | --- |
| city-circuit | 0.13 | **0.63** | worse at 40 |
| luger-hill | 0.38 | **1.00** | worse at 40 |
| river-run | 0.13 | **0.25** | worse at 40 |
| seatrack | 0.38 | 0.38 | equal |
| dirt-oval | **0.75** | 0.25 | worse at 20 |
| mountainstreet | **0.88** | 0.25 | worse at 20 |
| space-sprint | **0.63** | 0.00 | worse at 20 |
| searound | **0.38** | 0.00 | worse at 20 |
| ice-track | **0.25** | 0.13 | worse at 20 |

**So "it happens at 20 and not at 40" is not a property of the field size.** What the aggregate
difference reflects is that **the finish is tighter at 20** — 2.01 racers within one body length of
the winner against 1.74 at 40 — so there are simply more racers near the line to be missed. **The
set's SIZE is not the cause**: the median is 2 at both. Neither is the shot: `state` binds 94.6% and
97.2%, the same term either way. **On these numbers the driver is the geometry of the finish, and it
is track-dependent rather than field-size-dependent.**

---

## 8. Verification and source hygiene

**Read-only.** No production file was touched. `git diff --stat master...HEAD` contains this report,
its INDEX line and three files under `scripts/diag/`.

**The harness is COMMITTED rather than thrown away, and that is deliberate.** Every number above
comes from `scripts/diag/runin-contenders*.mjs`. The CLEANUP-2026-08-24 sweep found a measurement
driver behind a *shipped documentation claim* living untracked on one disk, and its proposal 3 was
that a sweep cited in a document should be committed before the document lands. This is that rule
applied to itself.

**It re-implements nothing.** Where it needs to know what a narrower set would have asked for, it
calls the production `contenderGuarantee` — the same pure function `_guaranteeCeiling` calls
(`CameraDirector.js:2460`) — on a reduced point set. The membership rule, the binding term and the
frame positions are all read off the director's own `_photoFinishContenders`, `_framingProbe` and
transform.

| guard | result |
| --- | --- |
| `check-doc-links` | PASS |
| `check-index` | PASS |
| `check-config-claims` | PASS — no config value stated |
| `check-language-closed` | PASS |
| `check-tags` | PASS |

---

## 9. Build vs spec — conformity

| the spec asked | status |
| --- | --- |
| measure only; change no code, default, rule or threshold | **done** — no production file touched |
| (a) the set as built, at source, incl. when formed and whether re-formed | **done** — §2, rule read at `:2689`, capture at `:1622`, re-formed in 0 of 144 races |
| (b) case A: non-set racers within one body length; winner outside the set, with N | **done** — §3, 2.8% of 144 |
| (c) case B: passengers, and each one's width cost by replay in the schedule's units | **done** — §4, priced with the production guarantee in ln; **and the limitation is stated**: only 23 of 144 races had a set big enough to price |
| (d) the owner's case, frame by frame | **done** — §6, 3,407-frame trace, with a correction to the brief's timing |
| (e) field size: does it hold, and what causes it | **done** — §7; it does **not** hold per track |
| one paragraph saying A, B, both, or neither | **done** — at the top; **NEITHER**, with the term named |
| do not propose a fix | **honoured** — §10 is candidate directions with costs, nothing proposed as work |
| read the core count and size the pool from it | **done** — 14 cores → pool 12 |
| no fingerprints, no browser gate, no client suite, with the reason | **done** — stated above |
| tables, worked example, what the N could not support, hygiene, conformity, proposals | **done** |
| push the branch; merge the report only | **done** |

**One thing I did beyond the brief:** committed the harness (§8), on the project's own recent lesson.

---

## 10. PROPOSALS — candidate directions, with what each costs the forward view

**His requirement that the leader drifts back behind the middle is not under revision, and every cost
below is stated against it.**

**1. Nothing about the contender set is worth changing first.** (Mine.) §5 is the reason: it decides
the width on 3–5% of closing frames. Any membership change — stricter or looser — buys a different
picture on one frame in twenty and leaves the other nineteen identical. **Cost of doing it anyway:**
the work, plus a re-mint of CAMERA and RENDER for a change the owner would struggle to see.

**2. If anything is chased, it is the COMEBACK shot's exclusivity, not the contender set.** §6 is the
owner's own case and the cause there is that one shot can hold one subject: for 469 frames the camera
was on comeback subject 12 while the eventual winner ran off the top of the frame — and both finished
within one body length. **Cost against the forward view:** any fix widens the comeback shot or ends
it earlier. Widening it takes room from ahead of the subject, which is precisely the forward view he
asked for; ending it earlier takes away the comeback he asked to see. **This is a genuine conflict
between two things he has asked for, and it is his to settle, not a defect to fix.**

**3. Re-forming the set would close case A cheaply, and would still not change the picture.** The set
is captured at progress 0.970 and never revisited while the field compresses. Re-forming it would
have admitted the three racers who finished within one body length in the owner's case. **Cost:**
the source's own note says the set is captured once *because* re-sorting it is what FINISH-PAIR-1
bought — a set that can change identity mid-shot is a shot that can jump. And by §5 the guarantee
binds 3–5% of the time, so the payoff is small even when it works.

**4. The `state` factor is where the finish's width actually lives, and nobody has asked what it
should be.** (Mine.) `_photoFinishZoom` and `_leaderZoom` decide 95% of closing frames. If a finish
reads "far away", that is the number to look at, and it is a single owner-facing value rather than a
membership rule. **Cost:** it moves CAMERA and RENDER immediately and needs his eye; but it is one
number, it is already a Dev Screen control, and an A/B is one race and a toggle.

**5. `garden-path` is unmeasured here and has now failed to finish in three separate probes.**
(Mine.) It produced no winner in 16 of 16 races. Every closing-stretch measurement this week rests
on nine tracks and says so, but the same track disappearing repeatedly is worth one cheap look —
whether it is a harness frame budget or a track that genuinely does not finish. **Cost:** nothing to
the forward view; it is a harness question.

**6. A standing measurement of "was the eventual winner in frame?" would answer this class without a
sweep.** (Mine.) The one number the owner actually reacts to is whether the man who wins is visible,
and it took 160 races to establish it here. The director already knows the winner at the line and its
own transform; a per-race count of off-canvas frames for the eventual winner would make the next
version of this question a lookup. **Cost:** none to the picture — it is diagnostic only — but it is
another instrument to keep honest, and this project's record with blind instruments is in §5 of
RUNIN-NAMES-1.
