# COPY-UTILS-1 — one of the two declared divergences is closed, and the image is still not standalone

**`server/utils/` is copied into the image now.** Its declaration is gone from the container-paths
guard, which is green with **two** entries where it had three.

**This does NOT make the image standalone.** `shared/` remains, and it is the harder half. The
section below proves that rather than leaving it as a caveat.

---

## WHY THIS ONE WAS ALWAYS THE EASY HALF

The guard shipped with two declared divergences, and the entry for `utils/` said so in its own words:

> **HISTORY, NOT NECESSITY, and it is the honest label.** `server/utils/` IS inside the build context
> and COULD be COPYed; it is not, because the original Dockerfile predates it and the mount was added
> when the missing helpers stopped the container starting. […] It is declared rather than fixed here
> because this piece builds a guard and does not change what ships — closing it is a one-line
> Dockerfile change and a rebuild, which is a separate decision.

This is that separate decision. One line:

```dockerfile
COPY utils/ ./utils/
```

`shared/` is the other kind entirely: it sits at the repository ROOT, above the build context
(`./server`), and no `COPY` can reach outside its context. Closing it means moving the build context,
which is a structural change and remains open.

---

## THE STALE-ENTRY CHECK EARNED ITSELF

The guard did not have to be told. The moment the `COPY` line landed, before any other edit:

```
FAIL: check-container-paths — the COPY set and the mount set disagree, undeclared.
  DECLARED_DIVERGENCES names "utils" (mounted-not-copied), which is no longer a divergence.
     Remove the entry: an allow-list carrying entries that describe nothing stops being a
     record of decisions and becomes a list nobody reads.
```

That check was written on a hunch that an allow-list rots when nothing notices its entries becoming
false. **It caught its first real case inside a week**, and it caught it in the right direction — not
"you broke something" but "this written reason is no longer true, delete it." The entry is now a
comment in its place recording that it stood there, why, and what closed it.

---

## THE PROOF, AND THE HALF IT DOES NOT COVER

**`utils/` is in the image**, which was the point:

```
$ docker run --rm --entrypoint sh seasonalraceclaude-server -c 'ls /app/utils'
atomicWriteJson.js  imageUpload.js  imageUpload.test.js
isSafeAssetFilename.js  isSafeAssetFilename.test.js  isValidId.js
```

**And the image is still not standalone.** Run with **no mounts at all**, it used to die on the first
of two missing directories; it now gets past that one and dies on the second:

```
before:  Cannot find module '/app/utils/atomicWriteJson.js' imported from /app/src/routes/tracks.js
now:     Cannot find module '/shared/nameLimits.mjs'        imported from /app/src/routes/playerGroups.js
```

**One of two closed, measured by where the failure moved to.** Anyone reading this as "the image runs
on its own now" would be wrong, and the container still needs the repository beside it.

**His install is unaffected** — the compose container was rebuilt and brought up on the new image, and
answers as before: `/` and `/setup` return the app, `/api/health` 200, `/api/tracks` 401.

**One incidental consequence worth naming:** `utils/` contains two test files
(`imageUpload.test.js`, `isSafeAssetFilename.test.js`) which are now shipped in the image. They are
inert — nothing imports them at runtime — and excluding them would mean a second exclusion list to
keep in step with a directory. Left as is, deliberately, and recorded so it is a decision rather than
an oversight.

---

## CHECKS

**`engine-reach --check` selected nothing** — `server/Dockerfile` and the guard script, both outside
the hull. The eighth consecutive time; piece 7's subject.

**All four fingerprints run by hand and all four UNMOVED** (`bc01b74fd4f3cfc8`, `daf78ff18eca83c6`,
`6dfded25dd656977`, `4819e3b0f8e61c23`). **Nothing minted.**

Guard suite 12/12. Its fixture was updated with the tree, as it must be: `REAL_COPIES` now names
`src`, `utils`, `seeds`, and the stale-entry test — which used `utils` as its example — now uses
`data`, because the example it was written around is the thing this piece removed.

**No client suite, no browser gate**: nothing under `client/` is touched.

## CONFORMITY

- The `COPY` line added and the declaration removed; the guard is green with two entries, not three.
- The image still builds, and his running container was rebuilt and verified answering.
- The report does not claim the image is standalone, and proves it is not by naming where the failure
  moved to.
- All four fingerprints run by hand and unmoved; nothing minted.

## PROPOSALS

**P1 — `shared/` now stands alone as the only thing between this image and self-containment**, and
the decision it needs is exactly the one SERVE-SPA-1 declined to take on its own: move the build
context to the repository root. That piece found a way around it for the client build (a named build
context), and **the same mechanism would work here** — `additional_contexts: { shared: ./shared }`
plus `COPY --from=shared . /shared` — without moving anything. Worth pricing against the context move,
because it would close the last gap tonight's work leaves open.

**P2 (mine) — the guard's blind spot is now the only one of the three original failures it cannot
see.** `seeds/` and `shared/` are both catchable; `utils/` was the one that was in neither list, and
it is now in both. The class is not closed — the next directory added to neither list is still
invisible — and CONTAINER-PATHS-1's P1 (walk the import graph and ask whether the container can reach
each resolved path) remains the fix.
