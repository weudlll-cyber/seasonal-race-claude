# START-SHAPE-1 — the shape of the start, measured before anyone builds

**Branch:** `docs/start-shape-1`, off master `fbde815d`. **MEASUREMENT ONLY.** No camera change, no
key, no fix, no revert. `CameraDirector.js` was read and never edited. **The repository's code is
byte-identical to master; this block adds one report and one index line.**

## WHAT THE MEASUREMENT FOUND, BEFORE THE TABLES

**The leader does not leave the picture because the shot is too tight around him. He leaves it
because the camera is not pointed at him yet.** At dirt-oval 3000 ms the camera is _aimed_ at screen
x **1515** and the leader is at **1517** — he is sitting on the anchor, and the anchor is 875 px
outside a 1280 px frame. That 875 px is the trail the owner described.

**The zoom hold is not the term that puts him out; it is the term that makes it visible.** A tight
shot converts a modest world-space lag into a large screen displacement.

**And the direction START-BISECT-1 proposed does not work.** Priced from the recorded frames, it
fails on every closed track and **breaks a track that is fine today**. The reason is worth more than
the candidate: the field requirement is measured _around the anchor_, so it goes blind exactly when
the camera is not on its anchor.

---

## TODAY'S PICTURE — ALL TEN TRACKS, seed 9, 20 racers, gun to 8 s

| track          | kind   | leader OUT       | worst x  | min on | aim trail | travel 1 s | fieldY drift |
| -------------- | ------ | ---------------- | -------- | ------ | --------- | ---------- | ------------ |
| city-circuit   | closed | **250–633 ms**   | **−93**  | 4/20   | 640       | 178.6      | 0.850        |
| dirt-oval      | closed | **2450–3917 ms** | **1519** | 18/20  | **875**   | 107.3      | 0.319        |
| garden-path    | closed | never            | 63       | 20/20  | 506       | 125.6      | 0.154        |
| ice-track      | closed | never            | 1133     | 17/20  | 501       | 56.3       | 0.442        |
| searound       | closed | **2133–3133 ms** | **1370** | 8/20   | 708       | 46.7       | 0.677        |
| luger-hill     | open   | never            | 1024     | 11/20  | 377       | 92.1       | 0.441        |
| mountainstreet | open   | never            | 909      | 18/20  | 237       | 140.7      | 0.225        |
| river-run      | open   | never            | 340      | 17/20  | 334       | 45.5       | 0.181        |
| seatrack       | open   | never            | 232      | 8/20   | 180       | 148.7      | 0.667        |
| space-sprint   | open   | never            | 875      | 5/20   | 290       | 165.8      | 0.715        |

**The picture is wrong on three of five CLOSED tracks and on none of the five open ones.**
city-circuit **0.25–0.63 s** (off the LEFT edge, −93), searound **2.13–3.13 s**, dirt-oval
**2.45–3.92 s**. garden-path and ice-track are closed and fine. **Every open track keeps the leader
in frame for the whole window.**

**The aim trail is the discriminator, not the track's shape.** Closed tracks trail their own aim
point by **501–875 px**; open tracks by **180–377 px**. The release is at 4983 ms on all ten, so
every one of these windows is _before_ the hold is released — the defect lives entirely inside the
hold, and the release itself is uneventful (`gun-window-truth`: centre moves 0.0 world px at the
step).

**The old defect is repaired and has stayed repaired.** On its own instrument and its own identity
(`gun-window-truth`, river-run, n=40, seed 5601), ALONG travel in the first second is **6.4 world px**
— `c3f294d1` recorded 37.4 before its fix and 6.4 after — and the field centroid sits at **fieldY
0.486** against the 0.427 that was the defect. **Zoom holds at 1.1650 throughout.** Nothing has crept
back.

---

## WHY THE FIELD REQUIREMENT CANNOT SEE THIS

`_fieldCeiling` asks `companyGuarantee`: _would every racer fit in a frame centred on the anchor?_
On dirt-oval at 3000 ms it answers **12.855** — a very loose ceiling, far above the 7.939 delivered —
while one racer is 237 px outside the picture.

**Both statements are true.** They would all fit in a frame centred on the anchor. The frame is not
centred on the anchor; it is 875 px away from it. **The requirement has the wrong centre**, and it
has it precisely in the frames where the camera is behind.

This also explains the binding flip START-BISECT-1 saw. Up to ~2 s the field ceiling binds (7.0–7.6)
and the picture is right. At 2.5–3 s the anchor jumps forward, the requirement re-measures around the
_new_ anchor, reads **12.9** — and stops binding. `state`, the hold, becomes the smallest term by
default. **Nothing loosened deliberately; the requirement simply stopped being about the picture.**

---

## CANDIDATE A — the direction START-BISECT-1 proposed. IT FAILS.

_Keep the hold, bound it by what the field requirement already demands each frame._ Composed exactly
as the director composes it, with the live requirement in place of the retired one — no new key, no
fraction.

