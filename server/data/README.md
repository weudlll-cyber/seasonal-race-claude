# server/data — Runtime Directory (gitignored)

This directory is a pure runtime store — it is gitignored and never committed.

Shipped defaults (tracks, backgrounds, brand, player-group) live in **server/seeds/**
and are copied here automatically on first boot by `seedRuntime.js` (only when the
destination file does not already exist — idempotent).

User-created data (custom tracks, brands, racers, groups, sessions, users) is also
written here at runtime.

To reset to factory defaults, delete the relevant files; they will be re-seeded from
`server/seeds/` on the next server start.
