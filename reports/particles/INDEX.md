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

**Not indexed, and deliberately:** the `PARTICLES-VISIBILITY-1/` folder holds the report's screenshots.
`check-index` only considers `*.md`.
