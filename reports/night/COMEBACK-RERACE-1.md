# COMEBACK-RERACE-1 — the comebacker branch re-raced on BRAKED master: it still costs breakaways, and the brake does not absorb it

Branch `night/2026-09-18`, piece 2. Date: 2026-09-18.
**★ NOTHING WAS MERGED, TAGGED OR DELETED.** `feat/remove-prestaging-comebacker` is untouched at
origin. Master was merged into a **probe copy** of it; that merge was never pushed. **This is the
decision material, not the decision.**

---

## ★★★ THE ONE LINE

**Yes — it still costs breakaways, and the brake being shipped does not change the answer.** Races
opening a gap the owner would call an escape **almost double**, 8 → 15 of 300, and the worst lead of
300 races grows **187.5 → 197.6 world px** — while the ordinary race is untouched (median 86.5 → 88.3).

★ **The brake is not absorbing it. It is working harder and still losing ground**: brake frames fired
rise **160,864 → 170,881** on the same 469,000-frame window.

---

## 1 · THE SETUP

| | |
|---|---|
| control arm | the real tree at **master `5b60b615`**, brake ON by `defaults.js` |
| branch arm | **probe copy** of `feat/remove-prestaging-comebacker` (`5c9e050e`) with **`origin/master` merged in** — merged clean, never pushed |
| fixture | ten tracks, **seeds 1–30**, **N=30 per track = 300 races per arm**, 40 racers, the owner's roster, `wild` |
| config | ★ **shipped defaults, no override of any kind** — the brake is on because `defaults.js` says so; `servoNoiseBlindEnabled` false on both arms |
| ★ instrumentation | ★ **NONE, in either tree** |

★★ **Why no instrumentation was needed, which is worth recording.** The branch's own report separated
the cast sites with *"an instrumented build proven to race identically to the shipped one"*. That is
not necessary: the race plan already exposes what is needed —
**`getHeroRoles()`** returns `{index: role}`, **`getHeldRelease()`** marks the staged hero, and
**`getTargetRank(i)`** gives the assigned rank, so the drawn-winner site is simply the racer assigned
rank 1. **Both arms therefore ran from unmodified checkouts**, and the standing rule against
instrumenting a real tree was never in tension with the measurement.

★ **The control reproduces the ship's own numbers, which is how we know the harness is honest.** The
gap brake's mint records the shipped path at **8 of 300 races** opening a >124 px late gap and a worst
lead of **187.5 px**. This harness, written separately and driven differently, returns **8 of 300** and
**187.5 px** on the control arm. **Independent agreement to the digit.**

---

## 2 · COMEBACKERS PER RACE, BY CAST SITE

| | MASTER | BRANCH |
|---|---|---|
| comebackers per race — **total** | **1.72** | **1.32** |
| — from the drawn-winner site (**kept**) | 0.61 | **0.61** |
| — from the staged path (**kept**) | 0.70 | **0.72** |
| — ★ from the **REMOVED** path | ★ **0.41** | ★ **0.00** |
| races with **NO comebacker at all** | **13 (4.3%)** | ★ **30 (10.0%)** |
| mean cast racers per race (non-B2) | 2.53 | **2.13** |

★ **The two kept sites are the control and they do not move** — 0.61 against 0.61, 0.70 against 0.72.
**Only the removed column goes to zero**, which is exactly what the branch says it does and is the
check that the cast-site split is reading the right thing.

★ **Races with nobody cast as a comebacker more than double**, 13 → 30 of 300. The branch names this
itself as the expected outcome of one staged path that can be refused, not as a defect.

Per track, the pattern is the same on all ten — the removed column is 0.33–0.57 on master and 0.00 on
the branch everywhere, and `luger-hill` loses the most (0.53 → 0, and 2 → 5 races with no comebacker).

---

## 3 · ★★ WHAT IT COSTS, AGAINST BRAKED MASTER

Largest lead from the brake's own **window start (0.6)** to the winner's crossing:

| | MASTER | BRANCH | change |
|---|---|---|---|
| **median** | 86.5 px | 88.3 px | +1.8 |
| **p90** | 127.7 px | **133.0 px** | ★ **+5.3** |
| **max** | 187.5 px | **197.6 px** | ★ **+10.1** |
| ★ **races with a >124 px gap after 0.95** | **8 (2.7%)** | ★ **15 (5.0%)** | ★ **+7, nearly double** |
| contested finishes | 125 (41.7%) | 124 (41.3%) | −1 |

★★ **The shape is the brake's own shape, running backwards.** The brake was merged because it cut the
tail and left the ordinary race alone. **The removal does the reverse by the same signature**: the
median barely moves, the p90 and the max grow, and the count of real escapes nearly doubles. **It
spends precisely what the brake bought.**

★ **Contested finishes are untouched** (125 → 124). Whatever this costs, it does not cost close
finishes.

### The paired comparison

| | |
|---|---|
| byte-identical races (same finishing order) | **176 of 300 — 58.7%** |
| winner changes | **81 of 300 — 27.0%** |

★ **41% of races change.** This is not a marginal branch: on the races where the removed path was
casting somebody, removing it changes who wins more than a quarter of the time.

---

## 4 · ★★ THE BRAKE IS NOT ABSORBING IT

| | MASTER | BRANCH |
|---|---|---|
| brake frames **fired** | 160,864 | ★ **170,881** |
| brake frames in window | 469,257 | 469,443 |

**The window is the same size on both arms and the brake fires ~6% more often on the branch** — and
the tail still grows. ★ **That is the answer to the question this piece was set: the brake does not
cover for the removal.** It reaches its authority ceiling against a bigger problem rather than
cancelling it.

★ **This is consistent with what the brake was already known not to do.** It was measured as not
reducing the escape *rate* at any setting — it cuts the worst cases. **A change that produces more
worst cases is therefore the one thing it is least able to offset.**

---

## 5 · ★ SO: DOES THE REASON IT WAS NOT LANDED STILL HOLD?

**It holds. Stated plainly, because that is what the piece asked for.**

The branch was held back because its own measurements showed it raising breakaways — 59.3% → 63.0%
breakaway share and the worst lead 313.9 → 420.9 px on its own single-track fixture. ★ **Those numbers
were taken before the brake existed, and the honest question was whether the brake had since made them
obsolete. Re-raced on braked master, over ten tracks instead of one, the direction is unchanged**:
+7 escapes of 300, +10.1 px on the worst lead, +5.3 px at p90.

★ **The magnitudes are much smaller than the branch's own** — its fixture showed the worst lead
growing by 107 px, this shows 10.1. **The brake is doing real work against it.** But it does not turn
the cost into a gain, and the escape count still nearly doubles.

**What the branch buys is not in this table.** It removes a casting path the owner decided should go,
and section S of its `DEAD-ENDS.md` carries the correction to the three figures that decision was
taken on. **This report does not weigh that against the cost — it supplies the cost, measured on the
tree as it stands.**

---

## WHAT THIS DOES NOT SETTLE

- ★ **N=30 per track.** 300 races per arm pooled is enough to see a doubling of an 8-race count only
  approximately: **8 → 15 on 300 races is a difference of seven races** and carries an interval that
  includes "somewhat less than double". The direction reproduces on the branch's own fixture and on
  nine of ten tracks here; the exact factor does not.
- **No statistical test is quoted.** The paired design supports one, and the piece asked for counts.
- **The small-field regime is not re-measured.** The branch silences the B1 pool entirely below 20
  racers; every race here is 40.
- **Nothing here re-measures what the branch is FOR** — only what it costs.
- **The probe copy's merge was never pushed** and the branch at origin is exactly as it was.
