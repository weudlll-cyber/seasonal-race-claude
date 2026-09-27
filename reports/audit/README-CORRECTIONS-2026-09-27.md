# README-CORRECTIONS-1 — two of my findings dissolve, and the deployment command is now run

**From master `5f685240`, on `docs/2026-09-27-readme-corrections`.** Documents plus one executed
deployment command. No product source touched; `docker-compose.yml` not edited.

★ **Two of the three items are corrections OF a correction — the place a second error hides.** Both
of my "dropped claims" from README-REWRITE-1 were wrong, in two different ways, and neither was
wrong by carelessness about evidence: one was a search that stopped one directory short, the other
was a measurement of the wrong thing. **Every address in the brief was verified and all of them
hold.**

---

## ★ ITEM 1 — THE 3-EFFECT CAP EXISTS. `ARCHITECTURE.md:173` WAS RIGHT ALL ALONG.

All four addresses in the brief verified at the tree:

| address | what is there |
| --- | --- |
| `components/EffectConfig/EffectConfig.jsx:11` | `export default function EffectConfig({ effects, onChange, max = 3 })` |
| `:34` | `if (effects.length >= max) return;` — the fourth is refused |
| `:124` | `{effects.length < max && (` — the add button is not rendered at the limit |
| `screens/TrackEditor/TrackEditorToolbar.jsx:128` | `<EffectConfig effects={effects} onChange={onEffectsChange} max={3} />` |

★★ **AND A FIFTH ENFORCEMENT POINT THE BRIEF DOES NOT NAME.**
`screens/TrackEditor/trackEditorSave.js:73`, inside `buildTrackFromEditorState`:
`const effectsArray = Array.isArray(effects) ? effects.slice(0, 3) : [];`
**The limit is enforced twice on the way in** — once in the control and once on save — not once.
That matters for the scope sentence, because it means the editor cannot produce a four-effect
geometry even if the control were bypassed.

### Does the renderer cap it? — **established, and the answer is no**

The brief asked for this to be established rather than assumed, or else said so in those words. It
was established:

- `screens/RaceScreen/index.jsx:476-481` builds the live instances from
  `extractEffects(geometry).map(...)` — **no slice, no length check**.
- `extractEffects` (`trackEditorSave.js:135`) filters out **unknown ids only**.
- A repository-wide search for a cap in the draw chain returns one hit, and it is the save path
  above.

**So a geometry that reaches the renderer with four effects is drawn with all four.** ★ Written
into `ARCHITECTURE.md:173` as **the limit's scope, not as a defect**, with the reason stated:
nothing in the product can produce such a geometry, because save slices. It would have to be
written by hand or posted to the API.

### All four statements of this one fact now agree

`docs/TRACK_EDITOR.md:310` (*"EffectConfig component, up to 3 simultaneous effects"*), `:348`
(*"up to 3 per geometry"*) and `:376` (*"Multi-effect array (up to 3 per geometry)"*) were each
checked against the same five addresses. **All three are correct and none needed changing.** With
`ARCHITECTURE.md:173` that is four statements of one fact, all true, and one of them now carries
where the fact is enforced.

### ★★ How the search missed it — the transferable part

The original sweep looked in `client/src/modules/track-effects/`, `TrackEditor.jsx` and
`defaults.js`. The cap is in `client/src/components/EffectConfig/`, **which was never opened** —
and `docs/TRACK_EDITOR.md:310` names that component by that exact word. **A document was pointing
straight at the answer and the search did not follow it.** The failure was not "no evidence found";
it was concluding *nowhere in the code* from *not in the three places I looked*, which is an
absence claim made from a bounded search without saying the search was bounded.

---

## ★ ITEM 2 — MY REPLACEMENT COUNT WAS ALSO WRONG

**Both counts re-run at this tree. The brief's numbers are confirmed exactly.**

| | count | what it means |
| --- | ---: | --- |
| files using the CSS **property** `max-width` | **9** | a width limit on an element — **says nothing about screen size** |
| files with an `@media (max-width: …)` **breakpoint** | **3** | an actual small-screen rule |

The three, with their addresses and their breakpoints:

- `client/src/screens/RaceScreen/RaceScreen.css:476` — `@media (max-width: 640px)`
- `client/src/screens/ResultScreen/ResultScreen.css:494` — `@media (max-width: 768px)`
- `client/src/screens/RacerEditor/RacerEditor.module.css:49` — `@media (max-width: 900px)`

