# DROP-CROP-SCRIPT-1 — the tool is gone, the knowledge is beside the artwork, and Rule A's population is now zero on purpose

> **Both preconditions established before the deletion, not after.** Nothing invokes it, and the
> sheets in the tree are provably its output — **12 of 12**, by running its own arithmetic against the
> PNG headers. `check-fallback-agreement` **27/27**, green on the tree, empty exception list.

---

## 1. THE TWO THINGS THAT HAD TO BE TRUE FIRST

### (a) Nothing invokes it — searched uncapped, both spellings

`crop-sprite-sheets`, `cropSpriteSheets`, `crop_sprite_sheets` over the whole tree:

| where a caller could hide | hits |
| --- | --- |
| `package.json` (all three) | **0** |
| `.github/` — every workflow | **0** |
| `.githooks/` | **0** |
| `scripts/verify.mjs`, `scripts/lib/routing.mjs` | **0** |
| any `import` / `require` anywhere | **0** — the file has no `export` at all |
| a document telling a human to run it | **0** — `LESSONS.md` and `BACKLOG.md`'s 2026-06-03 row NAME it as the tool that did the June crop; neither instructs anyone to run it |

**The only machine that ever read it was Rule A**, and it read the table, not the code.

### (b) The sheets in the tree ARE its output — 12 of 12

This is the decisive one, and it is a measurement rather than an argument. The tool's own arithmetic
— `cropSize = max(bodyWidth, bodyHeight) + 30`; `targetSize` = 128 below 128, `cropSize` up to 256,
256 above — was run over the pre-crop geometry **it recorded**, and the prediction compared with each
PNG's IHDR header:

```
horse        128x128  predicts 150   PNG frame 150x150   AGREE
giraffe      128x128  predicts 129   PNG frame 129x129   AGREE
snake        128x128  predicts 155   PNG frame 155x155   AGREE
rocket       128x128  predicts 151   PNG frame 151x151   AGREE
motorbike    128x128  predicts 150   PNG frame 150x150   AGREE
luge          64x64   predicts 128   PNG frame 128x128   AGREE
beetle       128x128  predicts 128   PNG frame 128x128   AGREE
boarder      128x128  predicts 128   PNG frame 128x128   AGREE
koi          565x565  predicts 256   PNG frame 256x256   AGREE
turtle       128x128  predicts 128   PNG frame 128x128   AGREE
dolphin      256x256  predicts 256   PNG frame 256x256   AGREE
snowmobile   192x192  predicts 148   PNG frame 148x148   AGREE

entries 12: 12 agree, 0 disagree, 0 missing
```

**Every sheet in the directory is the frame size this tool's rules produce from the inputs it
recorded.** It has no work left to do on any of them, so deleting it loses no capability that is
still needed. *(Independently: `BACKLOG.md`'s 2026-06-03 history row lists the same eight transitions
and the same four unchanged types, written on the day.)*

---

## 2. WHERE THE KNOWLEDGE WENT, AND WHY THERE

**`client/public/assets/racers/CREDITS.md`** — the file a person opening the sprite directory finds.

The pre-crop dimensions are **the only record of what those sheets held before**, and they are of use
to exactly one person: somebody looking at a spritesheet and wondering why it is 129 px wide. That
person is in `client/public/assets/racers/`, not in `scripts/`. Putting the table in a report would
have filed it where nobody with the question will be standing.

**It is written as history and says so**, with the live geometry left in its one home (the registry)
and explicitly not restated. The "after" column is there only so the pair is legible.

**And the file was already lying.** Its one existing entry read *"Format: 512×128 px, 4 × 128×128
frames"* for `horse-trot.png`. **The file is 1200×150 with eight 150×150 frames** — both halves false
since the 2026-06-03 crop, in the one document a reader of that directory opens. **Corrected by
removing the format line rather than fixing it:** the geometry has a home and now has a guard, and a
third copy here is precisely what went stale.

**The code is at the annotated tag `archive/crop-sprite-sheets`**, this project's archive shape, with
the recovery command in the tag message and in `docs/TAGS.md`.

---

## 3. ★ THE DELETION MADE A LOUD-FAILURE HOLE VISIBLE, AND IT IS CLOSED

**Rule A's live population is now ZERO.** RULE-A-REACH-1 measured it at twelve — twelve `frameCount`
literals, all in this one file, all agreeing. Deleting the file takes it to nothing.

So from today the rule prints:

```
check-fallback-agreement RULE A: 0 registry literal(s) in 450 file(s), over 20 racer type(s)
and 22 DISCOVERED field name(s); 0 disagree.
```

