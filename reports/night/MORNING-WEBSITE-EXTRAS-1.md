# MORNING-WEBSITE-EXTRAS-1 — open registrations on the website (7a) and the website chat (7b)

**Branch:** `feat/website-extras`, from master `dcc9a250` (2026-11-12). **Nothing is merged.**
**What the owner decided (2026-11-11):** OWNER-4: open race registrations appear on the website's
home and games page, for registrations the director marks "show on the website". OWNER-5: the
website chat appears on the join page and the director's registration list, NOT on the race screen.
Everything is website mode only; standalone at "/" stays exactly as today, its CSP included.

**References, read-only** (cloned into C:/tmp/ra-refs, nothing edited there): the website
`seasonal-entertainment` master `72aac53` (contains `da618e7`), `seasonal-bingo-royale` `f655df9`,
`seasonal-mini-games` `67306ff`.

| Piece | State |
| --- | --- |
| 7a — open registrations for the website (OWNER-4) | **done** — `37c75e42`, pushed |
| 7b — the website chat (OWNER-5) | **done** — `1feefcce`, pushed |
| the stand-in's open-rounds page and chat placeholder (the owner's look) | **done** — see below |
| real-website check (nginx) | **done** — see below; proofs 7 and 8 pass, two NOT DRIVEN |

## Follow-up 4: no browser-drawn control left (the owner's decision of 2026-11-13)

**The owner, 2026-11-13:** style every remaining browser-drawn control in the app, starting with
the ones noted under follow-up 3 (the Dev Screen's menus, the Setup screen's branding menu); further
raw controls found may be fixed too. A visual change only, in both modes; he looks before anything
is merged.

**How the inventory was made.** A scanner read every `<button>`, `<select>`, `<input>` and
`<textarea>` in `client/src` (402 tags, tests excluded, uncapped). For each it resolved the
class against the stylesheet the file imports, and kept the ones with neither a class that sets a
background, border, `appearance`, `accent-color` or `composes`, nor an inline look. Each hit was
then read by hand. The app has no global control style (`styles/main.css` resets margins only), so
an unstyled control is drawn by the browser. A dark menu with no `color-scheme: dark` counts as
browser-drawn too: its arrow and its opened list are the browser's, white with the field's light
text. That is what "the Dev Screen's menus" were: their fields are styled, their lists are not.

Line numbers are at `72246385`.

**Found: 31 controls.**

| # | Control | file:line | Screen | What was wrong | State |
| --- | --- | --- | --- | --- | --- |
| 1 | Branding menu | `SetupScreen.jsx:1226` | Setup, header on every tab | its own inline look, browser list | **styled**, group 1 |
| 2 | Racer-type menu | `SetupScreen.jsx:1397` | Setup, Track tab | browser list | **styled**, group 1 |
| 3–4 | Quick Test's racer and name-set menus | `SetupScreen.jsx:1787`, `:1835` | Setup, Quick Test (test aids) | see-through field, browser list | **styled**, group 1 |
| 5 | "Dismiss" | `components/SeedRedeliveryNotice.jsx:93` | Setup, the redelivery banner | raw button | **styled**, group 1 |
| 6–13 | Eight menus on `.select` | `RaceHistory.jsx:385`, `SurfaceClassManager.jsx:159`, `:469`, `TrackManager.jsx:498`, `UserManagementSection.jsx:281`, `:298`, `:412`, `:430` | Dev Screen | browser list | group 2 |
| 14–16 | Three menus on `.input` | `CameraAdvancedSection.jsx:754`, `DynamicsTuningSection.jsx:821`, `:1384` | Dev Screen | browser list | group 2 |
| 17 | Transition-grammar menu | `CameraAdvancedSection.jsx:434` | Dev Screen, camera | raw menu | group 2 |
| 18 | State-overlay duration | `CameraAdvancedSection.jsx:2078` | Dev Screen, camera | raw number field | group 2 |
| 19 | Camera slider rows | `CameraAdvancedSection.jsx:237` | Dev Screen, camera | raw range | group 2 |
| 20 | Shared slider | `DevScreen/components/RangeSlider.jsx:15` | Dev Screen, branding and surface classes | raw range | group 2 |
| 21–22 | "Export race config", "Refresh" | `ConfigExportSection.jsx:69`, `:82` | Dev Screen | raw buttons | group 2 |
| 23 | Lights style menu | `TrackEditorToolbar.jsx:167` | Track editor | raw menu | group 3 |
| 24 | Lights speed | `TrackEditorToolbar.jsx:191` | Track editor | raw range | group 3 |
| 25 | Load menu | `TrackEditorSaveBar.jsx:92` (`.loadSelect`) | Track editor | browser list | group 3 |
| 26–27 | Effect menus | `EffectConfig.jsx:110`, `:138` (`.select`) | Track editor | browser list | group 3 |
| 28 | Racer-type menu | `RacerMetadataPanel.jsx:141` (`.select`) | Racer editor | browser list | group 3 |
| 29–30 | Track and racer-type menus | `DistributionDiagnostics.jsx:263`, `:294` | Distribution diagnostics | browser list | group 3 |
| 31 | Runtime slider | `DistributionDiagnostics.jsx:320` | Distribution diagnostics | raw range | group 3 |

