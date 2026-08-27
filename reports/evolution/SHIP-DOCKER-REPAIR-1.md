# SHIP-DOCKER-REPAIR-1 — the docker repair lands, and step 12 gets the half it was missing

**Two things.** The Docker fix merged to master, and **the first real use of THE SHIP ORDER's step 12**
— which mostly worked and had one gap worth closing.

---

## THE MERGE

`fix/docker-native-build` → master at `688c8840`. Ancestry established here rather than taken from the
brief: `git merge-base --is-ancestor origin/master fix/docker-native-build` returned true, so the
branch tip's tree was already the tree master receives. `npm run verify` green (**PASS 5, FAIL 0**),
run directly and not behind a pipe; CI green for the merge SHA before anything was deleted.

Two independent August breakages, neither noticed because the server was being run outside Docker and
the local image dated from 2026-06-03:

- **The image could not be built.** `better-sqlite3` and `bcrypt` ship prebuilt binaries for glibc,
  not musl, so on `node:20-alpine` `prebuild-install` finds nothing and `node-gyp` fails on "find
  Python". Fixed with `python3 make g++` installed `--virtual` and deleted in the same `RUN` layer.
- **The container could not start.** `playerGroups.js` imports `../../../shared/nameLimits.mjs`,
  which from `/app/src/routes/` resolves to `/shared/` — outside `WORKDIR`. The build context is
  `./server`, so the Dockerfile *cannot* copy a repo-root directory; only a mount can. Introduced by
  NAME-LIMIT-1 on 2026-08-07.

`engine-reach --check` selects nothing for either path — both are outside the hull, so no fingerprint
was in reach and none was minted.

---

## STEP 12, FOLLOWED LITERALLY — what worked and what did not

This was the first ship since step 12 existed, and the brief asked whether it survives being followed
literally rather than from memory. **The check itself does. The step around it did not.**

### What worked

The containment check runs exactly as printed. Pasted from the file with `<branch>` substituted, it
returned empty output and exit 0 for the merged branch — correctly reporting it contained. It was
also re-run *after* the edit below, by extracting the line from the document with `grep` and `eval`-ing
it, so the text in the file is executable and not merely illustrative.

### What did not: the step said to check every branch and never said how to list them

Step 12 reads *"check AT ORIGIN that no branch contained in master survives"*. The check answers **one
named branch**. Nothing told the reader how to produce the list — and the obvious local command is
wrong in two ways at once:

```
$ git branch -r --format='%(refname:short)' | sed 's|^origin/||'
origin          ← this is origin/HEAD; there is no branch called "origin"
master
```

- **It is a cache, not a question.** `git branch -r` shows what your last fetch saw. A branch pushed
  since is simply absent and will never be checked — and a step whose purpose is "no contained branch
  survives" is worthless if its input can silently omit branches.
- **It invents one.** `origin/HEAD` strips to a branch named `origin` that does not exist.

**This is not hypothetical, and the record is embarrassing about it**: on 2026-08-26 a ship named
three branches from memory and left two standing, which is the finding that produced step 12 in the
first place. **The step was written to stop exactly that and then left the enumeration to the reader**
— so the same failure was still available to anyone following it.

### The fix

Step 12 now opens with the enumeration, sourced from origin:

```sh
git ls-remote --heads origin | sed 's|.*refs/heads/||'
```

and says in the file why `git branch -r` is not that list. The check follows, unchanged in substance.

**One cosmetic repair alongside it:** the check's code block had lost its line-continuation backslash
in the commit that introduced it, leaving a run of spaces mid-command. It was valid bash and ran
correctly — proved, not assumed — but it read like a typo, so it is now a single deliberate line.

---

## CONFORMITY

- Ancestry established here, not taken from the brief.
- `verify` run directly; merge as a separate step; CI green for the merge SHA before any deletion.
- Step 12 applied to the branch by running its own check, then the branch deleted at origin.
- Documents-and-Dockerfile only; no fingerprint in reach, none minted.

## PROPOSALS

**P1 — the enumeration deserves the same treatment the check got: a reason, not just a command.**
That is done here. What is *not* done is making it mechanical. `check-tags` already queries origin;
a sibling that fails when origin carries a branch whose tree adds nothing to master would remove the
human from this entirely. **It is still not proposed as work**, for the reason SHIP-ORDER-CLEANUP-1
gave: it would go red on somebody's legitimate in-flight branch, and nobody has agreed a naming
convention that would let a guard tell the two apart.

**P2 (mine) — a ceremony step should be executable from the document.** The one bug found here was a
code block that had drifted from being runnable, and the way it was caught was by `grep`-ing the line
out of the file and running it. **That is a cheap habit worth keeping**: any step that prints a
command should be pasted back out of the document and run at least once, because a command nobody has
executed since it was written is a comment.

**P3 (mine) — the Docker path had been broken for three weeks and no gate could see it.** Nothing in
`verify` builds the image, so two fatal faults sat in `server/Dockerfile` and `docker-compose.yml`
without a single red run. A build is slow and does not belong in `verify` — **but it belongs
somewhere**, and "the container starts and answers" is a different claim from "the tests pass". The
audit workflow already runs daily; a weekly `docker compose build` that only has to exit 0 would have
caught both faults the day after they landed.
