# LICENCE-OR-LATER-1 — `AGPL-3.0-or-later`, by the owner's answer

**The owner answered on 2026-09-01**, on the question LICENCE-AGPL-1 raised and deliberately did not
decide: **`-or-later`, not `-only`**. This piece is that one word, in the three places it is stated,
plus the notice wording that had to follow it.

**Its own piece and its own report on his instruction**, rather than folded into whatever was in
flight — which was COPY-UTILS-1, a Dockerfile change with nothing to do with licensing.

---

## WHAT CHANGED

**The identifier, in all three `package.json`:**

```
package.json           AGPL-3.0-only  ->  AGPL-3.0-or-later
server/package.json    AGPL-3.0-only  ->  AGPL-3.0-or-later
client/package.json    AGPL-3.0-only  ->  AGPL-3.0-or-later
```

All three still parse.

**The README's notice, because the meaning moved and a bare identifier swap would have left the prose
saying something narrower than the metadata.** It now states the grant in the FSF's own words —
*"either version 3 of the License, or (at your option) any later version"* — carries the standard
no-warranty paragraph beside it, and names the SPDX identifier explicitly so the two can be checked
against each other at a glance.

That wording is taken from the appendix of the licence text already in `LICENSE`, not composed. It is
the notice the FSF tells you to attach.

**`LICENSE` itself is untouched, and that is correct rather than an omission.** "Or later" is not a
different licence document — it is a statement about which versions the copyright holder permits, and
it belongs in the notice, never in the licence text. Editing that file would have been the one thing
LICENCE-AGPL-1 was most careful not to do.

**`private: true` still stands in all three**, unrelated and untouched.

**No per-file licence headers** — that instruction from the licence piece stands and nothing here
changes it.

---

## WHAT THIS MEANS, IN ONE PARAGRAPH

Under `-only`, a recipient may use RaceArena under the terms of AGPL version 3 and nothing else.
Under `-or-later`, they may choose the terms of any later AGPL the Free Software Foundation
publishes. It is the more common choice and it is the one that lets the project's users move forward
without needing the copyright holder's permission each time — and it is the owner's to make, which is
why LICENCE-AGPL-1 shipped the conservative reading and asked rather than assuming.

---

## THE EARLIER REPORT IS NOT WRONG, AND IS NOT CORRECTED

`LICENCE-AGPL-1` says `-only` was chosen and states why: it was the conservative reading of "AGPL-3.0"
and the alternative was flagged as his decision, in that report's own P2. **That was accurate when it
was written and it is not being corrected** — the journal is append-only and this is a superseding
decision, not an error in the record.

What a later reader needs is a pointer, so the INDEX entry for this piece says plainly that it
supersedes the identifier LICENCE-AGPL-1 shipped. Anyone landing on the older entry sees the newer one
immediately above it.

---

## CHECKS

**No fingerprint, no browser gate and no client suite.** This piece changes one string in three JSON
metadata files and a block of prose in the README. Nothing it touches is read by the race engine, the
camera director or the renderer, so no hash can move — stated rather than checked, per the chain's
rule for document pieces.

**Every statement of the licence in the tracked tree was enumerated before editing**, so the change
could not miss one: three `package.json`, one README section, and the two mentions in `docs/MORNING.md`
which are status text and are rewritten each piece anyway. `package-lock.json` entries are dependency
licences and were correctly left alone. `LICENSE` was checked and deliberately not touched.

Document guards green.

## CONFORMITY

- The identifier changed in all three `package.json`; all three parse.
- The notice the licence piece added updated to match, in the FSF's own wording.
- `LICENSE` untouched; `private: true` untouched; no per-file headers.
- Its own branch, its own check, its own report, its own merge — not folded into the piece that was
  in flight.
- The earlier report left intact, with a supersession pointer rather than a correction.

## PROPOSALS

**P1 — with the holder line settled too, the licensing question is closed and worth marking as such.**
Both rows that stood under NEEDS YOUR WORD are answered: `weudlll-cyber` stands as the holder, and the
grant is `-or-later`. Nothing about the licence needs him again unless he changes his mind.

**P2 (mine) — an `author` field would now be cheap and would stop the next reader asking.** The three
`package.json` still have none, which is why the holder line had to be inferred from the GitHub
organisation in the first place. One field, three files, and the repository would then establish its
own authorship instead of a report having to explain where the name came from.
