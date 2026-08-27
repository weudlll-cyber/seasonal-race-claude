# Morning sheet

**Owns:** where the night chain stands, right now. Rewritten after every piece, not at the end.
Whoever reads this at 7 a.m. should not have to open a single report to know where things are.

**Last rewritten:** 2026-08-27, end of the day's four pieces. **Three of the three open rows closed.**
**Master started at `9e6dfc97` with origin carrying master alone, and ends the same way.**

---

## NEEDS YOUR WORD — one thing, and it is not urgent

*Two of the three rows that stood here closed today: the seed eye-test is done, and the client-suite
trade is built. Both are under CLOSED TODAY.*

**Which fields of a shipped track are the project's, and which are yours?** *(the audit answered the
smaller question and sharpened this one)* All ten runtime records were audited. Nine had drifted
onto a legacy duration field — **behaviourally identical, proven, and now repaired.** Garden-path was
left alone deliberately: its live record carries two surface classes you added in the app on
2026-07-04 that **exist nowhere else — not in the seed, not in git.** A seeding rule that overwrote
records to deliver yesterday's icon would have deleted them. **Blocks:** nothing today; your install
is correct either way. It only decides how the seeding mechanism should behave if it is ever changed.

---

## CLOSED TODAY

- **The client suite is BOUNDED and the gate is honest again.** `maxWorkers: 4`, confirmed on the
  merged tree: **0 failures in 6 bounded runs against 20 in 6 unbounded**, margin **−5,457 ms →
  +3,101 ms** — better than the server suite's. **And the cost you accepted did not appear:** real
  wall clock **296.2 s** against 313.8 s unbounded, so it is not slower. The 403 s figure you were
  offered came from an arm measured while three other jobs were competing for the machine — the exact
  confound this item was about. You agreed to a 29% cost and are paying none.
- **The nine other track records are audited and repaired.** All had drifted onto a legacy duration
  field; proven behaviourally identical, then aligned. **Garden-path was left alone deliberately** —
  see the one open row below.
- **D23 — the seed for a normal race — is DISCHARGED.** Judged on the production build on
  **2026-08-27** and accepted: the drawn seed reads correctly on the setup panel and survives a
  browser restart. Both halves confirmed on screen, not merely in the source. Nothing outstanding.
- **The docker repair is on master** (`688c8840`), and the backend answers on 4000 again.

## DONE — the night chain, all eight merged to master

| # | what it was | outcome |
|---|---|---|
| **1** | client-suite crowding cliff | **MEASURED** — the suite starves *itself*; CPU, not memory. The two failing tests were starved to **10,457 ms** against a 5,000 ms limit. Bounding workers fixes it. |
| **2** | the along-track residual | **MEASURED** — episodes, not noise; **one track** (space-sprint, 61%); **three quarters of it is the margin**, not geometry. The recommendation is the sprite, not a zoom rule. |
| **3** | the anchor-versus-centre gap | **MEASURED — latent, and NOT work.** Worth 41 px at the very worst, almost all in one rare state. **And the "132 px" figure was mine and is wrong** — the real gap is 0.0 px pooled. |
| **4** | the ship order's missing step | **BUILT** — step 12 clears branches at origin, with the tree-level containment check beside it. |
| **5** | the backlog's stale entries | **BUILT** — three closed, two re-verified as correctly open, **one found half-and-half** that a report-level reading would have closed wrongly. |
| **6** | ROADMAP folded | **BUILT** — the last table moved; `ROADMAP.md` is now a redirect that owns nothing. |
| **7** | garden-path's snail | **BUILT** — the repository was already right; the *delivery mechanism* silently drops seed updates. |
| **8** | harness camera seed | **BUILT** — it follows the browser now. **All four fingerprints run and unmoved.** |

---

## ⚠ ONE STANDING WARNING, FROM PIECE 8

**Picture figures taken before 2026-08-27 by an instrument that omitted `cameraSeed` are not
comparable with figures taken after.** They are different cameras on the same races. 19 of 63 callers
already passed the seed explicitly and are unaffected — including every instrument from the recent
camera work. **Race and physics figures are unaffected**, and the unmoved world fingerprint is the
proof. Nothing was re-baselined and no historical corpus was re-run.

---

## ONE THING I BROKE AND FIXED — you should know

To run three measurements at once I made directory junctions from temporary worktrees into the real
`node_modules`. **Removing those worktrees deleted through the junctions**, gutting
`client/node_modules/.bin` and hollowing out `prettier`. Restored with `npm ci`; **the tracked tree
was never touched** and every gate has run green since. The lesson, for the next time three things
need to run at once: **never junction into a real `node_modules` from a directory you intend to
delete.**

---

## NOT STARTED

*(nothing — the chain is complete)*
