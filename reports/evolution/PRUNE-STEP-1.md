# PRUNE-STEP-1 — the condition that blocked it is gone, reproduced on a fresh stub, so it is a step now

> **The owner's refusal was explicitly conditional** — not that prune is wrong, but that **it fails
> here**, and a ritual that cannot succeed teaches that rituals are optional. That condition no longer
> holds, so the step is added. **Verified before adding it**, on a stub created and cleared today
> rather than on last night's evidence alone.

`verify` **PASS 10 FAIL 0**. One file changed: `docs/SHIP-CEREMONY.md`.

---

## 1. THE DECISION RULE WAS TESTED, NOT ASSUMED

The brief's rule: *if it still fails on any stub for a reason other than ReadOnly, do NOT add it.*

There were **zero stubs** to test on — last night's WORKTREE-STUBS-1 cleared all three. So one was
made: a real `git worktree` at `C:/ra-wt-probe5`, a short path outside the OneDrive tree, **with no
junction** (checked: `dir /s /al` found no reparse point anywhere inside it). Its directory was then
removed, leaving exactly the stale stub the ceremony has to deal with.

| step | result |
| --- | --- |
| `git worktree prune -v`, **no attribute cleared** | `error: failed to delete '.git/worktrees/ra-wt-probe5': Permission denied` — **1 stub left** |
| `attrib -R /d` on the stub, then on `logs`, then on `refs` | — |
| `git worktree prune -v` again | `Removing worktrees/ra-wt-probe5` — **0 stubs left** |

**It fails for ReadOnly and succeeds once ReadOnly is gone.** No other cause appeared, so the decision
rule permits the step and it was added.

---

## 2. ★ A DETAIL THAT ONLY A FRESH STUB COULD SHOW: THE ATTRIBUTE ARRIVES LATE

At the moment of creation the stub carried **`P` only — no `R` at all**. By the time prune ran it
carried **`A R P`**, and so did `logs/` and `refs/`.

**OneDrive applies the ReadOnly attribute after the fact, when it syncs the directory.** That is why
the clearing belongs at REMOVAL time and not at creation time — a block that cleared the attribute
when it made the worktree would find it back when it came to delete it. Last night's evidence, taken
on stubs that were already days old, could not have shown this.

---

## 3. WHY THE ORDERING IS SPELLED OUT, AND WHY IT FAILED FOR FOUR MONTHS

`attrib -R /s /d <dir>` **looks like it recurses and does not**: `/s` recurses for FILES, `/d` applies
to folders at the level given, and together they leave `logs/` and `refs/` still ReadOnly — **while
exiting 0**. Naming each level is the entire trick. The step writes all three lines out rather than
the tempting one-liner, because the one-liner is what everybody tried.

---

## 4. WHAT THE STEP SAYS ABOUT THE THING THAT ACTUALLY COSTS SOMETHING

**The stub is not the hazard. A junction is.** A stale stub costs one inert directory.
`git worktree remove --force`, run while a worktree had the main tree's `client/node_modules`
junctioned into it, walked *through* the link and deleted into the real tree — emptying
`node_modules/.bin` from 81 shims to 0 (SIDE-FREE-CULL-1, 2026-08-27).

The step therefore carries that warning beside the recipe: **do not junction `node_modules` into a
worktree**, and if one exists, remove the junction **before** the worktree, never the other way round.
Putting it anywhere else would file the small hazard as a procedure and leave the large one as a
memory.

---

## 5. WHAT THIS MOVED, AND WHAT POINTED AT IT (constraint 2)

| what moved | what pointed at it | outcome |
| --- | --- | --- |
| the ceremony gained a **step 13** | the SCOPE paragraph said *"Steps 1-11 are a ship's sequence … step 12 needs neither"* | **corrected**: steps 12 **and 13** bind to every merge, and 13 inherits 12's scope for the same reason |
| the step numbering | `check-tags.mjs:46` and `:88` cite "step 12" | **still accurate** — the branch-clearing step is still 12; no change |
| `docs/BACKLOG.md`'s worktree entry says *"Do not add prune to the ship ceremony"* | that entry | **NOT edited here** — it is a backlog entry with its own verdict history, and piece 3 owns document corrections. On the morning sheet. |

---

## Limits

**One stub, made for the purpose.** The recipe is now confirmed twice — three real stubs last night,
one synthetic stub tonight — but both times on this machine, this OneDrive configuration, this git.
Nothing here establishes it for a differently-synced checkout.

**The step cannot be enforced.** Nothing checks that anyone ran it; `.git/` is not tracked, so no
guard can see a stub. Rule B catches a leftover BRANCH because origin can be asked; a leftover stub is
local and invisible to CI. **This step is a habit made explicit, not a mechanism** — which is exactly
what the owner's original objection was about, and the only thing that has changed is that following
it now works.

**It was not proved that a stub with a deeper `refs/` tree clears the same way.** The stubs seen so far
hold `logs/` and `refs/` and nothing more. A stub from a worktree that carried branches would need one
`attrib -R /d` line per directory — the same rule, more lines — and that case has not occurred here.
