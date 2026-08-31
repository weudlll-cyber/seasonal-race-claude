# LICENCE-AGPL-1 — AGPL-3.0, and the README had been claiming MIT

**The owner chose AGPL-3.0 on 2026-09-01.** The repository is public and carried no licence file, so
until tonight nobody could legally use it — the opposite of what he wants.

**One thing to bring back to him: the copyright holder line is a placeholder** (see below). Everything
else in this piece is done.

---

## WHAT WAS FOUND ON THE WAY: THE README ALREADY CLAIMED A LICENCE, AND THE WRONG ONE

`README.md` ended with:

```
## License

MIT
```

**There was no `LICENSE` file, no `license` field in any `package.json`, and no copyright notice
anywhere in the tracked tree** — so that single word was the repository's entire licensing statement,
and it named a licence the owner has now decided against. It is replaced rather than softened.

This was not in the brief's list of expected work; it was found by searching for what the repository
already establishes, and it is the reason the README change is a replacement rather than an addition.

---

## THE LICENCE TEXT — WHERE IT CAME FROM, AND WHY THAT MATTERS

The instruction was: the full unmodified text, exactly as published, not retyped, summarised or
reformatted. **Nothing was typed.** The path taken is recorded here so a later reader can verify it
rather than trust it.

**`www.gnu.org` is unreachable from this machine** — `https://www.gnu.org/licenses/agpl-3.0.txt`
returned HTTP 403 on the first attempt and a transport-level failure on two more, with and without a
browser user-agent. So two published mirrors were fetched instead and **cross-checked line by line
against each other**:

| source | bytes | lines | longest line | appendix placeholders |
|---|---|---|---|---|
| `api.github.com/licenses/agpl-3.0` | 34,523 | 662 | 78 | `<year>  <name of author>` — **intact** |
| `spdx/license-list-data` `AGPL-3.0-only.txt` | 34,020 | 236 | 938 | intact, but **reflowed** |
| `licenses/license-templates` `agpl3.txt` | 34,527 | 663 | 79 | **modified** to `{{ year }}  {{ organization }}` |

**The GitHub copy is the one that shipped**, because it is the only one of the three that is both the
FSF's own hard-wrapped formatting *and* unmodified in the appendix. The line-by-line diff against the
license-templates copy came back with **31 differing lines, and every one of them is explained**: the
FSF's URL modernised from `http://fsf.org/` to `https://fsf.org/`, and the appendix's placeholder
line replaced with Jinja markers, which reflows the paragraphs after it. The SPDX copy confirms the
same content with different line breaks.

**Written verbatim, and verified after writing:**

```
LICENSE written: 34523 bytes
sha256         : 8486a10c4393cee1c25392769ddd3b2d6c242d6ec7928e1414efff7dfb2f07ef
identical to fetched source: true
```

Structure confirmed complete: preamble, `TERMS AND CONDITIONS`, all eighteen numbered sections
(0–17), `END OF TERMS AND CONDITIONS`, and the `How to Apply These Terms to Your New Programs`
appendix.

---

## WHAT CHANGED

- **`LICENSE`** at the repository root — the full AGPL-3.0 text, byte-identical to the fetched
  source, LF line endings.
- **`license: "AGPL-3.0-only"`** in all three `package.json`, placed beside `private` where the other
  publication metadata sits. All three still parse; the diff is one line each.
- **`README.md`** — the `## License / MIT` section replaced with a `## Licence` section naming
  AGPL-3.0, pointing at `LICENSE`, carrying the copyright line, and stating the one consequence a
  reader of *this* project actually needs: **section 13 — running a modified version as a network
  service obliges you to offer its users your source.** It also says plainly that `private: true` has
  nothing to do with licensing, because that pairing invites exactly that confusion.

**`private: true` stays in all three**, untouched, as instructed.

**No per-file licence headers were added.** **No dependency licence was touched and no third-party
notice file was generated.**

### Why `AGPL-3.0-only` and not `AGPL-3.0`