**Left, with the reason:**
- **Checkboxes and radio buttons (37):** native by the owner's rule. The scanner cannot tell
  whether one sits beside text in a font of its own, as "Show on the website" did, and I did not
  read all 37 for it; none of the ones read for this follow-up does.
- **Colour pickers (6):** `BrandingProfiles.jsx:423`, `:452`, `SurfaceClassManager.jsx:113`,
  `TrackManager.jsx:372`, `RacerMetadataPanel.jsx:77`, `TrackEditorToolbar.jsx:143`. Their frames
  already carry an inline app look; the picker inside is the browser's, by the rule.
- **Hidden file inputs (4):** `BrandingProfiles.jsx:496`, `SystemSettings.jsx:127`,
  `TrackEditorSaveBar.jsx:52`, `SpriteGeneratorPanel.jsx:302`. They are `display: none` or
  `hidden`; each is opened by a styled button, so nothing of them is drawn.
- **Never rendered (5):** `components/Button`, `ColorPicker`, `InputField`, `Modal` and
  `LogoUploader` are imported by no file. Their BEM classes (`btn`, `modal__close`, …) have no
  stylesheet. They are dead code, not a drawn control; left for a cleanup of its own.
- **The race canvas:** no control is drawn on it. The race screen's DOM overlays (camera log, perf
  log) already carry inline looks.
- **engine-reach:** none of the files touched or considered reaches the race engine, so none was
  left for that reason.
- **Read and found styled** (false hits of the scanner): `LegalPagesSection.jsx` (its fields and
  buttons take `s.textarea` and `s.btn` by spread props), `ErrorBoundary.jsx` (a style object),
  `SubCard.jsx`'s Reset (a text button by design), a comment in `RangeSlider.jsx`.

### Group 1 — the Setup screen

**Classes reused** (`SetupScreen.module.css`):
- The branding menu is **`.brandingSelect` = `playerInput`** by `composes`. It keeps the header's
  compact size it had inline (0.8rem, 0.15rem 0.4rem), its `min-width: 0` (AUDIT-1 A8-03) and
  `margin-left: auto`, and does not grow (`flex: initial`). Its border becomes `playerInput`'s
  `#2a2a35` and its focus edge the screen's red.
- The racer-type menu and Quick Test's two menus keep their inline look and add
  **`colorScheme: 'dark'`**, the date field's own property.
- "Dismiss" is **`quickTestBtn`**, by import. On the banner's dark amber tint its #888 text is about
  4.9:1.

**Tests:** the Setup screen folder and the notice, 19 files, 217 green.
- New in `SetupScreen.test.jsx`: the branding menu carries `.brandingSelect` and `playerInput`;
  the three menus are `colorScheme: dark`; a sweep finds no menu or button on the screen without a
  class or an inline look.
- New in `SeedRedeliveryNotice.test.jsx`: Dismiss carries `quickTestBtn`.

**Sabotage, red and then restored:**

| # | Mutation | What went red |
| --- | --- | --- |
| S | the branding menu without its class | the new Setup test |
| N | Dismiss without `quickTestBtn` | the notice's dismiss test |

**Hygiene** (lines before → after): `SetupScreen.jsx` 1999 → 1996, `SetupScreen.module.css` 724 → 743,
`SeedRedeliveryNotice.jsx` 98 → 107, `SetupScreen.test.jsx` 753 → 790,
`SeedRedeliveryNotice.test.jsx` 69 → 75. Removed: the branding menu's inline style. Moved out:
nothing. Noticed but left: the diagnostics screen's route is `/diagnose-verteilung`, a German path
(`App.jsx:150`); changing a URL is not styling.

## Follow-up 3 after the owner's approval of `076e5fc2` (2026-11-13)

**The owner, 2026-11-13:** the look of `076e5fc2` is approved. He asked that the two raw spots
noted under follow-up 2 ("noticed but left") be styled too, before the merge. A visual change only,
in both modes; he looks before anything is merged.

**The classes reused** (`SetupScreen.module.css`, by CSS-module `composes`):

| Spot | Class | Notes |
| --- | --- | --- |
| The form's track menu and event-name field | `.fieldInput` = `playerInput` | the date field's input; same padding, font and border, so the same height. The date field's own `color-scheme: dark` keeps the menu's arrow visible and its list dark |
| The full-screen QR stage's Close, Copy QR code and Download QR | `.stageButton` = `quickTestBtn` in its own hover colours | `quickTestBtn` at rest is `--color-muted` (#888) on the stage's white, 3.5:1, below 4.5:1. The app has no dark-on-light variant, so the closest existing style is the same button as it looks under the pointer: `--color-surface` background, `--color-text`, the `#444` edge |

No new colour or size. The stage's white page is unchanged, so the code stays scannable.

**Tests:** `RegistrationPanel.test.jsx` and `RegistrationPanel.website.test.jsx` 29/29 green.
- New: the track menu and the event-name field carry `playerInput`.
- New: the stage's three buttons carry every name of `.stageButton` and `quickTestBtn`.

**Sabotage, each red and then restored:**

| # | Mutation | What went red |
| --- | --- | --- |
| G | the track menu without `.fieldInput` | the form test ("sends the track…") |
| H | the stage's QR buttons without `buttonClassName` | the stage test |

**engine-reach --check:** none of the 4 paths can reach the engine; no fingerprint.
**OPERATOR-GUIDE:** unchanged; it names these controls but not how they look.

