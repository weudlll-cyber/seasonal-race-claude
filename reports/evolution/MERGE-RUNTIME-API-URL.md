# MERGE-RUNTIME-API-URL — the deployment-readiness topic closes

**Merge** `79fc2b6c` · **into** `dc1f252f` · **from** `feat/runtime-api-url-1` at `45168e75` ·
**2026-09-07** · **branch deleted at origin.**

Two pieces, both accepted by the owner on the running build — a race behaves as before, and the text
looks as it did:

- **RUNTIME-API-URL-1** (`04a4b6df`) — the API address is asked for at install time, never baked into
  the package.
- **SELF-HOSTED-FONT-1** (`e01109a4`) — the font ships with the package; nothing is fetched from a
  third party at runtime.

---

## 1 · THE CATCH-UP — THERE WAS NOTHING TO RESOLVE

```
$ git merge origin/master --no-edit
Already up to date.
```

**Master had not moved since the branch was cut.** Established rather than assumed:

```
$ git merge-base --is-ancestor origin/master HEAD   →  true
$ git merge-base HEAD origin/master                 →  dc1f252f
$ git rev-parse origin/master                       →  dc1f252f
```

The merge-base *is* master's tip, so master was already fully contained in the branch. **No hunk was
resolved, no file was touched, and there was nothing to push** — the branch stayed at `45168e75`,
which is where origin already had it.

The "keep both sides" rule therefore never had to be applied, and no hunk arose that could not be
resolved that way. There is nothing to report under it.

**One discrepancy, named rather than silently corrected.** The brief gives the branch tip as
`45168e78`; the actual tip, and what origin held, is **`45168e75`** — a single character, the same
commit. Everything below was done against `45168e75`, which was confirmed against
`git ls-remote` before anything else happened.

**★ Golden races on the caught-up branch — PASS:**

```
check-golden-races: closed-garden-path-12 — 12 racers, 35.35 s of racing in 2439 frames
check-golden-races: open-river-run-6 — 6 racers, 30.00 s of racing in 1898 frames
check-golden-races: 2 race(s), every finishing position and time as recorded (358 ms).
```

---

## 2 · VERIFY ON THE CAUGHT-UP BRANCH

`npm run verify -- --premerge`, run on the branch **after** step 1 — which, master not having moved,
is the same tree, and that is stated rather than glossed over.

```
PASS 24   FAIL 0   SKIP 9
wall clock 406.5s — sequential would have been 1025.5s (2.5x)
exit code 0
```

| guard | |
|---|---|
| **client-suite** | **PASS** 221.3 s (ran alone) |
| **server-suite** | **PASS** 47.5 s (ran alone) |
| script-suite | PASS 137.0 s |
| client-lint · client-format-check | PASS 135.4 s · 104.0 s |
| server-lint · server-format-check | PASS 76.9 s · 46.0 s |
| world-fingerprint | PASS 118.6 s |
| check-image-starts | PASS 58.2 s |
| check-writable · fingerprint-containment | PASS 29.2 s · 28.0 s |
| check-tags | PASS 6.1 s — **FORCED by `--premerge`** (CI runs it unconditionally) |
| check-measured-stamps · check-language-closed · check-config-claims | PASS |
| check-fallback-agreement · check-index · engine-reach-doc | PASS |
| check-fingerprint-payload · check-hooks-installed · check-doc-links | PASS |
| check-config-keys · check-doc-facts · ceremony-counts | PASS |

**The client suite and the server suite are the two rows above**, run by `verify` itself rather than
separately, so there is one result per suite and not two that could disagree.

### ★ Two skips that are worth naming rather than leaving in a count

**`viewer-invariants` — the pre-merge browser ship gate — was NOT selected, in its own words:**

```
viewer-invariants   nothing changed · declares 5 file(s) by import closure ·
                    dirs=client/src/modules/camera/,client/src/screens/RaceScreen/ ·
                    PRE-MERGE GATE NOT SELECTED — nothing it declares changed.
```

That is the correct reading and not a hole: this topic touches an HTML shell, a stylesheet, font
files, `services/api.js`, the server's static-serving path and two scripts. **Nothing it changed is
inside the camera or the RaceScreen**, which is what the gate declares.

**`golden-races` was skipped by routing** — nothing in its declared closure changed — **so it was run
separately** (§1), because the brief asks for it by name. The other seven skips are the same shape:
`camera-fingerprint`, `render-fingerprint`, `check-container-paths`, `check-ending-frame`,
`check-runin-frame`, `check-seed-versions`, `check-standings-invariant` — each "nothing changed".

**Nothing was red, so the merge proceeded.**

---

## 3 · BOTH PROOFS, RE-RUN — ★ ON ONE BUILD

The topic *is* these two claims, so both were re-run rather than cited. **One `npm run build`, and
nothing rebuilt between them** — the second proof was given `--no-build` precisely so that it judged
the *same* artefact the first one did.

The build under test: `assets/index-D8aE1XqL.js`, stamped

