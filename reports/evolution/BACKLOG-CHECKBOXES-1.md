# BACKLOG-CHECKBOXES-1 — three boxes closed by their own verdict, and a FOURTH that looked identical and is correctly open

> **Open checkboxes 60 → 57.** Every one was re-verified at the tree today rather than taken from the
> verdict that already said ALREADY DONE. **Nothing was deleted**: the boxes are struck, with the
> closing evidence and date on the line, so a question that was asked still reads as one that was
> asked and answered.

---

## 1. WHAT CLOSED, AND ON WHAT EVIDENCE

BACKLOG-VERDICTS-1 (2026-09-02) audited every open entry and returned **ALREADY DONE** on these
three. The verdict was recorded and **the checkbox never moved**, which is the whole of the defect —
a reader scanning for open work reads the box, not the paragraph under it.

| entry | the verdict said | re-checked today |
| --- | --- | --- |
| `:3821` two files still document the `--no-file-parallelism` flag that commit removed | already corrected | `server/package.json`'s `test` script is **`vitest run`**; the comments in `verify.mjs` and `ci.yml` both describe the removal |
| `:3864` a shipped track change still reaches nobody | closed by SEED-REDELIVERY-1 | confirmed at that report and at the seam it names |
| `:3908` garden-path still wears the snail | corrected | the seed's icon is **🪲** and its description reads *"scuttle through the roses"* |

**Closing them is mechanical, not a new judgement.** The judgement was made on 2026-09-02 with source
verification; this piece moves the box to match it, and re-verifies so that a wrong verdict does not
get laundered into a closed box.

---

## 2. ★ THE FOURTH ONE, WHICH IS THE REASON TO RE-CHECK RATHER THAN TRUST

`:3958` — *"A Dev Screen change does not reach a running race"* — sat in the same block and read the
same way, and a first pass through this list attributed a neighbouring ALREADY DONE verdict to it.

**Its own `verify:` command settled it.** Run today, it returns:

```js
const [cameraConfig] = useState(() => loadCameraConfig());
```

**No setter.** The config is read once at mount and never re-read, so a Dev Screen change does not
reach a running race — exactly as the entry says. **It is correctly open and stays open.**

**This is the argument for the re-check in one instance.** Three of four verdicts survived contact
with the tree and one did not, and the one that did not was mine, made while closing the other three.
A pass that had trusted the verdicts would have closed a live defect and left no trace of doing so.

---

## Limits

**This closes boxes; it does not audit the verdicts.** BACKLOG-VERDICTS-1 examined every open entry
and this piece touched only the four it marked ALREADY DONE. **The other 57 open boxes are unread
here** and nothing in this report says anything about whether they are still open for good reasons.

**"Open checkboxes 60 → 57" counts `- [ ]` at the line start.** It is a count of the marker, not of
distinct work items — an entry with sub-boxes counts more than once, and this report does not
re-classify them.
