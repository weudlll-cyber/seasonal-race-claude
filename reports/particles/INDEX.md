# Particles — index

The particle effects on the race screen: the surface dust behind the racers, the track effects (rain and
the others) and the finish burst. **None of them is covered by a fingerprint**, which is why these
reports exist.

`node scripts/check-index.mjs --dir=reports/particles --index=reports/particles/INDEX.md` checks that
every report here is reachable and that every link here resolves.

- [PARTICLES-VISIBILITY-1.md](PARTICLES-VISIBILITY-1.md) — 2026-09-28. Why dust, rain and the finish
  burst appear at some moments and not others, measured on the owner's own stored race. Dust is culled
  with the wrong axis scale, and rain spawns in a canvas-sized corner of the world; both MEASURED. The
  burst complaint is NOT PROVEN. Open row: BACKLOG PART ONE, *2026-09-28 — added (PARTICLES-VISIBILITY-1)*.

- [PARTICLES-VISIBILITY-2.md](PARTICLES-VISIBILITY-2.md) — 2026-09-28. The fix, on the branch and not merged: the
  cull tests each axis with its own scale, a finished racer's dust fades out, and every track effect covers the whole
  track. Before/after on the owner's race, and a table of every track's effects with where their amounts are set.

- [PARTICLES-VISIBILITY-3.md](PARTICLES-VISIBILITY-3.md) — 2026-09-28. Every track effect's amount now runs from
  off to many (maxima measured in the browser, capped where frame time slowed), and every racer-trail generator has
  an opacity control in the Dev Screen's surface-class editor. Per-effect counts, frame cost and screenshots.

**Not indexed, and deliberately:** the `PARTICLES-VISIBILITY-1/`, `-2/` and `-3/` folders hold the reports' screenshots.
`check-index` only considers `*.md`.
