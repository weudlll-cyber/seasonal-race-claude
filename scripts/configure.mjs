// ============================================================
// File:        scripts/configure.mjs
// Project:     RaceArena — RUNTIME-API-URL-1
// Created:     2026-09-07
//
// THE INSTALL ASKS FOR THE ADDRESS. `npm run configure`.
//
// ★ WHAT IT OWNS: asking whoever is installing this where the instance will be reached, judging the
// answer, and writing it where the running instance reads it. It refuses to finish without one.
//
// ★ WHAT IT DELIBERATELY DOES NOT DO: install anything, build anything, start anything, generate
// secrets, touch `server/data/`, or contact the network. It writes ONE file and prints what to do
// next. It is a question, not an installer — the brief was explicit that an installer must not be
// invented, and this project's install is `docker compose up` or the commands in DEPLOYMENT.md.
//
// ── WHERE IT WRITES, AND WHY THERE ──────────────────────────────────────────────────────────────
//
// `docker-compose.override.yml`. That file ALREADY EXISTS as this project's home for per-install
// environment: it is gitignored (`.gitignore:3`), merged automatically by `docker compose up`, has
// a committed `.example`, and `docker-compose.yml` already says in a comment that
// `RA_SESSION_SECRET` and `RA_CLIENT_ORIGIN` come from it. So this replaces "copy the example and
// edit it by hand" with "answer a question" — it adds no new mechanism and no new file format.
//
// ★ IT DOES NOT WRITE `.env`, and that is a decision rather than an omission. Docker Compose reads
// `.env` only for VARIABLE SUBSTITUTION in the compose file, not into the container's environment,
// so a `.env` would need `docker-compose.yml` edited to reference it — and the Node server reads no
// `.env` at all without `--env-file`. Writing one would produce a file that LOOKS configured and
// reaches neither runtime, which is the silent-failure shape this whole piece removes.
//
// ── THE NON-DOCKER PATH IS PRINTED, NOT WRITTEN ─────────────────────────────────────────────────
//
// DEPLOYMENT.md's "minimal production start" sets variables on the command line. There is no file
// this script could write that such a start would read, so it prints the exact `RA_PUBLIC_ORIGIN=…`
// line instead of inventing a config file nobody loads. What it cannot do, it says.
// ============================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { judgePublicOrigin } from '../server/src/runtimeConfig.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OVERRIDE = join(ROOT, 'docker-compose.override.yml');

const arg = (name) => {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};

/**
 * Put `RA_PUBLIC_ORIGIN` into an existing override file, or produce a new one.
 *
 * ★ IT REPLACES ITS OWN LINE RATHER THAN APPENDING. Running configure twice must not leave two
 * `RA_PUBLIC_ORIGIN` entries — Compose would take one of them and the operator could not tell
 * which. Everything else in the file is left exactly as it was, because it is theirs.
 *
 * Exported for the test; this is the only part with a rule worth pinning.
 */
export function withPublicOrigin(existing, origin) {
  const line = `      - RA_PUBLIC_ORIGIN=${origin}`;
  if (existing === null) {
    return [
      '# Written by `npm run configure` (RUNTIME-API-URL-1). Gitignored — it is this install’s own.',
      '# Merged automatically by `docker compose up`.',
      'services:',
      '  server:',
      '    environment:',
      line,
      '',
    ].join('\n');
  }
  const lines = existing.split('\n');
  const at = lines.findIndex((l) => /^\s*-\s*RA_PUBLIC_ORIGIN=/.test(l));
  if (at !== -1) {
    lines[at] = line;
    return lines.join('\n');
  }
  const envAt = lines.findIndex((l) => /^\s*environment:\s*$/.test(l));
  if (envAt !== -1) {
    lines.splice(envAt + 1, 0, line);
    return lines.join('\n');
  }
  // No `environment:` block to extend: say so rather than guess where it belongs.
  return null;
}

/**
 * ★ INSTALL-SECRETS-1 — the two secrets an install needs, generated rather than hand-copied.
 *
 * They used to be transcribed out of a document by hand, which is how installs come to share a
 * secret: the value written in a document is the value everybody uses. These are 32 random bytes
 * each, so they are unique per install by construction.
 *
 *   RA_SESSION_SECRET   signs sessions. In production the server REFUSES to start without it
 *                       (`server/src/auth/session.js:71`); in development it invents an ephemeral
 *                       one and every restart signs everybody out.
 *   RA_BOOTSTRAP_TOKEN  authorises `POST /api/auth/setup`, the call that creates the FIRST admin.
 *                       Without it that route answers 403 and a fresh install cannot be opened.
 *
 * ★ NEITHER IS EVER PRINTED — not to the terminal, not to a log, not into this script's output.
 * They are written to `docker-compose.override.yml`, the gitignored file that is already this
 * install's home for its own environment, and that file is where the operator reads them. A secret
 * echoed to a terminal is a secret in a scrollback buffer and in a screen recording.
 */
