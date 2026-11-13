# MORNING-GOING-ONLINE-PREP-1 — preparing the first online install (website mode)

**Branch:** `feat/going-online-prep`, from master `7dac27be` (2026-11-13). Nothing is merged.
**What the owner decided (2026-11-13), recorded in [docs/BACKLOG.md](../../docs/BACKLOG.md):**

- D1: website mode on the Contabo server, with no domain or certificate of its own.
- D2: the security contact address.
- D3: the website's legal pages in website mode.
- D4: off-server backup copies to OneDrive.
- D5: the SSH check, done once.
- D6: the first real install comes last.

Standalone at "/" is to stay exactly as today. At every fork in the work, today's standalone
behaviour is kept and the fork is noted below.

| Piece | State |
| --- | --- |
| 1 — SECURITY.md contact (D2) | **done** — `d89af282`, pushed |
| 2 — legal pages in website mode (D3) | **done** — `aed70694`, pushed |
| 3 — backup copies to OneDrive via rclone (D4) | **done** — `94fea1ba`, pushed; the OneDrive authorisation is the first run's |
| 4 — the GOING ONLINE row (D1, D6) | **done** — see below, pushed |
| END — verify, rebuild, servers | **done** — see *The end* below |

## Piece 1 — SECURITY.md

- SECURITY.md lists two channels: the e-mail first, then GitHub's private vulnerability reporting.
- D1-D6 are recorded, dated, at the head of BACKLOG's *Delivering to someone else* section.
- The SECURITY.md row moved to PART TWO.
- OPEN.md goes from four rows to three.
- CHANGELOG has a new entry.
- Guards: check-doc-links 0 dangling; check-index 0 unindexed; engine-reach none of 5 paths.

## Piece 2 — the facts found

**The race (master `7dac27be`):**

- **The footer, the one component:** `client/src/components/LegalFooter/LegalFooter.jsx`.
  - Before this piece, its router links went to `/legal-notice` and `/privacy`, each shown only when
    the operator had filled the text in (`hasText`).
  - It is drawn on:
    - the sign-in page: `client/src/screens/Auth/LoginScreen.jsx:41` (website mode) and `:132`
      (password form);
    - the join page: `client/src/screens/Join/JoinPage.jsx:207`;
    - the setup screen: `client/src/screens/SetupScreen/SetupScreen.jsx:1991`.
- **The race's own pages:**
  - the routes: `client/src/App.jsx:172-173` (`/legal-notice`, `/privacy`), public, outside
    `ProtectedRoute`;
  - the page: `client/src/screens/Legal/LegalPage.jsx`;
  - the text comes from the public `GET /api/settings/legal-pages` (`server/src/routes/settings.js:10`,
    `server/src/settings/legalPages.js`);
  - it is edited in Dev Screen → *Legal pages* (`client/src/screens/DevScreen/sections/LegalPagesSection.jsx`).
- The server serves no legal page of its own: it answers the app shell for every route.

**The website** (`seasonal-entertainment`):

- It was read only. It was cloned into `C:/tmp/ra-refs`, a scratch folder outside OneDrive, and fetched
  to master `0d61ce5`, which contains `da618e7`. Nothing was edited or pushed there.
- Its Imprint and Privacy are **info pages**:
  - `client/src/app/navigation.js:55-61`, `LEGAL_NAV`, links `/info/imprint`, `/info/privacy` and
    the disclaimer;
  - they are served by the route `info/:slug` (`client/src/app/App.jsx:105`);
  - the two slugs are seeded as drafts (`server/src/info/seed.js:32-37`);
  - the sidebar draws the links (`client/src/app/Sidebar.jsx:196`).
- The website runs at the origin's root, so from the race these are root paths on the same origin.
- **`docs/GAME-INTEGRATION.md` and `docs/EMBED.md` say nothing about a game's legal pages.** Searched
  for legal, imprint, privacy and footer: the only hit is EMBED.md:16, about the chat page having no
  footer. Nothing says a game must not duplicate them, so **the race's routes redirect** rather than
  answer 404.

## Piece 2 — what was built

- **`client/src/modules/legal/websiteLegalPages.js`** (new, 25 lines) is the one home of the
  website's two paths (`WEBSITE_LEGAL_PATHS`).
- **`LegalFooter.jsx`** (64 → 85 lines) branches on `SITE_MODE` (the existing helper,
  `modules/runtimeMarker.js`):
  - website mode: two plain `<a>` links to `/info/imprint` and `/info/privacy`, ALWAYS shown. A
    router link would put the base path in front.
  - standalone: the old two links, unchanged.
- **`LegalPage.jsx`** (57 → 93 lines) uses the same dispatch pattern as `LoginScreen.jsx`:
  - website mode: `window.location.replace(<website page>)`, with a fallback link;
  - standalone: `OwnLegalPage`, the old body unchanged.
- **`App.jsx`:** the comment only (182 → 184 lines).
- **`scripts/website-standin.mjs`** (368 → 396 lines) has placeholder pages at `/info/imprint` and
  `/info/privacy`. It imports the paths from the one home, and the pages carry no legal text.