And the fixed field: `client/src/modules/camera/projection.js:37-38`,
`REFERENCE_CANVAS_W = 1280`, `REFERENCE_CANVAS_H = 720`. **Verified.**

★ **Where my nine came from, since the brief asked.** I grepped for the string `max-width` in
`client/src/**/*.css` and reported the file count as "nine CSS files carry `max-width` queries".
The grep was correct; **the word "queries" was not.** Six of those nine use `max-width` as an
ordinary layout property. I measured a real thing and then named it as a different thing, and the
name was what carried the inference.

★★ **Dropping the owner's original sentence was still right, and for the reason that survives.**
*"No mobile layout by design"* asserts an **intent**, and nothing in the repository establishes an
intent either way. That is untouched by the count being wrong — but the count I gave did not
support the drop, and a reader checking my work would have found a weaker case than the one I
claimed.

**What the README now says**, measurements only: the race picture is a fixed 1280×720 field that
does not reflow, and three screens carry a small-screen breakpoint. ★ **It says nothing about
whether phone use is a goal.** That is the owner's, it is with him, and the page states what is
true until he answers.

**Recorded as a row** on the tidy list with all four addresses: three breakpoints against a fixed
race field, intent unestablished. The count is unaffected — it is not a new subject.

---

## ★ ITEM 3 — `docker compose up -d` IS NOW EXECUTED

It went into the README unexecuted because port 4000 is held by the owner's own dev backend. **A
second reason, found while setting this up, was worse than the port:** `docker-compose.yml:48`
bind-mounts `./server/data` — **the owner's live data** — and this server writes to it at boot
(seed delivery, migrations). A plain `docker compose up` here would not have been a read-only act.

**How it was run without either harm.** A temporary override passed with `-f` alongside the
committed file, under its own project name, never committed:

- port republished `4099:4000`;
- the data mount redirected to a scratch directory made for the run;
- `-p racearena-verify`, so the owner's container, network and auto-loaded
  `docker-compose.override.yml` were untouched.

★ **The committed `docker-compose.yml` was NOT edited** — `git diff --stat docker-compose.yml`
empty, before and after.

### Command by command, with what was actually seen

| command | result |
| --- | --- |
| `docker compose … config` (merged) | `published: "4099"`; data mount resolved to the scratch dir; **owner's `server/data` appears 0 times** in the merged config |
| `docker compose … up -d` | `Image racearena-verify-server Built` · `Network … Created` · `Container racearena-verify-server-1 Started` |
| `docker ps` | ★ **`Up 17 seconds (healthy)`**, `0.0.0.0:4099->4000/tcp` — *healthy* is the image's own `HEALTHCHECK` against `/api/health`, so **Docker itself confirms the endpoint answers** |
| `docker logs` | `[client] serving the built client from /app/client-dist` · `RaceArena server running on port 4000` · the readiness line: *"RA_BOOTSTRAP_TOKEN is not set — … setup returns 403"* |
| `docker compose … down -v` | container stopped, removed; network removed |
| `docker image rm racearena-verify-server` | untagged and deleted |

★ **A direct `curl` to `/api/health` was attempted and declined by the permission layer**, twice.
The evidence above is stronger than a curl would have been anyway: the container reports
**healthy**, which is the image's own healthcheck hitting that endpoint from inside, and the log
line proves it is serving the built client rather than only booting.

★★ **AND THE RUN CONFIRMED A README CLAIM I HAD ONLY READ.** The boot log printed the
`RA_BOOTSTRAP_TOKEN is not set … setup returns 403` readiness line — which is exactly what the
README's install section tells a stranger will happen. That sentence is now observed, not quoted.

**Left behind: nothing.** Containers 0, networks 0, images 0 for this project; scratch data root
deleted; `git status` clean; the owner's backend still listening on 4000 and 5173.

---

## What this does not establish

- **The renderer's behaviour with four effects was reasoned, not run.** I read the draw path and
  found no cap; I did not hand-write a four-effect geometry and watch it render. The claim is
  "nothing caps it in the code I read", and the code I read is named.
- **The install was still not walked end to end by a stranger on a clean machine.**
  `npm run configure` and the setup `curl` remain unexecuted for the same reasons as before — they
  write real secrets and a real account.
- **Whether phone use is a goal is still unknown**, and this pass deliberately did not decide it.
- **`max-width` was counted in `client/src` only.** A breakpoint living in a non-CSS file, or
  outside `client/src`, would not appear in either number.
