# What is open — the short list

**Generated 2026-08-23 from master `27ffb342`** by ROADMAP-OPEN-1 (NIGHT-2026-08-23, piece 4).

**THIS PAGE IS DERIVED AND NEVER AUTHORITATIVE.** [BACKLOG.md](BACKLOG.md) holds the evidence for
every line below, and where the two disagree **the backlog is right and this page is stale**. Nothing
here is a verdict of its own: every entry is a one-sentence rendering of an item that already exists,
with a link to where its evidence lives. **No item was judged, re-checked or closed to build this
page.**

Grouped by what YOU have to do with it. **Cheapest first inside each group.**

---

## NEEDS ONLY YOUR WORD

*Nothing has to be built or measured first. These are waiting on a sentence from you.*

**1 · Which cut counts as "the leading group"?**
Changes of first place, or fights inside the top five? The two measures disagree — on the open track
they rank the levers in opposite directions, so the answer changes which dial we would build.
→ [BACKLOG: HOW MUCH ACTION](BACKLOG.md#how-much-action--a-host-facing-control-2026-08-22-the-owners-order)

**2 · What does one action dial map onto?**
The last of four questions in that section still open; the measurements it needed now exist.
→ [BACKLOG: HOW MUCH ACTION](BACKLOG.md#how-much-action--a-host-facing-control-2026-08-22-the-owners-order)

**3 · The authored beats never reach the camera — hand them through, or leave the detector guessing?**
Your call, and it needs your eye afterwards.
→ [BACKLOG: NEEDS HIS WORD](BACKLOG.md#needs-his-word--decide-these-first) · decision D14

**4 · Does the race seed read right on screen?**
A normal race now draws a seed and shows it. Built, unmerged, waiting on you watching one race.
→ `feat/race-seed` · [BACKLOG: A seed alone does not reproduce a race](BACKLOG.md)

**5 · The dev-screen sprite-size concept — which of three?**
Override as a multiplier, a mixed mode with limits, or a redesign. The item itself says it needs a
vision decision before anyone writes a spec.
→ [BACKLOG: `B-UX4`](BACKLOG.md#planned--needs-spec)

**6 · The dev screen has grown to 30+ values — how should it be organised?**
Your own finding is that the values are hard to place. Nobody can spec it without your shape.
→ [BACKLOG: `B-UX2`](BACKLOG.md#planned--needs-spec)

**7 · Which dev-screen fields are still unclear to you?**
Three of the four sections already carry tooltips; one has none. Only you can say whether the three
are finished.
→ [BACKLOG: `T-1`–`T-4`](BACKLOG.md#planned--needs-spec)

**8 · The background images: re-spec or drop?**
The old plan cannot be run — it names PNGs and there are none. 60 MB of backgrounds ship in the
repository.
→ [BACKLOG: `Q-27`](BACKLOG.md#planned--needs-spec)

**9 · The naturalness envelope is guarded on one side only — add a floor, or say so in the document?**
Nothing shipped goes near the unguarded side, so nothing is broken today. The question is what a
future dial is allowed to do.
→ [RACE-ACTION §6](RACE-ACTION.md#the-envelope-has-two-sides-and-only-one-of-them-is-enforced)

---

## READY TO BUILD

*Specified, small, and nobody is waiting on anything.*

**Half a day or less, each:**

| what it is | what it would take |
| --- | --- |
| Warn instead of silently ignoring an invalid min/max in two dev-screen sections | a small edit — the warning already exists elsewhere to copy |
| Give the track editor a hint when a track is saved with no background | a hint line |
| Make the server's test cleanup survive a Ctrl+C | a signal handler in one test file |
| Sweep `.json.tmp` orphans that survive a OneDrive write failure | a boot scan, or one filter widened |
| Keep a draft of the drawn track geometry so a browser crash cannot lose it | ~50 lines |
| Protect "a default track cannot be un-defaulted" with a test | one backend test |
| Say *which* half failed when a track saves but its background does not | an error path split in two |
| Share one slider component across three dev-screen sections | an extraction |
| Add tooltips to the System Settings fields | the only tooltip section untouched |
| Rename the racer config folder away from the engine code | a move of 39 files |
| Pause and resume a running race | a button and a frozen loop |
| Give the `.git/worktrees` stubs a helper that cleans up after itself | a small script |
| Replace the `RA_PUBLIC_ORIGIN` placeholder with a real value | one value — **needed before anything goes online** |

→ all in [BACKLOG: Planned — needs spec](BACKLOG.md#planned--needs-spec) and
[Worktree stubs](BACKLOG.md) · [Before the VPS migration](BACKLOG.md#before-the-vps-migration)

**Verifications of work that already shipped** — cheaper than they look, because the code is in:

| what it is | what it would take |
| --- | --- |
| Loading a saved player list (`V-1`) | watch it once — its blocker shipped |
| A track whose geometry is missing is refused (`V-2`) | watch it once — its blocker is closed |
| Backup → restore → reset end to end (`B-5`, `V-5`) | one pass; the wiring exists |
| Dev panel sections, physics and collisions, storage edge cases, fullscreen (`V-6`–`V-9`) | a verification sitting |
| Sprites no longer stutter on a 6000-px track (`Q-13`) | **your eye on one race** — the code shipped |

→ [BACKLOG: Phase V](BACKLOG.md#planned--needs-spec)

---

## NEEDS MEASURING FIRST

*A question that no amount of reading settles. Each needs a run before anyone can decide.*

| what it is | what it would take |
| --- | --- |
| The middle stage of the action ladder, on every track and at full field size | **running now** — see the night's morning sheet |
| The definitive N=300 on the two arms that survived the screen | ~30–35 min of machine time; named, not started |
| Does the company guarantee hold on a spread-out field? | a measurement — your "5" already stands |
| "Road edge out of frame" as a standing number rather than an impression | an instrument that does not exist yet |
| Nothing measures MOTION, only per-frame values — a 2708 px jump was invisible | a new observer |
| Why Garden Path does not finish | currently **cannot establish** — needs a deliberate run |
| Is the flaky editor test really flaky? | repeated full-suite runs, counting failures |
| What the 60 MB of backgrounds actually costs | first paint and transfer, ~half an hour |

→ [BACKLOG: Instrument coverage residuals](BACKLOG.md) ·
[Camera residuals](BACKLOG.md) · [Measurement and guard residuals](BACKLOG.md)

---

## TOO LARGE — NEEDS YOUR DIRECTION

*Real work with a real shape, but not a task anyone should start unasked.*

**1 · Surface zones inside a track** — puddles on asphalt, mud on dirt. A drawing tool in the track
editor **plus** a new engine question ("what surface is under this racer?").
→ [BACKLOG: Surface Zones](BACKLOG.md#planned--needs-spec)

**2 · The full racer editor** — coat editing and sprite swapping. The basic editor shipped; this is
the rest of a screen.
→ [BACKLOG: `D8`](BACKLOG.md#planned--needs-spec)

**3 · Click a racer to lock the camera on it** — a new camera state, in the module that has cost the
most to get right.
→ [BACKLOG: `B-UX-ManualFocus`](BACKLOG.md#planned--needs-spec)

**4 · A written reference for every dev-screen value** — a documentation sprint, not a task.
→ [BACKLOG: `B-UX3`](BACKLOG.md#planned--needs-spec)

**5 · One particle system instead of two** — blocked by its own text until surface zones exist.
→ [BACKLOG: Dual particle system](BACKLOG.md#planned--needs-spec)

**6 · The server, the deployment and multi-tenant arc** — race-integrity server, leaderboard, VPS,
then multiple organisers. **Nothing here is built and nothing is online.**
→ [BACKLOG: Phases 5–7](BACKLOG.md#phases-57--the-planned-server-deployment-and-multi-tenant-arc-moved-from-roadmap-2026-08-23)

---

## What is deliberately NOT on this page

**Three kinds of backlog entry are left off, so their absence is a stated scope and not a silent
omission:** everything in **PART TWO** (closed work), the **Known Limitations — Deliberately
Accepted** section (things decided not to fix), and the **Parking Lot** (scope that is explicitly
unclear). **None of them is open work.** They are all in [BACKLOG.md](BACKLOG.md).

## How this page is kept

**It is regenerated by hand from `BACKLOG.md` PART ONE, and it carries the date and master sha it was
generated from** (top of this file). **If those are old, trust the backlog and not this page.**

**It is not currently guarded, and whether it should be is an open question** — see the proposal in
[ROADMAP-OPEN-1](../reports/evolution/ROADMAP-OPEN-1.md). The short version: a guard that fails when
this page drifts would either have to compare prose (which cannot be done mechanically) or force this
page to become a machine-generated list (which would destroy the only thing it is for — being written
in your language rather than the backlog's).
