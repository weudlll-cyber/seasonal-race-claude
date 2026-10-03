# DELIVERY-DIFF-1 — the owner's installation against what ships

**2026-10-04, branch `docs/delivery-diff` (not merged). Read-only: no data and no seed was changed.**

**What was compared.** The data folder his API uses — `server/data` in his working tree, because
`server/scripts/dev-start.js` sets no `RA_DATA_DIR` (`server/src/dataPaths.js:16-18`) — against the
shipped seeds: `server/seeds/` and the twelve units in `server/seeds/versions.json`.

- **Only these were read:** track, brand and player-group records, backgrounds and logos.
- **Never read:** `users.json`, sessions, races, logs, and anything on the deny list.
- **Player-group member names are personal data.** They were counted and never written down.

**How.** Each JSON record was flattened to its fields and compared field by field. Images were
compared by SHA-256.

## The shipped units (all at version 1)

| unit | record | image | fields that differ |
| --- | --- | --- | --- |
| track city-circuit | identical | identical | 0 |
| track dirt-oval | identical | identical | 0 |
| track garden-path | identical | identical | 0 |
| track ice-track | identical | identical | 0 |
| track luger-hill | identical | identical | 0 |
| track mountainstreet | identical | identical | 0 |
| track river-run | identical | identical | 0 |
| **track searound** | **differs** | identical | **2**: `effects`, `updatedAt` |
| **track seatrack** | **differs** | identical | **2**: `effects`, `updatedAt` |
| track space-sprint | identical | identical | 0 |
| brand seasonal-entertainment | identical | identical (logo) | 0 |
| **player group default-example-group** | **differs** | — | **1**: `updatedAt` |

### What differs, in plain terms

- **Searound — its track effects.** It ships with **no effects**; his copy has **bubbles**, count
  40, size 1.2, colour `#aaddff`, opacity 0.6. Edited 2026-09-28 (`updatedAt` 2026-06-03 → 2026-09-28).
- **Seatrack — its bubbles, much denser.** Shipped: bubbles at count **100**, size **1.9**, opacity
  **0.6**. His: count **36,000**, size **2.6**, opacity **0.45**, same colour. Edited 2026-09-29.
- **The default player group — only its edit time.** `updatedAt` 2026-06-17 → 2026-09-22. Every
  other field, including the members, is identical. He saved it without changing it.

These match the BACKLOG row's 2026-10-01 note that `searound` and `seatrack` differ in `effects`. That
note did not record the values; this report does.

## What he has that is not shipped

| kind | records | note |
| --- | --- | --- |
| tracks | none | every track he has is a shipped one |
| brands | 1 — `9a81a431-….json`, named "Fantasa", with its logo `9a81a431-….png` | his own brand |
| player groups | 2 — a 20-member test group and a 40-member test group | names counted, not printed; the group names are his and are not reproduced here |
| backgrounds | 3 — `2c02ee38d898.jpg`, `d4ee12be7c33.jpg`, `e26cbbcb1cc5.jpg` (uploaded 2026-06-28/29, about 3 MB each) | **no track of his references any of them** — uploads not in use |
| `tracks-backups/` | dated folders from 2026-05 onward | not a record type that ships; listed only so it is not mistaken for one |

## What this means for the delivery plan

**If the owner wants his installation to BE the shipped default:**
- **Two track records would change:** `searound` and `seatrack`, effects only.
- **Nothing else he has differs** from what ships.
- **The redelivery mechanism needs no new code for that:** change the two seed files, raise their two
  versions in `versions.json`, and `check-seed-versions` enforces the pairing.

**Choices this report does not make:**
- **Whether those two tracks should ship as he has them.** Seatrack's 36,000 bubbles is 360 times the
  shipped density.
- **Whether "Fantasa" or either test group should ship.**

## Not done

No seed, version or data file was changed.
