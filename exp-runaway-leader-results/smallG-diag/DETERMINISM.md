# Determinism re-run — searound (all 3 arms)

The searound arm set was re-run from scratch into a separate output directory with a separate
scratch directory, then compared byte-for-byte against the reported run:

```
node scripts/exp-runaway-leader.mjs --smallg-diag --races=50 --seed=1 --dur=60 --jobs=3 \
  --only=searound --out=client/tmp/smallg-rerun --tmp=client/tmp/exp-rerun
```

SHA-256 of the per-seed record CSVs — **all three identical**:

| arm | sha256 | verdict |
|---|---|---|
| OFF | `8a59f1a5a156d2b6a25b93ade5ccc8c7f8176f6a9894423273e0c8eaf92c6285` | IDENTICAL |
| G15 | `c024cbb7025c823885494e9eeed9a62baf866703ef2f84d179e64873d278febd` | IDENTICAL |
| G075 | `246a7ab7a76913965cccb169bc1fd1889c09f605653165aaabe7428f60658140` | IDENTICAL |

The branch-fire counters reproduced exactly as well (searound: G15 DOWN=381 UP=328 smokingGun=27;
G075 DOWN=1207 UP=867 smokingGun=188), and the STOP gate passed again on the re-run
(OFF = 14/50 runaway). Note that the re-run scheduled its arms in a different order
(OFF → G075 → G15 vs OFF → G15 → G075 in the reported run), so the identical output also confirms
the arms do not leak state into one another.

The scratch directories (`client/tmp/smallg-rerun`, `client/tmp/exp-rerun`) were removed after the
comparison; they are reproducible from the command above.
