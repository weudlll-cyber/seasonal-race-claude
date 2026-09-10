<!-- BEGIN CHAIN STATUS — rewritten after every piece -->
# Morning sheet

**Owns:** where things stand, right now. Whoever reads this at 7 a.m. should not have to open a
single report to know where the project is.

**Last rewritten:** 2026-09-10, after COMEBACKER-ROLE-TRUTH-1 — which CORRECTED two sentences
this sheet carried yesterday. See the marked block below.

**Where the code is.** Master is `f0debe20` (CI green). `night/2026-09-09` carries everything since
and is **NOT merged** — it waits for your eye. Ports 4000 / 4173 / 5173 are down.

---

## ★ YOUR PRECEDENCE QUESTION HAS AN ANSWER, AND IT SPLITS CLEANLY IN TWO

You asked what would happen if the camera simply **switched** to the comebacker whenever the race
director names one. Four arms, 100 races each, same seeds, nothing shipped and nothing recommended.

| arm | comeback shots on him | ★ fires per race | ★ **switches per minute** | cuts a LEAD_CHANGE short |
|---|---|---|---|---|
| **today** | 35 | — | **11.3** | 2 |
| **shorter hold** | 73 | — | ★ **14.6** | 3 |
| **precedence, HARD** — your question as asked | ★ **136** | **1.70** | **11.9** | ★ **30** |
| **precedence, MILD** — mine: once each, never over a lead change | 84 | **1.15** | **11.7** | ★ **0** |

★ **It does not make the camera restless.** It fires **1.7 times a race** (hard) or **1.15** (mild).
A race carries one to two comebackers; the arm acts about once on each.

★ **THE SHORTER HOLD CUTS THE PICTURE FAR MORE THAN EITHER PRECEDENCE DOES** — +3.3 cuts a minute
against +0.4 to +0.6 — **and buys fewer shots than the hard precedence** (73 against 136). If the
worry is a camera that jumps, **the precedence is the calmer lever and the hold length is the wild
one.** That is the opposite of how the two changes look from their descriptions.

★ **The trade you were right to worry about is the HARD arm's alone: it cuts a lead change short
30 times in 96 races — about once every three races.** The mild arm never does, and still more than
doubles today's shots. **That one constraint is the whole difference between them, and it costs 52 of
the 136 shots.** Whether a comeback is worth interrupting a lead change is a picture judgement and it
is not made here.

---

## ★ AND EVERY CAMERA NUMBER BEFORE THIS MEASURED SOMETHING IMPOSSIBLE

The hold arm held a racer chosen for his **drawn place**; the plan casts its comebackers by its own
rules; the detector offers **only the plan's cast**. At drawn place 3 the two coincided in **0 of 10
races** — so the ceiling on shots of the held racer was **zero by construction, not small**.

**Fixed: the arm now holds a racer the plan has cast. Overlap 96 of 96.**

Of 179 cast comebackers, **2 — 1.1% — are drawn inside the top 5**. The median drawn place is **27**;
78% start 21st or worse. The arm picks, among the cast, the one drawn furthest forward; **neither your
rule nor the plan's casting was overruled.** This also accounts for a **42 of 100** in an older report
that nobody had explained: at 1.1%, it cannot have come from a top-5 selection.

★★ **TWO SENTENCES I WROTE HERE YESTERDAY WERE WRONG, and a check of the source against my own
measurement found them** ([COMEBACKER-ROLE-TRUTH-1](../reports/night/COMEBACKER-ROLE-TRUTH-1.md)):

- I wrote that *"the plan casts comebackers from racers who start deep, because that is what makes a
  comeback"*, and called the collision **structural**. ★ **Neither assignment site reads the drawn
  place.** Both gate on rank at the CHOREO BOUNDARY, a different axis. **The 1.1% stands as a
  measurement; the explanation I attached to it does not**, and post-chaos rank was never recorded, so
  this is now an open question rather than a finding.
- I offered *"he reaches the top 5 in 95 of 96"* as evidence the hold produced a climb. ★ **Every cast
  comebacker is ASSIGNED a final rank of 5 or better — 179 of 179 measured.** The plan steers him
  there. So that number restates the rule that picked him and says nothing about the arm. **The
  control that would have made it evidence — the same racer, no hold — was never run.**

**What is unaffected: the 96/96 overlap, the 35 shots (81% of all comeback shots), and every number in
the four-arm table above.** None of them depends on the role's definition or on the drawn place.

★ **And the role itself is not what the brief and I both assumed.** `heroCurveGenerator` casts
`comebacker` at **two** sites, not one: the assigned winner (final rank 1) accounts for **37.4%**, and
the other **62.6%** are B1-band finishers assigned 2nd to 5th.

---

## WHAT ELSE IS ON THE BRANCH

- **The image build** was asking for 14 194 files to use 52. Narrowed; **what ships is byte-identical**
  (6 013 files, every md5) and the guard's build went 7.0 s → 3.8 s.
- **The registry the race engine reads no longer carries the network.** All four fingerprints unmoved;
  hull 197 → 196.
- **The e2e geometry flake** was reproduced and **deliberately not fixed** — `Failed to fetch` against
  a *listening* API, all in one instant at startup. A harness fix would mask it if the API is at
  fault. What would settle it is named.

---

## NEEDS HIS WORD

- ★ **Your eye on the MILD precedence, now that it is built.** You chose it on 2026-09-10 and it
  shipped without a key ([COMEBACK-PRECEDENCE-1](../reports/evolution/COMEBACK-PRECEDENCE-1.md)).
  Two of the arm's four numbers did not reproduce and the report says why; what is left is the
  picture, and that is yours.
- ★ **`holdGate = Math.max(minHold, stateCap)`** — a *maximum* acting as a floor in five of six states.
  It is the lever behind every comeback number, and arm B shows shortening it is the noisiest option.
- **The e2e `Failed to fetch`** — harness or serving defect, unresolved on purpose.
<!-- END CHAIN STATUS -->

<!-- The 2026-09-05 sheet that used to sit here is REMOVED, 2026-09-10 (MERGE-NIGHT-0909). It was
     not merely out of date: it carried its own RUNNING, OPEN and a SECOND "NEEDS HIS WORD" list,
     and its central claims were false as written — "five pieces on night/2026-09-05, none merged"
     and "feat/playable-four-1 is at origin, unmerged". Checked with git rather than read: neither
     branch exists at origin any more, and all six of the reports it summarised are on master. A
     stale second decision list under a current sheet is how a ghost list rebuilds, so it is cut
     rather than refreshed. Nothing is lost: reports/night/INDEX.md indexes every one of them, and
     each report is the canonical home of the decisions it left open. -->
