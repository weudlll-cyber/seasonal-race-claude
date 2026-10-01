# MORNING-RELEASE-1 — the night chain of 2026-10-01, towards a deliverable state

**Updated after each piece and pushed each time.** Last update: **after piece 2 — the night is finished.**

**Why this night:** the owner's facts of 2026-10-01 say the software is to be downloadable for many
server operators, and each operator must be able to host several organizers on one server. Two
pieces: delivery basics, and a survey and build plan for tenancy.

★ **Superseded the same day, 2026-10-01: the owner decided that the tenancy boundary will NOT be
built**, and approved merging `release/basics`. Organizers on one installation share everything that
is shared today; races stay scoped per team. `tenancy/survey` was not merged; it is archived as
the tag `archive/tenancy-survey-1` (`042f06cc`), which holds `reports/release/TENANCY-SURVEY-1.md`. The piece-2 entries and the tenancy questions below are kept as they were written
that night; **they are answered by that decision and are no longer open.**

## Done

- **Piece 1, delivery basics — branch `release/basics`, pushed, NOT merged.**
  [RELEASE-BASICS-1](RELEASE-BASICS-1.md).
  - **An installation guide a stranger can follow**, in one place (`docs/DEPLOYMENT.md`): install from
    a download, update, and roll back. **It was tried for real, twice**, in a throwaway folder. An older
    version was installed, data was created, the install was updated and then rolled back, and the
    accounts and data were checked after every step. The first try found three mistakes; all are fixed,
    and the second try worked from start to finish.
  - **`npm run backup`**: one command, and it still refuses to save the backup inside the data folder.
  - **`npm run status`**: checks that the server answers, that there is disk space, that the data
    folder can be written, and that the last backup is recent. A scheduler can alert on it.
  - **A setting that keeps the server reachable only from the machine itself**, for when a web server
    sits in front of it. Without the setting, nothing changes.
  - Two lists, nothing changed: what personal data is stored, and what exists of your delivery plan
    of 2026-08-31.
  - Nothing in the race moves; no fingerprint.

- **Piece 2, tenancy survey — branch `tenancy/survey`, pushed, NOT merged.**
  `reports/release/TENANCY-SURVEY-1.md`, now in the tag `archive/tenancy-survey-1`. No product change.
  - **What is true today:** only races are kept apart per organizer. Tracks, brands, player groups,
    racer types and surface classes are one shared set. An organizer made `admin` would manage
    everybody's users. **On one shared browser, the second person sees the first person's local race
    history and unsaved track drawings**, and races recorded offline would probably be uploaded into
    the second person's organizer (read from the code, not tested).
  - **A build plan in eight pieces**, T1 to T8. The first, T1, closes a small gap in races and
    needs no decision from you: a retried race upload can be answered with another organizer's race
    key.
  - **Eight questions for you**, one decision each, listed below.

## Running

- Nothing.

## Open — found tonight, written into the backlog

- **Personal data:** race history (it contains racer names), the admin-recovery log, and a deleted
  admin's name on the accounts they created can only be deleted by editing files by hand.
- **Your delivery plan:** the update mechanism exists and warns when it replaces an operator's change.
  **There is no command that turns your installation into the shipped defaults.** And two shipped
  tracks (`searound`, `seatrack`) no longer match yours: their effects differ.
- `npm run data:export` ignores the data-folder setting. The documents now say so.

## Needs your word

**The tenancy questions** (the options and what each means are in TENANCY-SURVEY-1, *QUESTIONS*):

1. Surface classes: one set for the whole server, or each organizer their own?
2. Who manages an organizer's users: only the person running the server, or each organizer's own
   administrator?
3. May an organizer change a shipped track: no (they make their own copy), only the server's
   administrator, or anyone (as today)?
4. What does a new organizer get of your shipped brand and "Example Group": their own copy, shared
   read-only templates, or nothing?
5. Your existing brands, groups and drawn tracks: yours only after the boundary, or shared?
6. The "updated records replaced your settings" notice: only the server's administrator, each
   organizer, or as today?
7. On a shared browser: each person's own things kept apart, or everything cleared at sign-out?
8. Racer types an organizer creates: shared like the built-in ones, or kept per organizer?

**And:**

- **Merge `tenancy/survey`?** It changes only documents. Merging it after `release/basics` gives
  small conflicts in `reports/release/INDEX.md`, `docs/BACKLOG.md` and `docs/OPEN.md`; the second
  merge re-derives OPEN.md's count.

- **Merge `release/basics`?** Look at the installation guide in `docs/DEPLOYMENT.md` first.
- **The server's default address binding** is still "every interface". Now there is a setting for
  "this machine only"; whether that should become the default is your choice (BACKLOG row B4).
- **Personal data**: whether race history, the recovery log and the `createdBy` names need a way to
  be deleted.
- **Your delivery plan**: whether to build the "my installation → shipped defaults" command, and
  whether `searound` and `seatrack` should be shipped as they are on your machine now.

## Checks

| check | piece 1 | piece 2 |
| --- | --- | --- |
| new tests | 24, all green; each new piece sabotaged once and caught | none (read-only) |
| install / update / rollback followed literally | run 2: passed every step | — |
| `node scripts/engine-reach.mjs --check` | none of 18 paths can reach the engine | documents only |
| `npm run verify -- --premerge` | **PASS 22, FAIL 0, SKIP 14** (second run; the first was red on one over-long line, fixed) | not run: documents only. `check-index`, its tests (9/9) and `check-doc-links` (0 dangling) were run, and the commit hook's 9 guards passed |
| BACKLOG PART ONE open rows | 15 (B2 closed, two opened) | 14 (the TENANCY row stays open, with the plan) |