Plain `AGPL-3.0` is **deprecated** in the SPDX licence list; the current identifiers are
`AGPL-3.0-only` and `AGPL-3.0-or-later`. `-only` was chosen because it is exactly what he said —
AGPL-3.0 — whereas `-or-later` would silently grant recipients the terms of licences the FSF has not
written yet. **If he wants the "or later" grant, it is a one-word change**, and it is a licensing
decision rather than a technical one, so it was not made for him.

---

## THE COPYRIGHT HOLDER IS A PLACEHOLDER — THIS IS THE ONE THING FOR HIM

**The repository establishes nothing.** No `author` field in any of the three `package.json`, no
copyright statement in any tracked file outside `reports/`, no `AUTHORS` or `CONTRIBUTORS` file. The
only identity the repository carries is the git author (`Weudl`) and the origin organisation
(`weudlll-cyber`).

Per the brief, the GitHub organisation name was used rather than inventing a legal entity:

```
Copyright (C) 2026 weudlll-cyber
```

**This is a placeholder he should confirm.** A copyright line normally names the natural or legal
person who holds the rights, and a GitHub account name is a stand-in for that, not the thing itself.
Whether it should read his own name, a company, or stay as it is, is a question for him and was not
decided here.

---

## DEPENDENCY LICENCES — LOOKED AT, NOTHING TOUCHED

Instructed to change nothing and to report an incompatibility if one was found. **None was found.**
Every declared licence across all three lockfiles, by distinct package count:

```
463 MIT · 33 Apache-2.0 · 21 ISC · 12 MPL-2.0 · 10 LGPL-3.0-or-later · 8 BSD-3-Clause
  8 BSD-2-Clause · 3 Apache-2.0 AND LGPL-3.0-or-later · 2 MIT-0 · 2 BlueOak-1.0.0
  1 each: Apache-2.0 AND LGPL-3.0-or-later AND MIT, 0BSD, GPL-3.0-only, (MIT OR WTFPL),
          (BSD-2-Clause OR MIT OR Apache-2.0), Python-2.0, CC-BY-4.0, CC0-1.0
  2 with no licence declared in the lockfile: busboy, streamsearch
```

Two worth naming rather than leaving in a list:

- **`better-sqlite3-session-store` is `GPL-3.0-only`, and it is a server RUNTIME dependency.** It is
  compatible: AGPLv3 section 13 grants explicit permission to combine a covered work with GPLv3 code.
  Named because it is the only copyleft dependency the running server links, and a later reader
  should not have to rediscover that it is fine.
- **`caniuse-lite` is `CC-BY-4.0`** — a build-time data file, one-way compatible, not linked into
  anything shipped.

`busboy` and `streamsearch` declare no licence **in the lockfile metadata**. That is a statement about
the lockfile, not a claim that they are unlicensed, and establishing what they actually carry was
outside this piece.

---

## CHECKS

**No fingerprint, no browser gate and no client suite was run, and that is the answer rather than a
skipped step.** This piece adds a text file, three inert metadata fields and a markdown section.
Nothing it touches is read by the race engine, the camera director or the renderer at any point, so
none of the four hashes can move and running them would prove only that the machine still works.

All eleven document and repository guards run and green, including `check-doc-links` (the new
relative link to `LICENSE` resolves) and `check-language-closed` (the licence text is English and in
any case sits outside that guard's declared scope).

## CONFORMITY

- Full unmodified AGPL-3.0 text at the repository root; not retyped, not reformatted, verified by
  hash after writing and cross-checked against a second published mirror.
- Licence field set in all three `package.json`; `private: true` untouched in all three.
- README states the licence and points at the file — and the false MIT claim it carried is gone.
- No per-file headers. No dependency licence touched, no notice file generated, no incompatibility
  found.
- Copyright holder taken from the GitHub organisation because the repository establishes nothing, and
  flagged as a placeholder for him rather than decided.

## PROPOSALS

**P1 — the holder line is the only open item, and it is a question, not work.** One line in the
README and, if he wants it, an `author` field in the three `package.json` that currently have none.

**P2 (mine) — `AGPL-3.0-only` versus `-or-later` deserves ten seconds of his attention.** Most
projects choose `-or-later` so recipients can move to a future AGPLv4 without asking. `-only` was
chosen here because it is the conservative reading of what he said. Either is a one-word change.