| track        | today: leader out | **A: leader out** | today min on | **A min on** |
| ------------ | ----------------- | ----------------- | ------------ | ------------ |
| city-circuit | yes (−93)         | **yes (−220)**    | 4/20         | **0/20**     |
| dirt-oval    | yes (1519)        | **yes (1579)**    | 18/20        | **13/20**    |
| garden-path  | **never**         | **yes (−28)**     | 20/20        | **10/20**    |
| ice-track    | never             | no                | 17/20        | 20/20        |
| searound     | yes (1370)        | yes (1363)        | 8/20         | 18/20        |

**It does not satisfy the double test, and I am not adjusting it until it does.** It fixes the new
defect on **zero** closed tracks, makes city-circuit and dirt-oval worse, and **introduces the defect
on garden-path, which is fine today** (0/20 racers on screen at worst on city-circuit).

**Where it fails, precisely:** at the moment the leader is out, the field requirement is _looser_
than the hold (12.855 vs 8.460), so `min` keeps the hold — and A then delivers the hold's full value
where today's live zoom is still easing toward it. **A is slightly tighter than today, exactly when
today is already too tight.** The candidate's premise — that the field requirement is the term that
would have caught this — is what the measurement refutes.

---

## CANDIDATE B — the same requirement, read off the DELIVERED frame

The demand is unchanged ("every racer in the picture"); only its centre changes, from the anchor to
the frame the camera actually produced. The bound is **the frame edge itself** — no key, no margin,
no fraction.

| track          | B: leader out | B min on | widening (worst frame) | B fieldY drift vs today |
| -------------- | ------------- | -------- | ---------------------- | ----------------------- |
| city-circuit   | **NO**        | 19/20    | 1.70×                  | 0.596 vs 0.850          |
| dirt-oval      | **NO**        | 20/20    | 1.37×                  | 0.293 vs 0.319          |
| garden-path    | **NO**        | 20/20    | 1.00×                  | 0.154 vs 0.154          |
| ice-track      | **NO**        | 20/20    | 1.10×                  | 0.412 vs 0.442          |
| searound       | **NO**        | 19/20    | 1.76×                  | 0.518 vs 0.677          |
| luger-hill     | **NO**        | 19/20    | 1.80×                  | 0.245 vs 0.441          |
| mountainstreet | **NO**        | 20/20    | 1.15×                  | 0.208 vs 0.225          |
| river-run      | **NO**        | 20/20    | 1.38×                  | 0.135 vs 0.181          |
| seatrack       | **NO**        | 19/20    | 1.77×                  | 0.453 vs 0.667          |
| space-sprint   | **NO**        | 19/20    | 2.25×                  | 0.367 vs 0.715          |

**It satisfies the new half of the test on all ten tracks**, and the field sits _steadier_ in frame
everywhere — the old defect's own metric improves rather than degrades.

**But its cost is real and it lands where nothing was wrong.** It widens **1.38× on river-run and
2.25× on space-sprint**, tracks whose leader never leaves the picture. **That widening is larger than
the old defect itself**: what `c3f294d1` repaired was a zoom drifting 1.1650 → 1.0873 over the first
second, a **1.07×** move away from the ceremony's framing. **Candidate B would move river-run 1.38×
away from it** — the same kind of departure, larger, on the track the old defect was found on.

**So B trades one defect for a milder version of the other.** It is not the recommendation.

---

## CANDIDATE B′ — the same rule, narrowed to the subject the defect is about

Identical to B, except the frame must contain **the leader**; every other racer is framed exactly as
the director frames it today.

| track                                                             | kind     | leader out | widening (worst) | **frames changed** |
| ----------------------------------------------------------------- | -------- | ---------- | ---------------- | ------------------ |
| city-circuit                                                      | closed   | **NO**     | 1.70×            | 46 / 480           |
| dirt-oval                                                         | closed   | **NO**     | 1.37×            | 89 / 480           |
| searound                                                          | closed   | **NO**     | 1.14×            | 61 / 480           |
| garden-path                                                       | closed   | NO         | **1.00×**        | **0 / 480**        |
| ice-track                                                         | closed   | NO         | **1.00×**        | **0 / 480**        |
| luger-hill · mountainstreet · river-run · seatrack · space-sprint | **open** | NO         | **1.00×**        | **0 / 480 each**   |

**196 frames of 4800 change. All 196 are frames in which the leader was outside the picture.**

---

## THE THREE QUESTIONS, ANSWERED

### 1. Which term should decide the picture in the first seconds — and why that one

**The requirement that every racer is visible — but measured against the delivered frame, not around
the anchor.** Not the zoom hold: the hold is right, and releasing it is what reinstates the old
defect. Not the field ceiling as it stands: it reads "comfortable" (12.855) while a racer is 237 px
outside, because its centre is a point the camera has not reached.

The reason to prefer it over any other term is that **it is the only one that is a statement about
the picture.** `state`, `guarantee`, `company` and `field` are all statements about geometry around
an anchor; every one of them can be satisfied while the frame is wrong, and on three closed tracks
all four are satisfied while the frame is wrong. **The corridor and the world bounds never bind in
this window on any of the ten tracks.**

### 2. What the owner would SEE change

