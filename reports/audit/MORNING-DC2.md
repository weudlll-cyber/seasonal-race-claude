# MORNING SHEET — DELIVERY-CLEAN-2, the unattended run

**Read this top to bottom.** One sheet for all four arcs, updated as each finishes. Started from
master `392bf975` on 2026-09-27. The OPEN section at the foot is regenerated from the tree each
time, never appended to.

---

## THE ONE-LINE ANSWER SO FAR

**Arc 1 is done: the doors DELIVERY-CLEAN-1 named are now either pinned by a test that fails if they
reopen, or recorded as your decision with both sides.** Nothing that changes what you see was
touched. The one thing I would want you to read first is **B9**, below — you can put this on a
public address over plain HTTP today and *nothing in the product will ever tell you*.

---

## ARC 1 — HARDENING · **MERGED** *(see the merge line at the foot of this section)*

### What was built

| | |
| --- | --- |
| `trustBoundary.audit.test.js` | 3 tests pinning that the server stores and does not adjudicate |
| `uploadBoundsAgreement.audit.test.js` | 4 tests pinning the three upload handlers identical |
| `crossTeamAccess.audit.test.js` | header block: it is **supposed** to go red when tenancy is built |
| `docs/DEPLOY-NOTES.md` §4 | two measured facts added to the section that owns HTTPS |
| `docs/DEPLOY-NOTES.md` §5 | *"How to stand this up without leaving a door open"* — six doors, who decides each |

★ **Every test was sabotaged to prove it fails.** Four sabotages, four reds, all reverted: a
winner-vs-position check, an engine reference in `server/src`, a 413→500 drift, a hardcoded upload
limit.

### ★★ THE ONE TO READ — B9

You can serve this on a public address over plain HTTP, **sign-in will work**, the password and the
session cookie will travel in clear, and **nothing will warn you**. `NODE_ENV` is set nowhere in the
shipped deployment files, so the cookie is never marked `Secure`; `startupReadiness.js` warns about
three other things and contains zero mentions of https, tls or secure. **The fix is one readiness
line and I did not build it** — a new warning at boot is a runtime change you would see. Your word.

### What I did NOT take, and why

| | why |
| --- | --- |
| **binding to `127.0.0.1`** | not purely safer — it **removes** direct same-origin access, which `DEPLOYMENT.md:242` describes as a supported shape with the proxy *optional* |
| **pinning the base image to a digest** | your condition was *"if purely safer"* and it is not: a digest **freezes security patches**, and nothing here watches `FROM` |
| **shortening the 30-day cookie** | the cost is real — an organiser mid-event does not want to re-authenticate, and there is no refresh flow |
| **a boot warning for plain HTTP** | runtime change you would see → B9 |
| **merging the three upload handlers** | live request handling → already commissioned, not arc 1's |

### Two corrections to earlier work

- **B7 overstated its risk.** The upload *bound* is already single-homed in
  `server/utils/imageUpload.js`; only the error *response* is triplicated. One route cannot accept a
  bigger file — it can only answer a violation differently.
- **The 58/59 "contradiction" was not one**, and the brief that raised it was wrong: 58 is the
  router surface, 59 adds `/api/health`. Both correct; the report just never said the scopes
  differed. Now labelled everywhere.

---

## ARC 2 — THE 39 DOCUMENTS · **MERGED**

**Your question was: who is supposed to read 39 documents, is the reason recognisable, and does
information live in one place.**

★★ **The earlier audit's "19 of 39 carry no OWNS line" was a count of a literal string.** Measured
for what you actually asked — *is it recognisable from the document why it exists* — **37 of 39
already said so**, in three different wordings, which is why no check could see it. Normalised:
**39 of 40 now carry a canonical line** (`CLAUDE.md` excluded deliberately — its opening is
load-bearing in its own rules).

