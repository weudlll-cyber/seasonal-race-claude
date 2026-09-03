# LEFT-BEHIND-1 — ONE stale sentence, and that is the whole answer

> **The three largest movers were the crop deletion, the badge removal and the citation conversion.**
> Searched across the whole scope for what they left: **one sentence in one document.**
>
> **This is a small finding and it is reported as one.** The alternative — writing it up as though a
> single stale sentence were a haul — is the shape this fortnight has been about.

---

## 1. WHAT WAS SEARCHED, AND WHAT WAS FOUND

Scope `3fc4c6ed..HEAD`, and the six classes the brief named:

| class | result |
| --- | --- |
| **scripts nothing invokes** | **none.** Every script touched in scope is named by `package.json`, `verify.mjs`, CI or a document — from `check-config-keys` (1 site) to `sim-fairness` (14) |
| **exports nothing imports** | **none.** All five new exports have a consumer: `sectionsOf` and `UNGROUPED_LABEL` (4 files each), `START_BOARD_GEOMETRY` (2), `getBodyBox` (2), `getPortraitFitScale` (3) |
| **tests asserting removed behaviour** | **none.** Four test files still name `assignRacers`, `racerNumber` or `Reshuffle` — every one is either an **absence assertion** (`expect(p).not.toHaveProperty('racerNumber')`) or a comment recording the removal. That is the point of DROP-RACER-NUMBER-1, not residue from it |
| **reports nothing links** | **none.** `check-index`: 429 evolution reports, **0 unindexed, 0 dangling**; 73 night, 7 parity, same |
| **documents pointing at deleted files** | **ONE.** §2 |
| **dead entries in the backlog's open part** | **none found.** Four were closed during this chain, each by its own stated condition; the rest were not re-audited (BACKLOG-VERDICTS-1's job, and out of scope) |

---

## 2. THE ONE

`docs/MORNING.md`:

> *"`crop-sprite-sheets.mjs`'s `frameWidth`/`frameHeight` **are now** `preCropFrameWidth`/
> `preCropFrameHeight`. Rule A no longer DISCOVERS them…"*

**Present tense about a file deleted the following day.** Written 2026-09-02 to record the rename;
the owner ruled DELETE on 2026-09-03 and the sentence describing the renamed file survived the file.

**Corrected to the past tense**, with a note saying where the code went. **The rename itself is not
wrong** — it happened, and R18 exists because of it. Only the tense was.

---

## 3. WHY SO LITTLE, AND WHY THAT IS NOT A COMPLIMENT TO ME

**Each of the three movers was followed through in its own piece**, and each carries the sweep in its
own report:

- the crop deletion swept eight references and left every one recording the deletion;
- the badge removal swept five spellings across four trees before touching anything;
- the citation conversion is enforced by Rule F, which reads the documents on every run.

**The one that got through is in the one document nothing guards** — the morning sheet, which is
rewritten by hand every night and is checked by no rule. That is not a coincidence and it is the only
generalisable thing here: **the residue landed exactly where nothing looks.**

---

## Limits

**"Provably dead" was the bar, and nothing needed the separate list.** The brief asked for an
untouched list of anything unprovable; there is nothing on it, because the one finding was provable
(the file is gone; the sentence is present-tense) and everything else was alive.

**Dead backlog entries were not systematically re-audited.** BACKLOG-VERDICTS-1 did that on 09-02 and
re-doing it is out of this scope. **Four entries were closed during this chain**, each by its own
`verify:` condition; whether the other 56 are still live is that pass's question, not this one.

**This searched for residue of REMOVALS.** Something added in scope and never wired up would look
different — an export with a consumer that is itself dead, say — and the export check here only asks
whether *a* file names it, not whether that file is reachable.
