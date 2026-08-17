# DEAD-EXPORTS-1 — one deleted, one kept, and a premise corrected

**Branch:** `fix/dead-exports-1`, off master `8b101598`. **One constant deleted. No behaviour
changed.** WORLD and WORLD-OFF measured and byte-identical.

**The headline is the correction:** the block was specced to delete **two** exports "referenced
nowhere in the repository". **One of them is referenced.** `deleteRacerSprite` is imported and called
five times by its own test file — it was never in the "referenced nowhere" category, and it stays.

---

## THE PREMISE, AND WHERE IT CAME FROM

SEPARATION-TO-TEST-1's table was accurate:

| export | verdict in that table |
| --- | --- |
| `services/racerApi.js` `deleteRacerSprite` | **ONLY racerApi.test.js** |
| `sim/observers/pulk-contest.mjs` `RUNAWAY_LEAD_THRESHOLDS_LEN` | **referenced nowhere at all** |

Two different categories. **Its prose then flattened them** — *"the two that look like genuinely
unused product code"* — and that sentence is what this block was written from. The table was right
and the summary was loose; the loose version is the one that travelled.

**This is the fifth time an unused/unreachable claim in this repository has needed checking before
acting on it, and the first time the false one was mine.**

---

## HOW DEADNESS WAS RE-ESTABLISHED — THE SEARCHES, NOT THE CONCLUSION

Run over **tracked files** (`git grep`), so build artefacts like `client/tmp/loadmode-full.json`
cannot mask or fake a hit — an untracked 1.3 MB test-output file did exactly that on the first
attempt.

| # | search | `deleteRacerSprite` | `RUNAWAY_LEAD_THRESHOLDS_LEN` |
| --- | --- | --- | --- |
| 1 | identifier, whole tree, all file types | definition + **5 uses in its own test** | definition only |
| 2 | as a STRING / partial name (`RUNAWAY_LEAD`) | — | only the definition; `RUNAWAY_LEADER` in `sim-fairness.mjs` is a **different** CLI flag |
| 3 | `import * as` namespace imports of the module | — | **none** — so no dynamic property access can reach it |
| 4 | every importer of the module | — | `sim-fairness.mjs` imports **7 names**, and this is not one of them; it takes the sibling `RUNAWAY_LARGE_LENGTHS` |
| 5 | server tree | route exists (below) | no hits |
| 6 | `docs/` | no hits | no hits — only `pulk-contest.mjs` as a *filename* in SIM/SHIP-CEREMONY/SWEEP-HARNESS |

**Verdict:** `RUNAWAY_LEAD_THRESHOLDS_LEN` is dead. `deleteRacerSprite` is not.

---

## WHAT WAS DELETED

```diff
-// RUNAWAY-LEADER thresholds (racer lengths), single-sourced here. LARGE is the primary "too big to
-// catch" cut; the list is the report's share table so the cutoff isn't arbitrary (LARGE must be in it).
 export const RUNAWAY_LARGE_LENGTHS = 4.0;
-export const RUNAWAY_LEAD_THRESHOLDS_LEN = [3, 4, 6, 8];
```

Its comment described **"the report's share table so the cutoff isn't arbitrary (LARGE must be in
it)"** — a share table that was never built, and an invariant (`4.0 ∈ [3,4,6,8]`) that nothing
enforced. The surviving `RUNAWAY_LARGE_LENGTHS` keeps its own comment, and a note records what stood
beside it and why it went, so the next reader does not re-derive the question.

---

## WHAT WAS KEPT, AND THE FINDING BEHIND IT

**`deleteRacerSprite` stays** — it has a test that exercises it, including the `id/slash` encoding
case, which is a real assertion about `encodeURIComponent`.

**The finding, reported and not acted on as instructed:** it is the only *client* caller of
`DELETE /api/racers/:id/sprite` (`server/src/routes/racers.js:318`), and nothing in the client calls
`deleteRacerSprite` outside its test. So the route is reachable from the API but not from any
screen — either a Dev Screen affordance was never wired up, or the sprite-replacement path
(`POST /:id/sprite`, which deletes the old file itself at line 302) made it redundant.

**Nothing on the server was touched.** A route nobody calls from this client is a separate decision
and may be reachable by other means.

---

## FINGERPRINTS

`pulk-contest.mjs` sits inside **the WORLD closure only** — walked, not assumed:

```
fingerprint-default.mjs  closure 36 | contains pulk-contest.mjs: YES
camera-fingerprint.mjs   closure 36 | contains pulk-contest.mjs: no
render-fingerprint.mjs   closure 55 | contains pulk-contest.mjs: no
```

So WORLD and WORLD-OFF were owed, and camera and render were not:

| instrument | before | after |
| --- | --- | --- |
| WORLD | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` |
| WORLD-OFF | `854018ee5d3d83e1` | `854018ee5d3d83e1` |

**Unmoved — the proof the deletion is inert.** Script suite **388/388**.

---

## ONE DECISION CLOSED

**2026-08-19 — the owner decided the three B2 attackers keep the shared `b2AttackFinalRank` of 7.**

SEPARATION-TO-TEST-1 left this open as "the open product question". It is closed: the attackers
converge on one place by design, they are one act, and the separation assertion covering the standard
cast is the correct scope rather than a workaround. **Not to be re-opened from that report.**

---

## SOURCE HYGIENE

| file | change |
| --- | --- |
| `scripts/sim/observers/pulk-contest.mjs` | one `export const` deleted; the sibling's comment corrected and a note added |

Nothing else deleted. **The other seventeen test-only exports stay** — a helper used only by its own
test is not a risk, and that was already decided. Tests added: 0. Tests deleted: 0. Tests
re-blessed: 0.

---

## PROPOSALS

### Proposal A — decide the sprite-delete route, since it is now the only loose end from that scan

`DELETE /api/racers/:id/sprite` exists, is tested on the server, and has no caller from any screen.
Three possibilities and they want different answers: a **Dev Screen affordance was never wired** (add
the button), the **upload path made it redundant** (`POST /:id/sprite` already removes the old file),
or it is **API surface kept deliberately**.

**It is cheap to settle and it decays if left**: an untested-from-the-client route accumulates the
assumption that somebody uses it — which is exactly the assumption that produced this block.

### Proposal B — when a report lists categories, do not summarise across them

The defect that reached a spec here was not in the scan or the table; it was in one summary sentence
that merged **"used only by its own test"** with **"referenced nowhere"**. Both were in the same
report, correctly, two paragraphs apart.

**The cheap rule is to make the summary quote the category, not the count** — "one referenced only by
its test, one referenced nowhere" instead of "two that look unused". It costs nothing and it is the
form that would have survived being read quickly, which is how a report is actually read.
