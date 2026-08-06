# server/data — Runtime Directory (gitignored)

This directory is a pure runtime store — it is gitignored and never committed.

Shipped defaults (tracks, backgrounds, brand, player-group) live in **server/seeds/**
and are copied here automatically on first boot by `seedRuntime.js` (only when the
destination file does not already exist — idempotent).

User-created data (custom tracks, brands, racers, groups, sessions, users) is also
written here at runtime.

To reset to factory defaults, delete the relevant files; they will be re-seeded from
`server/seeds/` on the next server start.

## THIS DIRECTORY IS NOT BACKED UP ANYWHERE

It is **gitignored**, so it does not exist at origin — nothing you put here is on GitHub. On the
owner's machine it sits inside OneDrive, and **OneDrive SYNCS rather than backs up**: a deletion
propagates to the cloud exactly as faithfully as a new file does. Neither of those is a copy you can
go back to.

Most of what is here does not matter — measured, **12 files (51.7 MB) are byte-identical to
`server/seeds/`**, which git tracks. What matters is the rest: uploaded background images, the brand
and its logo, accounts, and the owner's player groups.

    npm run data:export

writes ONE dated archive of exactly the files that differ from `server/seeds/` — computed per file by
SHA-256, never a remembered list — and prints what it wrote, how big it is and where. It is
read-only against this directory, it is not scheduled and no hook runs it. Pass `--out=<path>` to put
the archive on an external disk, which is the only version of this that is really a backup.

