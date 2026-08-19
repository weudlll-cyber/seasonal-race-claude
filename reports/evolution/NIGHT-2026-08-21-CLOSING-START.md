# Closing note — the START HAND-OVER night, 2026-08-21 — four of four, and one waiting for your eye

> **THIS FILE WAS RECOVERED.** It was written as `NIGHT-2026-08-21-CLOSING.md` and a later block the
> same day overwrote that path with its own closing note instead of creating a new one. The content
> below is byte-identical to `3e3fbeab`, restored under a name that says which block it closes. The
> other note — the five-piece night — keeps the original filename.

## WHAT TO DO IN THE MORNING

**1 · Look at the start, on the build already served at http://localhost:4173/.**
Build pill: **`bf1912eb · feat/start-handover-mark-1`**, no `+dirty`.

**The build serves TODAY's start by default.** Your design is behind a tick box, because two of its
four acceptance criteria were missed and the gate says it ships off until you say otherwise. To see
it: **Dev Screen → Camera (advanced) → 1 · Start & Post-Start → "Hand over when the leader reaches
his place"**, then a **Quick Test** race.

- **dirt-oval first** — the track your report came from. Today the leader runs off the right edge
  from about 2.4 s to 3.9 s. With the switch on he stops at about two thirds across and stays.
- **city-circuit second, and judge it hardest** — it is the biggest change of the ten. Today he is
  off the LEFT edge in the first second with 4 of 20 racers on screen; with the switch on the camera
  goes to him at 33 ms and the shot ends up **tighter** with 18 of 20 on screen.
- **luger-hill third, because it is the criterion that failed.** Nothing leaves the frame there. The
  question is whether the racing shot arriving at 0.5 s instead of 5 s reads as *the race has
  started* or as *the ceremony was cut off*. **No measurement can settle that one — it is the whole
  of the missed criterion and it is yours.**
- **river-run for reassurance** — identical to today for the first 2.9 s, and that is measured.

**2 · Answer three questions.** They are the only things blocking work that is otherwise ready:

> **A · The start hand-over.** Two of four criteria met (the leader is inside the frame on all ten
> tracks; the old river-run defect is untouched to the digit). Two missed, both the same one thing:
> the racing shot arrives up to 4.5 s earlier and it is tighter, so the field moves about in frame
> more — luger-hill's field-centre drift goes 0.441 → 0.598. **Accept that trade, refuse it, or ask
> for the variant in the report's first proposal** (make the mark reachable only from below, which
> would give searound, city-circuit and garden-path a real hold instead of handing over at the gun).

> **B · The setup lock-out.** When the setup marker exists but the users store is empty, the server
> is unreachable: `GET /setup-needed` says no setup is needed and `POST /setup` answers `409` before
> it has read the token, so there is nobody to log in as and no API route to make one. **Should
> `POST /setup` treat "marker present, zero users" as setup still being needed, or is
> `scripts/recover-admin.mjs` the intended and only way back in?**

> **C · The setup marker after a refusal.** When the marker is absent but users exist, `POST /setup`
> refuses correctly — but inside the `O_EXCL` gate, so it creates the marker, finds the users, and
> deletes it again on every attempt. **Should that refusal WRITE the marker instead, recording what
> the store already proves, so later attempts stop at the fast pre-check?**

## WHAT IS LEFT FOR YOU, IN ONE LIST

| item                                                                              | state                              |
| --------------------------------------------------------------------------------- | ---------------------------------- |
| `feat/start-handover-mark-1` @ `bf1912eb` — the start hand-over                    | **unmerged, your eye owed**        |
| the switch's default                                                              | **off**, and stays off until you say |
| question B — the setup lock-out                                                   | **open, behaviour pinned not changed** |
| question C — the marker after a refusal                                           | **open, behaviour pinned not changed** |
| everything else from this night                                                   | **merged, CI green, nothing pending** |

**No fingerprint was minted and none moved.** All four instruments were measured on the camera
branch and are byte-identical to the record.

---

## WHAT WAS DONE, IN ORDER

**0 · The B′ tidy-up.** `feat/start-leader-visible-1` — the `leaderVisible` zoom ceiling you rejected
on a production build on 2026-08-20 — is now the annotated tag **`archive/start-leader-visible-1`**
(`5d3cbf0`), whose message names what it was and why it was refused, and whose tree carries its
report. The branch is **deleted at the origin** and the tag is registered in `docs/TAGS.md`. The
evidence moved first and the branch went after, in that order. **Merged as `afebc3f7`.**

**A · [START-HANDOVER-MARK-1](START-HANDOVER-MARK-1.md) — your shape, built and measured.**
One key, `startHandoverOnLeaderMark`, default false. It moves the ceremony hold's release from a
clock — the first view change, which is 4983 ms on all ten tracks — to a condition: the first frame
the leader's position along his own heading reaches `leaderForwardFrac`. **That fraction is read
from the racing framing, never chosen.** It can only make the hand-over earlier; if the mark is
never reached, today's release fires unchanged. **Not merged. Not minted.**

