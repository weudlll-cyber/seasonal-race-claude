# BRANCH-INVENTORY-1 — one true contender baseline, and what every branch is actually holding

**On master.** Two pieces: `contender-truth.mjs` now grades the director's own set (merged,
`e590bc9a`, CI green), and every branch, worktree and stash is inventoried below. **Nothing was
deleted.** Each row carries a recommendation; the decision is the owner's.

---

## 1. The harness was grading its own reconstruction — and it is deleted, not switched off

`contender-truth.mjs` carried a second implementation of the membership rule — `sameLane`,
`nearlyLevel`, and a `contendersOf` built from them — and evaluated it on the first frame the
callback OBSERVES the photo finish. The director captures at the transition, one world-step earlier,
on racer positions that had not yet moved. The two sets disagreed at the edges.

**The reconstruction is DELETED rather than left behind a flag.** The rule's one home is
`_abreastContenders` in `CameraDirector.js`; a harness that restates it can drift from it, and this
one had. The `--lane-only` switch went with it — it reproduced an older, half-stated version of a
rule that is no longer this file's to state.

### The one true baseline

Ten tracks × seeds 9, 2814, 5601, arm `contenders` (what master ships), **7468 photo-finish frames**:

| | cut | fully outside | **NOT WHOLE** | empty frames |
| --- | --- | --- | --- | --- |
| the reconstruction (what this tool used to report) | — | — | **3.4%** | 18 |
| **the director's own set** | **6.3%** | **2.3%** | **8.2%** | 18 |

**The old figure understated by 2.4×.** That is the number to quote from here on.

**It is NOT the 7.6% the brief expected, and the difference is real rather than noise.** 7.6% was
`edge-slice-truth`'s **sliced** count — body intersects a boundary — measured on the pre-ship branch
tree. 8.2% is **not whole** — cut OR fully outside — measured on master after ZOOM-PACE-5 gave the
corridor cap a 1500 ms arrival. Two instruments, two metrics, two trees. They are not the same
quantity and reconciling them by adjusting one would be fitting.

**The failure is concentrated, not spread.** 15 of the 27 races are 0.0%. The whole of the 8.2% comes
from a handful: river-run/9 **52.9%**, seatrack/9 **44.1%**, seatrack/5601 **26.4%**, ice-track/2814
**22.5%**, city-circuit/5601 **20.4%**. A pooled average is the wrong summary of a distribution like
that, and it is why the per-race table is printed above the pooled line rather than below it.

**The 18 empty frames are pre-existing** — CONTENDER-ZOOM-1 recorded 18 on master before any of this
work — and all of them are city-circuit/5601.

### Two more two-baselines failures found in the same file

**The pooled footprint was not the default.** Every pooled figure this tool has ever reported was ten
tracks × seeds `9,2814,5601`, but that was recorded only in the usage block. Running it with no flags
gave ONE seed and a different number under the same name. The footprint is now what it does by
default.

**The default arm was the pre-ship one.** `contenderZoom` ships true as of `0bd07dba`, so a baseline
read off `--arm=off` described behaviour nobody sees. `contenders` is now the default; `off` is
retained as the control.

**Three output labels were untrue** once the set changed, and are corrected: the pair row said "2
racers" when the captured set is **2, 3 or 4**; the totals row still called it "the level set —
everyone within the entry gate's own threshold", which is the yardstick this work replaced; and the
entry line read "captured exactly 2/3", which parses as a fraction and meant "either 2 or 3".

**One line of it survives as a check, and is labelled as one.** The pinned block re-reads
`_photoFinishContenders` live with the stored reference as fallback, so it now grades the same racers
by a different route. It agrees to the digit — 8.2% against 8.2% — which is evidence the index lookup
survives a spread-copy, and is **not** a second finding. The output says so.

**No product change.** `scripts/` only; no fingerprint moves.

## 2. Every branch at origin

**A correction to the brief's count: there are NINE branches at origin besides master, not ten.**
`feat/contender-zoom` was the tenth and was deleted when it shipped.

