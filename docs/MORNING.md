# Morning sheet

**Owns:** where the chain stands, right now. Rewritten after every piece, not at the end.
Whoever reads this at 7 a.m. should not have to open a single report to know where things are.

**Last rewritten:** 2026-09-04, after the SECOND chain of the day — your five decisions plus the one
you ordered. **Six pieces, six merges, master green after every one, step 12 done each time, clean
tree.** Origin holds `master` and nothing else.

---

## ★★ WHERE THE SIX WENT — AND THE ONE THAT DID NOT DO WHAT WAS ASKED

| | | |
| --- | --- | --- |
| **6** | **the validator no longer discards a whole config over one key** | MERGED. The repair you ordered — and it **removed the reason piece 4 needed a precondition at all** |
| **4** | **the loader's bound matches the slider's**, with the reason written at the bound | MERGED |
| **1b** | **the duplicate-by-capital is gone** — one picture stored twice | MERGED |
| **3** | **Quick Test obeys the track's cap** | MERGED |
| **5** | **the sweep fails in under two seconds instead of hanging fifteen minutes** | MERGED |
| **2** | **garden-path was NOT taken into the gate** | MERGED as a diagnosis. **Your own rule stopped it** |
| **1a** | **the five pictures are laid out for your eye** | **WAITING ON YOU.** Nothing deleted |

---

## ★★ THE TWO THINGS THAT NEED YOU

### A. THE FIVE PICTURES

They are on one page, each beside the seed picture it shares a name with, with a measured difference
map — openable with no build and no server:

**https://claude.ai/code/artifact/bb599320-aa57-41e3-b8c3-14b68f78ad40**

What each one is. **No judgement about which is better:**

| | |
| --- | --- |
| `garden-path.png` | **the same garden, replanted.** Identical composition — same greenhouse in the corner, same fountain along the bottom — different planting |
| `space-sprint.jpg` | **the same sky, graded differently.** Same galaxy, nebula band and ringed planet in the same places; cool violet against warm rose |
| `dirt-oval.jpg` | **the same racecourse, a different day.** Same aerial, same grandstands; a bleached straw infield against a deep green one with horses working the far turn |
| `river-run.png` | **two different rivers.** A naturalistic daylight aerial — willows, canoes, swans — against a dark, graphic, stone-lined channel |
| `city-circuit.png` | **night stadium against day speedway.** Only the word "oval" is common to them |

**Nothing is deleted until you say so.** The sixth file — the byte-identical duplicate — is already
gone, because that was never a picture question.

### B. TWO PICTURE QUESTIONS OUT OF THE GATE WORK

Both raised by measurement, neither repairable without your eye:

1. **Should the photo-finish shot have ARRIVED by the crossing?** Today it has not on **three of ten
   tracks** at the seed the gate runs. On garden-path that leaves the winner near the bottom edge of
   the frame, with the shot still tightening, more than a second after he wins.
2. **Should the leader's walk survive a battle shot?** A battle shot in the endgame window frames the
   battle rather than the leader, and the walk does not happen.

---

## ★★ THE GATE DID NOT MOVE — AND THAT IS YOUR RULE APPLIED, NOT OVERRIDDEN

You authorised taking garden-path in **conditional on the diagnosis**, and gave the rule: *the
instrument's or a threshold's, fix it and take the track in; genuinely the track's, STOP.*

**Sixteen races later: both failures are real, and NEITHER BELONGS TO GARDEN-PATH.** It **passes item
9 at three of the four seeds measured** and item 10 at two of four. Item 9 fails when **the
photo-finish zoom has not arrived at the crossing** — the camera is still tightening *under* the
winner, who slides down the frame past the bound. Item 10 fails when a **battle shot** sits in the
endgame window. **Both are per-RACE camera behaviours, and both appear on more than one track.**

**The gate runs one seed — and it is exactly the race where garden-path fails both.** It would have
been red the day it was widened, which is how a gate stops gating. **So the gate is UNCHANGED:
neither stricter nor wider.**

★ **AND WHAT THE EXCLUSION COSTS IS NOT A TRACK.** Both gate tracks cross with the zoom **already
arrived**, so the gate is **structurally blind** to both behaviours — not because garden-path is
missing, but because neither of its own two races shows them. **The lever is which RACE the gate
runs, not which track.**

★ **Garden-path is also not the only excluded track that fails.** **luger-hill and dirt-oval fail
item 2** at the same seed, from the *same* late-zoom mechanism. Three excluded tracks fail something,
on two items, from one underlying behaviour — and none of it is visible to the gate.

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
