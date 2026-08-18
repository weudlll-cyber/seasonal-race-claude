# STRAGGLER-TRUTH-1 — phase 6 is measured, both old numbers were wrong, and the ending is not showing the people it waits for

**Branch:** `feat/straggler-truth-1`, off master `8e9a111f`. **MEASUREMENT ONLY.** No camera change,
no behaviour change, no key. The diff is one instrument, the answer written into
`docs/ENDING-PHASES.md` where the open question stood, and this report.

## WHAT WAS OPEN

`docs/ENDING-PHASES.md` described phase 6 — the wait for the stragglers — with two numbers it had
flagged as **unverified** on 2026-08-14, because nothing in the repository measured them. That audit
said the instrument would be a small job and proposed it rather than doing it. This is it:
`scripts/straggler-truth.mjs`.

## THE NUMBERS — one CLOSED track and one OPEN one, at 20 and at 40 racers, seed 9

| track | n | phase 6 lasts | zoom-out begins BEFORE the last crossing | still running then | of those, off canvas | frames of phase 6 with someone outside |
| ----- | - | ------------- | ---------------------------------------- | ------------------ | -------------------- | -------------------------------------- |
| dirt-oval | 20 | **6.18 s** | **4.57 s** | 11 of 20 | **11** | 220/371 (**59%**) |
| dirt-oval | 40 | **7.53 s** | **5.75 s** | 29 of 40 | **27** | 243/452 (**54%**) |
| river-run | 20 | **4.45 s** | **2.30 s** | 7 of 20 | **6** | 200/267 (**75%**) |
| river-run | 40 | **5.95 s** | **4.38 s** | 33 of 40 | **28** | 201/357 (**56%**) |

### Claim 1 — "~2.9 s at 20 racers" — **WRONG**

**4.45 s** on the open track and **6.18 s** on the closed one: 1.5× to 2.1× the recorded figure. And
it **grows with the field** — 5.95 s and 7.53 s at 40 — which the old single number could not have
expressed at all. Field size matters here for the same reason it mattered to the start this week.

### Claim 2 — "the zoom-out starts ~1.4 s before it ends" — **WRONG, in the direction the audit suspected**

It starts **2.30 s to 5.75 s** before the last crossing. The audit doubted 1.4 s on the grounds that
the zoom-out's own duration is longer than the lead it claimed, and it was right. **The separate
measurement that recorded 4.4–5.9 s stands.** The ending overlaps the race by between two and six
seconds.

### The question neither number asked — and it is the one worth having

**When the zoom-out begins, half to three-quarters of the field is still racing, and almost all of
them are already off the canvas.** On dirt-oval at 20 racers, **all 11** of the still-running racers
are outside the picture on that frame; at 40, **27 of 29**.

Across the whole of phase 6, **54–75% of frames have at least one unfinished racer outside the
picture**, and on **three of the four runs there is at least one frame in which not a single
unfinished racer is in shot** — the camera is holding a settled picture of an empty stretch of track
while people are still finishing the race behind it.

**The mechanism is not a defect in the zoom-out, and it is worth naming so nobody repairs the wrong
thing.** FINISH_OVERVIEW holds a FIXED world point `finishOverviewLookbackPx` behind the line,
deliberately, so that later finishers cross **in shot**. A racer further back than that lookback is
outside the frame by construction. The shot is doing exactly what it was designed to do; what is
open is whether the ending should go on waiting for people it has stopped showing.

## THE INSTRUMENT

`scripts/straggler-truth.mjs`. It reads two signals and reconstructs nothing:

- **the crossings** — `st.finishedCount` rising, the race's own count rather than a re-derivation
  from `t`;
- **the zoom-out** — `cd._inFinishMode` turning true. That latch **is** FINISH_OVERVIEW beginning,
  and it is the same one the director's four framing sites read, so the instrument cannot drift from
  the thing it is timing.

Everything else — how many unfinished racers are on the canvas — goes through `cd._proj.toScreen`
with the zoom and offsets the director **delivered**.

**The answer now carries a `MEASURED:` stamp**, which is the other half of the original complaint:
those two numbers had no provenance, so a reader had been taking them as established. It depends on
`CameraDirector.js`, which is where FINISH_OVERVIEW is decided, so the next change to the ending's
timing will be asked to re-measure this rather than inherit it.

## THIS IS A FINDING, NOT A REPAIR

Nothing was changed. **The owner accepted the start on 2026-08-21 and nothing tonight touches the
race, the camera or the picture.** If the ending should hold the stragglers in shot, that is a design
decision with a cost, and the cost is in the proposals below.

**No fingerprint can move**: the only non-document file added is `scripts/straggler-truth.mjs`, and
the closure walk puts it inside **none** of the four instruments (WORLD/WORLD-OFF 36, CAMERA 36,
RENDER 53). Measured anyway, and all four reproduce the record.

## PROPOSALS

1. **The lookback point could follow the last unfinished racer instead of sitting still.** It is a
   fixed world point today, chosen so finishers cross in shot; making it the rearmost *unfinished*
   racer's position would keep the people the ending is waiting for inside the frame. **Cost:** it
   turns a fixed anchor into a moving one during FINISH_OVERVIEW, which is a camera change in the
   endgame, moves CAMERA and RENDER, and needs his eye — exactly the kind of change tonight was told
   not to make.
2. **Or phase 6 could stop waiting.** The ending currently runs until `finishedCount >= nRacers`;
   it could instead run until the last racer *in shot* is home, and let the rest finish off camera.
   **Cost:** it changes when the result screen appears, which is a product decision rather than a
   camera one, and at 40 racers it would cut between two and six seconds from the ending. **Both of
   these are his call and neither is recommended here.**
