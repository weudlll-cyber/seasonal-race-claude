# INDEX-COVERAGE-1 — every report directory is now decided about

**Branch:** `fix/index-coverage`, off master `ea9187d7`. **No product file changed.** One guard, its
test file, one new index, two living documents.

---

## THE DEFECT, IN ONE LINE

`check-index` walked **3 of the 14** directories under `reports/` and printed
**`0 unindexed`** — a true sentence about **44%** of the tree, in a shape that reads as a statement
about all of it.

**The other eleven were not a decision. They were silence.** And silence is exactly what let
`reports/audit/PROJECT-AUDIT-2026-08-18.md` — the only copy of the finding that first-admin setup
could not succeed — sit untracked and unwatched until it was rescued by luck the following morning.

---

## THE ROUTE TAKEN, AND WHY

The brief allowed three: index everything, narrow the declaration honestly, or a mix. **The mix, and
the split is by one question — does anybody still ADD to it?**

| directory | tracked reports | decision |
| --- | --- | --- |
| `evolution/` | 179 | **INDEXED** (already) |
| `night/` | 67 | **INDEXED** (already) |
| `parity/` | 7 | **INDEXED** (already) |
| **`proposals/`** | **17** | **NEWLY INDEXED** — see below |
| `results-salvage/` | 212 | declared **ARCHIVE** |
| `open-track-overlap/` | 47 | declared **ARCHIVE** |
| `greenfield/` | 16 | declared **ARCHIVE** |
| `closed-track-overview/` | 16 | declared **ARCHIVE** |
| `perf/` | 11 | declared **ARCHIVE** |
| `exp-archive/` | 7 | declared **ARCHIVE** |
| `phase1-metrics/` | 3 | declared **ARCHIVE** |
| 4 standing notes directly in `reports/` | 4 | declared **out of shape for an index** |

**`proposals/` is the one that moved, and the reason is the incident.** It is the only archive that
still *receives* work: the audit that nearly went missing was written there two days ago. A directory
new work lands in needs the orphan check; a closed archive does not. It now has an
[INDEX.md](../proposals/INDEX.md) with all 17 files grouped by the question each was about, and the
guard checks it in both directions like the other three.

**MASTER DID NOT GO RED, and no report was mass-indexed to achieve that.** 312 archived reports are
declared out of scope *by name, each with a reason a stranger can read* — machine output from
interrupted sweeps, closed investigations whose conclusions live in indexed reports. Writing 312
index lines for tables nobody links to would have been ceremony, not coverage.

---

## THE THIRD DIRECTION — THE PART THAT ACTUALLY CLOSES IT

Declaring today's eleven would have fixed today and nothing else. **The guard now enumerates the
tracked reports itself and fails on any directory that is in neither list.**

```
check-index: coverage — 11 directories hold tracked reports; 4 INDEXED (270 reports),
             7 declared ARCHIVE (312 reports), 4 standing note(s) directly in reports/, 0 undeclared.
```

**Deliberately NOT pre-declared: `audit/`, `speed-candidates/` and `clean-state-2026-06-04/`.** They
hold no tracked `.md` today, so listing them as archive now would let the next file land in them
silently — which is the exact defect this closes. A file appearing there **fails** and forces the
decision.

**Enumeration is by `git ls-files`, not the filesystem.** A directory with no tracked file is not
part of the repository, and walking the disk would fail this guard on anybody's local scratch folder.

---

## PROVED IN ALL THREE DIRECTIONS

Run against the real tree, not fixtures:

| sabotage | expected | result |
| --- | --- | --- |
| unindexed report in a **covered** directory (`proposals/ZZ-SABOTAGE.md`) | FAIL | **exit 1** — `18 reports checked, 1 unindexed`, names `ZZ-SABOTAGE.md` |
| report in a **declared archive** (`perf/ZZ-ARCHIVE-SABOTAGE.md`) | PASS | **exit 0** — counted as `declared ARCHIVE (313 reports)` |
| tracked report in an **undeclared** directory (`audit/ZZ-NEW-FINDING.md`) | FAIL | **exit 1** — names `reports/audit/` and says what to do |