**Hygiene** (lines before → after): `RegistrationPanel.jsx` 718 → 731,
`RegistrationPanel.module.css` 353 → 374, `RegistrationPanel.test.jsx` 416 → 431.
Removed: nothing was made dead (`.stageExit` still places the Close). Moved out: nothing.
Noticed but left: the app's other raw `<select>`s (Dev Screen, Setup screen's branding menu) are
outside this panel.

## Follow-up 2 after the owner's look at `fb276fc7` (2026-11-13)

**What the owner saw, 2026-11-13:** the "Chat" button was an unstyled browser button in an empty
box, and opening the chat must keep everything inside the window, without scrolling. The
registration detail's controls were raw browser buttons and must look like the rest of the app.
A visual change: he looks before anything is merged.

**The classes reused.** The app has no global button class; each screen styles its own. This
panel is on the Setup screen, so it takes the Setup screen's own (`SetupScreen.module.css`),
by CSS-module `composes`:

| Use | Class | From |
| --- | --- | --- |
| Every ordinary button: Close now, the four Extend buttons, Extend until, Copy link, Copy QR code, Download QR, Show QR full screen, the list's "Open" on each card, and the Chat button | `quickTestBtn` | the Setup screen's secondary button, the outline button beside Start Race |
| The panel's × close | `removeBtn` | the Setup screen's remove-a-player × |
| Delete registration | `quickTestBtn` in the panel's existing `--color-primary`, its hover `#1f0e10` | the Setup screen has no danger button, so this is the brief's fallback, the secondary style in the error colour. It draws the Dev Screen's `btnDanger` red outline without importing the Dev Screen's stylesheet |
| The date field | `playerInput` | already in use (`DeadlineField.jsx:38`), unchanged |
| A disabled "Extend until" | the panel's own `.primary:disabled` values (opacity 0.5) | `quickTestBtn` has no disabled state |

No new colour or size.

**The chat as a side panel** (`components/WebsiteChat`):
- The button sits on its own, with no box: centred under the card on the join page, at its natural
  width on the registrations.
- Open: an `<aside>` "Chat", `position: fixed` to the right edge, `100dvh` high,
  `min(24rem, 100vw)` wide, with a header ("Chat", × "Close chat") and the frame filling the rest.
  Being fixed, it takes no room, so the page neither moves nor scrolls because of it.
- Below **768px**, the panel covers the whole window. That width is ResultScreen.css's "Mobile
  responsiveness", the only width query the app names for phones. The race screen's single-column
  640px and the Dev Screen's 900px tablet bar were the other candidates.
- Escape, the × and the Chat button each close it. Focus goes to the × on open and back to the Chat
  button on close; the button has `aria-expanded` and `aria-controls`.
- The frame exists only while open, and nothing is stored. The screens are the same, and the
  importers source test stays.

**The registration controls:**
- Behaviour, labels, order and test ids are unchanged.
- "Close now" now stands on its own row, and the "Extend:" buttons form one wrapping row.
- The "Extend until" row aligns to the top, so the button stands level with the date field, not
  with the middle of the field and its hint.
- `QrShareButtons` gains `buttonClassName`.
- The join page's other controls were already styled (`.join`, `.input`); only its Chat button
  was raw.

**Tests** (WebsiteChat, QrShareButtons, JoinPage and RegistrationPanel, each in both modes):
6 files, 54 tests, green. They were run serially with a 20 s per-test limit because the machine was
loaded. Two tests that time out at 5 s under load passed alone at the default limit.
- New: the closed button carries `quickTestBtn` and stands alone.
- New: the panel, its fixed class, the header and the ×, with focus on open; the ×, Escape and the
  button each close it, with focus back.
- New: the `.panel` rule, read from the stylesheet: fixed, `100dvh`, `min(24rem, 100vw)`, and
  `100vw` at 768px.
- New: every named detail button carries `quickTestBtn`; Delete also carries `.danger`; the date
  field carries `playerInput`; no button in the view is without a class; each card's "Open"
  carries `quickTestBtn`.

**Sabotage, each red and then restored:**

| # | Mutation | What went red |
| --- | --- | --- |
| A | the panel not fixed | the `.panel` rule test |
| B | Escape ignored | the Escape test |
| F | no focus into the panel | the open test |
| C | Delete without `.danger` | the buttons test |
| D | "Close now" a raw button | the buttons test |
| E | `QrShareButtons` ignoring `buttonClassName` | the buttons test |

**Docs** (living sentences found by an uncapped grep of the tree):
- `docs/BACKLOG.md`: 7a is "ON by default since 2026-11-13", and 7b is behind a button in a side
  panel.
- The `registrationStore.js` header: "1 unless the director unticked it".
- This sheet's look instructions, and the 7a "what was built" lines, which now say "as built" and
  "since the follow-up".
- OPERATOR-GUIDE: the chat panel, and Delete as the red one among the restyled buttons.
- The only other "off by default" hit, in OPEN.md, is about `RA_RACES_WAL`, not this choice.
- This sheet: the "7a — the facts, read BEFORE building" heading, which follow-up 1's edit
  replaced and did not put back (my error, in `fb276fc7`), is restored.

**Hygiene** (lines before → after):