| branch | tip | in master? | what it holds that master does not | superseded? | **recommendation** |
| --- | --- | --- | --- | --- | --- |
| `feat/coord-system` | `f8de7d97` | **no**, 1 ahead | One ruler for `.race-canvas-wrapper`: BrandLogoOverlay and StateOverlay moved onto percentage anchors, plus `overlayGeometry.js` (147 lines) and its test (151) measuring three wrapper sizes | no | **owner's eye owed** — its own message declares a VISIBLE CHANGE (corner clearance 12.96 CSS px against 16 at 1037×583) |
| `feat/finish-framed` | `6e94a086` | **no**, 2 ahead | `finishLineFraming` (the key is absent from master) making the finish line a guaranteed subject for the run-in, plus a WIP half-fix | **yes**, by `feat/runin-state` (merged `eea0acf2`), which shipped "only the line sets the width" by another route | **keep as record** — its head declares itself red (51 empty frames on luger-hill seed 9) and says so in the commit; that is evidence, not debris |
| `feat/frame-gap-2` | `80f772fe` | **no**, 1 ahead | `FRAME-GAP-2.md` + INDEX only — production reproduced the 33 ms frame and it is the page around the canvas | **yes**, wholly contained in `feat/frame-gap-3` | **delete** — the only branch here whose content is 100% inside another branch |
| `feat/frame-gap-3` | `83ffb0fc` | **no**, 2 ahead | `FRAME-GAP-2.md` + `FRAME-GAP-3.md` + INDEX — the 33 ms frame is the standings list; the background layer costs nothing. **Docs only, no product change** | no | **merge** — nothing to judge and no fingerprint to move; two diagnoses that cost real measurement time are invisible to anyone reading master |
| `feat/front-group` | `87a08af4` | **no**, 9 ahead | The corridor floor (`endgameCorridorFloor` + its Dev Screen control), the group machinery's removal, `endgame-width-truth.mjs` (**502 lines**), and reports FRONT-GROUP-1/2/3/7 | **the CODE yes** — CONTENDER-ZOOM-1 §0 states the floor is superseded and should not be merged, and FRONT-GROUP-7 ships it OFF. **The reports and the harness, no** — none are on master | **keep as record**, and see proposal 2 — the evidence should be rescued whichever way the branch goes |
| `feat/runin-state` | `e91e7a61` | **yes** | nothing | — | **delete** — merged at `eea0acf2`; exists only because it was never deleted afterwards |
| `fix/camera-ending-window` | `a8f0b918` | **yes** | nothing | — | **delete** — merged at `96f7a0ae` |
| `fix/resolve-converge` | `239644aa` | **yes** | nothing | — | **delete** — merged at `d7eca25d` |
| `guard/stamps-complete` | `df47b37d` | **yes** | nothing | — | **delete** — merged at `758a95ac` |

**Confirmed rather than assumed, as asked:**

- **`feat/frame-gap-2` and `-3` are NOT dead** — both carry unmerged commits. But `-2` is an ancestor
  of `-3` (`git merge-base --is-ancestor` passes), so the pair is one line of work, not two.
- **`feat/front-group` holds the corridor floor** — 9 commits, and the floor key is genuinely absent
  from master.
- **`feat/finish-framed` is the honestly-red run-in branch** — its head is a `wip(` commit that names
  its own guard's 51 failing frames and says "Do not merge". **Its guard reached master anyway**, by
  a separate commit (`2a7e1bdf`), and master's copy of `check-runin-frame.mjs` DIFFERS from the
  branch's — so the guard survived independently of the mechanism.

## 3. Local branches, worktrees, stashes

**One local branch has no counterpart at origin:** `docs/close-german-exception` (`0608d38c`), no
upstream, and **contained in master** (merged at `5e738dfe`). Empty diff against master.
**Recommendation: delete.** Every other local branch tracks its origin counterpart at the same tip.

| worktree | checked out at | |
| --- | --- | --- |
| `C:/Users/weudl/OneDrive/Dokumente/Seasonal race claude` (main tree) | `87a08af4` **[feat/front-group]** | **the main tree is not on master** — and this is what blocks deleting that branch |
| `C:/ra-n1` | `e590bc9a` [master] | both servers are built and served from here |
| `C:/ra-n2` | `69e4b27b` (detached) | a merge commit **contained in master** — spent, as expected |

**Stashes: none.** `git stash list` is empty.

## 4. Four proposals

**1 · Merge `feat/frame-gap-3` as it stands.** It is documentation only — no source, no defaults, no
fingerprint, nothing to eye-test. Two measured diagnoses about where a 33 ms frame comes from are
currently reachable only by someone who thinks to check out a branch. That is the one row in the
table where "merge" costs a review of nothing.

**2 · Rescue the front-group evidence before deciding the branch.** `endgame-width-truth.mjs` is 502
lines and is the only fixed-yardstick whole/cut/outside instrument for the endgame-width question;
the four FRONT-GROUP reports are the record of a 791-line mechanism that a one-line idea replaced.
The branch's CODE is superseded and should stay unmerged — but if the branch is ever deleted, that
harness and those reports go with it, and the next person to ask the same question rebuilds the
instrument. Bringing the reports and the script to master is independent of what happens to the
mechanism.

**3 · Make the stamp guard answer against the STAGED tree in the pre-commit hook.** This is what cost
master two red CI runs today. `check-measured-stamps` prints a PENDING line for dirty work — a
report, not a failure — which is correct for an ad-hoc run and is exactly wrong at commit time,
because the stamp goes stale the instant the commit lands. Running it against the staged tree in the
hook turns PENDING into the real answer at the only moment it matters. The guard's own header already
warns about this path in prose; the proposal is to make the tool enforce what the prose asks.

**4 · Point the main OneDrive tree at master.** It currently sits on `feat/front-group`, so the tree
the owner opens by default is nine commits of superseded camera work rather than what ships — and it
is also the reason `feat/front-group` cannot be deleted without detaching first. Moving it is
reversible and makes the default view the shipped one.
