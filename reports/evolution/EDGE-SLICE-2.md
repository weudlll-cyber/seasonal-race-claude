# EDGE-SLICE-2 — the racer is Nova, he fails BOTH conditions, and my earlier reason was wrong

**Branch:** `feat/contender-zoom` @ `73781bda`. **DIAGNOSIS ONLY — product source untouched, nothing
minted, 4173 unchanged.** Corrects [EDGE-SLICE-1](EDGE-SLICE-1.md), which stands as written.

---

## 1. Colour IS reachable — and it is not a safe way to name a racer

EDGE-SLICE-1 said a headless run has no colours "because they are assigned in the screen layer".
True, and the wrong conclusion: `client/src/screens/RaceScreen/renderState.js` is an ordinary module
and the harness can call it. The mapping:

```
RACER_COLORS = [ #ff6b35 orange, #4fc3f7 light blue, #a5d6a7 green, #ffcc02 yellow,
                 #ce93d8 VIOLET, #f48fb1 pink,       #80cbc4 teal,  #ffab40 amber,
                 #90caf9 pale blue, #ef9a9a salmon ]
r.color = RACER_COLORS[ARRAY POSITION % 10]
```

**It is assigned by array position modulo ten, so it is not a stable identifier**: change the field
size or the roster order and every racer's colour moves. That is the real limitation, and it is
worse than "unreachable" — a colour read from one run does not carry to another.

**In this run, neither violet racer is anywhere near the top edge:**

| violet racer | rank | physicalY | screen | gap |
| --- | --- | --- | --- | --- |
| Apex | 11 | −0.60 (inner) | (−903, 974) | 7.83 lengths |
| Speedy | 17 | −0.31 (inner) | (−2154, 1407) | 14.02 lengths |

Both are far off frame and on the **inner** side. So the colour in the owner's live run maps
differently from a 20-racer harness run — which the modulo-ten rule predicts.

**His own identification is the reliable one, and it agrees with the geometry**: he named Nova, and
Nova is the racer at the top edge on an outer lane while the winner sits near the middle.

## 2. Every racer at or beyond the top edge — enumerated, not picked

At the crossing frame, the winner (Surge, amber) is at **physicalY −0.14**, near the centreline.
**Two of twenty** racers have their body top above the canvas top:

| rank | name | idx | colour | physicalY | lane vs winner | gap | level? | ahead on his lane | body in frame | contender? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 5 | **Nova** | 19 | salmon | **0.60** | **0.74 outward** | 1.60 | NO | **Blaze (r4)** | **43%** | **no** |
| 7 | Ridge | 15 | pink | 0.75 | 0.89 outward | 2.45 | NO | Nova (r5) | 0% | no |

**Nova matches the owner's description exactly** — topmost, outer lane, winner near the middle, and
43% of him showing.

## 3. Both conditions, judged at the frame that decides them

**The set is captured ONCE at entry and never re-sorted** (FINISH-PAIR-1), so a gap measured at the
crossing says nothing about whether a racer qualified. It shows: the contenders read 0.00 / 1.31 /
1.51 lengths at the crossing, two of them past the one-length rule, because they drifted after
capture. **The capture frame is the one that decides membership:**

| rank | name | physicalY | gap | nearly level? | ahead on his lane | contender? |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Surge | −0.25 | 0.00 | yes | none | **YES** |
| 2 | Turbo | 0.11 | 0.10 | yes | none | **YES** |
| 3 | Blaze | 0.49 | 0.79 | yes | none | **YES** |
| 4 | Comet | −0.08 | 0.81 | yes | Surge, Turbo | no |
| **5** | **Nova** | **0.65** | **1.21** | **NO** | **Blaze (r3)** | **no** |

**Nova fails BOTH conditions at the deciding frame:** 1.21 body lengths back against a one-length
rule, and blocked across the track by Blaze — who is himself a contender, 0.79 back on a free lane.

**This is not a rule violation.** And **no contender is cut or outside** at the crossing: Surge,
Turbo and Blaze are all WHOLE.

## 4. The correction I owe

EDGE-SLICE-1 said Nova was "directly behind the leader on the same lane". **That was wrong.** The
`#1` in that output was an ARRAY INDEX, not a rank, and I read it as the leader. He is behind
**Blaze**, who was third at capture. The conclusion — not a contender — was right; the reason I gave
for it was not, and the owner was right to stop us.

Two things in that report are now superseded: the claim that colour is unreachable (§1 here), and the
attribution of who blocks him (§3 here). Its pooled slice figures are unaffected.

**No conclusion is drawn about "never half-cut"** — that was not this step's question. The one figure
belonging to this frame: including Nova whole would take **21.3% more width**.
