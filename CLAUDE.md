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
the codebase or documents — including file names.

**THE QUOTATION EXCEPTION IS CLOSED, 2026-08-12.** From this date the owner's verdicts are recorded
in **English only, attributed and dated**. A rendition of what he said, not a transcription of it —
"the owner, 2026-08-12: not worse is fine" rather than the German original beside a gloss. The list
below is the last state of the exception and is what STAYS; nothing on it moves.

**Why close it rather than convert.** The exception was written narrow — "his own words are
evidence, translating them destroys the evidence" — and read wider every time. The list drifted
from a COUNT ("exactly two such quotations") to a LIST with an incomplete inventory to what it
plainly was: an in-repository German paragraph after a rule that said no German in the repository.
Recording verdicts in English, attributed and dated, is evidence enough for every decision this
project has needed to justify since the exception was written; the German original is not a load-
bearing part of that evidence, it was a habit that grew unread.

**Why the existing quotations stay.** They are ALREADY WRITTEN into the record — into ships, into
fingerprints, into tags. Editing them would rewrite the evidence for verdicts that have already
been acted on; a later reader auditing a ship needs to find those words where the ship was cut.
Translating them out now would be its own form of falsifying the record, in the opposite direction
from the one the exception feared. So they stay, and this list is the closing inventory so a later
reader does not read them as an oversight.

**The closing inventory** (every verbatim owner quotation the codebase carries as of 2026-08-12,
found by searching, not trusted from a count):

- `docs/CONCEPT-COHESION.md` — the bounded brake
- `docs/TAGS.md` — the company guarantee, and the framing failure ("that is not exciting")
- `docs/SHIP-CEREMONY.md` — the runaway budget
- `client/src/modules/storage/defaults.js` — the podium build-up's tempo
- `docs/CAMERA_DIRECTOR.md` — the leader shot's bounding, the company guarantee retiring once home,
  and "I have seen all the races"
- `docs/FAIRNESS.md` — the 2026-08-12 verdict on the disproportionate-chaos watchdog
- `docs/fingerprints.json` — the FINISH-PAIR-1 mint carries two quotations, one the failure and one
  the verdict on the fresh tree
- `client/src/modules/autoSpriteScale.test.js` — the sprite-scaling rule
- `client/src/modules/camera/framingRule.js` and its test — the framing failure again

The list is CLOSED. **Do not add to it, and do not "fix" any entry on it.** If a later reading of
the code turns up a quotation this inventory missed, that entry too is grandfathered — it was
already written under the exception — and the inventory gets the missed line added; the rule
against NEW quotations is unaffected.

## Ship ceremony (permanent)

Any change that moves the shipped BEHAVIOUR — a new or changed default in
`client/src/modules/storage/defaults.js`, or the engine it gates — MUST follow the checklist in
[docs/SHIP-CEREMONY.md](docs/SHIP-CEREMONY.md), which is its canonical home and states every step.
Two consequences of it that are easiest to get wrong, named here so they are not discovered late:

- **Never mint a fingerprint on your own authority.** A visible change needs the owner's eye first.
- **Every fact has ONE authoritative home** and everywhere else points at it. Config values live in
  `defaults.js`; fingerprints live in [docs/fingerprints.json](docs/fingerprints.json); the fairness
  thresholds live in [docs/FAIRNESS.md](docs/FAIRNESS.md). Do not restate any of them.