**The fork inside it is worth more than the candidate.** "Hand over" had two readings. The first
ended the hold and left the start phase alone — which handed the picture to OVERVIEW's own wide
setting, a shot no race sits in there today, and **introduced the defect on garden-path**, a track
that is fine. The mechanism is the one B′ died of: widening re-resolves the pan against the world
edge. So the hand-over goes where today's hand-over goes, the ordinary racing shot, through the
transition grammar. **The same trap, walked into from the opposite direction, one week apart.**

**Your infield question is answered and the answer is a refusal to invent one.** On dirt-oval the
camera centre travels **823.9 world px along the track and 7.8 across it** in the start window; it
never leaves the road (max **4.0 world px** off an **89 px** corridor half-width); the lateral
guarantee spends at most 4.2 px and the world-edge clamp spends **0.0**. **Nothing moves the aim
laterally.** What moves is the FIELD across a frame that stayed put — its position in frame runs
**0.507 → 0.257** while its height holds at 0.45–0.50 — because the aim jumps forward at ~3000 ms and
the camera trails it. The infield you saw is the part of the picture the field vacated.

**B · [TEST-ACCOUNTS-1](TEST-ACCOUNTS-1.md) — eight test files stopped sharing one row.**
Merged as `5423099d`. `authAgent.js` mints a user per call; each test FILE gets its own users store.
**The latent instance was reproduced rather than asserted** — on master, with the store actually
shared, nine tests go red at `expected 200 to be 409`. **The finding is why it was latent:** the
store was isolated by a delete in another file that no reader of the assertion would ever see.
Nothing weakened, nothing retried, and **`--no-file-parallelism` is dropped** — it was serialisation
standing in for isolation. Proven with **five consecutive full runs (23 files, 650 tests) plus three
in random file order**. Two remaining order dependencies are named rather than fixed; one of them is
pre-existing.

**C · [SETUP-TOKEN-LOG-1](SETUP-TOKEN-LOG-1.md) — the 403 can name its cause, in the log only.**
Merged as `cc438dfb`. One warning, in the neighbour's shape, logging **no token, no prefix, no
length**. **The response is untouched and a test now asserts the two 403s are byte-identical**,
because that sameness is the security property. Five tests, two sabotage-proven.

**D · [SETUP-STATE-PIN-1](SETUP-STATE-PIN-1.md) — the disagreement is on the record.**
Merged as `707ff5e4`. **No behaviour changed; the diff is one test file.** Ten tests including a
control, **all ten green on the first run** — nothing was adjusted to fit. Questions B and C above
come from it.

## THE CLOSING STATE, PROVEN

- **Origin holds master and one branch** — `feat/start-handover-mark-1`, which is piece A and is
  meant to be there.
- **CI green for exactly each merge SHA**: `afebc3f7`, `5423099d`, `cc438dfb`, `707ff5e4`. Piece A's
  branch was run through the `workflow_dispatch` hand crank, since CI does not fire on a feature
  branch push.
- **Tree clean, no stashes, all local branches deleted.**
- **`npm run verify` green before every merge.**
- **Fingerprints reproduce the record**: WORLD `dc4647be0f55ebdb`, WORLD-OFF `854018ee5d3d83e1`,
  CAMERA `d9f45a4aea0e5778`, RENDER `1274c7e8444238e3` — all four measured on the camera branch,
  where the closure walk (`closureOf` from each instrument's declared reach: 36 / 36 / 36 / 53) puts
  a changed file inside every one of them. **Measured, not argued.**

**One thing to know before you merge piece A:** its branch is off `afebc3f7` and master has moved
three merges past it. Its `reports/evolution/INDEX.md` line will conflict with the three added since.
That is a one-line resolution and it is the cost of leaving the branch untouched while you look at
the build, which was the right trade.

## PROPOSALS

1. **Make the start mark reachable only from BELOW.** On searound, city-circuit and garden-path the
   leader is already at or past `leaderForwardFrac` at the gun, so the hold has nothing to hold and
   the ceremony's framing ends before the race is visibly under way. Requiring the fraction to have
   been below the mark first would give those three a real hold — and it might be what makes
   luger-hill's drift acceptable, since its mark is at 533 ms. **No new key, measurable in an
   afternoon.**
2. **`GET /setup-needed` and `POST /setup` should read one predicate.** They are two statements of
   one rule in two places, and piece D exists because they had drifted. One `isSetupComplete()`
   consulted by both makes your answer to question B a single edit and makes the next drift
   impossible rather than merely unlikely.
3. **Retire `START_PHASE_DURATION` if the hand-over becomes a condition.** Piece A found that the
   3000 ms start phase never decides anything — the release is 4983 ms on all ten tracks, every
   time, which is OVERVIEW's `minStateHold` and the signature of a constant rather than of a
   picture. Two settings expressing "hold the wide shot for a while", one of them dead.
