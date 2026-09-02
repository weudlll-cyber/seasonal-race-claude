# AIM-ROOM-LOST-1 — nothing stops the widening; the guarantee asks for one racer too few

> **ONE QUESTION, MEASURED. Nothing built, no setting changed, no value swept, no behaviour altered,
> the ship branch untouched.** Measurement and documents only — no fingerprint is in reach and the
> browser gate does not apply, so neither was run. Measured on `ship/aim-room-floor-1`, the tree the
> residual lives on.

**The answer: nothing stops it. The widening is never requested.** The company guarantee asks for
`minVisible − 1` companions on the stated grounds that *"the anchor itself is one of them"* — and
since CAMERA-LATERAL-1 the anchor is the **track centreline point**, which is not a racer. So the
guarantee is satisfied by one racer fewer than the promise. The `state` term then wins the `Math.min`
for the mundane reason that the state's own setting is **already wider** than company's understated
request. There is no fetter to remove.

---

## 1. THE CONTRADICTION, RESOLVED

It was right that a smaller zoom is a wider shot and the most demanding ceiling wins. What was wrong
is the assumption that the company ceiling is a true statement about *the promise*. It is a true
statement about a **different, smaller** demand.

A worked frame, end to end — space-sprint, seed 2, frame 574, 1280×720, 20 running:

| step | value |
|---|---|
| 1. company asked for | zoom **2.1496** |
| 1. state asked for | zoom **2.1333** ← argmin, the wider shot |
| guarantee / field / line | inf / inf / inf |
| 2. composed **target** zoom | **2.1333** |
| 3. **delivered** zoom | **2.0230** — *wider still* (delivered/target 0.948) |
| 4. anchor **intended** at | (634.65, 376.86) |
| 5. anchor **actually** at | (606.76, 423.48) — miss **54.33 px** |
| 7. guarantee internals | considered 20, skipped 0, survived 20, **need 4**, returned index **3** |
| 7. survivor ceilings | 5.2921, 4.0785, 2.4598, **2.1496**, *1.5670*, 1.2663 |
| 6. racers in shot | **4** of a promised 5 |

**Read the survivor list and the whole thing falls out.** `need = 4`, so the guarantee returns the
**4th** value, 2.1496 — the zoom at which four companions sit on the region edge. The delivered shot
is wider than that, so those four *are* in frame. Four. Plus an anchor that is not a racer. **The
fifth racer's ceiling is the next entry down, 1.5670** — and nothing ever asked for it.

---

## 2. EACH CANDIDATE, MEASURED AND ELIMINATED

Space-sprint, N=30, on the 1,480 broken-promise frames where `state` is the argmin.

**The shot is still travelling — NO.** `delivered / target` is **p50 = 1.0000**, p10 = 0.9970. It
differs on 34% of frames, and when it differs the delivered shot is **wider** than the target, not
tighter (0.948 in the worked frame). Widening more cannot be what is missing.

**The guarantee skipped candidates for `room <= 0` — NO. 0.00%.** Never fires on these frames.

**The guarantee had fewer survivors than it needed, so `Math.min(need, ceilings.length)` took what
existed — NO. 0.00%.** Never fires.

**The anchor is not where the guarantee assumed — YES, but it is not the loss.** It misses on
**100.00%** of frames (p50 74.22 px, p90 153.57, max 542.12), decomposed into a pan target that was
never going to put it there (p50 44.55 px) and a pan lerp that has not arrived (p50 59.22 px). But
the decisive counterfactual — **place the anchor exactly where the guarantee assumed, keep the
delivered zoom** — keeps the promise on only **11.55%** of frames, and the in-shot count is
**p50 = 4.00, p10 = 4.00**. Exactly `need`. **The anchor displacement is real and is not the
mechanism.**

**A bound neither of us had read — YES, and this is it.** Not a bound: an off-by-one.

---

## 3. THE ANCHOR IS THE CENTRELINE POINT, AND THE `− 1` PREDATES THAT

`companyGuarantee` (`framingRule.js:675`):

