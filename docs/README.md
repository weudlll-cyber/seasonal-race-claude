# RaceArena — the documentation map

**What this document owns:** the map. Every maintained document, what it owns, and the order to read
them in. If a document is not listed here it is either in [archive/](archive/README.md) or it should
not exist. **The rule is about DOCUMENTS, and the four empty directories a reader may find beside
them are not a counter-example: they are not in the repository at all** — git tracks files, so a
directory holding none of them is local litter on one machine and nothing this map is missing.

The project overview and the quick start are in the root [`README.md`](../README.md).

> **The one rule that explains the shape of everything below.** Every fact has exactly ONE
> authoritative home; everywhere else points at it. That is why no document states a config value
> (they live in `client/src/modules/storage/defaults.js`), no document states a fingerprint (they live
> in [fingerprints.json](fingerprints.json)), and why the thresholds for "fair" appear in
> [FAIRNESS.md](FAIRNESS.md) and nowhere else. Guards enforce all three.

---

## Read in this order

If you are new, this is the path. It is six documents and it is enough to be useful.

1. [../README.md](../README.md) — **what this is.** A browser-based racing-event visualiser.
2. [SETUP.md](SETUP.md) — **get it running.** Ten minutes.
3. **[GLOSSARY.md](GLOSSARY.md)** — **the words.** Read this before any race or camera document. This
   project's jargon is dense, and three of its terms mean two different things each.
4. [ARCHITECTURE.md](ARCHITECTURE.md) — **how it is built.** Client, engine, backend, and where the
   race loop lives.
5. [PROJECT-PRINCIPLES.md](PROJECT-PRINCIPLES.md) — **the rules that override convenience.** Short.
   Read all of it.
6. [FAIRNESS.md](FAIRNESS.md) — **what the game is actually trying to do.** The design will not make
   sense until you have read this: every racer is identical, so "fair" means something specific and
   unobvious here.

Then, by what you are about to touch: the race → [FORCE-MAP.md](FORCE-MAP.md) and
[PHASE-CONTRACT.md](PHASE-CONTRACT.md); the camera → [CAMERA_DIRECTOR.md](CAMERA_DIRECTOR.md); a
measurement → [SIM.md](SIM.md).

**Before you change anything that moves the race, two more:**
[DEAD-ENDS.md](DEAD-ENDS.md) (so you do not re-propose something already built and retired) and
[SHIP-CEREMONY.md](SHIP-CEREMONY.md) (so you know what shipping costs).

---

## Tier 1 — the project

What a stranger needs in order to understand and change RaceArena.

### Orientation

| document                                       | what it owns                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| [../README.md](../README.md)                   | The front door: what RaceArena is, and the first commands to run.   |
| [GLOSSARY.md](GLOSSARY.md)                     | The vocabulary. Every private term, defined once.                   |
| [PROJECT-PRINCIPLES.md](PROJECT-PRINCIPLES.md) | The principles that override convenience, including the invariants. |

### Running and building it

| document                           | what it owns                                                       |
| ---------------------------------- | -------------------------------------------------------------------- |
| [SETUP.md](SETUP.md)               | Local setup: client, backend, ports, the single-server rule.       |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System shape: client, in-browser race logic, backend, persistence. |
| [API.md](API.md)                   | The backend HTTP endpoints.                                        |
| [DEPLOYMENT.md](DEPLOYMENT.md)     | Public same-origin hosting and the environment it needs.           |

### The data model

| document                                   | what it owns                                          |
| ------------------------------------------ | ------------------------------------------------------- |
| [RACER_DATA_MODEL.md](RACER_DATA_MODEL.md) | What a racer type is and where its definition lives.  |
| [TRACK_EDITOR.md](TRACK_EDITOR.md)         | The track editor: Center and Boundary modes.          |
| [TRACK_LIFECYCLE.md](TRACK_LIFECYCLE.md)   | How a track is created, stored, and persisted.        |
| [branding.md](branding.md)                 | The event-branding system.                            |

### The race — how it behaves, and why

