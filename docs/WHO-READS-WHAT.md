# Who reads what — the reading order

**Owns:** the answer to *"who is supposed to read all this"*. It names the INTENDED READER of every
top-level document and the order to read them in. It states no fact of its own: every row points at
the document that owns the subject, and where this page and that document disagree, **that document
wins**.

*Written 2026-09-27 (DELIVERY-CLEAN-2 arc 2). There are 40 top-level documents, counting this one.
**Nobody is meant to read 40 documents.** The operator list below is five; the developer list is
four plus four; most people never need the rest.*

---

## If you are the OPERATOR — running an event

**Five documents, in this order.** You do not need anything below this section.

1. **[../README.md](../README.md)** — what RaceArena is, and how to run it.
2. **[SETUP.md](SETUP.md)** — getting it running: client, backend, ports, the first account.
3. **[ENVIRONMENT.md](ENVIRONMENT.md)** — every variable, and what breaks without it.
4. **[DEPLOYMENT.md](DEPLOYMENT.md)** + **[DEPLOY-NOTES.md](DEPLOY-NOTES.md)** — putting it on a
   real host. ★ **DEPLOY-NOTES §5 is the one to read before going live**: six doors, and which of
   them are still open.
5. **[branding.md](branding.md)** — making the event look like your event.

★ **If you read only one page of the five, read `DEPLOY-NOTES.md` §4 and §5.** They say what is not
in place yet — there is no HTTPS in this repository, and over plain HTTP sign-in works with the
password in clear and nothing warns you.

---

## If you are a DEVELOPER arriving — the first day

**Four documents, in this order, and the order matters.**

1. **[GLOSSARY.md](GLOSSARY.md)** — ★ **first, not last.** Three of this project's terms mean two
   different things each. A newcomer fails on the words long before the details.
2. **[../CLAUDE.md](../CLAUDE.md)** *(or)* **[README.md](README.md)** — the door, and the map.
3. **[ARCHITECTURE.md](ARCHITECTURE.md)** — which layer holds what.
4. **[FAIRNESS.md](FAIRNESS.md)** — what the game is trying to do. Every racer is identical, so
   "fair" here means something specific and unobvious, and the race design does not make sense
   without it.

**Then, before you change anything:**

- **[PROJECT-PRINCIPLES.md](PROJECT-PRINCIPLES.md)** — the rules that override convenience.
- **[VERIFY-RULES.md](VERIFY-RULES.md)** — what to run, and how much. ★ Bare `verify` green is not
  CI green.
- **[DEAD-ENDS.md](DEAD-ENDS.md)** — **required before proposing any race-mechanism change.** It
  exists so nobody re-proposes something already built, measured and retired.
- **[SHIP-CEREMONY.md](SHIP-CEREMONY.md)** — if your change moves shipped behaviour.

---

## When you are working on ONE subject — the owning document

One subject, one home. Go to the owner; everything else points at it.

| subject | owned by |
| --- | --- |
| the HTTP surface | [API.md](API.md) — and it states which endpoints it does **not** cover |
| authentication | [AUTH.md](AUTH.md) |
| environment variables | [ENVIRONMENT.md](ENVIRONMENT.md) |
| the camera | [CAMERA_DIRECTOR.md](CAMERA_DIRECTOR.md) · the ending: [ENDING-PHASES.md](ENDING-PHASES.md) |
| the race-action mechanism | [RACE-ACTION.md](RACE-ACTION.md) |
| forces on a racer | [FORCE-MAP.md](FORCE-MAP.md) |
| phase boundaries | [PHASE-CONTRACT.md](PHASE-CONTRACT.md) — ★ its values are dated 2026-07-14; its rule is not |
| fairness thresholds | [FAIRNESS.md](FAIRNESS.md) — the only document that states them |
| tracks | [TRACK_EDITOR.md](TRACK_EDITOR.md) (the editor) · [TRACK_LIFECYCLE.md](TRACK_LIFECYCLE.md) (creation → storage) |
| racer types | [RACER_DATA_MODEL.md](RACER_DATA_MODEL.md) |
| the live standings panel | [STANDINGS-ARCHITECTURE.md](STANDINGS-ARCHITECTURE.md) |
| the Dev Panel | [DEVSCREEN-INVENTORY.md](DEVSCREEN-INVENTORY.md) |
| the headless simulator | [SIM.md](SIM.md) · the measurement stack: [SWEEP-HARNESS.md](SWEEP-HARNESS.md) |
| what a seed guarantees | [EYE-TEST-SEEDS.md](EYE-TEST-SEEDS.md) |
| field cohesion, the design rationale | [CONCEPT-COHESION.md](CONCEPT-COHESION.md) |
| the git-tag register | [TAGS.md](TAGS.md) |
| running an unattended night | [NIGHT-RUN.md](NIGHT-RUN.md) |
| the vocabulary | [GLOSSARY.md](GLOSSARY.md) |

**Config VALUES are owned by no document at all** — they live in
`client/src/modules/storage/defaults.js`, fingerprints live in
[fingerprints.json](fingerprints.json), and a guard fails any document that restates one.

---

## What is OPEN, and what is HISTORY

**Open work:** [BACKLOG.md](BACKLOG.md) PART ONE is the list. [OPEN.md](OPEN.md) is the short view
**derived** from it — where they disagree, the backlog wins.

**History, and correct as history:** [BACKLOG.md](BACKLOG.md) PART TWO (closed work) ·
[AUDIT.md](AUDIT.md) (append-only audit log) · [LESSONS.md](LESSONS.md) (the numbered lessons) ·
[MORNING.md](MORNING.md) (the dated sheet of 2026-09-19 — **not** the current one) ·
[DEAD-ENDS.md](DEAD-ENDS.md) (retired approaches) · `docs/archive/` (says so itself).

**A redirect, owning nothing:** [ROADMAP.md](ROADMAP.md).

**Not documentation at all:** `reports/` is the lab journal — append-only, and **allowed to go stale
by rule**. See [../reports/README.md](../reports/README.md).

---

## What this page does not establish

- **It does not say a document is worth reading**, only who it is for. A document with a live reader
  and a live reason can still be too long, and this page does not judge that.
- **The groupings are mine, from each document's own scope line** — no reader was asked. If an
  operator finds they need something from the developer list, the grouping is wrong, not the reader.
- **39 is the top-level count.** `docs/archive/` (22) and `docs/internal/` (1) are below it and are
  history by declaration; nobody is directed to them here.