| File | Lines |
| --- | --- |
| `WebsiteChat.jsx` | 84 → 126 |
| `WebsiteChat.module.css` | 27 → 66 |
| `WebsiteChat.test.jsx` | 117 → 183 |
| `QrShareButtons.jsx` | 46 → 53 |
| `RegistrationPanel.jsx` | 701 → 718 |
| `RegistrationPanel.module.css` | 319 → 353 |
| `RegistrationPanel.test.jsx` | 375 → 416 |
| `JoinPage.jsx` | 209 → 210 |
| `JoinPage.module.css` | 130 → 130 |
| `registrationStore.js` | 673 → 674 |

- **Removed:** the chat's box (`.chat` in `WebsiteChat.module.css`), the join page's `.chat`
  column rule (now `.chatButton`), and the frame's fixed `32rem` height (it fills the panel).
- **Moved out:** nothing.
- **Noticed but left:**
  - The full-screen QR stage's "Close" (`.stageExit`) and its two QR buttons stay raw on its white
    page. It is drawn for a room, the brief named the detail's controls, and the stage passes no
    `buttonClassName`.
  - The form's track `<select>` and event-name `<input>` are browser-drawn too; the brief named the
    date field only.
  - `docs/AUTH.md`'s chat paragraph says "a Chat button that frames, only once clicked"; that is
    still true and names no placement.

## The follow-up after the owner's look (2026-11-13)

**The owner's decisions, 2026-11-13**, after his look at `30d6dd7c`:
1. **"Show on the website" is ON by default.**
2. **The chat sits behind a "Chat" button, closed until clicked**, as Seasonal Bingo Royale does it
   (its `apps/web/src/shell/ChatDock.tsx:5-14`), on the same screens as before. A trial: he may ask
   for a different placement after seeing it.

**What changed (one commit on this branch, nothing merged):**

- **The checkbox.** The size difference he saw had one cause. Both the checkbox and the "Who may join"
  radios already used `.choice`, but the radios' **0.85rem** comes from the `.durations` fieldset
  around them (`RegistrationPanel.module.css:29-37`), and the checkbox stood outside it at the page's
  own size. Now it sits in a `.durations` group with its `.choice` label, so the font, size and spacing
  are the radios'. The label is shortened to "Show on the website", and its explanation is a `.muted`
  hint below ("The website's home page and games page list it while it is open."), the place count's
  style. The form starts **ticked**. The server's default for a website-mode create without the
  field is now **true** too (`server/src/routes/registrations.js`), so the form and the API agree.
  Registrations opened before keep their stored value. Standalone is unchanged: no box, and the field
  is still refused (`registrations.test.js` "standalone: no Show on the website", green as it was).
