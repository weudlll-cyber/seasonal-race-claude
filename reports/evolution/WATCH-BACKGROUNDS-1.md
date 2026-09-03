# WATCH-BACKGROUNDS-1 — the 21.3 MB is watched now, and it is SIX not four: five are DIFFERENT PICTURES under one name, one is byte-identical twice

> **The digest covers them by EXTENSION, not by a second mechanism.** 31 racer sheets + 6 backgrounds
> = **37 assets watched**, one rule, one directory each for its record.
>
> ★★ **THE COLLISION IS WORSE THAN THE BRIEF EXPECTED, AND MORE OF IT.** Six of six share a name with
> a seed background, not four — and **five are different photographs**, measured at the pixels. §2.
>
> ★ **AND NOTHING LOADS THEM.** The client fetches backgrounds from the API. §3 — which is what makes
> the divergence survivable and what makes the 21.3 MB dead weight.

---

## 1. THE COVERAGE

`check-seed-versions`'s artwork rule took one directory. It now loops over two, each with its own
`digests.json` **beside the files it describes**, so a record never travels away from what it records.

```
check-seed-versions ARTWORK: 37 hand-made asset(s) match their record
  (31 under client/public/assets/racers; 6 under client/public/assets/tracks/backgrounds);
  0 changed, 0 new, 0 missing.
```

**Sabotage:** one byte appended to `space-sprint.jpg` →

```
FAIL: the artwork under client/public/assets/tracks/backgrounds does not match its record.
  CHANGED  space-sprint.jpg  recorded 0ae3ebfbf5cc…  now f182ad57af26…
```

Restored → green. **The message names WHICH directory** now that there are two, which is the only
behavioural change to the existing half. `dirs` gains the backgrounds path, so **a change there
selects this guard**. 16 tests green; the fixture gained a second watched directory, without which
every test in that file failed — the rule behaving correctly against a fixture that had not kept up.

*(The racer `digests.json` shows a diff: the explanatory note re-wrapped when the block was
restructured. **Every digest is byte-identical** — checked line by line.)*

---

## 2. ★★ THE NAME COLLISION — MEASURED AT THE PIXELS, NOT INFERRED FROM NAMES

Names and formats cannot answer this: a re-encode changes every byte, and a different photograph can
share a name. So both sides were decoded to raw pixels and compared on a common grid.

| client file | client | seed | mean \|diff\| /255 | verdict |
| --- | --- | --- | --- | --- |
| `city-circuit.png` | 1536×1024 | `city-circuit.jpg` 3072×2047 | **63.06** | **DIFFERENT PICTURES** |
| `garden-path.png` | 1536×1024 | `garden-path.jpg` 3072×2047 | **59.23** | **DIFFERENT PICTURES** |
| `river-run.png` | 1536×1024 | `river-run.jpg` 6144×4096 | **44.82** | **DIFFERENT PICTURES** |
| `dirt-oval.jpg` | 1168×784 | `dirt-oval.jpg` 3072×2047 | **41.07** | **DIFFERENT PICTURES** |
| `space-sprint.jpg` | 1168×784 | `space-sprint.jpg` 6000×4000 | **30.20** | **DIFFERENT PICTURES** |
| `Mountainstreet.jpg` | 6144×4096 | `mountainstreet.jpg` 6144×4096 | **0.00** | **IDENTICAL BYTES** |

**It is six, not four.** Every client background shares a name with a seed one.

**Five are different photographs.** A mean absolute difference of 30–63 out of 255 is not a re-encode
artifact; those are different images. **Two of them share a name AND a format** (`dirt-oval.jpg`,
`space-sprint.jpg`) — same name, same extension, different picture, 6× the file size apart.

**One is one fact with two homes.** `Mountainstreet.jpg` and `mountainstreet.jpg` are byte-identical
at 9.32 MB, differing only in the capital M — **which on a case-insensitive filesystem is a trap of
its own**, since the two names are the same name to the OS and different names to git.

**What a single home would cost:** 9.32 MB and one decision about which path the app asks for.
Nothing else references the client copy (§3), so the cost is a deletion and a README line.

**Which image should appear where is a picture question and it is his.** Nothing was reconciled.

---

## 3. ★ AND NOTHING LOADS THEM, WHICH REFRAMES ALL OF IT

The client does **not** read `client/public/assets/tracks/backgrounds/`. `trackLoader.js` builds

```js
backgroundImage: `${API_BASE_URL}/api/tracks/${serverId}/background`
```

— **the server's copy**. The only reference to the public path in `client/src` is a **doc-comment
example** in `bgImageCache.js`.

So:

- **The divergence is not live.** No viewer is seeing the wrong picture; the five different
  photographs are not reaching a screen at all.
- **The 21.3 MB is dead weight in the client bundle**, shipped to every visitor's browser cache
  budget and to every build.
- **The README beside them is stale too**: it lists seven files to place there including
  `ice-track.png`, which does not exist, and `mountainstreet.jpg` in lower case.

**Not deleted.** It is 21.3 MB of pictures and the decision is his — and if he wants the client to
serve backgrounds locally one day, these are the files that would do it.

---

## Limits

**"Different pictures" is a pixel measurement, not an identification.** A mean absolute difference of
41 says these are not the same image; it does not say whether one is a crop, a different render, or a
different photograph of the same place. **A human eye would answer that in a second and this did not
ask.**

**The comparison resizes both to 64×64.** That is deliberate — it is a same-or-not question and the
originals differ in resolution by up to 4× — but it means a difference confined to fine detail would
be understated. Every verdict here is far from the threshold, so the coarseness does not decide any
of them.

**"Nothing loads them" is a grep over `client/src`.** A dynamic path built at runtime would be
invisible to it; none was found and the API path is unambiguous.

**The digest cannot judge whether a change was wanted.** It refuses silence, nothing more — the same
statement its own output carries.