★ **Nothing qualified for retirement, and that is a measured result.** Every document has a live
inbound link once `reports/` and `docs/archive/` are excluded; both subject-dead candidates
survived (`STANDINGS-ARCHITECTURE` covers a panel that is built; `ROADMAP` is a redirect doing a
redirect's job).

**What was actually wrong, and is fixed:**
- **`MORNING.md` is the dated sheet of 2026-09-19 named as if it were current.** Its first line now
  says so and points at `OPEN.md`.
- **`AUTH.md` (13 variables) and `DEPLOY-NOTES.md` (7) described environment variables with no
  pointer to `ENVIRONMENT.md`**, which claims to own every one. Two homes, nothing saying which
  wins. Deferrals added.
- **`PHASE-CONTRACT.md` contradicted itself** — opening says "the CURRENT shipped race world", its
  own `:95` concedes a sweep predates the speed-150 re-baseline. Values scoped to their date; the
  contract it states marked undated and still binding.

**The deliverable: [docs/WHO-READS-WHAT.md](../../docs/WHO-READS-WHAT.md).** The operator reads
**five** documents. A developer's first day is **four**, in a fixed order, `GLOSSARY.md` first.
Nobody reads 40.

## ARC 3 — THE 281 TOOLS · **MERGED**

**Your question: do we need them all.** 4 removed, 85 kept with a reason each, and the reasons are
the point.

★★ **The earlier “65 scripts nothing names” is right and misleading.** I reproduced 65 exactly —
and **~29 of them are scripts DISCOVERED BY CONVENTION, not dead ones**: every `*.test.mjs` is run
by `script-suite` through a `git ls-files` filter that never names a file, and every top-level
`check-*.mjs` is found by the guard registry’s naming convention. A search for “who names this
file” cannot see either. Genuinely reached by nothing: **89** — 36 at the top level and 53 in
`scripts/diag/`, which is a **declared hand-run directory** and not a finding.

**Removed (4, 473 lines)** — each a one-off whose single artefact is committed and named:
`crop-dolphin-sprite`, `gen-boarder-sprite`, `gen-luge-sprite`, `gen-scaled-sprites`. No living
document instructs anyone to run them; zero references outside `reports/`.

**Kept, and these are the judgements:**
- `gen-aquatic-masks.mjs` is the same shape but **stays** — it is the only worked example of HOW a
  tint mask is made. Removing it deletes a method, not a spent artefact.
- The seven `exp-*` **stay** — **4–6 reports cite each**. Deleting them would leave dated records
  citing a measurement nobody can reproduce.
- The `*-truth` family and all of `scripts/diag/` are **live-but-unwired by design** — somebody runs
  them when they have that question. What each needs to become reachable is one registry line plus a
  `depends=` set, and that is a decision about CI time, not mine.

★ **No redundant pair exists.** The 14 `*-sum.mjs` are producer/summariser coupled by output
DIRECTORY, not by name — six have no same-stem producer, which is a readability row, not duplication.

★ **Portability, tree-wide (951 files): `client/`, `server/` and `shared/` carry no hardcoded path
at all.** The only real ones are the two benchmark `--master` worktree defaults already recorded as
having no portable alternative.

## ARC 4 — THE SOURCE · **MERGED**

**Your question: is it all needed, and is it structured right.** ★ **Nothing structural was
performed** — you judge the product by eye, so everything structural is a proposal with its cost.

★ **The product source is clean.** Zero unused variables and zero unreachable code in `client/src`,
`client/e2e` and `server/src`.

★★ **The 8 unimported exports are now a structural certainty, not a grep result.** `client/src`,
`server/src` and `shared` contain **zero dynamic imports and zero string-keyed calls** — there is no
mechanism by which an unnamed export could be reached. All 8 kept as seams; three are mine.

★ **77 unused locals found in `scripts/`, a tree that had never been linted — and NOT removed.**
Your own rule (§4.4) authorises a dead variable *in a region already touched*, and arc 4 touched
none of those 48 files. Two are in the engine hull. Recorded as P6.

### The six proposals, ranked — commission them one at a time

| | | cost | what you would see |
| --- | --- | --- | --- |
| **P1** | `CameraDirector.js` is **5,507 lines**, ~3× the next engine file, holding the state machine AND the offer arbitration | HIGH | **nothing, if done right — which is why it is dangerous** |
| **P2** | the three upload handlers → one | LOW | nothing |
| **P3** | the JSON-store preamble, `brands.js` ⇔ `playerGroups.js`, 44 lines | MODERATE | nothing |
| **P4** | `RaceScreen/index.jsx` is 2,172 lines, frame loop mixed with setup | HIGH | nothing |
| **P5** | two Dev Screen sections at 2,118 and 1,730 lines | LOW | ★ **YES** — so it belongs to `B-UX2` |
| **P6** | 77 unused locals in `scripts/` | trivial × 48 | nothing |

★ The clone detector **reproduced §6.1 exactly** on both trees — a check on that earlier number as
much as on the tree.

---

## WHAT NEEDS YOUR WORD — regenerated from `docs/BACKLOG.md` PART ONE

Nothing here is answerable by measurement; each is a choice between readings.

1. **B9 — a boot warning for plain HTTP?** One readiness line, in the voice of the three that
   already exist. Not built: you would see it.
2. **B4 — bind to loopback?** Safer on a VPS, and it removes direct same-origin access. Either the
   bind or a host firewall is required on a rented server; with neither, a proxy is decoration.
3. **The base image** — reproducibility versus automatic patching. Recorded with both sides.
4. **The 30-day cookie** — convenience versus exposure window.

---

## THE OPEN LIST — regenerated from the tree

**PART ONE: 7 non-audit subjects + 9 open DELIVERY-CLEAN rows = 16.** `docs/OPEN.md` lists **16**.
The two agree.

★ **The four arcs closed no PART ONE row and opened two** — B9 (plain HTTP, arc 1) and the
structural proposals (arc 4). That is the honest shape of this run: it was commissioned to HARDEN,
to make documents recognisable, to thin the tools and to read the source — none of which resolves
an open decision. Two items INSIDE the C tidy list were resolved (C3, the OWNS lines; C2, the
orphan-script count, corrected rather than closed).

---

## BLOCKED

**Nothing in any of the four arcs was blocked.** Every piece was performed.

★ Two pieces were deliberately NOT taken and are rows rather than blocks, because taking them
would have broken the run's own rules: the 77 `scripts/` unused locals (§4.4's "region already
touched"), and every structural refactor in arc 4 (you judge by eye).
