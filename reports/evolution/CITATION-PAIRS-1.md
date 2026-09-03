# CITATION-PAIRS-1 — 61 converted, 51 refused, and Rule F now checks THE PAIR, which closes its own declared blind spot

> **His decision, 2026-09-04**: convert the link citations so the link keeps working and the visible
> half becomes checkable — **with the part that makes it worth doing**: Rule F must check the pair,
> not the visible half.
>
> **61 of 112 converted. All 61 verified, by the rule itself.** 51 refused and reported.
>
> ★ **Rule F's blind spot goes from ALL of its citations to 8 of 69.** §3.

---

## 1. THE FORM, AND WHY THE PAIR IS THE WHOLE POINT

```
before   [`raceStep.js:46-55`](../client/src/modules/raceStep.js#L46-L55)
after    [`raceStep.js` → `computeRowEnvMult`](../client/src/modules/raceStep.js#L46-L55)
```

The href is untouched, so **every link still works**. The visible text is now a two-sided claim a
machine can check.

**And the href's line number still drifts silently.** Code above it moves, the anchor stays, and the
click lands somewhere else. So converting the visible half **alone** would have left a citation whose
text says the right name while its link points at the wrong place — **worse than today, because a
reader trusts a link more than a number.**

**Rule F therefore checks that the symbol named in the text is AT the lines the href names.** Both
halves, together, or the citation is not checked at all.

---

## 2. THE COUNTS, AND HOW ALL 61 WERE VERIFIED

| | |
| --- | --- |
| deep-link citations in `docs/*.md` | **112** |
| **converted** | **61** |
| **refused — nothing in the cited range is a nameable symbol** | **51** |

**The verification is not a separate pass — it is the rule.** After conversion,
`check-fallback-agreement` reads each of the 61 files at the href's line range and looks for the
named symbol:

```
RULE F: 69 symbol citation(s) in 36 document(s) — 61 PAIRED (symbol checked AT the line
        the link points to) and 8 bare (symbol checked anywhere in the file); 0 disagree.
```

**61 paired, 0 disagree.** Every conversion resolves to a symbol genuinely at the line the original
citation pointed to — which is exactly *"resolves to what the original line held"*, checked by the
same mechanism that will keep checking it.

### ★ The symbol picker had to be tightened three times, and that is the report's most useful part

A first pass accepted anything the cited range *referred to* and produced **`storageSet`** (a call to
an imported helper), **`useEffect`** (a React hook), **`background`** (a CSS property) and **`for`**
(a keyword). **Every one of those is genuinely at the line, so the paired check would PASS them** —
and every one is useless: it says the range *mentions* a thing, not what the range *is*.

**A citation that is checkable and meaningless is not an improvement on a line number.** The picker
now accepts only a symbol **DECLARED** in the range — `function`/`const`/`class`/`export`, or an
object-literal key — with keywords excluded, imported names excluded, and non-JS files excluded
entirely. That took the convertible set from 70 → 63 → 61, and the refused set grew accordingly.

---

## 3. ★ THE BLIND SPOT, RE-MEASURED

Rule F declared this from the day it shipped:

> *"WHICH occurrence. It asks whether the symbol is in the file at all, not whether it is the one the
> sentence meant."*

**A paired citation cannot have that problem.** The symbol must be at the lines the link points to,
and no other feature's symbol satisfies that by accident.

| | before | after |
| --- | --- | --- |
| citations Rule F checks | 8 | **69** |
| checked only for existence **anywhere in the file** (blind) | **8 of 8 — all of them** | **8 of 69** |
| checked **at a line** | 0 | **61** |

**The proof is the sabotage.** `NATURALNESS_CEILING` is declared in `raceGovernor.js` at `:30`. Cited
as `` [`raceGovernor.js` → `NATURALNESS_CEILING`](…#L92-L97) `` it is a symbol that **really is in
the file** — the old rule would have passed it:

```
FAIL: RULE F — 1 citation(s) name a symbol their file does not contain.
    docs/a.md: cites `raceGovernor.js` → `NATURALNESS_CEILING` at L92-L97, and
      NATURALNESS_CEILING is NOT in those lines (it IS elsewhere in the file —
      the LINK points somewhere else)
```

**It says which half is wrong**, which matters: without that clause a reader edits the symbol when
the line is what drifted.

**Both halves proven, on the real tree**: swap the symbol for another real one → red; drift the href
to `#L200-L210` while the text stands → red. Restored → 0 disagree. **Five new tests, 45 in the
suite.**

---

## 4. THE 51 THAT WERE NOT CONVERTED

**Refused, not deferred.** The brief is explicit that an unchecked pair is the failure mode this
design exists to avoid, so a citation with no symbol at its range keeps its line and is left alone.

What they point at: JSX fragments, CSS rules (`main.css#L18-L19`), bare expressions, and ranges whose
content is a call rather than a declaration. **They are not worse than they were** — they are exactly
what they were, and they are now *known* to be uncheckable rather than assumed convertible.

**One resolution defect was found and fixed on the way.** The paired check first resolved by the
BASENAME in the visible text, and this repository has four files called `index.jsx` — so **14 of the
61 came back AMBIGUOUS**, i.e. the rule declining to check the very citations the conversion was for.
It now resolves by the **href**, which is a real path and never ambiguous. A test pins it.

---

## 5. NOTHING CHANGED THE GAME

Documents, one guard rule, one test file. No engine file, no default, no fingerprint input.
`verify --base=master`: **PASS 10 FAIL 0 SKIP 16**.

---

## Limits

**"All 61 verified" means all 61 satisfy the paired check.** It does not mean the symbol chosen is the
best description of the range — for a range whose first declaration is a minor local, the citation is
now *checkable* rather than *informative*. **That is still the trade the design buys:** if the local
moves out of the range, the rule goes red and someone fixes the citation, which is more than a line
number ever offered.

**The 51 refusals are a property of the picker, not a proof.** A human reading those ranges would
find a good name for some of them. The picker is deliberately mechanical because a judgement made 51
times by a script is 51 chances to be confidently wrong.

**Rule F still sees only `docs/*.md`.** The same paired form now appears in a code comment
(`garden-path-finishes.spec.js`) and is not checked there.

**112 is today's count.** CITATIONS-CONVENTION-1 measured 107 a day earlier; the difference is a day
of document edits, not a disagreement about method.
