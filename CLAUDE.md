# RaceArena — Claude project rules

**What this document owns:** the door for an AI, and the two permanent rules that are not derivable
from any other document. **It POINTS; it duplicates nothing.** If a rule below can be stated in full
somewhere else, this file names that place instead of restating it — the same one-canonical-home rule
the project applies to everything else.

## Read this first, in this order

1. [docs/README.md](docs/README.md) — the map, and the reading order for a newcomer.
2. [docs/GLOSSARY.md](docs/GLOSSARY.md) — **the vocabulary. Read it before any race or camera
   document.** Three of this project's terms mean two different things each; you will misread code
   without it.
3. [docs/PROJECT-PRINCIPLES.md](docs/PROJECT-PRINCIPLES.md) — the rules that override convenience.
4. [docs/FAIRNESS.md](docs/FAIRNESS.md) — what the game is trying to do. Nothing about the race design
   makes sense before this.

Before changing anything: [docs/VERIFY-RULES.md](docs/VERIFY-RULES.md) (what to run and how much) and
[docs/DEAD-ENDS.md](docs/DEAD-ENDS.md) (so you do not propose something already built and retired).

## Language rule (permanent)

All user-facing text, source code comments, variable names, log messages, UI labels, Dev Screen
labels, document strings, and repository documents must be in **English**. No German text anywhere in
the codebase or documents — including file names. This rule applies to all future changes without
exception.

## Ship ceremony (permanent)

Any change that moves the shipped BEHAVIOUR — a new or changed default in
`client/src/modules/storage/defaults.js`, or the engine it gates — MUST follow the checklist in
[docs/SHIP-CEREMONY.md](docs/SHIP-CEREMONY.md), which is its canonical home and states every step.
Two consequences of it that are easiest to get wrong, named here so they are not discovered late:

- **Never mint a fingerprint on your own authority.** A visible change needs the owner's eye first.
- **Every fact has ONE authoritative home** and everywhere else points at it. Config values live in
  `defaults.js`; fingerprints live in [docs/fingerprints.json](docs/fingerprints.json); the fairness
  thresholds live in [docs/FAIRNESS.md](docs/FAIRNESS.md). Do not restate any of them.
