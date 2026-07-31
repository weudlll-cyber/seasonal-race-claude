# RaceArena — Claude Project Rules

## Language Rule (permanent)

All user-facing text, source code comments, variable names, log messages,
UI labels, Dev Screen labels, document strings, and repository documents
must be in **English**. No German text anywhere in the codebase or documents.
This rule applies to all future changes without exception.

## Ship ceremony (permanent)

Any change that moves the shipped BEHAVIOUR (a new/changed default in
`client/src/modules/storage/defaults.js` or the engine it gates — a
"fingerprint-moving" change) MUST follow the checklist in
[docs/SHIP-CEREMONY.md](docs/SHIP-CEREMONY.md): paired gate, mint, REBASELINE +
SIM.md, golden/replay, the return tag AND its register entry (one step), the
report AND its INDEX entry (one step), the canonical-doc sweep, the owner's live
eye, and the three guards before the commit. That file also states the ONE
CANONICAL HOME rule (every fact has one authoritative home; everywhere else
points to it).
