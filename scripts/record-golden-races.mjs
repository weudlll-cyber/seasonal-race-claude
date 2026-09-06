#!/usr/bin/env node
// ============================================================
// File:        scripts/record-golden-races.mjs
// Project:     RaceArena — GOLDEN-RACES-1
//
// RECORDING WHAT THE TWO GOLDEN RACES NOW DO. One deliberate act, never a fix-up.
//
//   node scripts/record-golden-races.mjs                        first recording only
//   node scripts/record-golden-races.mjs --intended="reason"    re-record a MOVED outcome
//
// ── ★ WHY THIS IS A SEPARATE COMMAND AND WHY IT REFUSES ─────────────────────────────────────────
// A golden race going red has exactly two meanings and they must never be confused:
//
//   THE CHANGE WAS INTENDED — somebody deliberately changed how a race runs, and the expectation
//   should follow.
//   THE CHANGE WAS NOT INTENDED — this is the finding the check exists for. The expectation STAYS
//   and the change is the thing that is wrong.
//
// ★ THE DEFAULT IS THE SECOND. So this command cannot be reached by accident: it is not part of
// verification, `check-golden-races.mjs` has no flag that calls it, and with an expectation already
// on file it REFUSES unless the invocation itself says the change was intended. Typing a reason is
// the smallest act that cannot happen by habit.
//
// ★ AND IT IS NOT PERMISSION. Re-recording a golden race is the same class of act as minting a
// fingerprint: it needs the OWNER'S WORD, per occurrence. This command makes the act deliberate and
// recorded; it does not make it authorised. No spec may run it on its own authority, and
// GOLDEN-RACES-1 granted no standing permission to.
//
// ── ★ THE PREVIOUS EXPECTATION IS KEPT ──────────────────────────────────────────────────────────
// Never replaced silently. Each re-record pushes the outgoing expectation onto `history`, with the
// date, the reason given, and the commit the tree was on. That record is what later answers "when
// did this race last move, and why" — the question every discussion about repeating a stored race
// turns on, and one no hash can answer.
// ============================================================

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { runAllGoldenRaces, RACES_PATH, EXPECTED_PATH, readJson, compareRace } from "./check-golden-races.mjs";

const args = process.argv.slice(2);
const intendedArg = args.find((a) => a.startsWith("--intended"));
const INTENDED = intendedArg ? intendedArg.replace(/^--intended=?/, "").trim() : null;

function currentCommit() {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    // A tree with no git is not a reason to refuse a recording; it is a reason to say so in it.
    return "unknown";
  }
}

const existing = existsSync(EXPECTED_PATH) ? readJson(EXPECTED_PATH) : { races: {} };
const ran = runAllGoldenRaces(readJson(RACES_PATH));

// What would actually change, race by race — computed with the SAME comparison the check uses, so
// the two can never disagree about whether an outcome moved.
const moved = [];
const fresh = [];
for (const r of ran) {
  const before = existing.races?.[r.id];
  if (!before) {
    fresh.push(r.id);
    continue;
  }
  const v = compareRace(r.id, r.results, before.results);
  if (!v.ok) moved.push({ id: r.id, why: v.message });
}

if (moved.length === 0 && fresh.length === 0) {
  process.stdout.write(
    "record-golden-races: nothing to record — both races already match what is on file.\n",
  );
  process.exit(0);
}

// ★ THE REFUSAL.
if (moved.length > 0 && !INTENDED) {
  process.stderr.write(
    "\nREFUSED: " +
      `${moved.length} golden race outcome(s) have MOVED, and this command was not told that was intended.\n\n`,
  );
  for (const m of moved) process.stderr.write(`  ${m.why}\n\n`);
  process.stderr.write(
    "  ★ A MOVED GOLDEN RACE IS A FINDING FIRST. Read it as a defect until somebody establishes\n" +
      "  otherwise: it means a change altered how a race runs.\n\n" +
      "  If the change was NOT intended, the change is what to fix. Nothing here should be updated.\n\n" +
      "  If it WAS intended — and re-recording needs the OWNER'S WORD, per occurrence, exactly as\n" +
      "  minting a fingerprint does — say so in the invocation:\n\n" +
      '      node scripts/record-golden-races.mjs --intended="what changed, and why the new outcome is right"\n\n',
  );
  process.exit(1);
}

if (moved.length > 0 && INTENDED.length < 12) {
  process.stderr.write(
    `\nREFUSED: --intended needs a REASON, not a flag. "${INTENDED}" says nothing a reader in six\n` +
      "months could use. Write what changed and why the new outcome is the right one.\n\n",
  );
  process.exit(1);
}

// ── Write ─────────────────────────────────────────────────────────────────────

const now = new Date().toISOString().slice(0, 10);
const commit = currentCommit();
const out = { races: { ...(existing.races ?? {}) } };

for (const r of ran) {
  const before = out.races[r.id];
  const history = before?.history ?? [];

  if (before && moved.some((m) => m.id === r.id)) {
    // ★ THE OUTGOING EXPECTATION IS KEPT, with why it went.
    history.unshift({
      recordedOn: before.recordedOn,
      recordedCommit: before.recordedCommit,
      supersededOn: now,
      supersededCommit: commit,
      supersededBecause: INTENDED,
      results: before.results,
    });
  }

  out.races[r.id] = {
    recordedOn: before && !moved.some((m) => m.id === r.id) ? before.recordedOn : now,
    recordedCommit: before && !moved.some((m) => m.id === r.id) ? before.recordedCommit : commit,
    recordedBecause: before && !moved.some((m) => m.id === r.id) ? before.recordedBecause : (INTENDED ?? "first recording — no previous expectation existed"),
    realizedDurationSec: r.realizedDurationSec,
    results: r.results,
    history,
  };
}

writeFileSync(EXPECTED_PATH, JSON.stringify(out, null, 2) + "\n");

for (const id of fresh) process.stdout.write(`record-golden-races: RECORDED "${id}" for the first time.\n`);
for (const m of moved) {
  const kept = out.races[m.id].history.length;
  process.stdout.write(
    `record-golden-races: RE-RECORDED "${m.id}" — the previous expectation is kept ` +
      `(${kept} in history), dated ${now}, commit ${commit}.\n`,
  );
}
process.stdout.write(`record-golden-races: wrote ${EXPECTED_PATH}\n`);
