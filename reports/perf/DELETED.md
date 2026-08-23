# reports/perf — DELETED

**Why this file exists:** so that a year from now nobody searches for one of these without
learning that it was removed deliberately, when, and on what grounds.

**The owner's criterion, 2026-08-23:** a write-up that cannot be reproduced is worth keeping
only if we still know WHAT it measured and the source state still relates to it. A referent is
a commit, tag, branch or date that RESOLVES today — `feat/open-track-overlap`, which all eleven
named, resolves nowhere. It was merged at `bc53ae1` on 2026-06-08 and exists today as neither a
local nor a remote ref; `backup/step1-complete-fair`, named by two of them, resolves nowhere
either. Verified, not assumed.

| file | git date | bytes | verdict that removed it |
| --- | --- | ---: | --- |
| `00-cc-perf-analysis.md` | 2026-06-06 | 24201 | NO REFERENT |
| `02-postfix-reconciliation.md` | 2026-06-06 | 14208 | NO REFERENT |
| `03-memory-leak-audit.md` | 2026-06-06 | 16189 | NO REFERENT |
| `04-mid-race-refresh-memory.md` | 2026-06-06 | 13671 | NO REFERENT |
| `05-scoreboard-simplify.md` | 2026-06-06 | 7780 | NO REFERENT |
| `07-allocation-reduction.md` | 2026-06-06 | 7784 | NO REFERENT |
| `08-neighbor-pairloop.md` | 2026-06-06 | 13586 | NO REFERENT |
| `10-loop-fusion-analysis.md` | 2026-06-06 | 24183 | NO REFERENT |
| `11-y-rejection.md` | 2026-06-06 | 4810 | HAS A REFERENT, SUBJECT GONE |
| `12-y-rejection-sweep.md` | 2026-06-06 | 8869 | HAS A REFERENT, SUBJECT GONE |

**Kept:** `01-tier1-wave1.md` — it names commit `3eac3f2`, which resolves, and the fix it
measured (the `_catchupSteps < 2` catch-up guard) is live at
`client/src/screens/RaceScreen/index.jsx:982`.

**No raw chain was deleted.** The age rule removes raw older than two weeks; every raw file
here was added on 2026-08-09 or 2026-08-10 and is therefore two weeks old or younger.
