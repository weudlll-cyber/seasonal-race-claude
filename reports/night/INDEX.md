# Night blocks — index

Unattended blocks: one file per block, newest first. These are lab-journal entries and are
**append-only** — a report records what was true on the day it was written and is never rewritten.

This index exists because `reports/night/` sat outside every guard until ONE-TRUTH-2 stage 5: a
report here could be orphaned, or an index link could dangle, with nothing noticing.
`node scripts/check-index.mjs --dir=reports/night --index=reports/night/INDEX.md` now checks both
directions.

- [CONFIG-TRUTH-1.md](CONFIG-TRUTH-1.md) — the owner's values land, and documents stop stating
  numbers. 94 current config claims across 11 living documents → 0, enforced by
  `check-config-claims.mjs` in CI, the commit hook and verify; nine archives now declare themselves
  HISTORICAL. Squash merging disabled at repo level (rebase still on — his call).
  `minRacersVisible` 3 → 5 hit its stop rule: it moves the camera fingerprint AND the render one, so
  it sits unmerged and unminted on its own branch awaiting the ceremony and his eye. The
  `choreoOutcomeStart` premise verified three ways from history. CI on master still owed — the
  GitHub Actions outage ran all evening.
- [CLEAN-STATE-1.md](CLEAN-STATE-1.md) — merge, then one green master with no loose ends. The three
  ONE-TRUTH branches merged as merge commits (a squash would have destroyed the SHA a stamp names),
  three branches deleted, tracking-lag re-measured independently and reproducing cell for cell. A
  wrapper so an ad-hoc helper can prove its edit landed — and the line-ending trap its own sabotage
  found. A test that wrote the TRACKED SIM.md fixed at the cause, not with a retry. Lessons 205 and 206. Config contradictions: seven keys stated as current and wrong, five of them in one document —
  findings only, nothing changed. CI on master unproven: GitHub Actions outage.
- [ONE-TRUTH-2.md](ONE-TRUTH-2.md) — one home, references everywhere else. The owner’s rule:
  all 19 generated fingerprint copies DELETED, documents reference the record or say nothing. The
  containment guard ONE-TRUTH-1 discarded as unsound is now sound and built. Retries to zero, ten
  clean runs. Two silent traps made loud: a swallowed CLI flag and a write that did not land.
- [ONE-TRUTH-1.md](ONE-TRUTH-1.md) — one fact, one home. The three fingerprints got a single
  machine-readable record and 19 documented copies were machine-written and machine-checked.
  Superseded by ONE-TRUTH-2, which deleted all 19 copies instead. Also: the 20-run retry study that
  found the suite failing 3 runs in 10, and the generated engine-reach list in SIM.md.
- [NIGHT-TOOLS-1.md](NIGHT-TOOLS-1.md) — instrument truth. The retry ledger, check-index's second
  direction, the generated ceremony cost column, and the pixel and documentation audits below.
- [E-doc-audit.md](E-doc-audit.md) — the documentation audit from NIGHT-TOOLS-1 stage E.
- [D-pixel-audit.md](D-pixel-audit.md) — the pixel audit from NIGHT-TOOLS-1 stage D.

**Not indexed, and deliberately:** `captures/` holds verbatim BEFORE snapshots taken so a tool's
output could be compared after it changed. They are evidence, not reports, and `check-index` does
not descend into subdirectories.
