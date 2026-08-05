# NIGHT-TOOLS-1 — Stage E: documentation audit (FINDINGS ONLY, no prose rewritten)

Method: each document read **against the source it describes**, and every finding below is backed by
a command whose output is quoted. Impressions are excluded. Nothing here was repaired — the brief
allows mechanically-provable stale numbers to be corrected, and **none were found** (see §0).

**Inventory: 33 documents under `docs/`, plus `README.md`, `CLAUDE.md` and `KRAEFTE-LANDKARTE.md` at
root.** The last is not in the brief's list: 437 lines, English content, German filename kept
deliberately with the language rule quoted in its own header, linked from AUDIT/BACKLOG/SIM. It is
legitimate and current.

---

## §0 — every fingerprint claim in every live document is CORRECT

Checked mechanically against the shipped hashes (camera `00cafa2432add0f7`, render
`1f83ecc1fcb6fa9a`, world `dc4647be0f55ebdb`). SIM.md, SHIP-CEREMONY.md, REBASELINE.md,
CAMERA_DIRECTOR.md and ARCHITECTURE.md all carry current values; the only occurrences of superseded
hashes are in TAGS.md and in prose that describes a transition, where they are history.

**So there were no stale numbers to correct in this block.** That is worth stating plainly, because
it is the outcome the brief's "may be corrected" clause was written for and it did not arise.

---

## §1 — docs/SIM.md · LAST TRUE AT `703b5b6e` (today)

**MISSING — the shipped world is NOT completely described.** Mechanically: of the 19 files in the
engine-reach hull (what `raceCore.js` can actually reach), **8 are never named in SIM.md**:

```
autoSpriteScale.js   heroChoreography.js   raceBaseSpeed.js   raceBehaviorConfig.js
raceDynamicsConfig.js   storage.js   RandomHelper.js   mathUtils.js
```

Two of these matter more than the others and are the actionable half:

- **`raceBehaviorConfig.js` and `raceDynamicsConfig.js`** are *configuration surfaces the race core
  reads*. A document that claims to describe the shipped world and never names them is incomplete in
  the way that matters — those are knobs, not plumbing.
- **`autoSpriteScale.js`** is the file the mint tripwire was created for (CAMERA-MINT-TRIPWIRE-1). It
  reaches the engine and SIM.md does not mention it.

The other five (`storage.js`, `RandomHelper.js`, `mathUtils.js`, `raceBaseSpeed.js`,
`heroChoreography.js`) are plumbing or already covered under another name; naming them would be
completeness theatre. **Recommendation: name the two config surfaces and `autoSpriteScale.js`; leave
the rest.**

**MISSING — script inventory.** SIM.md cites 37 script paths; `scripts/` holds 50 `.mjs` files. Not
all deserve documenting, but the gap is unstated, so a reader cannot tell whether a script is absent
because it is unimportant or because nobody updated the list.

**GONE — one dead reference:** `scripts/sim-sweep.mjs` (also cited by BACKLOG.md and ROADMAP.md).

**Fingerprint lineage: correct.** The chain and the current values check out.

---

## §2 — docs/CAMERA_DIRECTOR.md · LAST TRUE AT `e3437a75`

**Could someone run a camera check tomorrow using only this document? PARTLY — and the gap is
specific.**

| what a runner needs | present? |
|---|---|
| which script | **yes** — `camera-fingerprint.mjs` and `render-fingerprint.mjs` both named |
| the current expected hashes | **yes**, both correct |
| what it covers | **yes**, and well |
| the three render blind spots | **yes** — line 314 names the rasteriser, the artwork and the sprite blit together |
| **which ARGUMENTS to pass** | **NO** |
| **what it EMITS** | **NO** |

`--quiet`, `--ops=<track>`, `--phases` and `--coverage` appear nowhere in the document; there are
three matches for the script names and none for any flag. A reader is told *that* the fingerprint
exists and *what it means*, but not *how to invoke it* or *what a passing run looks like on screen*.
They would have to open the script. **MISSING, and it is the cheapest fix in this audit:** four lines
giving the exact command, its flags, and one line of sample output.

**One nuance the document gets right and should keep:** it names camera changes as reaching the
render fingerprint, which was only corrected yesterday.

---

## §3 — the rest, and the "one truth, two homes" answer

**THE ANSWER THE BRIEF ASKED FOR, with evidence: the CURRENT FINGERPRINTS live in FOUR documents.**

| document | camera | render | world |
|---|---|---|---|
| `docs/SIM.md` | 1 | 1 | 2 |
| `docs/SHIP-CEREMONY.md` | 1 | 1 | 1 |
| `reports/parity/REBASELINE.md` | 1 | 1 | 2 |
| `docs/CAMERA_DIRECTOR.md` | 1 | 1 | — |
| `docs/ARCHITECTURE.md` | — | — | 2 |

**The two that most directly claim to be the truth about the same thing are `REBASELINE.md` and
`SHIP-CEREMONY.md`.** The ceremony itself says at line 144 that REBASELINE's top block "is the
canonical current baseline" — and then carries its own copy of all three hashes in the table above
it. It also declares (line 147) that "SIM.md is the canonical home for the fingerprint lineage", so
the rule names *two* canonical homes for two nearly-identical facts, while four documents actually
hold the values.

They agree today only because I have been updating all of them by hand in every block this week.
That is precisely the arrangement stage B just removed from the cost column.

**GONE — seven references to scripts that no longer exist:**

| script | cited by |
|---|---|
| `sim-sweep.mjs` | BACKLOG.md, LESSONS.md, ROADMAP.md |
| `diag-locks.mjs`, `param-sweep-full.mjs`, `sweep-dyn-sbt.mjs`, `sweep-lateral.mjs` | LESSONS.md |
| `exp-b2-attack.mjs` | BACKLOG.md |
| `pp-pulklr-sweep.mjs` | ARCHITECTURE.md |

Most sit inside historical narrative in LESSONS.md, where naming a since-deleted tool is arguably
correct — the lesson happened. **ARCHITECTURE.md and BACKLOG.md are the two where it reads as a live
instruction**, and those are the ones worth fixing.

**Oldest by last touch** (a weak signal, listed because it is cheap and directs the next audit):
`API.md` 2026-06-09 · `SETUP.md` 06-11 · `AUTH.md` 06-13 · `branding.md` 06-13 · `AUDIT.md` 07-14.
None was read against its source tonight — the brief's order put SIM and CAMERA_DIRECTOR first and
the remaining time went there. **That is the largest unexamined surface this audit leaves.**

---

## §4 — retirement candidate (planner proposal 2)

**No document met the bar.** CAMERA.md was retired because a *newer, better* document owned the same
subject. Nothing here is in that position: the stale documents (`API.md`, `AUTH.md`, `SETUP.md`) are
old but have no rival, and retiring them would leave the subject undescribed rather than
single-homed. **The defect-density case is instead the FINGERPRINT TABLES**, where four homes exist
and three could be replaced by a pointer — the same shape, one level down.

## §5 — what I did NOT check

- `API.md`, `AUTH.md`, `SETUP.md`, `branding.md`, `AUDIT.md`, `DEPLOYMENT.md` and ~20 further
  documents were **not read against source**. Only inventoried.
- FAIRNESS.md, LESSONS.md, DEAD-ENDS.md, TAGS.md, VERIFY-RULES.md were checked for fingerprint and
  script-name claims only, not read end to end.
- No document's *prose* was assessed for accuracy of reasoning — only claims a command can settle.
