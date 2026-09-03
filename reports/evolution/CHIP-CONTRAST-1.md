# CHIP-CONTRAST-1 — the chips measured 1.20:1 because they declared a background and no COLOUR, and their readability depended on the operator's logo

> **Both states cleared, measured rather than eyeballed. Unselected 1.20:1 → 5.48:1. Selected
> 1.37:1 → 15.47:1.** The convention was already in this screen and is now used instead of the one
> I invented.
>
> ★ **The over-capacity message was never unreadable — it was 4.88:1 and legible. It was
> INDISTINGUISHABLE**, because every secondary line on that screen looks the same. §3.
>
> ★ **And what he is not being told: WHICH seven were cut. They are chosen deterministically, and he
> cannot find out who they are from anywhere on the screen.** §4 — and it is worth more than the
> colour, exactly as he said.

---

## 1. THE MEASUREMENT

WCAG 2.1 relative luminance, each text colour against **the surface it actually sits on** — which
for the first version meant compositing a translucent fill over the panel underneath it.

| | text | on | ratio | |
| --- | --- | --- | --- | --- |
| **BEFORE** unselected chip label | `#000000` | `#191921` | **1.20:1** | **FAIL** |
| **BEFORE** selected chip label, no brand profile | `#000000` | `#1d2538` | **1.37:1** | **FAIL** |
| **BEFORE** selected chip label, a green brand | `#000000` | `#1c2523` | **1.34:1** | **FAIL** |
| **BEFORE** the count pill's digit | `#000000` | `#16161d` | **1.17:1** | **FAIL** |
| **AFTER** unselected chip label | `#888888` | `#0d0d0f` | **5.48:1** | PASS |
| **AFTER** unselected, on hover | `#eaeaea` | `#0d0d0f` | **16.14:1** | PASS |
| **AFTER** selected chip label | `#eaeaea` | `#1f0e10` | **15.47:1** | PASS |
| **AFTER** the count pill's digit, chip off | `#eaeaea` | `#2a2a35` | **11.79:1** | PASS |
| **AFTER** the count pill's digit, chip on | `#eaeaea` | `#3a1a1e` | **12.96:1** | PASS |
| **AFTER** the over-capacity notice | `#f4a261` | `#2a1f14` | **7.81:1** | PASS |

**4.5:1 is the bar for normal-size text (WCAG AA), and it is the one he named.**

---

## 2. ★ WHY IT WAS 1.20 AND NOT MERELY DIM — TWO MISTAKES, AND THE SECOND IS WORSE

**(a) The chip declared a `background` and no `color`.** A `<button>` with no colour of its own does
not inherit the page's; it takes the user agent's `buttontext`, which is **black**, because nothing in
this app declares `color-scheme: dark`. So the label was black on a near-black field. **One missing
line, and no test in a 4,400-test suite had an opinion**, because every test that touched the picker
asserted behaviour and the behaviour was correct.

**(b) ★ The chip named three custom properties this project does not define.**
`--border`, `--panel-alt`, and `--brand-primary` as the selected chip's FILL.

The first two exist nowhere, so their fallbacks silently applied — which is why it looked deliberate.
**The third is the real fault: `--brand-primary` is injected only while a branding profile is
loaded, and its value is the operator's own event colour.** So the selected chip's readability was a
property of somebody's logo. It is why he saw green where the code's fallback is blue, and it means
**the contrast could not have been guaranteed at any value** — a fresh install and his install were
different colours, and a third operator would be a third.

**A control's contrast cannot depend on a colour the operator picks for their branding.** That is the
finding, and it is bigger than the ratio.

---

## 3. THE CONVENTION EXISTED, AND IT IS TWO CLASSES ABOVE THE ONES I WROTE

He asked me to establish it first. It is in the same stylesheet:

| | unselected | selected |
| --- | --- | --- |
| `.tab` / `.tabActive` | `--color-muted` on transparent | `--color-text` on `#2a2a3a` |
| `.optionBtn` / `.optionBtnActive` — **the lap choices** | `--color-muted` on `#0d0d0f`, `1px solid #2a2a35` | `--color-text` on `#1f0e10`, border `--color-primary` |
| `.trackCard` / `.trackCardSelected` | — | border `--track-color`, background `#12121a` |

**It is a BORDER-AND-TEXT convention, not a fill convention**, and that is exactly what protects it:
the selected state keeps a dark field, so the label stays light. A chip that fills with a bright
colour has to solve a contrast problem the convention never creates.

**The chips now use `.optionBtn` / `.optionBtnActive`'s treatment identically** — same background,
same colour, same border colour — and a test asserts that character by character, so a future chip
cannot drift back to a palette of its own.

**The picker's own panel went too.** It was a `--panel-alt` tint inside `.panel`; it is now a plain
block with the convention's `#2a2a35` rule underneath it as a divider.

---

## 4. ★ THE OVER-CAPACITY MESSAGE — AND WHAT IT DOES NOT SAY