- **`docs/OPERATOR-GUIDE.md`:** one paragraph on website mode.
- **CHANGELOG:** one entry.
- **BACKLOG:** a note under D3.
- Nothing removed, nothing moved out.

**Tests (both modes):**

- `LegalFooter.website.test.jsx` (new, 6 tests).
- `LegalPage.website.test.jsx` (new, 5 tests).
- One footer test each added to `LoginScreen.website.test.jsx` and `JoinPage.website.test.jsx`.
- `standin.integration.test.js` adds 1 test (13/13).
- `LegalFooter.test.jsx` and `LegalPage.test.jsx` (the standalone pins) are unchanged and pass.
- Legal, auth and join files together: 10 files, 63 tests green.

**Sabotage:**

1. The website branch broken (`SITE_MODE === 'SABOTAGE'`) → 6 website tests red, every standalone
   test green.
2. Website forced everywhere (`!==`) → 13 standalone tests red, including the unchanged
   LegalFooter.test.jsx and LegalPage.test.jsx.

Both were restored by the reverse edit and re-run: 27/27.

**engine-reach:** none of 11 paths can reach the engine; no fingerprint check runs.

## Piece 3 — the copy off the server (D4)

**What was built:** `racearena backup-copy setup|status|test|fetch`, in `deploy/racearena` (729 →
1017 lines).

- **The section header** says how the copy works and where the password goes.
- **`setup`:**
  1. installs rclone with `apt-get install rclone`, from the distribution's signed repository. That
     is the pinning: the distribution's release fixes the version (Debian 12: rclone 1.60).
  2. **the OneDrive:** the owner runs `rclone authorize "onedrive"` on his PC and pastes the token,
     which is never shown, and rclone creates the remote.
  3. **the crypt layer:**
     - the password is generated and written with umask 077 to
       `/etc/racearena/backup-copy/crypt-password` (0600).
     - it is obscured through standard input, never on a command line.
     - `rclone.conf` is 0600 too, built under a temporary name, so an interrupted setup does not count
       as set up.
     - the password is shown ONCE, only on `/dev/tty`, with "store it safely"; the owner types `saved`
       and the screen is cleared.
     - with no terminal it is not shown at all, and setup says where to read it once.
  4. a test copy is written and read back; if it fails, the copy is not switched on.
- **Options:** `--existing` types in an earlier install's password (a new server reading the old
  copies); `--local <dir>` copies to a directory instead of the OneDrive (a second disk, and the test).
- **After every `racearena backup`:**
  - the daily timer's command, an update's and an uninstall's backup all copy the archive and its
    `.sha256`, then prune the copy at 14 days.
  - a failed copy never fails the backup: it is said, and written to the journal under
    `racearena-alert`.
- **`status`, `test` and `fetch`:**
  - `status` lists the copy itself and fails when the newest copy is older than 2 days, when the copy
    is empty, or when it cannot be read.
  - `racearena status` gets a copy section only once setup has run. It reads the server's own record
    (`state/last-copy`), not the OneDrive: the 10-minute alert timer runs it, and a short outage is
    not a stale copy.
  - `test` is the setup's round trip.
  - `fetch <archive>|--newest` brings an archive back, checked against its checksum, for
    `racearena restore`.
- **Reused:** `state_get`/`state_set`, `require_installed`, `say`/`die`, `restore`.
- **Moved out:** two helpers, `archive_stamp` and `backup_cutoff`, were taken out of
  `prune_backups`, which now uses them, so the disk and the copy age a backup by the same rule.
  Nothing was removed.
- **Other files:**
  - `deploy/install.sh` (770 → 771): both closing texts name `racearena backup-copy setup`.
  - `deploy/systemd/racearena-backup.service` (10 → 12): a comment.
  - `docs/VPS-INSTALL.md` (191 → 224): the table row and *The copy off the server — on the first
    run*: the four steps, saving the password, getting a copy back on a new server.
  - `docs/OPERATOR-GUIDE.md` (598 → 605).
  - `docs/BACKLOG.md`: the backup row stays OPEN, and says it is built and that the first run does the
    OneDrive authorisation and the first real copy.
  - OPEN.md and CHANGELOG.

**The test:** `deploy/test/backup-copy-check.sh`, new, 187 lines.

- It runs in a throwaway Debian 12 container, the image `hardening-check.sh` uses.
- It uses the real racearena, and the real rclone installed by the setup itself.
- A local directory stands in for the OneDrive.
- `docker` is a stand-in that writes and unpacks real tar archives of the data folder.

**Result: 39 of 39.**

| Section | What it shows |
| --- | --- |
| 1. no setup | nothing changes: no copy, no rclone, no folder, no status section |
| 2. setup | rclone installed; files 0600 root; a crypt remote; the password not in any output; the test copy read back; a second setup refused |
| 3. a backup | copied; stored not readable as a tar; no plain name; not equal to the archive |
| 4. the read-back | fetch from an empty backups folder, checked; identical; `racearena restore` brings the data back; a damaged copy refused |
| 5. retention | 20 days pruned and said; 13 days kept |
| 6. status | fresh passes; stale warns (both status commands); empty warns |
| 7. a new install | the same password opens the copy and reads the archive as a tar; a wrong password does not |

