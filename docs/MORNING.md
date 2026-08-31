# Morning sheet

**Owns:** where the night chain stands, right now. Rewritten after every piece, not at the end.
Whoever reads this at 7 a.m. should not have to open a single report to know where things are.

**Last rewritten:** 2026-09-01, after piece 4 of 9. **Master `b5413025` → and moving.** Origin
carries master alone.

---

## NEEDS YOUR WORD

Short, and nothing here blocks anything running.

1. **The copyright holder line is a placeholder.** The licence is in and says
   `Copyright (C) 2026 weudlll-cyber` — your GitHub organisation, used because the repository
   establishes no author anywhere: no `author` field in any `package.json`, no copyright notice in
   any tracked file. A GitHub account name is a stand-in for a person or a company, not the thing
   itself. **One line in the README to change** if it should read something else.
2. **`AGPL-3.0-only` or `AGPL-3.0-or-later`?** You said AGPL-3.0, so `-only` shipped — the
   conservative reading. `-or-later` would let recipients use the terms of a future AGPLv4 without
   asking. **One word in three `package.json` files.** Most projects choose `-or-later`.

*The track-field-ownership row that stood here is CLOSED — see below. It was answered on 2026-08-31.*

---

## CLOSED SINCE THIS SHEET WAS LAST RIGHT

- **"Which fields of a shipped track are the project's, and which are yours?" — ANSWERED AND BUILT.**
  You decided the rule: a shipped record is delivered **whole**, the operator is **warned by name**,
  and a record with no seed of that name is **never touched**. The whole seed strand is merged: your
  install became the shipped seeds, the redelivery mechanism exists, a hand-raised version decides
  when it fires, and a guard refuses a seed change whose version was not raised. **A boot on your
  install changes nothing** — 30 records byte-identical, no warning raised.
- **Two decisions came in on 2026-09-01 and are no longer questions:** the licence is **AGPL-3.0**,
  and **the server serves the client** rather than a second web server beside it. Both are built.

---

## TONIGHT'S CHAIN — 4 of 9 done

| # | piece | state |
|---|---|---|
| **1** | **The licence: AGPL-3.0** | **DONE, merged.** Full unmodified text at `LICENSE`; `AGPL-3.0-only` in all three `package.json`; README corrected. **It had been claiming MIT** with no licence file at all. No dependency licence is incompatible. |
| **2** | **The server serves the client** | **DONE, merged.** One thing to start, one port. Proven by HTTP against the real container. |
| **3** | **The image must not carry your credentials** | **DONE, merged.** The COPY was serving nothing; the runtime store is now out of the build context entirely. Proven from inside a built image: no credential file anywhere. **Nothing had leaked** — no image was ever published. |
| **4** | **The documented first step dead-ends** | **DONE, merged.** README and SETUP.md said the backend was optional; it has not been since auth arrived. Both rewritten around the one-port path, with the first-admin step they never mentioned. |
| 5 | The required environment, where a newcomer looks | not started |
| 6 | Close one of the two declared divergences | not started |
| 7 | What the engine-reach advisory says about data files | not started |
| 8 | The two things the crowding entry still infers | not started |
| 9 | What the track backup directory actually is | not started |

### What piece 2 actually changed, in one paragraph

`GET /` used to be a 404 while `docs/DEPLOYMENT.md` described a same-origin deployment that had never
been built. Now the server serves `client/dist` with a deep-link fallback, mounted **above** the auth
guards so a signed-out visitor can load the page that draws the sign-in form. **No path under `/api/`
can be answered with the app's HTML** — that is the classic failure of this arrangement and it is
proven by HTTP, signed in and signed out. A missing asset 404s instead of coming back as the shell
(found by probing, not by reading). With no client build the server starts anyway and says so. **The
dev loop is untouched** — the preview on 4173 still works exactly as it did. The client build reaches
the Docker image through a **named build context**, so the build context did not have to move to the
repository root; that structural decision is still yours to make and is what piece 6's other half
would need.

---

## RUNNING / NOT RUN

- **Fingerprints:** all four run by hand for every piece that touched code, and **all four unmoved**
  every time. Nothing minted; there is no minting permission in this chain.
- **`engine-reach --check` has now selected nothing six times running** for these path shapes. That
  is piece 7's subject.
- Document-only pieces run **no** fingerprint, browser gate or client suite — they cannot move a hash,
  and that is stated rather than checked.
