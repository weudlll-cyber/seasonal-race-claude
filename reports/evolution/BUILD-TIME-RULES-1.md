# BUILD-TIME-RULES-1 — of the faults found since the census, TWO could have been caught earlier by a machine; the rest became inevitable at the keystroke and are human rules or nothing

> **READ-ONLY. Nothing was built and nothing is proposed as a build.**
>
> **Every rule this fortnight produced runs AFTER the fact.** This asks whether any of them could have
> run before it, working from the actual defects rather than from the idea of earliness.
>
> ★ **The honest headline: very little can move earlier, and the two things that can are already
> half-built.** §4 says so plainly, because a proposal that promises more is the failure this report
> exists to avoid.

---

## 1. THE DEFECTS, AND THE MOMENT EACH BECAME INEVITABLE

Every fault found since the census, with the moment it was *decided* rather than the moment it was
*noticed*.

| # | the fault | became inevitable | could anything have caught it THERE? |
| --- | --- | --- | --- |
| 1 | **the chip declared a background and no `color`** (1.20:1) | **at the keystroke** | **YES — a linter.** `color` and `background` on the same rule is a mechanical pattern |
| 2 | **the chip named three custom properties this project does not define** | **at the keystroke** | **YES — mechanically.** A CSS `var(--x)` whose token is defined nowhere is decidable from two files |
| 3 | the STARTERS board sized one axis of a two-axis picture | **while the code was typed**, believing a helper's contract | **no.** The contract was in the helper's own comment and was read; the belief was wrong, not absent |
| 4 | truncation dropped names the host could not discover | **while the spec was written** | **no machine.** It is a product judgement — the owner reversed it in one sentence |
| 5 | `maxPlayers: 20` read by nothing | **at the keystroke that stopped reading it**, months ago | **YES in principle** — an unused-export check. But it is a config KEY, and a key nothing reads is indistinguishable from a key read dynamically |
| 6 | four limits wearing one name | **while each was named**, months apart | **no.** *"Do these two names describe the same thing"* is meaning |
| 7 | **a guard hardcoding a count it computes** | **at the keystroke** | **partly.** §3 |
| 8 | **a test hardcoding what it tests** | **at the keystroke** | **partly.** §3 |
| 9 | three second sites the sweeps missed | **at the sweep**, which ran and did not reach them | **no — and this is the important one.** §2 |
| 10 | two of my own SABOTAGES were wrong | **at the keystroke** | **no.** A test of a test is a test |
| 11 | the citation picker's first three passes chose calls, hooks and keywords | **while the code was typed** | **no.** It took reading the output to see that `useEffect` is a useless citation |
| 12 | a heredoc collapsed `\b` into a control character | **at the keystroke** | **YES, and it was** — `no-control-regex` caught it at the commit |

**Twelve faults. Four are mechanically catchable earlier, and one of those four already is.**

---

## 2. ★ THE THREE MISSED SECOND SITES ARE THE ONES THAT MATTER, AND EARLINESS DOES NOT HELP THEM

C1's finding was that the sweep **was performed** and still missed three. Each was missed for a
**search-shape** reason:

| | why |
| --- | --- |
| `AUDIT.md` | **nobody thinks to open it.** It reads as history, not as a spec |
| `smoothDt` in `ARCHITECTURE.md` | **the token is legitimate 30+ times.** A grep for the name drowns the one wrong use |
| the `TRACK_LIFECYCLE` diagram | **it is a PICTURE.** An ASCII diagram is prose to a human and noise to a search for a sentence |

**No amount of earliness fixes any of these.** A rule at spec-writing time would not have known the
claim would later be wrong; a rule at the keystroke would have been the same grep, run sooner, with
the same shape.

**What WOULD help is a better SEARCH, not an earlier one** — which is a different proposal and not
what was asked. The one shape worth naming: **a sweep should enumerate documents rather than grep
tokens.** *"Which files mention this subject at all"* would have opened `AUDIT.md`; *"read every hit
in files that mention it"* would have surfaced the diagram. It is slower and it is not a rule that
fires; it is a habit with a checklist.

---

## 3. THE TWO THAT ARE ALREADY HALF-BUILT, AND WHAT COMPLETING THEM COSTS

### (a) A guard or a document restating a count the code prints

**Three of the three false claims written in scope were this.** The pattern is narrow enough to
describe: *a number in prose, in a file that also computes that number.*

**What a rule would need:** the sentence to say which computation it quotes. That is
PATTERN-CATCHABILITY-1's **S3**, and it needs opt-in — exactly as Rule F needed the arrow form.
**A plausible shape:** `<!-- computed-by: check-fallback-agreement RULE F -->` beside the sentence,
and a rule that runs the guard and compares. **What it would cost:** running a guard inside a guard,
and a convention that 7% of sentences would follow — CONTROL-CLAIMS-1 measured exactly that adoption
problem for a different convention and it is the reason the tooltip-value rule was never built.