**Sabotage:**

1. `type = crypt` changed to `alias`: 6 FAIL, all encryption checks and the new-install reading.
2. The copy's retention set to 400 days: 2 FAIL, the pruning.

The sabotage files were deleted afterwards. `shellcheck -S warning` on racearena and the check: clean.

**Not tested here:** the OneDrive authorisation (`rclone config create … onedrive token …`). It needs
the owner's Microsoft account, and it is the first real run's (D6). Also not tested: the `--existing`
prompt, which needs a terminal. Section 7 rebuilds the same layer, the way setup writes it.

## Piece 4 — the GOING ONLINE row (D1, D6)

The row is rewritten at its head:

- the first run is the website-mode install on the website's Contabo server, with no domain or
  certificate of its own, coming last.
- what that run must do, in order:
  1. install;
  2. sign in through the website;
  3. the D5 SSH check, once;
  4. the backup-copy setup;
  5. the pre-exposure bar, still open.
- its verify line.
- **Struck, not deleted:** buying a domain, the race's own certificate, "his word plus a purchase",
  "the domain itself", and ufw, the DNS check and the real certificate for this run.
- The standalone path stays documented as available.
- The SSH HARDENING row gets the D5 note. OPEN.md is aligned; the count stays three, and its PART ONE
  range is corrected.

## Forks (each kept as today)

4. **The SSH HARDENING row stays open.**
   - D5 makes it a one-time check on the first run. Its verify line is that check, so closing or
     folding it into GOING ONLINE waits for the run.
   - `racearena harden-ssh` stays.
5. **The copy uses one crypt password**, with no second salt password, so the owner keeps one secret.
   - File names and folder names are encrypted.
   - Filename encryption is rclone's default, `standard`.
6. **`racearena status` judges the copy from the server's own record, not by asking the OneDrive.**
   `racearena backup-copy status` asks the OneDrive itself.

1. **The Dev Screen's *Legal pages* editor stays in website mode.**
   - The texts edited there are not shown in website mode, and the operator guide says so.
   - Hiding the editor was not asked for.
2. **The link labels stay the race's own ("Legal notice", "Privacy policy").** The website calls them
   "Imprint" and "Privacy".
3. **The website's third legal link, "Not financial advice", is not added to the race's footer.** D3
   names the legal pages; the race never had a disclaimer.

## Noticed, left

Nothing.

## The end

**Verify: one run of the branch diff against master `7dac27be`.** 20 passed, 4 failed, 14 skipped.
The machine was at 100 % CPU all through it: another project's sessions were running their own
verify, browser tests and linters.

- **ceremony-counts — a real finding, fixed.** The new `client/src/modules/legal/websiteLegalPages.js`
  is a `modules/` file outside the hull, so the generated counts in `docs/SHIP-CEREMONY.md` moved:
  90 → 91, and 33 → 34. They were regenerated (`gen-ceremony-costs --counts`) and committed as
  `4f0a8ebf`; `--check-counts` agrees, and the hull stays 232.
- **script-suite** failed on `gen-ceremony-costs.test.mjs`, the same stale count. Alone, after the
  fix: 7/7.
- **client-suite:** vitest could not start its workers for two parity files ("Timeout waiting for
  worker to respond") under the load. Neither file was touched. Alone: 2 files, 6/6.
- **server-suite:** `src/website/websiteMode.integration.test.js` timed out at 5 s. No server code
  changed on this branch.
  - Alone, the first time, still under the other sessions' load: red, the same timeouts.
  - Alone, once more after the installer test: 12/12.

**Engine-reach:** no changed file is in the hull, so no fingerprint check ran and none moved.

**The standalone installer test** (`deploy/test/e2e-local.sh`): **79 of 79.**

- Run on A = `9c6edaba`, from a fresh clone of the URL in `C:/tmp`; the later commit only regenerates
  doc counts.
- B, C and D were throwaway local refs, cherry-picked from the previous run's test commits and never
  pushed.
- No container of the stack is left, and the scratch clone is deleted.

**Running, hidden, on the branch head, with the client rebuilt there.** Every badge reads
**`4f0a8ebf · feat/going-online-prep`**, clean:

- the standalone dev server: http://localhost:5173/, with the API on 4000;
- the website-mode instance on 127.0.0.1:4791 under `/games/race`, behind the stand-in at
  **http://127.0.0.1:4790/**.

**Checked in a browser:**

- Through the stand-in, the sign-in page's footer links "Legal notice" to `/info/imprint` and
  "Privacy policy" to `/info/privacy`, and the stand-in answers both with its placeholder.
- `/games/race/privacy` lands on `/info/privacy`.
- At 5173 the footer links the race's own `/legal-notice` and `/privacy`, as before.

Nothing is merged.