- **The chat.** `WebsiteChat` is now a **Chat** button, the race's plain secondary `<button
  type="button">` (as "Copy link" and "Show QR full screen" are drawn), with `aria-expanded` and
  `aria-controls`. The frame is **not in the DOM until clicked**, so nothing of the website's chat loads
  before the click. The same button closes it, which removes the frame. Nothing is stored, so every
  visit starts closed. The screens are the same: the join page, and the director's registration list
  and detail, not while the QR stage is up. The source test that limits the importers to those two
  files stays.
- **openRounds.js** header: `players` is the COUNT (`reg.taken`), not "names registered so far".

**Forks:**
- **F-1. The button style on the join page.** The join page's only button style is its full-width
  primary `.join` ("Join"). I used the race's plain secondary button on both screens, so that "Chat"
  does not compete with "Join".
- **F-2. Where this differs from Bingo**, by the owner's words: Bingo remembers open/closed per browser
  and keeps the frame hidden once opened; here nothing is stored and closing removes the frame. Bingo's
  side panel or drawer is not copied: the placement stays 7b's.
- **F-3. `loading="lazy"` dropped.** The frame now exists only after a click, so it loads at once.

**Tests.** Client: WebsiteChat, JoinPage (standalone and website), RegistrationPanel (standalone and
website): 5 files, 46 tests, green. Server: openRounds.integration, registrationStore, the
registrations route and standin.integration: 5 files, 57 tests, green.

**Sabotage, each red and then restored:**

| # | mutation | red |
| --- | --- | --- |
| S1 | the server default back to off | openRounds "stores it SHOWN unless unticked" |
| S2 | the form default back to off | 2 panel tests |
| S3 | the chat open by default | 6 tests across 3 files |
| S4 | the button opens but never closes | "the same button closes it again" |
| S5 | the mode guard removed (standalone draws the button) | 3 standalone tests |
| S6 | the checkbox outside the `.durations` group | "drawn as the Who may join choices" |

**Hygiene.** `WebsiteChat.jsx` 58 → 84; `WebsiteChat.module.css` 31 → 27; `WebsiteChat.test.jsx`
87 → 117; `RegistrationPanel.jsx` 688 → 701; `RegistrationPanel.website.test.jsx` 187 → 209;
`RegistrationPanel.test.jsx` 373 → 375; `JoinPage.jsx` 208 → 209; `JoinPage.test.jsx` 165 → 166;
`JoinPage.website.test.jsx` 120 → 123; `registrations.js` 213 → 213; `openRounds.js` 83 → 84;
`openRounds.integration.test.js` 258 → 259.
- **Removed:** `.title` in `WebsiteChat.module.css` (the button names the chat now) and the frame's
  `loading="lazy"`.
- **Kept, not dead:** `.choice` is still the radios' class and now the checkbox's too.
- **Moved out:** nothing.
- **Noticed but left:** the `docs/BACKLOG.md` row still says "off by default" in its description of
  piece 7a (`:1932`); the brief said the row stays as it is. (Corrected in follow-up 2, above.)

## 7a — the facts, read BEFORE building

**The website's contract** (seasonal-entertainment `docs/OPEN-ROUNDS.md`):

- `:3-4` — the games say which rounds are open; the site shows them in the home page's
  "Featured game" box and on the games page. `:12` everyone sees them, signed in or not.
- `:13-14` — only rounds the host marked "show on the website"; **the game filters**, the site shows
  what the game lists.
- `:19` — `GET <status URL>`: **public, no login, JSON, `Cache-Control max-age=30`**.
- `:20-34` — the page: `{ "version": 1, "rounds": [ { id, title, kind, startsAt, signupClosesAt,
  players, maxPlayers, joinUrl } ] }` — id ≤ 64 chars stable per round, title ≤ 80, kind ≤ 40,
  startsAt / signupClosesAt ISO 8601 UTC or null, players integer ≥ 0, maxPlayers integer ≥ 1 or
  null, joinUrl **absolute https on the same origin as the status URL**.
- `:35` — **at most 20 rounds; only rounds whose sign-up is open now and that the host marked; no
  personal data (no player names).** Unknown fields ignored; a higher version ignored whole.
- `:40-42` — **where the URL comes from:** an admin types it, Admin → Games, "Sign-up status URL"
  per game (https only, ≤ 300 chars). The race does not register itself anywhere.
- `:43-47` — **who fetches, and when: the website's SERVER**, every 60 s and at once after an admin
  saves the game, through `server/src/previews/safeFetch.js` — https on port 443 only, public
  addresses only, no redirects, 5 s, ≤ 64 KB, JSON only (safeFetch.js:6-9, :39-40).
- `:48-53` — checked strictly (`server/src/games/openRoundsContract.js`): not the contract's page →
  failure; each bad round dropped on its own: text too long or empty (`:19-20`, `:30`), a time not
  ending in `Z` (`:22-23`, `:31`), counts out of range (`:24`, `:32`), joinUrl not https or not on
  the status URL's origin (`:39`), a sign-up already closed (`:40`); only the first 20 read
  (`:15`, `:69`).
- `:54-56` — the last good answer counts for 3 minutes (`openRounds.js:19-20`, POLL_MS 60 000,
  STALE_MS 180 000).
- `docs/GAME-INTEGRATION.md:29-36` — the race is the third embedded game; its slug is `race`.

**How Bingo serves it** (seasonal-bingo-royale, the reference the race follows):

- `apps/server/src/http/routes/openRounds.ts:77-85` — `GET <base>api/public/open-rounds`, rate
  limit 60 a minute per address, `cache-control: public, max-age=30`, `{ version: 1, rounds }`.
- `:49-59` — open now (lobby, not started, lobby window not closed), `show_on_website`, no test
  match, no bots; soonest first; `LIMIT 20`.
- `:63-74` — `id` = the match id, `title` cut to 80, `kind` = the game's name, `signupClosesAt` =
  the lobby's close, `players` / `maxPlayers` = counts, `joinUrl` = the lobby on the endpoint's own
  public address (`SBR_PUBLIC_URL`, else `https://<request host><base>`, `:81`).
- `:12-13` (header) — **standalone: the option does not exist and the list is empty.**
- `apps/server/src/db/migrations/0017_show_on_website.sql` — the per-match flag;
  `packages/contracts/src/http/openRounds.ts:19-33` — the same contract in zod.

## The end of the chain

**verify** (`--premerge --base=dcc9a250`, one run, while the rehearsal loaded the machine): **24 pass,
2 fail, 12 skip.** (1) `check-index` — a real finding: this sheet was not in `reports/night/INDEX.md`;
added, re-checked: 0 unindexed. (2) `server-suite` — `websiteJoin.integration.test.js` and
`websiteMode.integration.test.js` timed out in their 10 s setup hooks under load (the same two as on
2026-11-12); re-run alone once: 2 files, 19 tests, green — CI decides. Fingerprints: none moved, none ran
(no change reaches the engine).

**Standalone installer test** (`deploy/test/e2e-local.sh`, run because `deploy/test/real-site.sh` and
`real-site-race.sh` changed; nothing the installer itself runs changed): on `de3c194d`, from a fresh clone of
the URL, **79 passed, 0 failed**.

**For the owner's look** (started hidden on the branch head `de3c194d`, the client built there):

