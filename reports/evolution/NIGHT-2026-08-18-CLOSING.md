# NIGHT 2026-08-18 — closing note

**One of four pieces done.** Piece 1 is merged, green and swept. **Pieces 2, 3 and 4 were not
started**, and that is a deliberate stop rather than a failure: the budget rule says _a piece not
started beats one half done_, and Piece 2 is the largest of the four.

---

## WHAT SHIPPED

**[CHANGE-PASSWORD-RL-1](CHANGE-PASSWORD-RL-1.md)** — merged `f6a1a275`, CI green for exactly that
SHA and for the branch SHA `92a1b4a3`, branch deleted at origin.

`POST /api/auth/change-password` is limited to **five**, the owner's number. It reuses the limiter
login and setup already use — same factory, same 429 sentence, **no new environment key**, the login
window read from the same variable. The one genuine difference is named rather than smuggled: **it
keys on the session's user, not the IP**, because the route is authenticated and per-IP keying would
let one operator exhaust every colleague's budget at the same address. Five tests, the per-user
keying sabotage-proven. **No fingerprint could move** — no instrument's closure contains any changed
file, established by walking each declared `reach` through `closureOf`.

---

## WHAT WAS NOT STARTED, AND WHAT EACH STILL NEEDS

**Piece 2 — nine test files sharing one `testadmin`.** The largest of the four: nine files to
decouple, a latent instance to fix, an enumeration (not an impression) proving there are no others,
and **five consecutive full server-suite runs** reported per run. It was not begun, so nothing is
half-changed and the next session starts from a clean master.

**Piece 3 — the setup mismatch logs nothing.** Small and self-contained: one server-side log line in
the shape the neighbouring warning already uses, never logging the token, plus a test that the
mismatch case logs and the correct case does not. The response must not change.

**Piece 4 — the marker and the user store can disagree.** Tests only, pinning today's behaviour in
both contradiction states. No behaviour change; the report owes him two sentences he can answer.

**Piece 3 was not taken out of order.** The brief says each piece starts only when the previous is
merged, and doing the cheap one instead of the expensive one would have reported three-of-four
progress while leaving the actual finding — the shared-account coupling that has already caused two
failures — untouched.

---

## WHAT IS WAITING FOR HIS EYE — THE FIRST THING IN THE MORNING

**[START-LEADER-VISIBLE-1](START-LEADER-VISIBLE-1.md)** is on `feat/start-leader-visible-1` @
`21b77415`, **unmerged, unminted, untouched by tonight's work**, and **the production build of
`ac885415` is served on 4173**. Nothing tonight rebuilt or restarted it.

**Read that report before looking at the build.** B′ is built and it does **not** pass its own
acceptance test: dirt-oval and searound are substantially repaired, all five open tracks are
byte-identical, and **city-circuit is much worse** — 46 out-frames at −93 px became 124 at −984,
because widening re-resolves the pan against the world edge and the feedback runs the wrong way.
**Look at dirt-oval first; do not judge city-circuit.**

---

## THE CLOSING STATE

- `feat/start-leader-visible-1` **untouched and still at the origin** at `21b77415`; master alone
  otherwise (`git ls-remote`).
- Tree clean, no stashes.
- **No fingerprint moved on master tonight.** Piece 1 changed four files, none of which is inside any
  instrument's closure (36 / 36 / 55) — so the record is untouched by construction rather than by a
  re-measurement that could not have said anything.

---

## PROPOSALS

### Proposal A — Piece 2 should be the next session's first piece, not its second

It is the one with a live consequence: the shared `testadmin` has already produced two failures, and
one latent instance is still there — `sessionInvalidation.test.js` promotes a user to `admin` while
`users.integration.test.js` asserts that demoting `testadmin` fails **because it is the sole admin**.
If those overlap, the second sees two admins and gets a 200 where it expects 409.

**The other two pieces are small and stable; this one decays**, because every new server test written
in the meantime inherits the same shared account and adds to what has to be untangled. **The
ten-line fix named in SELF-PASSWORD-1 — a per-file username in `authAgent` — is very likely the whole
of it**, and the expensive part is the enumeration and the five runs, not the change.

### Proposal B — a night brief with four pieces should say which one to drop

Tonight's brief carried a budget rule and a sequence, and the two can conflict: the sequence puts the
most expensive piece second, so a session that runs short delivers one piece instead of three. That
is the right outcome under the rules as written and it is what I did — **but it was my judgement, not
his**, and he is the one who knows whether the rate limit or the shared-account coupling mattered
more tonight.

**One line would settle it: "if time runs short, do 1, 3, 4 and leave 2."** It costs nothing to write
and it moves a decision from an agent's discretion back to the person whose priorities they are.