export function generateSecret() {
  return randomBytes(32).toString('base64url');
}

/**
 * Upsert one `- KEY=value` line under `services: server: environment:`.
 *
 * ★ IT NEVER REPLACES A VALUE THAT IS ALREADY THERE, and that is the opposite rule from the
 * address. Re-running `configure` on a live install must not roll its session secret — that would
 * sign every user out — nor its bootstrap token. So an existing key is LEFT ALONE and reported as
 * kept. Returns null when there is no `environment:` block to extend.
 */
export function withKeptEnv(existing, key, value) {
  if (existing === null) return null;
  const lines = existing.split('\n');
  if (lines.some((l) => new RegExp(`^\\s*-\\s*${key}=`).test(l))) {
    return { text: existing, added: false };
  }
  const envAt = lines.findIndex((l) => /^\s*environment:\s*$/.test(l));
  if (envAt === -1) return null;
  lines.splice(envAt + 1, 0, `      - ${key}=${value}`);
  return { text: lines.join('\n'), added: true };
}

async function main() {
  const preset = arg('origin');
  let origin;

  if (preset !== undefined) {
    // Non-interactive form, for the test and for anyone scripting an install. It is held to the
    // SAME rule: a bad value here refuses too.
    const verdict = judgePublicOrigin(preset);
    if (!verdict.ok) {
      console.error(`Refusing: ${verdict.reason}.`);
      process.exit(1);
    }
    origin = verdict.origin;
  } else {
    if (!stdin.isTTY) {
      // ★ NO SILENT DEFAULT. An unanswered question at install time is exactly how somebody ends up
      // serving a package that points at their own machine.
      console.error(
        'Refusing: nothing to read the answer from (no terminal), and there is no default.\n' +
          'Pass it instead:  npm run configure -- --origin=https://races.example.com'
      );
      process.exit(1);
    }
    const rl = createInterface({ input: stdin, output: stdout });
    try {
      for (;;) {
        const answer = await rl.question(
          '\nWhat address will this RaceArena be reached at?\n' +
            '  A domain or an IP, with the scheme, origin only.\n' +
            '  Examples:  https://races.example.com    http://198.51.100.7:4000\n' +
            '> '
        );
        const verdict = judgePublicOrigin(answer);
        if (verdict.ok) {
          origin = verdict.origin;
          break;
        }
        console.log(`  That will not do: ${verdict.reason}. Try again, or Ctrl-C to stop.`);
      }
    } finally {
      rl.close();
    }
  }

  const existing = existsSync(OVERRIDE) ? readFileSync(OVERRIDE, 'utf8') : null;
  const next = withPublicOrigin(existing, origin);
  if (next === null) {
    console.error(
      `Refusing: ${OVERRIDE} exists but has no \`environment:\` block to add to.\n` +
        `Add this line under \`services: server: environment:\` yourself:\n` +
        `      - RA_PUBLIC_ORIGIN=${origin}`
    );
    process.exit(1);
  }
  // ── The two secrets, generated if this install does not already carry them ────────────────────
  let text = next;
  const secretReport = [];
  for (const key of ['RA_SESSION_SECRET', 'RA_BOOTSTRAP_TOKEN']) {
    const r = withKeptEnv(text, key, generateSecret());
    if (r === null) {
      console.error(`Refusing: ${OVERRIDE} has no \`environment:\` block to put ${key} in.`);
      process.exit(1);
    }
    text = r.text;
    secretReport.push(`${key} ${r.added ? 'generated' : 'kept — this install already had one'}`);
  }
  writeFileSync(OVERRIDE, text, 'utf8');

  console.log(`\n  Address set to ${origin}`);
  for (const line of secretReport) console.log(`  ${line}`);
  console.log(`  Written to     docker-compose.override.yml  (gitignored — this install's own)`);
  console.log('\n  Docker:      docker compose up --build');
  console.log(`  Without it:  RA_PUBLIC_ORIGIN=${origin} node server/src/index.js`);
  console.log('\n  The client is NOT rebuilt for this. The same build serves any address.');
  console.log('\n  The two secrets are IN docker-compose.override.yml and are deliberately NOT');
  console.log('  printed here — read them from that file if you ever need them.');
  console.log('  Still needed for a real deployment: NODE_ENV=production and TLS in front.');
  console.log('  See docs/DEPLOYMENT.md.\n');
}

// Importable for the test without running the prompt.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
