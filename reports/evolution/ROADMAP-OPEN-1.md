# ROADMAP-OPEN-1 — `docs/OPEN.md`, the one list he reads

**Branch:** `docs/open-page` off master `27ffb342`. **Documents only.** No source changed.
**NIGHT-2026-08-23, piece 4.**

PIECE 3 left `BACKLOG.md` at **3078 lines** — the right shape for one owner of a subject, and the
wrong shape for a person deciding what to do next. **This piece is the other half of that trade.**

---

## 1. What it is

`docs/OPEN.md`: **one page, every open item, in his language**, grouped by what he has to *do* with
it rather than by which report it came from.

| group | n | what it means |
| --- | --- | --- |
| **NEEDS ONLY YOUR WORD** | **9** | nothing has to be built or measured first |
| **READY TO BUILD** | **13 + 5** | specified and small; the 5 are verifications of work that already shipped |
| **NEEDS MEASURING FIRST** | **8** | no amount of reading settles them |
| **TOO LARGE — NEEDS YOUR DIRECTION** | **6** | real work, real shape, nobody should start unasked |

**Cheapest first inside each group**, as the brief requires — which is why "replace one placeholder
value" sits above "pause and resume a race", and why the five shipped-work verifications are broken
out: **they read as expensive and are not**, because their code is already in.

---

## 2. It is derived, and the page says so twice

**Every line points at the backlog and states nothing the backlog does not.** No item was judged,
re-checked or closed to build this page, and **no verdict was invented** — where the backlog says
"cannot establish", so does this page.

- **The header** carries the generation date and the master sha (`27ffb342`) and says plainly: *where
  the two disagree, the backlog is right and this page is stale.*
- **The footer** says how it is regenerated and that it is not guarded.

**Every anchor was validated.** 15 cross-document links into `BACKLOG.md` and `RACE-ACTION.md`, all
checked against the real headings with GitHub's own slug rules — **0 bad anchors**. *(The first check
reported 15 failures and the CHECKER was wrong, not the links: it collapsed runs of whitespace into
one hyphen where GitHub emits one hyphen per space, so every heading containing an em-dash mismatched.
Recorded because a validator that is wrong in the safe direction is the more dangerous kind.)*

---

## 3. The translation is the work, and it is the part that can rot

**The backlog says:** *"`RA_PUBLIC_ORIGIN` exists only as the placeholder `racearena.example.com`. It
is the canonical self-origin the CSRF guard compares incoming `Origin` headers against."*
**This page says:** *"Replace the `RA_PUBLIC_ORIGIN` placeholder with a real value — one value, needed
before anything goes online."*

**Both are true and neither can replace the other.** The first is the evidence; the second is what a
person deciding tonight's work needs to see. **That gap is the reason the page exists and also the
reason it will drift** — a mechanical extract of the first sentence of each item would not drift, and
would not be worth reading.

**Three items are deliberately rendered as cheaper than the backlog makes them look**, because the
backlog's text predates a change:

| item | why the backlog reads more expensive than it is |
| --- | --- |
| `V-1`, `V-2` | both are written as blocked; **their blockers shipped and closed** (PIECE 2) |
| `B-5` | written as "wiring missing"; **the wiring exists** (PIECE 2) |
| `Q-13` | written as needing a structural fix; **the fix shipped — only an eye-test is left** (PIECE 2) |

**No new verdict is being asserted there** — each of those corrections is already in the backlog with
its evidence, made earlier tonight. This page carries the corrected reading, not a fresh one.

---

## 4. Should a guard fail when it drifts? — the proposal the brief asked for

**PROPOSED: NO GUARD, and the reasoning matters more than the verdict.**

A drift guard has only two possible shapes and **both destroy something**:

1. **Compare the prose to the backlog.** Cannot be done mechanically. "One value, needed before
   anything goes online" and the CSRF paragraph are the same item and share almost no vocabulary.
2. **Generate the page mechanically and fail when the file differs.** This works — and it converts
   the page into a machine extract, **which removes the only property it has**: being written in his
   language. A generated OPEN.md is just BACKLOG.md with the evidence deleted.

**A third shape does work, and it is narrow enough to be honest: guard the COUNTS, not the words.**
A check that counts unticked items in `BACKLOG.md` PART ONE and fails when that number differs from a
figure recorded in `OPEN.md`'s header would catch *"an item was added and the page was not
regenerated"* — the actual failure mode — **without any claim about the prose.** It cannot force the
text to be right; it can only say *something moved.*

