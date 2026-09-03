# ARTWORK-DIGEST-1 — the rule catches its founding incident, and a geometry check would not have

> **The incident was reproduced on COPIES and the repository's own artwork was never touched.**
> Red on the nine files, green after restore, green on the real tree. `check-seed-versions` **16/16**.
> **And the correction this piece owes: "nothing watches the artwork" was WRONG about half of it.**

---

## 1. ★ THE FINDING THAT DECIDED THE SHAPE — A GEOMETRY CHECK WOULD NOT HAVE CAUGHT IT

The obvious cheap rule is "the registry's frame size must match the PNG's header". **Measured, on a
faithful reproduction of the incident:**

```
scratch horse BEFORE: 1200x150   sha 223ee39c748dba50…
scratch horse AFTER : 1200x150   sha 02be933d520abbe8…
```

**Same dimensions. Different pixels.** The bad run re-cropped an already-cropped sheet, and its own
arithmetic produced the same target size it produced the first time — so the frame geometry came out
identical and only the image changed. It even printed `Verification: OK — no border clipping` for
each file.

**So the geometry question and the content question are different questions**, and only a digest
answers this one. That is why the rule is a digest and not the cheaper check.

*(The geometry rule is still worth building — it is piece 4's — but this report is the reason it must
not be sold as covering this incident.)*

---

## 2. ★ THE CORRECTION I OWE: HALF THE ARTWORK WAS ALREADY WATCHED

**WHATS-LEFT-1 and the morning sheet said "nothing watches the artwork". That is false of the
largest half of it**, and the sweep this piece was required to do is what found it.

`check-seed-versions` already fails when **any tracked file under `server/seeds/` changes without
its unit's version being raised** — and that includes **`server/seeds/backgrounds/` (10 files,
51.6 MB) and `server/seeds/brand-logos/` (1 file)**. The guard reports **0 orphans**, which is the
proof every one of them is inside a versioned unit.

**What was actually unwatched was `client/public/`.** The claim should have been, and now is: *no
guard declared `client/public/`.* That is what I verified last night by asking every guard
`--declare`; I then generalised it to "the artwork", and the seed half was never in that search.

---

## 3. WHERE THE RULE WENT, AND WHY IT IS NOT A NEW SCRIPT

**Inside `check-seed-versions`, whose subject already IS this**: *"a tracked file whose CONTENT
changed without its record changing with it."* It was the only guard in the repository with that
subject; it runs everywhere (`check-writable`, the other tree-walker, is a declared no-op off
Windows and so would not run in CI); and it already reads a manifest and walks a tree.

**Its `covers` was widened to say so** rather than left describing half of what it does.

### Why a DIGEST here and a VERSION for seeds — and the seed manifest's own words settle it

`server/seeds/versions.json` argues against a content comparison in as many words:

> *"The moment an operator edits a record their copy differs from the seed. A content comparison
> would therefore overwrite and warn on every boot, forever, on every install that has ever been
> used. The version is the only thing that can say WE MEANT THIS."*

**None of that reaches a spritesheet.** It is bundled into the client build; no operator has a
divergent copy; there is nothing to redeliver. **The objection that rules content out for seeds does
not apply here**, which is why the two halves of one guard use two instruments without contradicting
each other.

### Re-recording is one command, and that was a requirement rather than a nicety

```
node scripts/check-seed-versions.mjs --record-artwork
```

**No version to invent, no second file to edit, no argument to remember.** The failure message names
it, and names `git checkout --` for the other case. A tripwire whose reset is harder than deleting
the tripwire gets deleted within a month; **a test asserts that the failure message carries the
command.**

**The record lives beside the artwork** — `client/public/assets/racers/digests.json` — not in `docs/`,
because the person who legitimately replaces a sheet is standing in that directory.

---

## 4. PROOF THAT IT CATCHES ITS FOUNDING INCIDENT

**Reproduced faithfully, on copies, with the repository untouched.** The deleted tool was recovered
from `archive/crop-sprite-sheets^`, a scratch tree was built with copies of all 31 sheets, and it was
run there. It behaved exactly as it did on 2026-09-03, `Verification: OK` and all.

| step | result |
| --- | --- |
| guard against the corrupted copies | **exit 1** — `FAIL: the artwork does not match its record`, naming **all nine** files individually: `beetle`, `boarder-sprite`, `giraffe-walk`, `horse-trot`, `luge-slide`, `motorbike-walk-mask`, `motorbike-walk`, `rocket-fly`, `snake-crawl`, each with the recorded and the measured digest |
| restore the copies | **exit 0** — *"31 hand-made asset(s) … match their record"* |
| the real tree, throughout | **exit 0**, and `git status` on the asset directory shows only the new record file |