### It was legible. It was not noticeable.

`.emptyHint` is `--color-muted` on `--color-surface` = **4.88:1**, which passes. **The defect was
salience, not contrast**: the same grey carries the empty-roster hint, the group hint, and the
section headings, so a warning in it is one more line of furniture. Recolouring alone would not have
fixed that, which is why it also gets a bordered, tinted panel — the only new visual idea in this
piece, and it is the thing that makes it a *notice* rather than a *line*.

### A WARNING, not an error — deliberately

The treatment is **the one this screen already uses**: a ⚠️ and `--color-accent`, the same pair as the
start bar's `capacity-warning`, whose wording is *"The race will still start but may feel cramped."*
The message now ends *"The 40 in the field will race normally."* for the same reason.

**It is not the error red.** `--color-primary` is what the Start button's refusal uses, and nothing
here is refused: a field at the cap starts and races. **Dressing a normal outcome as a failure is how
an operator learns to skip the real ones**, which is the argument he made himself.

*(Noted in passing: the start bar's existing warning hardcodes `#f4a261` where `--color-accent` is its
one home. Not changed — it is on master, not this branch, and it is a one-line thing for whoever is
next in that file.)*

### ★ WHICH SEVEN WERE CUT — deterministic, and undiscoverable

**They are not arbitrary.** The rule is:

```js
const incoming = group.players.filter((n) => !already.has(n));
const admitted = room > 0 ? incoming.slice(0, room) : [];
```

So the survivors are **the first `room` names of the group's saved order, after removing any already
in the field**, and the cut is the **tail** of that list. `server/data/player-groups/<id>.json` holds
`players` as an array; the Dev Screen's `parseNames` splits the pasted text on commas and preserves
order; nothing sorts it. **Same group, same field, same cut, every time.**

**And he cannot find out who they are.** Every route is closed from where he is standing:

- **The group's saved order is not shown on the Setup Screen at all** — the chip shows a name and a
  count.
- **The roster shows who IS in the field, never who was turned away.** A name that never arrived
  leaves no trace.
- **The racer numbers give no clue**: the whole field is renumbered after the group lands.
- The only way is to open the Dev Screen, read the group's text, and diff it by eye against the
  Players tab.

**So: deterministic, reproducible, and invisible.** As instructed, **this was not built** — naming the
cut players is a design question (a list? a "7 more" expander? refuse the whole group instead of
truncating?) and the honest first step is that he knows the gap exists.

**My own view, for what it is worth and not acted on:** truncation may be the wrong behaviour
entirely. A host who picks a group of 47 for a 40-cap track probably wants to *choose* the seven, not
to have the tail silently removed — and refusing the group with *"this group has 47; the track holds
40"* would be both simpler to build and harder to get wrong than any list.

---

## 5. WHAT IS PINNED, AND IT IS SABOTAGE-PROVEN

`chipContrast.test.js`, seven tests, in the client suite — **it measures the stylesheet**, because
jsdom does not compute colours and this question is arithmetic.

| it asserts | sabotage |
| --- | --- |
| both chip states declare a `color` at all | removed it → **2 tests red** |
| both clear 4.5:1 against their own field | ↑ same run |
| the count pill clears it on both chip states | — |
| the notice clears it **and is `--color-accent`, not `--color-primary`** | — |
| the chips match `.optionBtn`/`.optionBtnActive` exactly | ↑ caught by the same removal |
| **no custom property is named that `main.css` does not define** | added `var(--border, …)` → **red, naming `--border`** |

Both sabotages were run against the real stylesheet and both went red; restoring gave 7/7. **Brand
and track colours are still allowed where a fallback is given** — they are legitimately injected at
runtime — but they can no longer be a control's only colour.

---

## 6. NOTHING CHANGED THE GAME

CSS, one component's markup, one message's wording, one new test file. **No engine file, no default,
no fingerprint input.** `client/src/screens/SetupScreen` is outside the engine hull and the commit
hook's reach advisory named nothing.

**125 Setup Screen tests green, lint clean.**

---

## Limits

**The ratios are computed from the stylesheet, not sampled from a rendered page.** They are true if
the declarations that apply are the ones the test reads, which is why the merged-cascade parser and
the undefined-token rule are both part of the same test file rather than niceties beside it. **A
browser measurement would be better and costs ten minutes of e2e** (R7); this is the cheap 95%.

**The "BEFORE" black is Chromium's `buttontext` with no `color-scheme` declared**, which is what this
app is. A browser that resolved it differently would give a different first row — but not a passing
one, and the missing declaration is the defect either way.

**The green in the "brand green" row is an illustration, not his profile.** I did not read his
branding data. The point of that row is that the number moves with a colour I cannot know, which is
the fault; the exact value is not.

**Hover is not a fix for anything.** 16.14:1 on hover is listed because it is the convention's own
behaviour, not because a control may rely on being pointed at to become readable.

**Nothing here touches the Dev Screen's Player Groups manager**, which has its own controls and was
not measured.
