# DROP-DEAD-BACKGROUNDS-1 — 12.6 MB deleted, re-established unreachable at the source first

> **His decision, after looking at all five pairs: he wants the picture the game already uses, in
> every case.** None of the five client-side files was wanted.
>
> **All five deleted — 12,585,667 bytes.** With `Mountainstreet.jpg` earlier the same day, the folder
> has gone from **21.32 MB to 0**.
>
> ★ **Reachability was re-established UNCAPPED, at the source, and the decisive fact is not a grep**:
> `trackLoader.js` builds *every* client-side background path as an **API URL**. §2.
> ★ **The digest rule could not be "green with the reduced set"** — the reduced set is empty, and it
> refuses that, correctly. So the directory stopped being a watched artwork directory. §4.

---

## 1. WHAT WENT

| file | bytes | against the picture the game shows |
| --- | --- | --- |
| `garden-path.png` | 4,170,201 | the same garden, replanted |
| `river-run.png` | 4,420,831 | a different river |
| `city-circuit.png` | 3,068,312 | a night stadium against a day speedway |
| `dirt-oval.jpg` | 542,155 | the same racecourse, a different day |
| `space-sprint.jpg` | 384,168 | the same sky, graded differently |
| **total** | **12,585,667** | |

Earlier the same day, `Mountainstreet.jpg` — 9,772,456 bytes, **byte-identical** to the seed copy
under a second spelling. **21.32 MB → 0.**

**Where a person wondering about it will find out:** the `README.md` that stayed behind in the
folder, which carries this table and the reason; `docs/ARCHITECTURE.md`'s tree, where the folder is
now annotated instead of described as holding images; and this report. **git holds every byte** — the
archive question was about the reason, and the reason is written in three places, none of which is a
commit message.

---

## 2. ★ RE-ESTABLISHED UNCAPPED — AND THE DECISIVE FACT IS NOT A GREP

The earlier finding was a report. This is the irreversible step, so it was redone from scratch.

**Six searches, all uncapped, all case-insensitive, over the tracked tree:**

| | what was looked for | result |
| --- | --- | --- |
| A | every reference to the directory path | 25 hits — **all** test fixtures, docs, reports, or the digest guard's own list |
| B | the directory built in **pieces** — `'backgrounds'` as a segment, template literals, concatenation | every hit is **server-side** (`server/data/backgrounds`, `server/seeds/backgrounds`), a different directory |
| C | any **track record** carrying a public-path background | none. Every shipped seed uses `backgroundImageFile` (a bare filename the API serves); every e2e fixture uses `backgroundImage: null` |
| D | the three `.png` basenames — an extension unique to these copies | docs, reports, two test fixtures |
| E | `url()`, `<img>`, `src=` across every `.css`, `.html`, `.svg` | **zero** |
| F | `dirt-oval.jpg` / `space-sprint.jpg` — names shared with the seeds, so every hit judged by its **path** | every one is either the seed copy or a test fixture |

**AND THEN THE ONE THAT ACTUALLY SETTLES IT.** A grep can only show that a literal does not appear.
What proves unreachability is where the path *comes from* — `client/src/modules/storage/trackLoader.js`:

```js
backgroundImage: `${API_BASE_URL}/api/tracks/${serverId}/background`,
```

**Every background path the client uses is built there, as an API URL.** `RaceScreen/index.jsx` and
`PresetThumbnail.jsx` both read `geometry.backgroundImage`, which is that. `bgImageCache` — the one
production module that loads a background — is fed from those two call sites and nowhere else. **The
public folder is not on any path the product can take.**

**THE FIFTEEN TEST FIXTURES DO NOT LOAD ANYTHING.** They pass the string into
`buildTrackFromEditorState`, which stores whatever it is given; there is no `new Image()`, no `.src =`
and no `fetch` in either file. They were **left alone deliberately** — the string is an arbitrary
input to a pass-through, and rewriting fifteen of them buys no truth. The risk they carry is that a
*reader* believes such a path is live, and that is addressed at the three places a reader would
actually look (§3) rather than by churning test data.