```js
{ commit: `45168e75`, branch: `feat/runtime-api-url-1`, dirty: !1 }
```

### Proof A — the same bundle, two addresses, no rebuild

```
ADDRESS A — GET /setup -> 200
  injected: <script>window.__RA_RUNTIME_CONFIG__={"apiBaseUrl":"https://races.example.com"};</script>
  bundle referenced: assets/index-D8aE1XqL.js

ADDRESS B — GET /setup -> 200
  injected: <script>window.__RA_RUNTIME_CONFIG__={"apiBaseUrl":"http://198.51.100.7:8080"};</script>
  bundle referenced: assets/index-D8aE1XqL.js

bundle identity after both serves:
  index-D8aE1XqL.js  sha256 c9083ab0fe3bb77f

UNCONFIGURED — GET /setup -> 200
  injected script present: false
  ★ served html is BYTE-IDENTICAL to client/dist/index.html: true
  served bytes 888 · on disk 888

PASS — same filename, same hash, two different addresses, no rebuild.
```

**Exit 0.** A domain and a bare IP with a port, to show both forms work — and unconfigured still goes
down the same path it always did, byte for byte.

### Proof B — the blocked-network font render

```
audit-offline-render: origin http://127.0.0.1:53590, build client/dist
  external requests attempted : 0
  font files served by us     : 6
      /fonts/inter-latin-400-normal.woff2      /fonts/inter-latin-700-normal.woff2
      /fonts/inter-latin-600-normal.woff2      /fonts/inter-latin-500-normal.woff2
      /fonts/inter-latin-ext-400-normal.woff2  /fonts/inter-greek-400-normal.woff2
  body font-family            : Inter, system-ui, sans-serif
  ok  latin 400      inter= 520.375px  control=576.09375px
  ok  latin 500      inter=528.5625px  control=576.09375px
  ok  latin 600      inter= 536.625px  control=576.09375px
  ok  latin 700      inter=544.8125px  control=576.09375px
  ok  latin umlauts  inter=449.65625px  control=499.28125px
  ok  latin-ext      inter=402.65625px  control=499.28125px
  ok  greek          inter=383.96875px  control=499.28125px

audit-offline-render: PASS — every non-origin request aborted, 6 Inter face(s) served by the
app itself, all 7 probes painted in Inter.
```

**Exit 0.** The four latin weights still measure four *different* widths, which is four distinct
faces each really being applied rather than one reused.

---

## 4 · ★ THE FINGERPRINT DECISION, AND ITS REASON

**No fingerprint was re-run, and none needed to be.** The rule was: compare the branch tip's tree
against the merge result; if `git diff` between them is empty, the topic's measurements stand.

```
$ git diff --stat 45168e75 79fc2b6c
(no output — EMPTY)

$ git rev-parse 45168e75^{tree}   →  22da5cc93617cc9aea1ecb8b6de904b378001742
$ git rev-parse 79fc2b6c^{tree}   →  22da5cc93617cc9aea1ecb8b6de904b378001742
```

**The diff is empty and the two tree objects are the same object.** Not "equivalent" — the identical
SHA. That follows necessarily from §1: master was already an ancestor, so merging it in changed
nothing, and merging the branch into master produces the branch's tree exactly.

**So the measurements taken on the branch are measurements of the merged tree.** There is no tree the
fingerprints have not already been run against, and re-running them could not answer a question that
is open. Stated explicitly, as asked: **the topic's measurements stand; no re-run was needed; nothing
moved.**

Independently, `world-fingerprint` **did** run inside `verify --premerge` and **passed** —
`services/api.js` is inside its declared closure — so the world was checked on this tree anyway.
`camera-fingerprint` and `render-fingerprint` were skipped because nothing in their closures changed.

---

## 5 · THE MERGE

One merge, `--no-ff`, **no squashing** — the two pieces' four commits keep their own history, as
rule R11 requires (squash and rebase are both disabled on this repository).

```
$ git log -1 --format='%P' 79fc2b6c
dc1f252f8cdc650c3df66c3ce72aaea1fcb0d8b0 45168e75f0514ae9c96e1e3ba6375614bcfd84e7
```

Two parents: master as it stood, and the branch tip.

```
79fc2b6c merge(MERGE-RUNTIME-API-URL): the deployment-readiness topic — one package,
         installable anywhere, fetching nothing from a third party
45168e75 docs(SELF-HOSTED-FONT-1): the report, indexed — e01109a4, clean
e01109a4 feat(SELF-HOSTED-FONT-1): the font ships with the package; nothing is fetched from
         a third party
74a4016c docs(RUNTIME-API-URL-1): the build badge and the ports as left — 04a4b6df, clean
04a4b6df feat(RUNTIME-API-URL-1): the API address is asked for at install time, never baked
         into the package
```

## 6 · THE BRANCH IS GONE AT ORIGIN

Deleted as the **very next command after the push**, because deleting late reddens master:

