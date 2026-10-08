# AUDIT-1 — A2 group E: comments that contradict the code (scripts and server)

Source: the group-E sub-review of A2 (comments and headers), returned as a message on 2026-10-09.
This file records its findings as they were carried forward; each is re-checked by hand before it
enters reports/release/AUDIT-1.md, and the final verdict is recorded there, not here.

All are proposed SAFE-CLEANUP (comment-only corrections) unless marked.

| # | file:line | what the comment says vs what the code does |
|---|---|---|
| E-01 | scripts/comeback-beats.mjs (header) | header describes raceDriver behaviour that no longer holds |
| E-02 | scripts/check-runin-frame.mjs:47-48 | stale description of the frame selection |
| E-03 | scripts/check-runin-frame.mjs:119 / :407 vs :565 | two comments disagree with the code at :565 |
| E-04 | scripts/check-runin-frame.mjs:371-372 | orphan comment with no code under it |
| E-05 | scripts/verify.mjs:451-472 | block comment describes an older step order |
| E-06 | scripts/verify.mjs:627-628 | claims a `COPY --from=client` in the Dockerfile that no longer exists in that form |
| E-07 | scripts/verify.mjs:24, :194, :245 | usage text out of step with the flags the script takes |
| E-08 | server/src/races/raceStore.js:6-7 | "nothing writes to it" — the store is written by POST /api/races |
| E-09 | server/src/races/raceStore.js:543 | listRacesByTeam comment vs the 100-row cap the code applies |
| E-10 | server/src/races/raceStore.js:505 | leftover doc line from a removed parameter |
| E-11 | scripts/camera-replay.mjs:235-236 | says names do not matter — a racer's name is physics (`stablePairBit`) |
| E-12 | scripts/camera-replay.mjs:201-202 | stale description |
| E-13 | scripts/lib/raceDriver.mjs:88-89 | stale description |
| E-14 | scripts/lib/raceDriver.mjs:6, :9, :474 | header and inline text out of step |
| E-15 | scripts/check-fallback-agreement.mjs:108-113 | describes a comparison the code no longer makes |
| E-16 | scripts/exp-runaway-leader.mjs:1889-1892, :20-23 | stale descriptions |
| E-17 | scripts/endgame-spec.mjs:9 | stale header line |
| E-18 | scripts/render-fingerprint.mjs:28 | stale header line |
| E-19 | scripts/viewer-invariants.mjs:5, :63 | stale descriptions |
| E-20 | scripts/sim/observers/report.mjs:21-23 | stale description |
| E-21 | scripts/parity/goldenRunner.mjs:32, :232-233 | stale descriptions |

Stale line-number citations found in the same pass (comment cites a line that moved):

- comeback-beats, raceDriver, endgame-spec, goldenRunner — internal citations drifted
- verify.mjs cites `Dockerfile:68` — now `:152`
- raceStore cites `session.js:79` — now `:83`
- raceStore cites `ResultScreen:208` — the id is minted in `raceHistory.js:91`

Note: E-01, E-11, E-13, E-14, E-21 are inside or beside the engine hull's scripts (raceDriver,
camera-replay, goldenRunner). A comment-only edit there moves no fingerprint, but every edit in
those files is checked with `engine-reach` before it is committed.