**THE ONE RESIDUAL, NAMED RATHER THAN WAVED AWAY.** A track record created in *his* browser before
the upload feature shipped could in principle hold a `/assets/tracks/backgrounds/...` path in
localStorage. Nothing in the repository can carry one, the editor has not produced one since the
upload shipped, and `trackLoader` overwrites the field on every load. If such a record exists it
would now show a missing background rather than a wrong one — which is the more honest of the two.

---

## 3. SECOND SITES — THREE, AND THE MOST IMPORTANT IS A PICTURE

| | what it said | why the sweep nearly missed it |
| --- | --- | --- |
| `docs/ARCHITECTURE.md` tree diagram | listed the folder as *"Track background images (1280×720)"* | **it is an ASCII diagram** — prose to a human, noise to a search for a sentence. This is the exact shape the 2026-09-04 morning sheet named as one of the three second sites its own sweep had missed |
| `docs/TRACK_EDITOR.md` JSON example | `"backgroundImage": "/assets/tracks/backgrounds/city-circuit.png"` | **second site of a claim already corrected in §4 of the same document** the day before. Fixing the prose left the example, and this file calls itself the single source of truth for the feature |
| `client/src/modules/track-effects/bgImageCache.js` | a `@param` example naming `dirt-oval.jpg` | **production code telling a reader what a valid path looks like** — the only one of the three that a developer would copy |

All three corrected, each pointing at the mechanism that actually feeds the function.

---

## 4. ★ THE DIGEST RULE COULD NOT BE "GREEN WITH THE REDUCED SET"

The brief asked for the artwork digest rule to be green with the reduced set, and for its record to
stop naming files that do not exist. **The reduced set is empty, and the rule refuses that:**

    FAIL: ZERO image files under client/public/assets/tracks/backgrounds.
          Either the artwork moved or the extension filter stopped matching; either way this
          rule cannot have compared anything. See Lesson 187.

**That refusal is correct and was not softened.** From inside the rule, "zero images here" and "the
extension filter broke" are indistinguishable — which is what Lesson 187 exists to say. Adding an
expected-empty exception would be machinery bought to accommodate one directory, at the cost of the
protection the rule provides everywhere else.

**So the directory stopped being an artwork directory.** It is removed from `ART_DIRS` and from the
guard's declared `dirs`, with the reason written at the list. **`digests.json` was DELETED, not
emptied** — a manifest naming five files that no longer exist is exactly the stale-record defect this
rule exists to refuse, and the brief named that class specifically.

**WHAT IS STILL WATCHED, AND WHAT THE SABOTAGES SHOWED.** Four arms, each exercised:

| | |
| --- | --- |
| a byte appended to a racer sheet | **FAIL**, naming the file and both digests |
| a NEW file in no record | **FAIL** *(found by accident — my first sabotage created `horse.png` instead of appending to it, since that file does not exist. Removed; the arm is real)* |
| the zero-files refusal, aimed at the now-empty folder | **still FAILS** — unchanged |
| a missing directory | **still FAILS** — unchanged |
| the rule on the real tree | **31 assets match, 0 changed, 0 new, 0 missing** |

The guard's own suite is **16/16**, with its fixture reduced from two watched directories to one.

**The pictures the game actually shows are unaffected.** `server/seeds/backgrounds/` is covered by
the **seed version** rule and always was — which is the correction ARTWORK-DIGEST-1 had to make when
it claimed "nothing watches the artwork".

---

## 5. WHAT WAS RUN

| | |
| --- | --- |
| `npm run verify --base=master` | **PASS 15 FAIL 0 SKIP 11** |
| `check-seed-versions.test.mjs` | **16 / 16** |
| RENDER fingerprint | **matches the record** — routed in because `client/public/` changed, and run rather than argued |
| minted | **nothing. No minting permission was given and none was needed** |

---

## 6. WHAT THIS DOES NOT COVER

- **It does not prove no browser anywhere holds a stale local track record** (§2). It proves the
  repository cannot produce one.
- **The fifteen test fixtures still name deleted files.** Deliberate — they are arbitrary inputs to a
  pass-through, and the reader-facing sites were fixed instead.
- **The folder still exists, holding only its README.** That is the record, in the one place someone
  wondering about the missing megabytes would look first; it costs 2.7 KB in the bundle.
- **Nothing was archived beyond git.** The bytes are in history; the reason is what needed a home,
  and it has three.