```js
const need = Math.floor(minVisible) - 1; // the anchor itself is one of them
```

That comment is true when the anchor is the subject racer. It is not true now.
`CameraDirector._setTargets` (line ~4581), CAMERA-LATERAL-1:

```js
if (pinAcross) {
  const onCentre = this._centrelineAt(headingT);
  if (onCentre) { panTarget = onCentre; subjects.point = onCentre; }
}
```

The anchor is **replaced** by the racing-line centreline point at the leader's `t` — deliberately,
and for a good reason its own comment gives: *"before the guarantees, so each of them measures from
the anchor the camera will actually use."* The guarantees were correctly re-pointed at the new
anchor. The **headcount that assumed the anchor was a racer was not.**

Measured rather than read, on both tracks:

| | space-sprint | seatrack |
|---|---|---|
| anchor vs `_centrelineAt(t)` | **p50 0.00, max 0.00** | **p50 0.00, max 0.00** |
| anchor is **not** any racer's position | **100.00%** of frames | **100.00%** |
| world px to the nearest running racer | p50 **19.75**, p90 61.61 | p50 **16.12**, p90 36.62 |

**The anchor is the centreline point exactly, on every frame, and no racer is ever standing on it** —
the leader is in his lane, which is the whole point of pinning across to the centreline.

---

## 4. WHAT THE HONEST CEILING WOULD BE — and yes, the count is reachable

Asking the same sorted list for one index further down — the zoom at which `minVisible` **racers**
are in the region rather than `minVisible − 1` companions — costs nothing to read and answers the
reachability question directly. **Nothing was changed to obtain this; it is arithmetic on the
recorded frames.**

| | space-sprint | seatrack |
|---|---|---|
| shot must widen by (state ÷ honest) | **p50 1.33×**, p90 2.26× | **p50 1.27×**, p90 1.72× |
| the honest ceiling would **win** the `min` | **93.58%** of frames | **79.09%** |
| promise **kept** at `min(state, honest)` | **100.00%** | **100.00%** |
| racers in shot then | p50 **5.00** | p50 **6.00** |

**So the wanted racer count IS reachable in those moments — on every one of them.** It is not a
geometry limit. The racers are there to be shown; the shot simply is not asked to open far enough.

**What would have to give:** the LEADER_ZOOM setting he chose. On these frames the honest ceiling is
**tighter than the state's own zoom on ~94% of them**, so it would become the argmin and override his
setting — widening the picture by a **median 1.33× and a p90 of 2.26×** on the frames concerned
(about 6% of mid-race LEADER_ZOOM frames on space-sprint, 3% on seatrack). That is precisely the
trade the guarantee is *supposed* to make — it exists to widen past the state setting when the state
setting would crop the subjects — but it is a real change to the picture he set, on a small minority
of frames, and it is his to judge.

**This also revises AIM-ROOM-CEILING-1's reading without contradicting its numbers.** That report
measured `state` as the argmin on 61% of broken frames and called it the fetter. The measurement
stands; the interpretation sharpens. `state` is not restraining anything — it wins by default because
company under-asks. The fetter is the `− 1`.

---

## 5. WHAT WAS NOT ESTABLISHED

**Whether the `− 1` is wrong everywhere, or only where `pinAcross` is true.** It is measured here on
LEADER_ZOOM frames on two tracks. `companyGuarantee` is called from two sites and the other passes
`racers.length + 1`; states whose anchor is still a racer's own position would be unaffected. That
was not swept.

**Why the anchor misses its intended screen point by a median 74 px** is measured and decomposed
(45 px composition, 59 px lerp) but not diagnosed. It is not the cause of this shortfall — the
counterfactual settles that — but it means every guarantee in the file is reasoning from a screen
position the frame does not deliver, which is a separate question and a live one.

**No fix is proposed and no value is recommended.** Changing `need`, or giving the guarantee an
anchor that is a racer, or leaving it alone and accepting `minVisible − 1` as what the setting
actually means — those are three different decisions about the picture, and none of them is a
measurement.
