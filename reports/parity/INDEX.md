# Sim/browser parity + baseline records — index

One file per record, and unlike the evolution reports these are **living** where they say they are:
[REBASELINE.md](REBASELINE.md)'s top block is the current measured baseline and is kept current.
The rest are dated investigations and are append-only.

This index exists because `reports/parity/` sat outside every guard until ONE-TRUTH-2 stage 5.
`node scripts/check-index.mjs --dir=reports/parity --index=reports/parity/INDEX.md` checks that
every record here is reachable and that every link here resolves.

- [REBASELINE.md](REBASELINE.md) — **the live baseline.** Which document owns which hash, and what
  moved each one. Carries no fingerprint VALUES since ONE-TRUTH-2; those live in
  [docs/fingerprints.json](../../docs/fingerprints.json).
- [DIVERGENCE-AUDIT.md](DIVERGENCE-AUDIT.md) — the sim/browser divergence audit.
- [MICRO-DIVERGENCE.md](MICRO-DIVERGENCE.md) — residual micro-divergences after the audit.
- [GOLDEN-SOAK.md](GOLDEN-SOAK.md) — the golden-equality soak run.
- [GS-CONFIRM-GATE.md](GS-CONFIRM-GATE.md) — the golden-soak confirmation gate.
- [HONEST-WORLD-GS-SCREEN.md](HONEST-WORLD-GS-SCREEN.md) — the honest-world golden screen.
- [STEP-ORDER-ARC.md](STEP-ORDER-ARC.md) — the step-order arc investigation.

**Not indexed, and deliberately:** `golden-soak-rows.json` and `golden-soak.log` are DATA produced
by a run, not records written by a person. `check-index` only considers `*.md`.
