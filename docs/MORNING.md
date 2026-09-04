# Morning sheet

**Owns:** where the chain stands, right now. Rewritten after every piece, not at the end.
Whoever reads this at 7 a.m. should not have to open a single report to know where things are.

**Last rewritten:** 2026-09-04, after the THIRD chain of the day — your two decisions on the pictures
and the finish. **Eight pieces, eight merges across the day, master green after every one, step 12
done each time, clean tree.** Origin holds `master` and nothing else. **Nothing was minted; no minting
permission was given and none was needed.**

---

## ★★ WHERE THE EIGHT WENT — AND THE ONE THAT DID NOT DO WHAT WAS ASKED

| | | |
| --- | --- | --- |
| **6** | **the validator no longer discards a whole config over one key** | MERGED. The repair you ordered — and it **removed the reason piece 4 needed a precondition at all** |
| **4** | **the loader's bound matches the slider's**, with the reason written at the bound | MERGED |
| **1b** | **the duplicate-by-capital is gone** — one picture stored twice | MERGED |
| **3** | **Quick Test obeys the track's cap** | MERGED |
| **5** | **the sweep fails in under two seconds instead of hanging fifteen minutes** | MERGED |
| **2** | **garden-path was NOT taken into the gate** | MERGED as a diagnosis. **Your own rule stopped it** |
| **1a** | the five pictures were laid out for your eye | **ANSWERED — all five deleted** |
| **7** | **the five dead client pictures are gone**, 21.32 MB to 0 | MERGED |
| **8** | **the accepted finish behaviour is recorded beside the items** | MERGED |

---

## ★★ BOTH OF YESTERDAY'S OPEN DECISIONS ARE CLOSED

**THE FIVE PICTURES ARE GONE.** You looked at all five pairs and wanted the picture the game already
uses in every case, so all five were deleted — **12,585,667 bytes**, and with the duplicate removed
earlier the folder went from **21.32 MB to 0**. Reachability was re-established **uncapped** first,
because deletion is the irreversible step: six searches, including the path built in PIECES and
`url()`/`<img>`/`src=` across every stylesheet and markup file. **But what settles it is not a grep** —
`trackLoader.js` builds *every* client-side background path as an API URL, and the one module that
loads a background is fed from exactly two call sites that read that field.

**THE FINISH BEHAVIOUR IS ON THE RECORD.** Items 9 and 10 now say, where a reader meets them, that
they encode an ideal you considered and rejected.

---

## ★★ ONE NEW THING THAT NEEDS YOU

**DIRT-OVAL FAILS ITEM 7 AT SEED 3 — A CONTENDER OFF CANVAS ON 78 FRAMES.** It is not one of the two
items, it is **not accepted behaviour**, and it is the one thing an exclusion is still hiding. It fell
out of re-reading data already measured; it is reported and **not diagnosed** — how a racer still in
with a chance leaves the canvas for over a second is unexamined.

*(Also still open from before, unchanged: whether item 2 — which measures the accepted closing-zoom
behaviour **directly** — should carry the same acceptance note. Your acceptance named two items and
item 2 was not one of them, so it is flagged and left to you.)*

---

## ★★ THE GATE STILL HAS NOT MOVED — AND NOW THE EXCLUSIONS MEAN SOMETHING DIFFERENT

Garden-path was not taken in: both its failures are real picture behaviours, and the gate runs the one
seed where it fails both. **That still stands.** What changed is *why* the exclusion is unjustified.

**It is no longer justified by a defect.** Items 9 and 10 object to the two behaviours you have now
accepted, so the exclusion is justified by items that object to something wanted — **a different and
weaker reason**. Widening the gate now would make it red on day one for behaviour you chose, which is
the trap the earlier piece avoided.

★ **THE THREE EXCLUDED TRACKS ARE IN THREE DIFFERENT CASES**, and a reader working from memory will
get this wrong:

| | fails | rests on the two accepted items alone? |
| --- | --- | --- |
| **garden-path** | items 9 and 10 at the gate's seed, and nothing else | **yes** |
| **luger-hill** | item 2 only | **no** — same behaviour, a different item |
| **dirt-oval** | item 2, **and item 7 at seed 3** | **no** — and item 7 is not accepted |

★ And what the exclusion costs is still **not a track**: both gate tracks cross with the zoom already
arrived, so the gate is structurally blind to these behaviours. **The lever is which RACE it runs.**

---

## ★★ THE ONE THAT CHANGED THE MOST IS THE ONE YOU ORDERED

**A single bad key used to cost an operator EVERY tuning in that store**, silently, with nothing
naming the key that did it. Five of the seven stores did it; the dynamics store alone gated forty-odd
keys behind one `return`.

It had a second cost, and that one shaped decisions rather than storage: **a loader bound could never
be TIGHTENED**, because tightening it confiscated everything else from anyone holding the
newly-illegal value. **The tolerance was protecting people from the validator, not from the value.**

Now a rejected key falls back to **its own default, alone**; every other key survives; and the
console says which key, what was stored, and what is being used instead. **Then piece 4 moved the
bound an hour later with nothing at risk.**

