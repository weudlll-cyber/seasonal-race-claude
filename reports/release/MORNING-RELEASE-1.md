# MORNING-RELEASE-1 — the night chain of 2026-10-01, towards a deliverable state

**Updated after each piece and pushed each time.** Last update: **after piece 1** (piece 2 running).

**Why this night:** the owner's facts of 2026-10-01 say the software is to be downloadable for many
server operators, and each operator must be able to host several organizers on one server. So the
tenancy boundary belongs in the first release. Two pieces: delivery basics, and a survey and build
plan for tenancy. **Nothing is merged. Both branches wait for you.**

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

## Running

- **Piece 2, tenancy survey — branch `tenancy/survey`.** Read-only survey finished; report being
  written.

## Open — found tonight, written into the backlog

- **Personal data:** race history (it contains racer names), the admin-recovery log, and a deleted
  admin's name on the accounts they created can only be deleted by editing files by hand.
- **Your delivery plan:** the update mechanism exists and warns when it replaces an operator's change.
  **There is no command that turns your installation into the shipped defaults.** And two shipped
  tracks (`searound`, `seatrack`) no longer match yours: their effects differ.
- `npm run data:export` ignores the data-folder setting. The documents now say so.

## Needs your word

- **Merge `release/basics`?** Look at the installation guide in `docs/DEPLOYMENT.md` first.
- **The server's default address binding** is still "every interface". Now there is a setting for
  "this machine only"; whether that should become the default is your choice (BACKLOG row B4).
- **Personal data**: whether race history, the recovery log and the `createdBy` names need a way to
  be deleted.
- **Your delivery plan**: whether to build the "my installation → shipped defaults" command, and
  whether `searound` and `seatrack` should be shipped as they are on your machine now.

## Checks

| check | piece 1 |
| --- | --- |
| new tests | 24, all green; each new piece sabotaged once and caught |
| install / update / rollback followed literally | run 2: passed every step |
| `node scripts/engine-reach.mjs --check` | none of 18 paths can reach the engine |
| `npm run verify -- --premerge` | *filled in when it finishes* |
