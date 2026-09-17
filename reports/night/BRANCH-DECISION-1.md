# BRANCH-DECISION-1 — the two open branches, prepared for his decision

Branch `night/2026-09-17`, piece 4. Date: 2026-09-18. **NOTHING WAS MERGED, TAGGED OR DELETED**, as
instructed. Both branches are exactly as they were at origin; the only thing done to either was to
read it and to test it against master with `git merge-tree`, which writes nothing.

| | |
|---|---|
| master head tonight | `5b60b615` |
| `feat/remove-prestaging-comebacker` | **`5c9e050e`** — 2 commits ahead, **88 behind** |
| `night/2026-09-14-history` | **`cba9c774`** — 5 commits ahead, **101 behind** |

---

# A · `feat/remove-prestaging-comebacker` — the one that changes the race

## What is in it

Two commits, five files. **One of them is engine code.**

| file | what |
|---|---|
| ★ `client/src/modules/heroCurveGenerator.js` | the change itself — **in the engine hull** |
| `heroCurveGenerator.test.js`, `stagedComeback.test.js` | the guard that goes red if the removal is undone |
| `docs/ARCHITECTURE.md`, `docs/DEAD-ENDS.md` | the record, as section **S** |

**It removes the pre-staging comebacker casting path** — the second branch of the B1-pool loop in
`castHeroes`, which cast `addSolo(… 'comebacker' : 'sovereign-lead')` for any pool member the staged
path did not take. ★ **That was not a fall-back bolted on beside the staged path. It was the ORIGINAL
casting path, unchanged since the generator was written on 2026-07-08**; the staged path was inserted
in front of it on 2026-09-11 and deliberately left it standing so a refused staging stayed
byte-identical. After this branch, **the B1 pool casts at most one racer per race, and when the
staging is refused it casts nobody.**

## ★★ ITS OWN MEASUREMENTS PULL AGAINST WHAT SHIPPED THREE DAYS AGO

This is the finding that decides the recommendation. The branch is honest about it — the table is its
own, on the owner's fixture, city-circuit, 40 racers, N=300, call sites separated:

| | before | after |
|---|---|---|
| comebackers per race | 1.82 | **1.32** |
| races with no comebacker at all | 5 (1.7%) | **20 (6.7%)** |
| mean cast racers per race | 5.43 of 40 | **4.93 of 40** |
| ★ **breakaway share** | 59.3% | ★ **63.0%** |
| ★ **worst lead of 300 races** | 313.9 world px | ★ **420.9 world px** |

★ **The removal RAISES breakaways and grows the worst lead**, and its own explanation is the right
one: *"Removing a steered racer makes an unsteered one"* — uncast racers are the dominant breakaway
producers.

★★ **The gap leader brake shipped to master on 2026-09-17 to do the opposite.** It was merged
precisely to cut the tail of the leader's lead, and its mint records the largest lead falling
**244.4 → 187.5 world px** with the median almost unmoved. **So master now carries a mechanism that
pulls this number down, and this branch carries a change measured pulling it up.**

★ **THE TWO NUMBERS ARE NOT DIRECTLY COMPARABLE and are not presented as if they were** — the branch
raced 300 races on one fixture, the brake's figure is 300 races pooled over ten tracks, and the
medians differ (113 px against 88 px), so the fixtures are not the same population. **What is
comparable is the direction, and the direction is opposed.**

## Do the measurements still hold now master has moved?

**No — and this is the answer to the question as asked.** Every number above was taken before the
brake existed. The brake acts on the leader's lead in the last stretch of the race; the removal acts
on how many racers are steered at all. **They meet on exactly the quantity each is measured by.**
Nothing in the record says what the removal does to a braked race, because no such race has been run.

## What merging would change, and what deleting would lose

**Merging changes the shipped race, and pulls the full ship ceremony with it:**

- It merges cleanly — **verified tonight against `5b60b615`**, no conflicts, despite 88 commits of drift.
- ★ **It moves a golden race.** `closed-garden-path-12`'s winner moves Flash → Nitro (36.592 → 36.496 s).
  The branch names this itself. Golden races would have to be re-recorded — which the brake ship did
  **not** have to do, because a `defaults.js` change cannot reach a fixture that pins its own inputs.
  **This is engine code, so it can.**
- All four fingerprints would move and need minting, **and a mint needs your eye first.**
- ★★ **Below 20 racers the B1 pool would cast NOTHING AT ALL** — 100% of races at n = 10, 12, 16, 19,
  against 2–5% before. A 12-racer field is not a size you race, but it is a regime change and the
  branch says so rather than leaving it to be found.
- It touches neither `defaults.js` nor `docs/fingerprints.json`, so **there is no key to turn it off
  with.** Merging it is not reversible by a setting.

