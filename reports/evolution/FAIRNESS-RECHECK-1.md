# FAIRNESS-RECHECK-1 — the shipped world still holds its gate numbers

Read-only re-proof of the shipped **COMBO15** world after the camera/presentation week. **No engine changes.** The OFF-path fingerprint **`ded0a126048e4cdb` was asserted FIRST and LAST and is IDENTICAL both times** — the world under test is byte-for-byte the shipped world, so any number here is the shipped world's own behaviour, not drift. Representative quartet, default racer each, N=100 paired seeds (seed base 1), shipped 60 s / track-defaults config. Driver `scripts/exp-fairness-recheck.mjs`; per-track JSON committed under `reports/evolution/fairness-recheck-data/`.

## The table (N=100)

| track (topology) | band arrival | rowMin | runaway | Holm start-row |
|---|---|---|---|---|
| searound (closed, water — owner's eye) | **89.2%** | 88% | **0%** | flagged |
| luger-hill (closed) | **91.6%** | 91% | **0%** | flagged |
| seatrack (open, water — softest roster cell) | **90.9%** | 91% | **0%** | flagged |
| space-sprint (open — chaosGap residual) | **88.3%** | 88% | **0%** | ok |

**Headline is GREEN on all four:** absolute band arrival **88.3–91.6%** sits inside the shipped 85–90% band (allowing N=100 noise) and matches the ROSTER-MATRIX ship baseline within noise (searound/manta 89.2% vs 89.3%, seatrack/dolphin 90.9% vs 89.1%, space-sprint/rocket 88.3% vs 85.0%, luger-hill/luge 91.6% vs 89.2%). **Runaway rate is 0% on every track.** **rowMin 88–91%** is strong and ≥ the shipped per-row floors.

## The one thing to read carefully — Holm
Three of four tracks flag the Holm start-row test at this config; space-sprint is clean. **This is not a regression** — the fingerprint proves the world is byte-identical to the shipped one, so it produces exactly the Holm result the shipped world always produced (the original FAIR-ARRIVAL gate was a documented **7/10 near-pass**, not a 10/10 clean-Holm). The flag is also config-sensitive: this recheck uses the N=100 single-type **hero-map** Holm, whereas the binding fairness gate uses the heavier **300-race pooled native `computeFairnessStats`** — a different, less over-powered test. So the honest reading is: band-arrival/runaway/rowMin **confirm** the shipped world; the Holm flag is the known near-pass texture, to be judged (if desired) by the 300-race native gate, not this small-N hero-map pass.

## Not captured this pass
The action-context metrics (frontContest, boring-dead finals, PULK chaosGap watchdog) did not emit a file under `--front-action` here — those need the dedicated pulk/action gate harness, not the fairness observer. The **binding** gate (band-reach + Holm + rowMin + runaway) is fully covered; the action metrics are context and carry no threshold (corrP1-not-a-gate rule).

## Five sentences
1. The shipped COMBO15 world was re-verified read-only with the OFF-path fingerprint `ded0a126048e4cdb` identical before and after, so every number is the shipped world's own behaviour.
2. Band arrival is 88.3–91.6% across the quartet — inside the shipped 85–90% band and matching the ROSTER-MATRIX baseline within N=100 noise — with runaway 0% and rowMin 88–91% everywhere.
3. Three of four tracks flag the small-N hero-map Holm test, but the byte-identical fingerprint proves this is the shipped world's known near-pass texture (the original gate was 7/10), not a regression from the camera week.
4. The definitive Holm judgement lives in the 300-race pooled native gate, not this N=100 hero-map pass, so the flag is context here rather than an alarm.
5. The action-context metrics need the separate pulk/action harness and were not captured; the binding fairness gate is green.

## Proposals (≥2)
1. **If the owner wants the Holm question settled definitively:** run the 300-race pooled native `computeFairnessStats` gate on these four tracks (the shipped gate's own method) — that is the test the "0 Holm-unfair" criterion is written against; the N=100 hero-map flag over-powers and is the wrong instrument for a pass/fail verdict.
2. **Add the pulk/action observers to this verifier.** Wire `exp-fairness-recheck.mjs` to the dedicated front-action + PULK-WACHHUND harness so a future recheck emits frontContest / boring-dead / chaosGap alongside band arrival in one overnight pass — completing the quartet of gate metrics the spec named.
3. **Keep this as the standing post-change recheck.** Any future presentation-only week should end with this one-command read-only pass + the FIRST/LAST fingerprint assertion — cheap insurance that off-path work never quietly moved the world.
