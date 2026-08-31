# COMPOSE-SEEDS-MOUNT-1 — the delivery mechanism was inert in the container, and a baked-in seeds directory is the same failure one level down

**One line of `docker-compose.yml`, eight lines of comment saying why.** The container now mounts
`./server/seeds:/app/seeds` the way `src`, `utils` and `data` are already mounted.

**The boot with a LIVE manifest still changed nothing on his install** — which is the whole point:
today's shipment is version one everywhere, so a manifest the container can finally read must be as
inert as one it could not.

---

## THE DEFECT, CONFIRMED IN THE RUNNING CONTAINER BEFORE ANYTHING WAS CHANGED

`server/Dockerfile` carries `COPY seeds/ ./seeds/`, and nothing mounted over it. So the container ran
whatever seeds were baked into the last image build — and that image predates SEED-REDELIVERY-1
entirely:

```
$ docker compose exec server ls -la /app/seeds/versions.json
ls: /app/seeds/versions.json: No such file or directory
```

`readManifest()` reads that path, catches, and returns `{}`. `deliverSeeds` then iterates an empty
object: **no unit is ever visited, no version is ever compared, and no redelivery can ever happen in
the container, at any version, forever.** Not a delay — a permanent silence.

**And it would have looked like it worked.** The delivery code was mounted and running (`server/src`
is mounted, so the container had every line of it); only the thing it reads was stale. A version
raised on master would have been committed, guarded, reviewed and shipped, and simply never arrived
— **which is the exact failure this whole strand was built to end**, reproduced one level down in the
deployment where none of the strand's own machinery can see it. The guard checks that a version was
raised when content changed; nothing checked that the raised version could be read by the process
that acts on it.

## THE FIX

```yaml
- ./server/seeds:/app/seeds     # shipped seed records + versions.json — see above
```

with the reason written beside it in the file, because a mount that looks like a developer
convenience will eventually be removed by someone tidying up. It is not a convenience: `src` and
`data` are mounted so changes are visible without a rebuild, and `seeds` is mounted so **a delivery
is not silently impossible**.

`docker compose restart` does not apply a new mount — the container has to be recreated — so this was
applied with `docker compose up -d`, which reported `Recreated` and came back up.

**Confirmed from inside afterwards:**

```
-rwxrwxrwx  1 root root  4690  /app/seeds/versions.json
12 units, versions: 1
```

The container reads the live manifest, and the install's own `/app/data/.seed-versions.json` records
those same twelve units at 1.

---

## THE BOOT WAS STILL INERT — measured, not argued

Every file in the five runtime type directories was hashed (SHA-256) and stamped immediately before
the compose change and again after the container came back up with a readable manifest.

```
=== his runtime store, before vs after the container booted with a LIVE manifest ===
NO DIFFERENCE — 30 records byte-identical, mtimes unchanged, no notice file created
```

`diff` returned empty. **`.seed-notices.json` still does not exist**, on the host or in the container.
That is the ADOPT/EQUAL path doing what it promises: the shipped versions are all 1, the install
recorded all 1, so every unit takes the "equal — touch nothing" branch. His garden-path surface
classes, his Fantasa brand, his 40-name group and his German-named group are all exactly where they
were.

**The container log is one line**, `RaceArena server running on port 4000`, and `GET /api/tracks`
answers 401 — auth-gated and alive.

### A CORRECTION TO SEED-REDELIVERY-1's COUNT

That report — and its INDEX line — say **"all 31 records"**. **The number is 30**, counted directly:

```
tracks 10 · backgrounds 13 · brands 2 · brand-logos 2 · player-groups 3  =  30
```

The 31 came from miscounting the snapshot's own keys, which include the two state-file entries
(`.seed-versions.json`, `.seed-notices.json`) alongside the records. **Nothing else in that report
changes**: the diff it printed was empty then and is empty now, and "not one record was overwritten"
is true of thirty exactly as it was claimed of thirty-one. The report is not edited — the journal is
append-only — so the correction is filed in `INDEX.md`'s CORRECTIONS section, which is its home.

---

## CHECKS

**`engine-reach --check` selected nothing** — `docker-compose.yml`, `1 outside the hull`. The fifth
consecutive time for this strand, and the least surprising of the five: a compose file is not code
the engine imports.

**All four fingerprints run by hand, as the previous three pieces did:**

| role | measured | verdict |
|---|---|---|
| world | `bc01b74fd4f3cfc8` | **UNMOVED** (`--check` confirmed) |
| world-off | `daf78ff18eca83c6` | **UNMOVED** (`--check` confirmed) |
| camera | `6dfded25dd656977` | **UNMOVED** |
| render | `4819e3b0f8e61c23` | **UNMOVED** |

**Nothing minted, and there was no permission to.** Nothing could plausibly have moved — the
instruments read `server/data/tracks` and `server/seeds/tracks`, and this piece changes neither, only
where a container looks for the latter — but they were run rather than argued, which is the standing
rule of this strand.

Document guards and the language guard: green.

---

## CONFORMITY

- One mount added, in the file that already owns the other three, with the reason written beside it.
- Container recreated (not merely restarted) so the mount is actually in effect, and verified from
  inside.
- Inertness on his install proven by a before/after hash of the whole runtime store: 30 records
  identical, no notice file.
- `engine-reach --check` run; all four fingerprints run by hand and unmoved; nothing minted.
- A wrong count in the previous report corrected in the INDEX rather than by rewriting the journal.

## PROPOSALS

**P1 — the same question should be asked of every other baked path.** `Dockerfile` COPYs `src/` and
`data/` too, and both are mounted over; `utils/` and `shared/` were each added to the mount list only
after something broke. **Nothing checks that the set of COPYed directories and the set of mounted
directories agree**, and this defect is what that gap looks like when the stale copy is data rather
than code. A guard comparing the Dockerfile's COPY lines against the compose volume list would be
cheap and would have caught this before it shipped.

**P2 (mine) — production has the opposite risk, and it is worth being explicit about.** A real
operator's image bakes the seeds in, which is correct: their manifest arrives with the image, as it
should. The failure mode there is not staleness but a *rebuild that copies seeds while the data
volume persists* — exactly the path this mechanism was designed for, and untested outside these
scripts. Worth one deliberate rehearsal on a scratch data root before anyone raises a real version.