**Deleting loses something that exists nowhere else.** Section S carries a **correction to the three
figures the removal was decided on**. All three — *1.09 of 1.82 comebackers, 18% held the biggest
lead, 53.7% were the drawn rank-1 racer* — were measured per call site and **belong to the
drawn-winner site, which this branch keeps**, not to the path it removes. The removed path was
**0.51 per race, 1.3% of biggest leads, 1 drawn-winner in 153 — the least consequential of the three
sites.** If the branch goes, that correction should be lifted into `docs/DEAD-ENDS.md` on master first.

## ★ RECOMMENDATION — keep it, do not merge it yet, and re-measure before you decide

**One sentence: it is a clean, well-guarded, well-documented branch whose only measurement was taken
against a race that no longer exists, and the mechanism that replaced it works against it.** Re-race
its N=300 fixture on braked master and read the breakaway share and worst lead again; that is a few
hours and it is the whole decision. **Merging it tonight would quietly spend part of what the brake
bought, with no measurement saying how much.**

---

# B · `night/2026-09-14-history` — the one that changes nothing

## What is in it

Five commits, three files, **no engine code and no product code of any kind**:

| file | what |
|---|---|
| `reports/evolution/BREAKAWAY-HISTORY-1.md` | **new, 298 lines** — the whole substance |
| `reports/evolution/INDEX.md` | its index entry |
| `docs/MORNING.md` | that night's morning sheet |

**What the report says.** Against your recollection that races used to have far fewer runaway
leaders: **raced against raced races, the race itself did not change.** At five points of master
between 2026-08-04 and 2026-09-12, **all 30 races are bit-identical at all five stands** — same
winner, same duration, same peak lead to the last digit; the leader's largest lead sits at **113.2 px
median, 223.5 at p90, the same number at every stand.**

★★ **What moved was the camera.** Every shipped default that changed in those six weeks is a camera
key, and across the merge that carries the step the race is bit-identical in 300 races while **84 of
those 300 changed how big the gap LOOKS, 80 of them larger** — at p90 the same gap covers **7.8% more
of the screen.** One key: **`contentionWatch`, shipped 2026-08-22 in `d4bad558`**, which you judged on
a production build and accepted.

## Do the measurements still hold now master has moved?

**They hold as history, and they have acquired an end date.** The report measures a window that
closes at **2026-09-12**; master moved on **2026-09-17**. ★ **The gap leader brake is the first
shipped change in that whole six-week span that acts directly on the quantity this report holds flat**
— that is what it was merged to do. **A sixth stand taken tonight would not match the other five, by
design and not by defect.**

So the report's finding is intact and its headline is not: merged as it stands, the tree would carry
*"the race itself has not changed at all"* as a present-tense sentence. **One dated line fixes it**,
and it is the only edit the report needs.

★ Its own sweep was honest — **verified tonight**: the report says its instruments lived in
`C:/tmp/hist` and were swept, and `C:/tmp/hist` does not exist.

## What merging would change, and what deleting would lose

- **It changes no race, no default, no fingerprint, no golden race.** There is nothing to mint and
  nothing for your eye to judge.
- ★ **It conflicts in two files — `docs/MORNING.md` and `reports/evolution/INDEX.md`** (verified
  tonight against `5b60b615`). **Both are append-style shared documents and neither conflict is
  semantic**: two different nights wrote to the same place. The MORNING.md conflict is the larger of
  the two and **has grown tonight**, because this chain writes to that file after every piece.
- **Deleting loses the whole report.** It is the only measured answer to a question you actually
  asked, and the only written record that the runaway impression is a **framing** change with a named
  cause and a named commit. Nothing on master carries it.

## ★ RECOMMENDATION — take the report, drop the branch's morning sheet

**One sentence: merge it for the report alone, resolving MORNING.md by keeping master's side
wholesale.** The branch's MORNING.md is a superseded night sheet and re-litigating it against tonight's
is work with no product in it; the INDEX conflict is one line placed next to another. Add the dated
line to the report's headline first, so it reads as the history it is. **This is a low-risk merge and
the only thing it risks is an afternoon of doc-conflict tidying.**

---

## WHAT THIS DOES NOT SETTLE

- ★ **Neither branch's test suite was re-run on a merged tree tonight**, and the mergeability above is
  `git merge-tree` — a textual merge, which proves no conflict and **does not prove the tests pass**.
  The pinned fairness gate owns the machine's cores for the rest of the night and re-running a suite
  against it would corrupt both. For branch B this matters little; **for branch A it is a gate that
  has not been run.**
- The comparison in §A between the removal's worst-lead figure and the brake's is a comparison of
  **directions, not of numbers** — different fixtures and different pooling, stated there as well.
- Nothing here re-measures either branch. Both recommendations are about what to measure next, not
  about what the answer will be.