```
$ git push origin master
   dc1f252f..79fc2b6c  master -> master

$ git push origin --delete feat/runtime-api-url-1
 - [deleted]           feat/runtime-api-url-1

$ git ls-remote --heads origin
79fc2b6c9a3010632477e66f7ea8ae9387aa9652	refs/heads/master
```

**Only `master` remains, at the merge SHA.** The local branch ref is left in place, as the other
merged locals (`feat/team-races-1`, `night/2026-09-06`) already are.

## 7 · CI — ★ IT WENT RED FIRST, AND THE REASON IS WORTH KEEPING

**Final conclusion for the merge SHA `79fc2b6c`: `success`** — all three jobs green.

```
$ gh run view 34164356828 --json status,conclusion,headSha
status=completed  conclusion=success  sha=79fc2b6c9a3010632477e66f7ea8ae9387aa9652

success  Living-doc guards + script tests
success  Client checks
success  Server tests
```

**But the first run of that same SHA FAILED**, and reporting only the green would be dishonest. The
failing step was `check-tags`, on its Rule B:

```
check-tags RULE B: 2 head(s) at origin; 1 whose TREE master already holds
FAIL: 1 branch(es) stand at origin whose TREE master already holds:
feat/runtime-api-url-1 -> 45168e7  (master's tree holds every path this branch's tree holds)
```

### ★ This is precisely the race the brief warned about, and "the very next command" was not enough

The timing, from the run's own log:

| time | what |
|---|---|
| `21:46:50` | `git push origin master` — GitHub creates run `34164356828` |
| `21:47:05` | CI's `check-tags` reads origin and sees **two** heads |
| shortly after | `git push origin --delete feat/runtime-api-url-1` lands |

The delete **was** the very next command issued — but CI reached `check-tags` **15 seconds** after the
push, and a local `git push` round-trip plus process start does not reliably beat that. The guard was
right: at the instant it looked, a merged branch really did stand at origin.

**Nothing was wrong with the merge**, and nothing about the tree changed between the two runs. The
condition simply no longer existed, which was confirmed before re-running rather than assumed:

```
$ git ls-remote --heads origin
79fc2b6c...	refs/heads/master

$ node scripts/check-tags.mjs
check-tags RULE B: 1 head(s) at origin; 0 whose TREE master already holds; 0 unjudged.
```

Then `gh run rerun 34164356828 --failed` → **success**.

**The lesson, stated for the next merge:** on this repository the branch deletion cannot be made to
win that race by ordering alone — `check-tags` is one of the first steps in the "Living-doc guards"
job. Either the delete has to happen **before** the master push (the branch is already merged
locally, so nothing is lost), or the first CI run on a merge SHA should be expected to fail Rule B
and be re-run. This merge took the second path because the brief prescribed the order it did.

---

## SOURCE HYGIENE

**The catch-up touched nothing, so there is no before/after table.** `git merge origin/master`
reported *"Already up to date"*; no file was opened, no hunk was resolved, no line changed. The
merge commit `79fc2b6c` carries the branch's tree unmodified — proved in §4 by tree-object identity,
not by inspection.

**No scratch files entered the repository.** The two-address harness and the merge message were
written under the session scratchpad outside the tree; the isolated data directory it created was
deleted by the harness. `git status` is clean. **`git stash` was not used on this tree.**

### Services, as left

| port | what | before | after |
|---|---|---|---|
| **4000** | the API | listening, PID 50700 | **listening, PID 50700 — untouched** |
| **4173** | the production build | listening, PID 49220 | **listening, PID 49220 — untouched** |
| **5173** | dev | not running | not running — not started |

**Nothing was stopped, so nothing needed restarting**, and both PIDs are the same before and after.
The proofs deliberately avoided all three: proof A bound **4877** with its own isolated
`RA_DATA_DIR` under the scratchpad (it never read or wrote `server/data`, so his accounts were not
touched), and proof B binds an **ephemeral** port the OS chooses and closes it again.

**★ One fact worth knowing rather than discovering:** `client/dist` on disk — and therefore what
4173 is serving — is the build made for §3, stamped **`45168e75`**, the branch tip. Its tree is
byte-identical to master's merge (§4), so what he sees *is* master's content; only the stamp predates
the merge commit. It is left as it is rather than rebuilt, because rebuilding would change what a
running service is serving for no reason but a label.

## WHAT THIS MERGE DID NOT DO

- **No behaviour changed while merging.** There was no conflict to resolve, so nothing could be
  rewritten to fit.
- **No new work was started on the branch.** It closes here.
- **RUNTIME-API-URL-1's "what is still needed" list was not acted on.** That is the owner's next
  decision. **Item 5 is closed** by the font piece and struck through in that report; items 1, 2, 3,
  4, 6 and 7 stay open and stay named — TLS and something in front, hand-written secrets, the dev
  bootstrap token in `docker-compose.yml`, the manual client build, no `HEALTHCHECK`, and whether
  `verify` should build the client so `audit-bundle-address.mjs` can be routed.