**On a closed track — the only place anything changes.** dirt-oval: between **2.45 s and 3.92 s** the
shot opens about **1.37×** and the leader comes back from ~240 px outside the right edge to inside
it. searound: **2.13–3.13 s**, a **1.14×** opening. city-circuit: **0.25–0.63 s**, where the leader is
currently off the **left** edge, a **1.70×** opening. **garden-path and ice-track: nothing.**

**On an open track: nothing at all.** Not "a small change" — **zero frames differ on all five**. That
is the whole point of B′ over B, and it is why the last change's mistake cannot repeat in the other
direction.

### 3. The risk of reinstating the old defect, as a number

**0 changed frames out of 2400 on the five open tracks**, including **river-run and mountainstreet —
the two tracks `c3f294d1` was measured on.** The old defect cannot be reinstated on the tracks where
it was diagnosed, because B′ never fires there.

For completeness, today's old-defect numbers, which B′ leaves untouched by construction: river-run
ALONG travel **6.4 world px** in the first second (defect 37.4, post-fix 6.4), fieldY **0.486**
(defect 0.427), zoom held flat at 1.1650.

**On the three closed tracks where it does fire, the risk is not zero and should be named:** B′
widens for up to 89 consecutive-ish frames (~1.5 s on dirt-oval), which _is_ a departure from the
held framing. It is bounded at **1.70×** worst case, it happens only while a racer is off-frame, and
it collapses to 1.00× the moment he is back. **That is the trade to put in front of him.**

---

## THE RECOMMENDATION, WITH ITS COST

**Candidate B′.** It fixes the reported defect on every track that has it, changes nothing on every
track that does not, and its risk against the old defect is a measured **0 of 2400 frames** rather
than an argument.

**Its cost, stated plainly:** on three closed tracks the shot opens by up to 1.70× for up to ~1.5 s
during the start, then closes again. **That is a visible change to the start on dirt-oval,
city-circuit and searound, and he should see it before it ships.** It also leaves the underlying
cause — the camera trailing its own aim by up to 875 px — **untouched**: B′ makes the trail
survivable rather than smaller. Whether the trail itself should be reduced is a separate question and
a separate block.

**One limit of every candidate number above.** They are computed from recorded frames by holding the
camera **centre** where the director put it and changing only the zoom. Screen offset from centre is
linear in zoom, so a re-framed position is exact for a fixed centre — but a wider shot would also
change what the world-edge clamp does to the pan. **On closed tracks the clamp never bound in this
window** (`clamp` is 0.0 throughout on dirt-oval), so the approximation is tight where it matters;
on open tracks it is untested because B′ changes nothing there.

---

## FINGERPRINTS AND THE CLOSING STATE

**Nothing changed, so nothing could move.** No source file, no config, no test — the diff is this
report and its index line. The instruments used are the committed ones
(`start-frame-capture`, `gun-window-truth`) plus a scratchpad recorder that **reads** the director's
own `_framingProbe`; it was not committed.

```
engine-reach --check reports/evolution/START-SHAPE-1.md reports/evolution/INDEX.md
  ENGINE REACH: none of 2 path(s) can reach the race engine.
```

**MINTED NOTHING.**

---

## PROPOSALS

### Proposal A — a camera commit names the tracks its numbers come from

`c3f294d1` is a careful commit that reproduced a defect, measured it, and stated before-and-after
numbers — and its claim _"racers outside the picture 0 throughout"_ is false on three of the five
closed tracks, because it was measured on two open serpentines. **This block is the second report in
a row to reach that finding**, and the cost of not having it was a three-week bisect followed by this
measurement.

**The cheap form is one clause in the ship ceremony: a camera commit states which tracks its numbers
come from.** Not "run all ten" — often pointless and always slow. **Naming the sample turns a claim
that reads as universal into one a later reader can bound**, and it would have made both of the last
two blocks unnecessary.

### Proposal B — the field guarantee should be measured where the camera is, or say that it is not

The deepest finding here is not the defect; it is that **`_fieldCeiling` answers a question about a
frame that does not exist.** It reads 12.855 — "comfortable" — while the leader is outside the
picture, and it is _correct_ about the frame it was asked about. Nothing is broken in it; it is
simply anchor-relative, and nobody has written that down where a reader of the ceiling list would see
it.

**Either it moves to the delivered frame (which is candidate B′'s whole content), or its header says
in one line that it constrains geometry around the anchor and says nothing about the picture when the
camera is behind.** The second costs a sentence and stops the next reader — or the next spec —
assuming the guarantee covers a case it structurally cannot.

### Proposal C — the trail is the cause, and it deserves its own measurement before anyone widens

Every candidate here treats the symptom. **The camera trails its own aim point by 501–875 px on
closed tracks and 180–377 px on open ones**, and the difference between those two ranges is the whole
difference between a start that looks right and one that does not.

**Nobody has measured why.** It could be the lerp rate against how fast the anchor moves on a short
closed circuit, or an anchor step at ~2.5 s that no rate could absorb — the data here shows the step
(aim jumping 907 → 1515 in one second on dirt-oval) but does not say what causes it. **That is one
evening with the instrument already written**, and if the trail can be reduced, B′ becomes a
safety net that rarely fires rather than a widening the owner has to accept.