**The cheaper rule is human and is one sentence:** **do not write a count you can print.** It would
have prevented all three.

### (b) A test declaring constants the module owns

**Mechanically catchable, and narrowly.** A test file that declares a `const NAME = <literal>` where
the module under test exports or declares the same name with the same value is a comparison a script
can make. **It would have caught the board test.**

**What it would cost:** false positives wherever a test deliberately hardcodes an expected value —
which is most of what tests do. The rule would have to be *"declares the same NAME as its subject"*,
not *"the same value"*, and even then a test naming its own `SPRITE_BOX` for unrelated reasons is
legal. **Worth building only if it fires more than once.**

---

## 4. ★ WHERE THE RULES MUST BE HUMAN, AND WHY THIS PROJECT'S HUMAN RULES ROT

Named honestly, because a human rule that is presented as a mechanism is worse than no rule:

| human rule | rots how |
| --- | --- |
| do not write a count you can print | the writer is thinking about the sentence, not about the machine |
| a limit's name says what it limits (R20) | the fifth number is added by someone who never read R20 |
| a bound says whether it is the mechanism or the evidence (A5) | it is a comment, and comments are read by whoever is already in the file |
| sweep for second sites, uncapped | it WAS obeyed, and still missed three (§2) |

### What makes a human rule stick here, when they repeatedly have not

This project has evidence on this and it is worth taking seriously rather than exhorting.

**The rules that STUCK are the ones that acquired a machine.** R13 (*a rule inside an existing guard*)
stuck because `verify` routes guards. R17 (*a block that re-mints names what must not move*) stuck
because the fingerprints fail. R11 (*every exemption is printed when granted*) stuck because the
guards print them.

**The rules that ROTTED are the ones that stayed prose.** R16 named the wrong tool for weeks. R18's
founding instance was deleted and the rule was nearly deleted with it. The 0.60 bound moved because
its reason lived in a report's Limits section instead of at the line.

**So the pattern is not discipline. It is PROXIMITY plus a FAILING ARTEFACT:**

1. **The rule's statement must live where the work happens** — at the line, in the signature, in the
   guard's own output. SLIDER-BOUND-060-1 moved the reason from a report to the `max:` and that is
   the whole of that piece.
2. **Something must go red.** Not necessarily about the rule — R20 has no guard — but the *area* must
   have a failing artefact, so the person is already reading output when they meet the rule.
3. **The rule must be stated as a REFUSAL, not an aspiration.** *"Do not write a count you can print"*
   survives a skim; *"prefer computed values"* does not.

**And one thing this fortnight demonstrated that no rule will fix:** the two copies in C2 and the two
bad sabotages in C3 were made by someone who had written the relevant constraint into a report **the
same night**. **Knowing the rule is not the failure mode. Applying it to the artefact you are
currently building is.** That is a property of attention, not of memory, and I do not have a proposal
for it.

---

## 5. WHAT I WOULD ACTUALLY DO, IF ANYTHING

**In order of value per cost, and none of it is large:**

1. **The two CSS rules from §1** — a control declaring `background` without `color`, and a `var(--x)`
   whose token is defined nowhere. Both are decidable from the stylesheet plus `main.css`, both would
   have caught the 1.20:1 chips at the keystroke, and **`chipContrast.test.js` already contains the
   second one.** Promoting it from one screen's test to a rule is small.
2. **Nothing else, yet.** The count rule needs an opt-in convention with a known 7% adoption problem;
   the test-constants rule needs a second instance to justify itself; and the three missed second
   sites are a search-shape problem that no rule at any moment addresses.

**PROPOSE ONLY, and this is the proposal: one small rule, and the honest statement that everything
else found this week became inevitable at a keystroke that no machine was watching and no earlier
moment existed to watch it from.**

---

## Limits

**Twelve faults is what this chain found, not what exists.** A fault nobody noticed cannot be
classified by when it became inevitable.

**"Could a machine have caught it" is my judgement**, and it is the optimistic direction that is
dangerous: it is easy to say a rule *could* have caught something and hard to write one that catches
it without crying wolf. Where I have said YES, I have named the two files a script would need.

**The proximity/failing-artefact account in §4 is a reading of this repository's history, not a
theory.** It fits the rules this project has kept and the ones it has lost; it is not evidence that
it would fit another project, or that a rule built to that pattern would stick.

**I did not cost anything.** *"Small"* means it looks like a day's work from here, and this project
has learned repeatedly that a rule's cost is in its exception list rather than its implementation.
