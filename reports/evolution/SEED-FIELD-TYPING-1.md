# SEED-FIELD-TYPING-1 — a key you can paste but not read out

**Date:** 2026-09-07
**Branch:** `feat/team-races-1`, off `caf8768a`. **Not merged.** `night/2026-09-06` untouched.
**Fingerprints:** `engine-reach --check` selects nothing; nothing minted. Golden races **PASS**.

---

## Why a paste survived and a keystroke did not

`sanitizeQuickTestSeedInput` (`client/src/screens/SetupScreen/quickTestSeed.js:46-64`) asks three
questions of the whole string and reduces anything it cannot place:

```js
if (looksLikeRaceIdentifier(asText)) return asText;   // form 2 — RACE-IDENTIFIER-1
if (looksLikeShortKey(asText)) return asText;         // form 3 — RACE-HISTORY-4
const digits = String(raw ?? '').replace(/[^0-9]/g, '');   // …otherwise, DIGITS ONLY
```

Re-verified at source, and so is the call site: `RaceSettings.jsx:114` ran it **on every change**.

`looksLikeShortKey` is `normalizeShortKey(raw) !== null`, and that requires **exactly six** characters
of the alphabet after trimming (`shared/raceShortKey.mjs:54-64`). So every prefix of a key being
typed fails it, and the digits filter then eats the letters:

| typed so far | recognised? | field becomes |
|---|---|---|
| `7` | no | `7` |
| `73` | no | `73` |
| `733` | no | `733` |
| `733D` | no — four characters | **`733`** ← the D is destroyed |
| `733DS` | no | `733` |
| `733DSV` | would be yes — but the letters are already gone | `733` |

**A paste arrives complete**, so the six-character string is recognised on its first and only
judgement and passes through whole. Measured in the browser before the fix: typing `tna-8nw` left
**`"8"`**, and typing `zzzzzz` left **`""`**.

## ★ Why RACE-HISTORY-4's third form did not cover typing

It added the key as the sanitiser's third accepted form — correctly — and it proved it in a browser.
**With `fill()`.** `race-history.spec.js:163` and `:166`:

```js
await seedField.fill('ZZZZZZ');
await seedField.fill(typed);
```

`fill()` assigns the value in one step, which **is** a paste. It cannot produce the intermediate
states typing goes through, so it passed against a field that shredded every one of them. The
sanitiser's own comment says the key's validity is *"asked when the person asks for it, not here on
every keystroke"* — and the call site asked on every keystroke. **The comment described the
intention; the wiring did the opposite; and the proof could not tell them apart.**

## The fix — nothing was built

The start handler **already** asks all three questions of the raw value, at submit, in order
(`SetupScreen.jsx:873`, `:884`, `:919`): `looksLikeRaceIdentifier` → `looksLikeShortKey` →
`resolveQuickTestSeed`, which still calls the sanitiser — at submit, where a refusal can be shown.
So the field simply stops destroying what it cannot yet interpret:

```js
onChange={(e) => onSeedChange?.(e.target.value)}
```

**Reused, and named:** `looksLikeRaceIdentifier` (`raceIdentifier.js`), `looksLikeShortKey` and
`normalizeShortKey` (`shared/raceShortKey.mjs`), and `sanitizeQuickTestSeedInput` itself, which keeps
its two other call sites — the two that read a **complete** value out of storage
(`SetupScreen.jsx:134`, `:616`) — and its submit-time use inside `resolveQuickTestSeed`. No
recogniser, no field and no mode selector was added. The alphabet is untouched, no character folding
was introduced, and the key's shape, length and issuing are unchanged.

**Removed:** the now-unused `sanitizeQuickTestSeedInput` import in `RaceSettings.jsx` — dead the
moment the call went, and eslint would have said so.

## The five proofs

`client/e2e/seed-field-typing.spec.js`. The typing cases use `pressSequentially`, never `fill()` —
that distinction is the whole piece.

| | before | after |
|---|---|---|
| a short key **TYPED** character by character runs that race | **RED** — field held `"8"` | **GREEN** |
| the same key **PASTED** still works | passed | **GREEN** |
| a number **TYPED** is still a seed | **RED** | **GREEN** |
| an identifier **PASTED** still works | passed | **GREEN** |
| an unknown key **TYPED** is refused with a message, starts nothing | **RED** — field held `""` | **GREEN** |

Before the fix: **3 failed, 2 passed** — and the two that passed are exactly the two pastes, which is
the defect stated as a test result.

**Sabotage**, once: the per-keystroke reduction was restored and the typing case went red again —
`qhw-56b` came back as **`"56"`**. Reverted; the fix is back and lint is clean.

**One correction to the test, not the product.** The first green run left one failure: `Start Race`
never enabled, because players are React state and a `/setup` load starts empty however many races
ran before. That was my spec's gap. It now makes the screen startable the way `d9-smoke.spec.js`
already does — add one player, pick a track — reused rather than reinvented. **5 of 5 green.**

---

## Source hygiene

| file | before | after |
|---|---:|---:|
| `client/src/screens/SetupScreen/RaceSettings.jsx` | 245 | 261 |
| `client/e2e/seed-field-typing.spec.js` | — | new |

**Noticed and deliberately left:** the *other* seed field, `SetupScreen.jsx:1756`, still sanitises on
every keystroke. It is the small Quick-Test box — 52 px wide, `inputMode="numeric"`, and its own title
offers only a number range. **No short-key path reads it**: `typedShortKey` is computed from
`raceSeed`, the field this piece fixed. Widening it was not asked for and would change what that
control claims to be, so it stands.

`engine-reach --check`, verbatim:

```
ENGINE REACH: none of 2 path(s) carry a change that can reach the race engine.
  2 outside the hull (cannot reach the engine at all): client/src/screens/SetupScreen/RaceSettings.jsx, client/e2e/seed-field-typing.spec.js
```