- standalone: **http://localhost:5173/** (API on 4000) — at "/" no checkbox, no chat, unchanged;
- website mode through the stand-in: **http://127.0.0.1:4790/** (the race on 127.0.0.1:4791 under
  /games/race) — pick **Hugo Host**, open a registration with **Show on the website** (on by default
  since 2026-11-13) and one with it unticked; **Open sign-ups, as the website shows them** on the stand-in's page lists the marked one
  and not the other; the chat frame (the stand-in's placeholder, naming the room) is below the
  registrations and below the join page, and not on the race screen.

Nothing is merged.

## 7b — the facts, read BEFORE building

**The website's embed** (seasonal-entertainment `docs/EMBED.md`):

- `:15-17` — `/embed/chat?room=<slug>&theme=<light|dark|auto>` shows only the chat, compact, no site
  header or footer. `:19` room: a room's slug, e.g. `race`. `:21-23` theme `auto` (the default) follows
  the site's own rule.
- `:24-26` — **room rules apply unchanged: a guest can read `general` but not `race` (members only)**;
  the frame then opens the guest's first room with "This room isn't available."
- `:33-37` — on the site's own pages the login state is the site's own: the session cookie applies as
  on any page; logging in is on the site's login page.
- `:45-49` — the race's row: room `race`, "Seasonal Race", **`/embed/chat?room=race&theme=auto`**.
  `:57-61` the race's room is the first-start room, members read and write.
- `:66-68` — framing: the games are under `/games/<slug>/` on the site's own domain, so its
  `frame-ancestors 'self'` lets them frame `/embed/chat`; nothing to approve.
- `:173-203` — the postMessage API (`ready`, `unread`, `resize` from the chat; `visible`, `theme` to it),
  each side checking origin, source and `data.source`. `:187-188` a host on another site must not send
  `no-referrer`.
- `:205-217` — **the snippet**: "the same for this site's pages (the race game) … a relative [src] on
  this site"; `<iframe id="se-chat" title="Chat" src="…/embed/chat?room=race&theme=auto"
  style="width: 100%; height: 32rem; border: 0">`.
- `docs/GAME-INTEGRATION.md:188-196` — the same embed URL for the race; `:198-202` **Required: allow the
  iframe in the game's `frame-src` CSP; keep a referrer (`strict-origin`) so Firefox can identify the
  parent**; validate messages; `:204-205` Bingo embeds the chat without the unread and visibility
  messages.

**How the reference games embed it:**

- Bingo `apps/web/src/shell/ChatDock.tsx:5-14` — website mode only, on the lobby, match screens and the
  host console, behind a "Chat" button (a side panel, a drawer on phones); the frame created on first
  open and kept; `:162` `<iframe className="chat-panel__frame" title="Chat" src={src}>`; it follows the
  game's theme. Standalone: no button, no frame, no request.
- Bingo `apps/server/src/http/plugins/securityHeaders.ts:33-34` — `'frame-src': ["'self'"]` ("the
  website's chat frame is on the same site; nothing else may be framed"); `:48` `referrerPolicy:
  no-referrer` for its pages. Mini Games `apps/server/src/http/plugins/securityHeaders.ts:76` the same
  no-referrer; its `frame-src` admits the website's room path (`apps/server/src/chat/provider.ts:119`).

## 7b — what was built

**Client.** `client/src/components/WebsiteChat/WebsiteChat.jsx` (new): renders NOTHING unless
`SITE_MODE === 'website'`; otherwise a "Chat" section in the app's panel tokens with `<iframe title="Chat"
src="/embed/chat?room=race&theme=auto" loading="lazy" referrerpolicy="strict-origin">`, full width, 32rem,
no border. Mounted in exactly two files: `JoinPage.jsx` (after `<main>`, in the page's centred column)
and `RegistrationPanel.jsx` (below the list and the form; below one registration's detail, **not while
the full-screen QR stage is up**).

**Server.** `server/src/csp.js`: `frame-src 'self'` in website mode only; `frame-ancestors 'none'` in both;
the mode resolved once.

**Tests.** `WebsiteChat.test.jsx` (new, 3): standalone renders nothing; website mode the exact
attributes; **by the source, exactly two files import it** (the join page and the registration panel —
so the race screen, the result screen and the start ceremony cannot draw it). `JoinPage.website.test.jsx`
+1 (framed below the card, after the form, outside `<main>`); `JoinPage.test.jsx` (standalone: none);
`RegistrationPanel.website.test.jsx` +2 (below the list after the form; on the detail, gone while the QR
stage is shown); `RegistrationPanel.test.jsx` (standalone: none). `csp.test.js` +3: **standalone's
header pinned byte for byte** to what master `dcc9a250` sent (captured before the change, with and
without a public origin), and website mode's `frame-src 'self'` with `frame-ancestors 'none'`.

**Sabotage, each RED then restored:** the mode check removed (3 red); `WebsiteChat` imported into
`RaceScreen/index.jsx` (1); the chat rendered beside the QR stage (1); the chat above the join form (1);
`frame-src` in every mode (2 — the pinned standalone headers); `frame-src` dropped in website mode (1).

**Reused:** `SITE_MODE` (runtimeMarker.js); the app's panel tokens (`--color-surface`, `--radius`,
`--color-muted`); the join page's centred column width; the piece-4 test harnesses. **Removed:**
nothing. **Moved out:** nothing. **Lines (before → after):** JoinPage.jsx 201 → 208, its CSS 123 → 130;
RegistrationPanel.jsx 680 → 688; csp.js 62 → 68; new WebsiteChat.jsx 58, its CSS 31, its test 87; tests:
csp 84 → 121, JoinPage 162 → 165, JoinPage website 107 → 120, panel 371 → 373, panel website 166 → 187;
docs: AUTH.md 446 → 457, OPERATOR-GUIDE.md 580 → 587; BACKLOG 7708 → 7712 and OPEN 541 → 538 (the 7a/7b
row to PART TWO). **Fingerprints:** none (`engine-reach --check`: nothing reaches the engine).

## The real-website check (nginx, fresh, 2026-11-12/13)

`deploy/test/real-site.sh nginx master`: the website at master **`72aac53`** (contains `da618e7`)
installed fresh by its own harness with RACE=yes, the race (`858413e3`) installed into it in website mode,
driven by curl through `https://example.org`. The rehearsal gained proofs 7 and 8 (`858413e3`); the
in-server driver gained `page` and `open-rounds-check`.

| # | proof | result |
| --- | --- | --- |
| 7a | a registration marked "Show on the website" is in the race's list, read with NO session through the website's proxy (`/games/race/api/public/open-rounds`) | pass |
| 7b | an unmarked one is not | pass |
| 7c | exactly the website's eight fields, kind "Seasonal Race", the join link on `https://example.org/games/race/join/<code>`, no player name | pass |
| 7d | **the website's OWN checker** (`parseOpenRounds`, its `server/src/games/openRoundsContract.js`, run in the site container on the fetched answer) accepts the marked round and not the unmarked | pass |
| 7e | unticking it takes it off the list | pass |
| 7f | the website's own poll and its home / games page showing it | **NOT DRIVEN** — its guarded fetch takes public addresses only (its `server/src/previews/safeFetch.js:59-63`, `ipPolicy.js:16`), and the harness's server is `10.77.0.10` (its `deploy/test/run.sh:87`). 7a–7d read exactly what that poll reads and judge it with the website's own code. Not a website defect: it is its SSRF guard working. |
| 8a | a signed-in member's join page: the race's CSP carries `frame-src 'self'` and `frame-ancestors 'none'` | pass |
| 8b | the race's built page frames `/embed/chat?room=race&theme=auto` (in its bundle) | pass |
| 8c | the website's embed answers that member (200) and lets the same site frame it (`frame-ancestors 'self'`) — so the race's CSP and the website's agree | pass |
| 8d | a browser drawing the frame inside the join page | **NOT DRIVEN** — no browser in this rehearsal; the client tests render it |

The proofs before them in the run all passed: install (3), 1a–1c, 2a–2e, 5a–5d.
**The run was stopped by me during proof 5 — my error.** The log file showed proof 1 for half an hour
while the run was in fact progressing (the output reached the file late), I took it for a hang and sent
SIGTERM; its exit trap removed the server and the website harness's containers. So **5e, 3, 4 and 6 did
not run in this chain**; none of them touches code this chain changed (they all passed fresh on
2026-11-12 in WEBSITE-EMBED-1's rehearsal, the same race paths), and the brief asked for 7 and 8 only.
**Website-side defect: none. Race-side defect: none.**

**Cleanup:** the harness's containers, volume, network and its server image are gone (the exit trap);
compared with the Docker state recorded before the run, nothing of it is left. **Not deleted (refused by
the permission system):** the scratch folder `C:/tmp/ra-rehearsal` (the race bundle and the website
clone) and the read-only reference clones in `C:/tmp/ra-refs`.

## The stand-in, for the owner's look (dev and test only, never in the image)

`scripts/website-standin.mjs` (286 → 368 lines; not in the image — server/Dockerfile copies three named
scripts and nothing else of scripts/): **`/_standin/open-rounds`** asks the race's
`GET <base>/api/public/open-rounds` from its own process, as the website's server does, and lists the
rounds as the website's home page and games page would (title, kind, places, closes at, Join) — linked
from the stand-in's page; **`/embed/chat`** is a placeholder that names the room it was asked for
(escaped), so the frame on the race's join page and registrations is visible. Its tests
(`standin.integration.test.js`, 249 → 285): +2 — a marked open registration listed and an unmarked one
not; the placeholder names the room and escapes markup. The ten existing tests unchanged and green.

## 7a — what was built

**Server.** `GET <base>/api/public/open-rounds` (`server/src/website/openRounds.js`, new), mounted in
`server/src/app.js` ONLY when `RA_MODE=website` and listed on `PUBLIC_PATHS` (`server/src/auth/guards.js`):
standalone has nothing there and answers the API's own 404. `{ version: 1, rounds }`, `Cache-Control:
public, max-age=30`, at most 20, soonest deadline first; each round exactly the contract's eight fields.
The registration store gains `show_on_website` (check-then-alter; NULL outside website mode),
`setShowOnWebsite` (team-scoped, open only, website-mode registrations only) and `openRoundsForWebsite`
(open now AND marked — never a name, entry, external id, team or internal id). The director's create
takes `showOnWebsite` in website mode (**false unless given** as built; **true unless given** since
the follow-up of 2026-11-13); `POST /api/registrations/:id/website
{ show }` toggles it (website mode only; in standalone it falls through to the API's 404). CSRF: the
global origin guard, as for every write.

**Client.** `RegistrationPanel.jsx`: one `ShowOnWebsiteBox` — on the create form (off by default as built; on since the follow-up of
2026-11-13) and
on an OPEN registration's detail — drawn only when `SITE_MODE === 'website'` (the runtime marker);
`registrationApi.js` sends `showOnWebsite` and gains `setShowOnWebsite`.

**Tests.** `server/src/website/openRounds.integration.test.js` (new, 10): public + max-age=30 +
version 1; a marked open one with EXACTLY the eight keys and the values (title, kind, Z time, counts,
joinUrl on the public origin with the base path); **no leak** — a member joined first, and the answer's
text contains neither their name, the entry id, the external id, the registration id nor the team; an
unmarked, a closed-early and an expired registration absent; the title cut to 80; create OFF unless
ticked; toggle on/off and the list follows; another team's id 404 and unchanged; closed 409; a member
without "may host" 401; standalone 404. `registrations.test.js` +2 (standalone refuses the field, the
toggle is no route); `registrationStore.test.js` (an older file gains the column, lists nothing);
`RegistrationPanel.website.test.jsx` +4 (off by default and sent; ticked sent as true; toggles on an
open one; none on a closed one); `RegistrationPanel.test.jsx` (standalone: no box, nothing sent).
Server suite 78 files / 1354 tests green.

**Sabotage, one per proof, each RED then restored:** route mounted in standalone (1 red); unmarked
listed (3); closed-early listed (1); expired listed (1); an extra field `eventName` in a round (1);
create defaulting to ON (1); toggle always setting on (1); toggle ignoring the team (1); client: box
ticked by default (2); box drawn in standalone (1 — **the first try stayed GREEN**: the standalone test
looked for the box only after the form had been replaced by the view; the assertion was moved before
the click, then red).

**Reused, not written again:** the join route's limiter factory (`createJoinLimiter`, its own
instance — 60 a minute, Bingo's number too); `resolvePublicOrigin` / `resolveBasePath`
(`runtimeConfig.js`) for the join link; the store's `rowById` / `isClosed` / `countOf` / `iso` and its
`refusal` codes (`answerRefusal` in the route); `unknownFields`; the panel's `styles.choice` and
`SITE_MODE` from `runtimeMarker.js`; the piece-4 test harness (`as()` sign-in through the website).
**Moved out:** the store's two copies of check-then-alter (`addRacedColumn`, `addWebsiteAccessColumn`)
now share one private `addColumnIfMissing`, which the new column uses too (both exports kept).
**Removed:** nothing. **Lines (before → after):** registrationStore.js 589 → 673; routes/registrations.js
187 → 213; app.js 172 → 177; guards.js 272 → 276; RegistrationPanel.jsx 642 → 680; registrationApi.js
120 → 133; new website/openRounds.js 83, its test 258; tests: store 348 → 355, routes 216 → 239, panel
366 → 371, panel website 116 → 166; docs: API.md 1363 → 1396 (81 → 83 routes, fourteen → fifteen
routers), AUTH.md 435 → 446, OPERATOR-GUIDE.md 572 → 580. **Fingerprints:** none —
`engine-reach --check` on all 16 paths: none can reach the race engine.

## Forks decided

*(updated after every piece)*

1. **7a: `id` is the registration's public CODE, not its internal id.** The contract needs a stable id
   (≤ 64); the internal id is team-internal (`toPublicView` never shows it), while the code is in the
   join link the website shows anyway — so it reveals nothing new.
2. **7a: `title` = "<event name> — <track>", or the track alone; `kind` = "Seasonal Race"; `startsAt` =
   null.** The contract has one title and no track field; the brief asks for track and event name. The
   race's name on the website is "Seasonal Race" (its EMBED.md:49). A registration has no start time
   (the director starts the race), and null is allowed (OPEN-ROUNDS.md:27).
3. **7a: standalone answers 404, where Bingo answers an empty list** (openRounds.ts:12-13). The brief
   says 404; it is also what "the endpoint exists only in website mode" means here.
4. **7a: a FULL registration stays listed** (players = maxPlayers) while it is open, as Bingo lists a
   full lobby (its query does not filter on places); the website shows the counts.
5. **7a: `joinUrl` origin** = `RA_PUBLIC_ORIGIN` (the installer sets `https://<SITE_DOMAIN>` in website
   mode), else `https://<request host>` as Bingo does (openRounds.ts:81). The local stand-in look runs on
   http, so its join links are http there — the website would drop those; the real check uses https.
6. **7a: the status URL is the website admin's to enter** (OPEN-ROUNDS.md:40-42): Admin → Games →
   "Sign-up status URL" = `https://<site>/games/race/api/public/open-rounds`. The race registers itself
   nowhere; OPERATOR-GUIDE says so.
7. **7a: rate limit = its own instance of the join limiter** (60 / minute / address) rather than sharing
   the join route's bucket, so a busy join minute never starves the website's poll and vice versa.
8. **7b: the chat sits BELOW the page, always there, not behind a button.** Bingo puts it behind a
   "Chat" button in a side panel; the brief places it "below the page's own content … without pushing
   the join form or the registration controls off a phone screen", which a section after the content
   does by construction. `loading="lazy"` instead of Bingo's created-on-first-open.
9. **7b: `referrerpolicy="strict-origin"` on the FRAME, the page headers unchanged.** The website
   requires a kept referrer (GAME-INTEGRATION.md:199); Bingo and Mini Games send `no-referrer` for their
   pages, as the race does (helmet's default). Putting it on the iframe alone meets the website's rule
   without touching standalone's headers.
10. **7b: no postMessage.** Neither `unread` nor `resize` is needed for a frame that is always shown at a
    fixed height; Bingo does not use them either (GAME-INTEGRATION.md:204-205). Nothing to validate,
    nothing sent.
11. **7b: `theme=auto`**, the URL the website's own table gives the race (EMBED.md:49). The race has one
    (dark) theme and no theme switch to follow.
12. **7b: not on the full-screen QR stage** — it is part of the registration's detail but is shown to
    an audience, so the brief's "not on any screen shown to an audience" wins there.
13. **BACKLOG: the 7a/7b row moved to PART TWO now** that both are built, as the brief says, marked
    unmerged; the merge is the owner's, after his look.