**That is the goal state and it is byte-identical to what a rule with a broken discovery would
print.** Lesson 187 exactly. The rule had no loud failure of its own: its test asserted the registry
yields racers and fields, which checks the fixture, not the tree.

**Closed, with the right distinction.** Finding zero LITERALS is success. What must never be zero is
the DISCOVERY:

- **zero racer types or zero field names** → FAIL. *"It cannot have compared anything."*
- **zero files walked** → FAIL. *"'0 disagree' would be a statement about an empty search."*
- **zero literals found** → **green**, and a test pins that it stays green.

**Both failures are PROVEN to fire**, not asserted:

| probe | result |
| --- | --- |
| `--registry-root=` at a fixture exporting `RACER_TYPE_IDS = []` | `FAIL: RULE A discovered 0 racer type(s) and 0 field name(s)`, **exit 1**, and it does NOT print its summary line on the way out |
| `--src=` at an empty directory | `FAIL: RULE A walked ZERO files`, **exit 1** |
| the real tree | **exit 0**, 0 literals, 0 disagree |

**`--registry-root=` is a new flag and it is a seam, not a mechanism.** It exists for the one reason
`--src=`, `--tags-file=`, `--doc=` and `--heads-file=` exist in this repository: without it the
registry failure **cannot be fired**, and a check that cannot go red is the thing this guard is for.
It moves the HOME; `--src=` moves the SCAN, and conflating them would make the rule compare a fixture
against itself.

**Three new tests, 27/27.**

---

## 4. WHAT THIS MOVED, AND WHAT ELSE POINTED AT IT (constraint 2)

Uncapped, whole tree, documents and code comments:

| site | what it said | outcome |
| --- | --- | --- |
| `scripts/check-fallback-agreement.mjs` `blind[]` | *"since PRE-CROP-FIELDS-1 there is a DELIBERATE example in the tree (`crop-sprite-sheets.mjs`'s `preCropFrameWidth`)"* | **corrected** — a second site created by my own repair, one night old. The blind spot is unchanged and is now unexercised |
| the same file's Rule A note | *"Those fields **are** now `preCropFrameWidth`…"*, present tense | **corrected**: the owner ruled twice, rename then delete |
| `docs/VERIFY-RULES.md` R18 | *"The instance it comes from. `scripts/crop-sprite-sheets.mjs`'s `FLAGGED_TYPES` **carried**…"* | **corrected** — the story is intact, the reader is told the file is gone and where it is |
| `docs/LESSONS.md:2259` | listed the script under **Reference:** | **corrected** — points at the tag and at `CREDITS.md` |
| `scripts/check-fallback-agreement.test.mjs:397` | *"the shape `crop-sprite-sheets.mjs` **now has**"* | **corrected** to past tense |
| `docs/BACKLOG.md`'s 2026-06-03 history row | *"Scripts: `audit-sprite-crops.mjs`, `crop-sprite-sheets.mjs`"* | **deliberately left** — a dated record of what that ship added, which is still what it added |
| `reports/**` (eight files) | various | **deliberately left** — append-only |

### A test the deletion broke, and the fix is that the test was too wide

`"RULE A carries NO exception for the one file it ever objected to"` sliced from
`const EXCEPTIONS` to `const isExcepted` — **four hundred lines and three unrelated functions** — and
grepped that span for `crop-sprite-sheets`. My note recording the deletion tripped it.

**Narrowed to the array literal itself**, and the slice now asserts it ends at the array's own closing
bracket. **An assertion that fires on prose about a thing is not an assertion about the thing** — and
the wide slice would have kept firing on every future mention.

---

## 5. RULE A AFTER THE DELETION

```
RULE A: 0 registry literal(s) in 450 file(s), over 20 racer type(s) and 22 DISCOVERED field
name(s); 0 disagree.
```

**Green, gating, empty exception list, nothing told to look away** — and now unable to report that
quietly if its discovery breaks.

---

## Limits

**Nothing was run that crops anything**, and the "12 of 12" is the tool's ARITHMETIC reproduced, not
the tool executed. If its arithmetic and its execution ever disagreed — a resize rounding, say — this
check would not see it. The independent corroboration is `BACKLOG.md`'s row from the day.

**The pre-crop table is now a fact with no second side.** It was already that; deleting the script
does not change it, but it is worth saying plainly: nothing can check `CREDITS.md`'s "before" column
against anything, ever, because the files it describes no longer exist. It is a record, and records
are trusted.

**Rule A now has nothing to check on this tree.** It is a guard against recurrence with a live
population of zero, and the loud failure added here protects the *discovery*, not the *finding*. If
somebody adds a registry copy tomorrow it will be caught; until then the rule's greenness says only
that no copy exists.