| document                                    | what it owns                                                                      |
| ------------------------------------------- | ----------------------------------------------------------------------------------- |
| [FAIRNESS.md](FAIRNESS.md)                  | **Canonical.** What "fair" means, and the only home of its thresholds.            |
| [FORCE-MAP.md](FORCE-MAP.md)                | Every force acting on a racer, with a source line for each. Structure, not values. |
| [PHASE-CONTRACT.md](PHASE-CONTRACT.md)      | The phase boundaries, and everything calibrated against each one.                  |
| [RACE-ACTION.md](RACE-ACTION.md)            | The shipped race-action mechanism — how overtakes and lead changes are produced.   |
| [CONCEPT-COHESION.md](CONCEPT-COHESION.md)  | The field-cohesion design rationale behind the shipped gap-reroll.                 |

### The camera

| document                                 | what it owns                                                        |
| ---------------------------------------- | --------------------------------------------------------------------- |
| [CAMERA_DIRECTOR.md](CAMERA_DIRECTOR.md) | The camera's shape: which file owns what, and the one framing rule. |

### The race screen

| document                                                 | what it owns                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [STANDINGS-ARCHITECTURE.md](STANDINGS-ARCHITECTURE.md)   | **Canonical.** The live standings' two layers, and the rule a change to them must obey. |

### Limits, and what is next

| document                     | what it owns                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [ROADMAP.md](ROADMAP.md)     | **A REDIRECT — owns nothing.** Phases and their status are in [BACKLOG.md](BACKLOG.md) PART TWO.                              |
| [BACKLOG.md](BACKLOG.md)     | The living list of open work, with the evidence behind each item.                                                            |
| [DEAD-ENDS.md](DEAD-ENDS.md) | **Required before any race-mechanism proposal.** What was already built, measured and retired — so it is not proposed again. |

---

## Tier 2 — how we work

**This tier serves the working process, not the product.** A reader trying to understand RaceArena
needs none of it. A contributor about to change RaceArena needs most of it.

| document                                         | what it owns                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| [VERIFY-RULES.md](VERIFY-RULES.md)               | What to run, when, and how much. The standing rules, R0 onward.                    |
| [SHIP-CEREMONY.md](SHIP-CEREMONY.md)             | **Canonical.** The checklist for a change that moves shipped behaviour.            |
| [SIM.md](SIM.md)                                 | The headless simulator: how to run it, and what each metric means.                 |
| [SWEEP-HARNESS.md](SWEEP-HARNESS.md)             | The measurement stack around the sim: observers, orchestration, determinism.       |
| [EYE-TEST-SEEDS.md](EYE-TEST-SEEDS.md)           | What a seed guarantees, and what it does not.                                      |
| [TAGS.md](TAGS.md)                               | The git-tag register. A guard depends on its format.                               |
| [LESSONS.md](LESSONS.md)                         | The numbered lessons. Append-only; cited by number across the codebase.            |
| [AUDIT.md](AUDIT.md)                             | The dated security and quality audit log. Read rows as history.                    |
| [DEVSCREEN-INVENTORY.md](DEVSCREEN-INVENTORY.md) | What the Dev Panel actually renders, verified at source.                           |
| [internal/README.md](internal/README.md)         | The diagnostic-snapshot export procedure. The Dev Panel names this path on screen. |

---

## Tier 3 — history

[archive/](archive/README.md) — twenty-one dated records: diagnoses, inventories and tuning logs that
describe the project as it was on a particular date. Kept because the reasoning is worth reading.
**Read nothing there as current.**

[../reports/](../reports/README.md) — the lab journal. Append-only by rule, never rewritten, and
therefore full of statements that were true on the day they were written and are not true now.

---

## What is deliberately NOT a document here

- **Config values.** `client/src/modules/storage/defaults.js` is the only home.
- **Fingerprints.** [fingerprints.json](fingerprints.json) is the only home.
- **A HANDOFF file.** One existed, was never maintained, and is not coming back. Per-task findings go
  into a report under [../reports/](../reports/README.md).