★ **THE CENSUS CORRECTS WHERE TO LOOK.** The brief named the camera validator. **The camera store
validates nothing at all** — the whole-object reject is in the dynamics store. Five discard
wholesale; two never validated anything, and those two are **left alone**, because giving them rules
would mean inventing bounds nobody has measured.

★ **AND MY FIRST ATTEMPT SILENTLY CHANGED WHICH CONFIGS ARE LEGAL — 4,204 times in 60,003.** Every
one was `NaN`: `!(x <= 0)` is **not** `x > 0`, and they differ on exactly the one value nobody
re-reads a range check for. Caught by running the new rules against **the old chains extracted from
`master`**, not by reading the diff. Every rule is now the literal negation of the clause it
replaced, and the second run is **0 disagreements in 160,004**.

★ **YOUR STORED CONFIG: I COULD NOT READ IT.** Reading a browser profile is blocked here, correctly,
and that is said rather than worked around. **What replaces it is stronger than one snapshot**: these
loaders are pure functions of the stored object, the accepted set is now proven identical, and a
config with no failing key is returned untouched — so **any** config that loaded correctly before
loads identically now, whatever it holds.

---

## ★★ THE INSTRUMENT THAT HUNG — AND THE ONE I WAS NOT SENT FOR

The sweep's build ran with its output discarded, was awaited on `exit` **alone** with no timeout, and
nothing checked that it had produced anything — **three faults in four lines**, any one enough. Three
sabotages now fail in **under two seconds each**, naming what was expected and what was found.

★ **The old promise is DEMONSTRATED to hang**, not argued to: extracted from `master` and run against
a child that cannot start, it never settles.

★ **I could not reproduce the original fifteen minutes**, and say so rather than dressing a guess as
a diagnosis. The repair is of the **class** — the only honest one available when the symptom will not
come back on demand.

★ **THE CLASS IS SMALLER THAN THE GREP SUGGESTS, AND ITS WORST MEMBER WAS NOT THE ONE I WAS SENT
FOR.** The discriminator is not "ignored stdio" but **asynchronous, or reaching the network**. The
two `git ls-remote` calls in `check-tags.mjs` — the only children in `scripts/` that touch the
network — had **no timeout at all**, so a credential prompt would block a gating guard indefinitely.
Bounded now. Roughly fourteen synchronous children cannot hang on a promise and are not members.

★ **AND TWO DEFECTS IN MY OWN FIX, both found by RUNNING it and neither by reading it**: `spawn` out
of scope — a repair for a hang that shipped a crash — and a failed build **leaking the API server**,
so the next run would have failed at a login with a timeout that reads like a product defect. That is
word for word the failure that file's own teardown comment already describes.

---

## ★ THE SMALLER THREE

**QUICK TEST NOW OBEYS THE TRACK.** It capped its own roster at a hardcoded number whatever the track
was, so a Quick Test could start a field the Start button had just learned to refuse. It reads the
same authority now, through **one** expression — so the piece **removed a copy rather than adding
one**. Two halves, mirroring the Start button: the input stops at the cap, **and** the field is still
checked, because switching the quick track from an open one to a closed one reaches an over-cap field
with no control misused. **Told, not tidied.** ★ Green on the first run proves nothing, so it was
sabotaged: **a clamp-only implementation looks like a fix and fails exactly the three specs that
matter.**

**THE DUPLICATE PICTURE IS GONE.** Same sha256, same byte count, two spellings of one name — the same
name to Windows and a different name to git. The lowercase copy in the seeds is kept: it is the one
the API serves, it matches every other filename in both directories, and the client copy was read by
nothing.

**AND RULE F CAUGHT MY OWN EDIT AGAIN**, the second time in two days. Inserting lines into
`SetupScreen.jsx` shifted three paired citations in `branding.md` off their targets — and reading them
showed they were **already wrong in intent**, passing only because a symbol happened to fall inside a
line range. Re-anchored to the code their sentences are actually about, rather than re-pointed at a
fresh coincidence.

---

## ★ WHAT NONE OF THIS COVERS

- **Four seeds per track, not forty**, behind every garden-path claim. The nightly sweep would settle
  the battle-shot hypothesis and how often the late photo-finish happens.
- **The `NaN` hole in the config validators is PRESERVED on purpose.** The old chains accepted it and
  so do these. It is unreachable through storage — `JSON.stringify(NaN)` is `null` — and tightening
  it is its own decision, not a side effect of this one.
- **The five diag runners still have no `error` handler.** They terminate rather than hang, so that is
  a message improvement and not a hang removal.
- **Nothing was minted, and nothing needed to be.** All four fingerprints match the record after every
  piece that could reach them, run rather than argued from routing.

---

## THE PREVIOUS CHAIN — 2026-09-04, EARLIER

The fifteen pieces of the first chain are recorded in `reports/evolution/`, and their five open
decisions (A–E) are the ones this chain closed: **A** is the five pictures above, still yours; **B**
was the gate; **C** was Quick Test and the four maxima; **D** was the stored 0.65; **E** was the
instrument that hung. **B through E are done.**
