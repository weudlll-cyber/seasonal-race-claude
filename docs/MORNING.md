# Morning sheet

**Owns:** where the night chain stands, right now. Rewritten after every piece, not at the end.
Whoever reads this at 7 a.m. should not have to open a single report to know where things are.

**Last rewritten:** 2026-08-27, after the day's piece 2 (D23 closed).
**Master started at `9e6dfc97` with origin carrying master alone, and ends the same way.**

---

## NEEDS YOUR WORD — three things, none of them urgent

*(The seed eye-test that stood here is **done** — see DONE below.)*

**2 · The client suite costs about 29% more wall clock to make the gate honest.** *(piece 1)*
Bounding its workers to 4 gives **0 failures in 3 runs** against **20 in 6 unbounded**, and takes the
margin from **−5,457 ms to +598 ms**. It costs **313 s → 403 s** per run. The server-suite fix was
free; this one is not, so it is your trade to make. **Blocks:** nothing today — the gate stays as it
is until you say. **Not a timeout**: every failure measured was starvation, not a defect in a test.

**3 · Nine other track records may be stale the way garden-path's was.** *(piece 7)*
Seeding copies a track record only if the file does not already exist, so **no seed edit ever reaches
an existing install.** Garden-path's icon sat stale for a day; the other nine were not audited.
**Blocks:** nothing yet. It is minutes of work and either confirms them clean or finds more.

---

## CLOSED TODAY

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