The third prints the incident it exists for rather than a bare error:

```
FAIL: 1 directory/directories under reports/ hold tracked reports and are in NEITHER list:
  reports/audit/  (1 report(s))

Decide, do not leave it silent — that is how reports/audit/ came to hold the ONLY copy of a
critical finding with nothing watching it. Either add an INDEX.md and register the directory
in REGISTERED, or name it in ARCHIVED with a reason a stranger can read.
```

All sabotage files were removed; the tree is clean.

---

## THE TESTS, AND WHAT BREAKS IF THEY ARE DELETED

`check-index.test.mjs` 7 → **9**. The two new ones cover direction 3 against a synthetic **git
repository**, because that is the only invocation it takes — with `--dir` it is skipped, which is
what keeps the seven fixture tests hermetic.

**If they are deleted, the `reports/audit/` incident becomes possible again, silently.** Direction 3
is the rule that a new directory must be *decided about* rather than merely unwatched, and it is the
one direction the existing fixture form cannot exercise — so without these it would be checked by
nothing at all. One asserts an undeclared directory fails **and names it**; the other asserts a
declared archive passes, so the guard cannot be "fixed" by simply failing on everything.

---

## VERIFICATION

**No fingerprint is owed**, by closure walk: `scripts/check-index.mjs`, its test, `reports/` and
`reports/README.md` are inside none of the three instruments — 36, 36 and 55 files respectively. No
product file is in the diff.

The guard's declaration was rewritten to match what it now does, including its remaining blind spots:
orphans *inside* a declared archive (312 reports, deliberately unwalked), the four standing notes,
and subdirectories of a registered directory (`night/captures/`, `night/img/` hold evidence, not
reports).

---

## SOURCE HYGIENE

| file | change |
| --- | --- |
| `scripts/check-index.mjs` | +85 — `proposals` registered, `ARCHIVED` map, direction 3, declaration rewritten |
| `scripts/check-index.test.mjs` | +2 tests, +`repoFixture` helper |
| `reports/proposals/INDEX.md` | **new**, 17 entries grouped by question |
| `reports/README.md` | the table and the "three of those directories" paragraph corrected |

Tests added: 2. Tests deleted: 0. Tests re-blessed: 0.

### Noticed but left

- **`reports/night/captures/` and `img/`** are subdirectories of a registered directory and are not
  descended into. The night INDEX already says captures are evidence rather than reports; it is now
  in the guard's blind list too.
- **`reports/audit/` still exists on disk** holding an empty `archive/`. Git tracks nothing there, so
  it is invisible to the guard — correctly, and the moment a file lands the guard speaks.

---

## PROPOSALS

### Proposal A — apply the same "decide or fail" shape to `docs/`

`reports/` is now the only tree where a new directory forces a decision. `docs/` has the same
exposure and a higher cost when it goes wrong: a living document is *supposed* to be current, and a
new subdirectory of them would be checked by `check-doc-links` for dangling links but by nothing for
whether anybody knows it exists.

**The shape is already written and cost about 40 lines here.** The question is only whether `docs/`
wants an index at all, which is a smaller decision than it sounds — `docs/README.md` already claims
to be the map, so the guard would be asserting a promise the document already makes.

### Proposal B — decide what `reports/audit/` is, now, while it is empty

It holds no tracked file, so the guard cannot see it, and the next person to write an audit there
will hit a red build with no guidance beyond the error text. **Two lines of decision now saves that:**
either delete the empty directory so the next audit lands in `evolution/` like the two rescued ones,
or give it an `INDEX.md` and register it.

**Deleting is probably right** — the two audits that lived there are now indexed in `evolution/`,
which is where project-level write-ups already belong. But it is his directory and his call, so it
is on the sheet rather than done here.
