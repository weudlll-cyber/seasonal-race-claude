# Night blocks — index

Unattended blocks: one file per block, newest first. These are lab-journal entries and are
**append-only** — a report records what was true on the day it was written and is never rewritten.

This index exists because `reports/night/` sat outside every guard until ONE-TRUTH-2 stage 5: a
report here could be orphaned, or an index link could dangle, with nothing noticing.
`node scripts/check-index.mjs --dir=reports/night --index=reports/night/INDEX.md` now checks both
directions.

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
