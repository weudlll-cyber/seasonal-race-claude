# Audits — index

**Read-only audits of this repository, written by an OUTSIDE author.** One line per file: who looked,
at what, and what they found.

**Why this directory is REGISTERED and not declared an archive** (AUDIT-REGISTER-1, 2026-08-22). The
choice was between giving it an index and naming it in `check-index`'s `ARCHIVED` list with a reason.
An archive is declared out of scope because *nobody adds to it and nothing links into it* — and both
halves of that are false here: two audits landed on the same day, and the whole point of an outside
audit is that its findings are meant to reach the people who can act on them. Declaring it out of
scope would have made "invisible" the official answer to the problem this exists to solve.

`reports/proposals` is the precedent, registered for exactly this reason: it is the one archive that
still RECEIVES work, and the audit that sat there untracked was the only copy of a finding that
first-admin setup could not succeed. **A directory that new work lands in needs the orphan check.**

**These files are ANOTHER AUTHOR'S RECORD and are committed unedited.** Not a word of them is
changed — not a typo, not a link, not a heading. Where a finding is acted on, the work and its
verdict live in `reports/evolution/`, and this index gains a pointer; the audit itself stays as
written. That is the same append-only rule the other indexes keep, with one addition: **we do not
edit someone else's report even to correct it.** If an audit is wrong, the answer is a reply in
`reports/evolution/`, not a silent edit here.

---

- [PROJECT-HYGIENE-2026-08-25.md](PROJECT-HYGIENE-2026-08-25.md) — read-only hygiene audit of the
  auth seam and the repository's shape. Reads the client/server setup-token and password-change
  contracts end to end and finds them aligned; flags the report archive's size and a corridor
  diagnostic test whose last assertion is a tautology.
- [DEEP-AUDIT-2026-08-25.md](DEEP-AUDIT-2026-08-25.md) — deep read of the subsystems that control
  public behaviour, security, rendering and the measurement harnesses, with per-file verdicts and a
  declared coverage statement. **No evidence-backed public-route auth bypass found in the source
  read.** Two findings: **F1 (Medium)** the report tree is 1143 files and 959327 lines, with
  `reports/perf` alone 326 files and 787228 lines, so the archive dominates navigation; **F2 (Low)**
  [client/src/modules/diagnostics/trackCorridor.test.js](../../client/src/modules/diagnostics/trackCorridor.test.js)
  ends in `expect(true).toBe(true)` and therefore cannot fail. It is explicit about what it did NOT
  open, which is the part that makes the rest of it usable.

**F2 is this project's own Lesson 209 in someone else's words** — a check that cannot fail is
indistinguishable from one that passes. It is not fixed here: this block registers the directory and
commits the audits unedited, and acting on a finding is separate work with its own verdict.