**The nine are exactly the nine the incident hit.**

**Seven tests**, including the sabotage, the pair that proves restoring makes it green, a NEW file, a
vanished file, the one-command re-record, and both loud failures (a missing or empty artwork
directory; an unreadable record — which must fail rather than report the artwork unchanged).
**16/16 on the guard's suite.**

---

## 5. ★ WHAT IS STILL UNWATCHED — THE INVENTORY, WITH COSTS. EXTENDED NOTHING.

Every tracked binary and vector asset in the repository — **52 files** — by directory:

| files | size | directory | watched? | by what |
| --- | --- | --- | --- | --- |
| 10 | 51.57 MB | `server/seeds/backgrounds` | **YES** | the seed version rule |
| 1 | 0.09 MB | `server/seeds/brand-logos` | **YES** | the seed version rule |
| 31 | 2.27 MB | `client/public/assets/racers` | **YES, from today** | the artwork digest rule |
| **6** | **21.32 MB** | **`client/public/assets/tracks/backgrounds`** | **NO** | — |
| **2** | **0.00 MB** | **`client/public` (favicon-16, favicon-32)** | **NO** | — |
| 2 | 0.25 MB | `reports/night/img` | no, correctly | report evidence, append-only by rule |

**There are no fonts and no sounds**, and that is measured rather than assumed: the search covered
`ttf otf woff woff2 eot mp3 wav ogg svg ico` and returned nothing outside the rows above.

### What each would cost

- **`client/public/assets/tracks/backgrounds` — 6 files, 21.3 MB. Digest cost: 33 ms.** The rule
  already takes `--artwork-root=`, so extending it is a second call, not new machinery. **The
  question it raises is not cost, it is DUPLICATION:** four of the six have a same-named counterpart
  under `server/seeds/backgrounds`, in a different format (`city-circuit.png` here against
  `city-circuit.jpg` there), and two more do not (`Mountainstreet.jpg` with a capital M,
  `garden-path.png`). **Whether these are the same pictures, stale copies, or a build-time set is a
  question nobody has asked**, and digesting them would freeze whatever they are without answering
  it. **That is why it was not extended tonight** — the brief said to extend nothing, and this one
  needed the establishment first anyway.
- **The two favicons — 3 ms.** Trivially cheap and trivially low-stakes. They would be swept up by
  widening the walk one directory; the only reason not to is that `client/public/` also holds
  `index.html`, and a digest rule over a file that a build step touches would fire on the build.

---

## 6. WHAT THIS MOVED, AND WHAT ELSE POINTED AT IT (constraint 2)

| what moved | what pointed at it | outcome |
| --- | --- | --- |
| `check-seed-versions` gained a second instrument | its `covers` said only "a shipped seed record" | **corrected** — it now describes both halves; three new `blind` entries name what the digest cannot do |
| its fixture repo | the guard now fails loudly without an artwork directory, so two tests that expect exit 0 broke | **fixture given one asset and its record** — the same shape `check-config-keys`'s fixture took, and it exercises the happy path on every test in the file |
| the claim *"nothing watches the artwork"* | `docs/MORNING.md`, `reports/evolution/WHATS-LEFT-1.md`, `PRE-CROP-FIELDS-1.md` | **the morning sheet is corrected**; the two reports are append-only and the correction is recorded in the INDEX corrections block, where a reader on the way to them passes it |
| the routing | nothing declared `client/public/` | `dirs` now carries `client/public/assets/racers/`, so **an artwork change selects this guard** — which is what makes any of it work |

---

## Limits

**A digest cannot judge intent and this report should not be read as if it could.** It refuses
silence. If somebody re-records a corruption deliberately, the record agrees with the corruption and
the guard is green — correctly, because at that point a person has said "I meant this".

**It watches 31 files in one directory.** 8 more tracked assets outside it are unwatched and named
above; **the reason they are named rather than covered is the brief's instruction, not a judgement
that they matter less.** The 21 MB of client-side track backgrounds are the larger exposure by size.

**The reproduction used the tool, not the accident.** The 2026-09-03 incident was a shell expansion;
what was reproduced is the tool's effect on the same files. If the accident had also truncated a
write or interleaved with a sync, the copies would differ from what actually happened — but the
digest catches any of those equally, so the proof is not weaker for it.

**The scratch reproduction ran `sharp` against 12 sheets in a temp tree.** It wrote nothing inside
the repository, and `git status` on `client/public/assets/` was checked after: only the new
`digests.json` appears.
