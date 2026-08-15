# Night runs — the one line, and why each flag is there

**What this document owns:** how an unattended block is STARTED, so it finishes while the owner is
asleep instead of stalling on a dialog nobody is there to answer. The permission RULES are in
`.claude/settings.json`; this file owns the launcher.

**Why it exists.** Two night blocks were lost to approval prompts. A prompt in an unattended run does
not fail — it WAITS, with no error and no exit code, and the morning shows a half-finished block that
looks like it crashed and did not. The fix is two halves and both are needed: an allow list broad
enough to cover what a night block actually does, and a MODE in which an unapproved call is **denied**
rather than parked.

---

## The one line

```bash
claude -p "$(cat night-task.md)" --permission-mode dontAsk --output-format json \
  > "logs/night-$(date +%Y%m%d-%H%M).log" 2>&1
```

Put the block's instructions in `night-task.md` first. That is the whole procedure.

### What each flag is doing, because guessing at these is how the last two nights were lost

| flag | why |
| --- | --- |
| `-p` / `--print` | Non-interactive: run, print, exit. **It also skips the workspace-trust dialog**, which is its own silent blocker in a fresh checkout. |
| `--permission-mode dontAsk` | The load-bearing one. An unapproved call is **DENIED and the run continues**; without it the call WAITS forever. This is not `--dangerously-skip-permissions`: the deny list still bites, so a force-push or a read of `.env` is refused, not waved through. |
| `--output-format json` | One machine-readable result object at the end, so the morning check is `jq` and not reading prose. |
| `> logs/night-… 2>&1` | Both streams to one dated file. A night that fails is only debuggable if its output survived. |

### THE MODE MUST ARRIVE AT LAUNCH — a settings file cannot supply it

**`defaultMode` in `.claude/settings.json` does nothing for a session that is already running**, and
`bypassPermissions` in particular cannot be ENTERED mid-session — it has to be active when the process
starts. That is why the mode is on the command line above and why this document, not the settings
file, is the home of the night-run posture. A block that "set the mode in settings" has changed
nothing about the run it is inside.

### A NIGHT BLOCK MUST NEVER EDIT `.claude/settings.json` OR `.claude/settings.local.json`

**This is the one prompt no mode suppresses.** "Allow write to `.claude/settings.json`?" is hardcoded
and appears under `dontAsk` as under every other mode — so a night block that tries to widen its own
permissions stalls on the very dialog it was trying to avoid, or gets denied and then behaves as if it
had succeeded. Permission changes are daytime work, done by a human, before the night run starts.

`.claude/settings.local.json` is additionally **personal and never committed**: it accumulates every
"yes, don't ask again" and grows without bound. Only `.claude/settings.json` travels with the
repository.

### How the resume dialog is avoided

**By not asking for it.** The interactive session picker appears for `-r`/`--resume` with no value, and
`-c`/`--continue` reattaches to the last conversation in the directory. A plain `-p` invocation starts a
fresh session and shows neither. **A night run must never carry `-r` or `-c`.** If a specific session id
is wanted for tracing, pass `--session-id <uuid>` — it pins the id without opening a picker.

### Optional, and worth it on a long block

- `--max-budget-usd <n>` — a hard ceiling; the run stops rather than spending the night.
- `--model opus` / `--effort high` — pin them so a config change between sessions cannot alter the run.
- `--no-session-persistence` — only if the transcript is genuinely not wanted; it cannot be resumed.

---

## Reading the morning after

```bash
tail -40 logs/night-*.log                                  # what it did last
grep -ci "permission.*deni" logs/night-*.log               # 0 = nothing was refused
```

**A denial is not automatically a bug.** Under `dontAsk` a denial is the system working: it refused
something the rules do not cover and kept going. Every denial is a gap to close in
`.claude/settings.json` — or, occasionally, a thing the night block should not have been doing.

---

## What the rules deliberately do NOT cover

Stated here so the next gap is closed by widening the rules and not by reaching for
`--dangerously-skip-permissions`:

- **Force-push and history rewrite** (`push --force`, `rebase`, `filter-branch`, `reflog delete`,
  `reset --hard`, `clean -fdx`). A night block that believes it needs one of these has gone wrong
  earlier; the correct night-time response is to stop and leave the branch for the morning.
- **Deleting `server/data`, the source, the docs or `.git`.** Nothing a night block does is worth an
  unattended `rm -rf` of those.
- **Reading `.env`, `users.json`, keys and `*.pem`.** A block that needs a credential should be given
  one through the environment by the person starting it, not read one off the disk.

**Branch deletion IS allowed** (`git push origin --delete`, `git branch -D`) — the ship lifecycle ends
with it, and an earlier draft of the deny list broke exactly that.

---

## The browser suite runs HERE, and nowhere else

```bash
npm run test:e2e
```

**That is the whole command.** It starts its own API and its own Vite on their own ports with their
own empty data directory, creates a throwaway account, logs in once, and runs every spec
authenticated. It touches nothing on 4000, 5173 or 4173, so it can run while the owner's dev server
and production build are up.

**Why it is a night command and not a CI step — the owner's decision, 2026-08-16.** It costs about
**ten minutes**, which is roughly five times the entire per-push CI run, and its flake budget is
unknown because until 2026-08-16 the suite had not run successfully at all. A ten-minute browser
suite gating every merge trains people to re-run red builds, and a check nobody believes protects
nothing.

**This is the one home for that command and that reason.** `docs/VERIFY-RULES.md` says why the suite
is deliberately outside the ordinary path and points here rather than repeating it.

**What to read afterwards.** The list reporter prints per-test lines; `client/playwright-report/`
holds the HTML report, and failures keep a screenshot and a video. **A failure here is a FINDING to
triage, not a build to fix in the night** — the suite spent two months dead behind an auth gate, so
some of its assertions are older than the product they describe.