**Not built tonight, and not recommended without his word**, because it carries R11's risk: it
pressures whoever adds a backlog item into touching a second file, and a guard that makes the cheap
act expensive is how items stop being written down. **That is his call, and it is on the morning
sheet.**

---

## 5. Source hygiene

- **One new file**, `docs/OPEN.md`, **158 lines**. No existing document was edited except the INDEX
  and — from PIECE 3, already merged — `ROADMAP.md`, whose forward reference to this page was
  **deliberately removed** when it was written, because the file did not exist yet and would have been
  a broken link. **It is added back here**, now that the target exists.
- **Removed / extracted:** nothing. This piece only adds.
- **No value restated.** No `defaults.js` number appears on the page; `RA_PUBLIC_ORIGIN` and
  `pulkCeilingCap`-style keys appear by NAME only.
- **Noticed but left alone:** the backlog's `NEEDS HIS WORD` index still lists *"merge ROADMAP into
  BACKLOG — approved as work, its own piece"* as though it were pending. **PIECE 3 did it two hours
  ago**, and the row's own target (PART TWO D24) is a decision record that correctly stays. **Left
  because the row is inside a table whose stated purpose is to show what each old question became**,
  and rewriting it needs a decision about whether that table tracks questions or work. **Named here so
  the next reader finds it deliberately.**
- **Absence claims:** none made in this piece. The item inventory was **extracted** from PART ONE
  (31 unticked `- [ ]` entries plus the `Planned — needs spec` bullets sorted in PIECE 2), not
  asserted to be complete by search.

---

## 6. Build-vs-spec conformity

1. **The brief asked for "every open item".** The page carries **every unticked item in PART ONE and
   every survivor of PIECE 2's sort** — but it does **not** carry PART TWO, the *Known Limitations —
   Deliberately Accepted* section, or the *Parking Lot*. **Those are not open items**: the first is
   closed work, the second is accepted-and-not-to-be-fixed, the third is explicitly unclear scope. **A
   page that listed them would be a table of contents, not a decision list.** Stated because it is a
   narrowing of "every".
2. **The three-line-per-item shape was kept for the groups where it earns its place and dropped where
   it did not.** "NEEDS ONLY YOUR WORD" and "TOO LARGE" use it; **READY TO BUILD and NEEDS MEASURING
   use two-column tables**, because thirteen consecutive three-line entries is a wall, and *where it
   lives* is one shared link for the whole group. **The brief's intent — what it is, what it takes,
   where the evidence is — is met per group rather than per line.**
3. **The proposal about a guard is a NO with a third option**, rather than the yes/no the brief's
   phrasing invites. §4 gives the reasoning.
4. **R15 — documents only; the gate set is the doc guards and nothing else.** No source file was
   touched, so no fingerprint, suite, browser gate or race can have changed its answer. **Merged while
   PIECE 1's sweep ran**, under the night's documents-only rule.
5. **Ran alongside the sweep; nothing here was timed.** Every figure is a count of lines or items.

---

## 7. Proposals

**P1 — COUNT-DRIFT, NOT PROSE-DRIFT (the §4 third shape), IF HE WANTS A GUARD AT ALL.** Record the
PART ONE unticked count in `OPEN.md`'s header; fail when the file disagrees with the backlog. **It
catches the real failure — an item added, the page not regenerated — and makes no claim about
wording.** The cost is R11's: it taxes the act of writing an item down. **His call.**

**P2 — DONE RATHER THAN PROPOSED: the page now carries what was left off it.** §6.1 narrows "every
open item" three ways, and that narrowing was invisible to a reader of the page. It was cheap enough
to fix rather than propose, so `OPEN.md` gained a short **"What is deliberately NOT on this page"**
section naming the three excluded kinds — PART TWO, accepted limitations, parking lot — and pointing
at the backlog for each. **Recorded here as a proposal I acted on**, because the difference between a
short list and a list that quietly hides things is one paragraph.

**P3 — THE FOUR GROUPS ARE A BETTER BACKLOG STRUCTURE THAN THE BACKLOG'S OWN.** PART ONE is organised
by *where an item came from* — which report, which audit, which date. **This page is organised by
what has to happen next, and it took one pass to build**, which suggests the information was always
there and only the ordering was missing. **If the backlog is ever restructured, these four groups are
the candidate** — and PIECE 3's P3 reached the same conclusion from the opposite direction (split by
audience, not by subject). **Two pieces arriving independently at the same shape is the strongest
signal in tonight's paper work.**
