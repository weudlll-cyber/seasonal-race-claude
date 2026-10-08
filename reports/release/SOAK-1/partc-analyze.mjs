// ============================================================
// File:        partc-analyze.mjs
// Path:        reports/release/SOAK-1/partc-analyze.mjs
// Project:     RaceArena
// Created:     2026-10-07
// Description: SOAK-1 part C — reads the dev server's GIT_TRACE2_EVENT log, the saver's record and
//              the dev server's own output, and answers the four questions of part C.
//
// Usage: node partc-analyze.mjs <rawDir>
//   <rawDir>/trace2.jsonl, saver.jsonl, vite.out, vite.err
//
// ATTRIBUTION. Every git process the dev server started is put in exactly one bucket:
//   start-up — before the saver's first record (the plugin's start-up read and path lookup)
//   badge    — within 5 s after a badge read began (fetching the virtual module runs `load()`)
//   gitmove  — within 3 s after .git/HEAD or .git/index changed (the 500 ms poll, then `recheck`)
//   OTHER    — none of these. A git child per source save would land here, and nowhere else.
// A git process that git itself starts (a child of a child) is counted separately, by its sid.
// ============================================================

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const raw = process.argv[2];
const lines = (f) => (existsSync(join(raw, f)) ? readFileSync(join(raw, f), 'utf8').split('\n').filter(Boolean) : []);

const starts = [];
for (const l of lines('trace2.jsonl')) {
  let e;
  try {
    e = JSON.parse(l);
  } catch {
    continue;
  }
  if (e.event === 'start') starts.push({ t: Date.parse(e.time), sid: e.sid, argv: e.argv.slice(1).join(' ') });
}
const saver = lines('saver.jsonl').map((l) => JSON.parse(l));
const t = (e) => Date.parse(e.t);
const firstSaver = saver.length ? t(saver[0]) : Infinity;
const moves = saver.filter((e) => e.ev === 'gitmove').map(t);
const badges = saver.filter((e) => e.ev === 'badge').map((e) => Date.parse(e.fetchedAt));
const commits = saver.filter((e) => e.ev === 'commit');
const end = saver.find((e) => e.ev === 'end');
const lastSave = saver.filter((e) => e.ev === 'save').at(-1);

const top = starts.filter((s) => !s.sid.includes('/'));
const nested = starts.length - top.length;
const bucket = { 'start-up': [], badge: [], gitmove: [], OTHER: [] };
for (const s of top) {
  if (s.t < firstSaver) bucket['start-up'].push(s);
  else if (badges.some((b) => s.t >= b && s.t - b <= 5000)) bucket.badge.push(s);
  else if (moves.some((m) => s.t >= m - 50 && s.t - m <= 3000)) bucket.gitmove.push(s);
  else bucket.OTHER.push(s);
}
const byArgv = (arr) => {
  const o = {};
  for (const s of arr) o[s.argv] = (o[s.argv] ?? 0) + 1;
  return o;
};

// How many separate git-file moves were there, and how many came from the plugin's own git?
// Moves are grouped into episodes 2 s apart; an episode with no commit and no badge read near it
// was caused by something else — most likely `git status` refreshing the index.
const episodes = [];
for (const m of moves) {
  const last = episodes.at(-1);
  if (last && m - last.end <= 2000) last.end = m;
  else episodes.push({ start: m, end: m });
}
const commitTimes = commits.map(t);
const explained = (ep) =>
  commitTimes.some((c) => Math.abs(ep.start - c) <= 15_000) || badges.some((b) => ep.start >= b && ep.start - b <= 15_000);
const unexplainedEpisodes = episodes.filter((ep) => !explained(ep));

const vite = [...lines('vite.out'), ...lines('vite.err')];
const errorLines = vite.filter((l) => /0xC0000142|3221225794|UNREADABLE|STATUS_DLL_INIT_FAILED|spawn|EPERM|ENOMEM/i.test(l));

const badgeRecords = saver.filter((e) => e.ev === 'badge');
console.log(JSON.stringify({
  window: { from: saver[0]?.t, to: end?.t ?? saver.at(-1)?.t },
  saves: end?.saves ?? lastSave?.saves ?? null,
  commits: commits.length,
  gitInvocations: { topLevel: top.length, nestedChildren: nested },
  attribution: Object.fromEntries(Object.entries(bucket).map(([k, v]) => [k, { n: v.length, argv: byArgv(v) }])),
  gitFileMoves: { samples: moves.length, episodes: episodes.length, unexplainedEpisodes: unexplainedEpisodes.length,
    firstUnexplained: unexplainedEpisodes.slice(0, 5).map((e) => new Date(e.start).toISOString()) },
  badges: badgeRecords.map((b) => ({ when: b.when, at: b.fetchedAt, badge: b.badge && `${b.badge.commit} · ${b.badge.branch}${b.badge.dirty ? ' +dirty' : ''}`,
    truth: `${b.truth.commit} · ${b.truth.branch}${b.truth.dirty ? ' +dirty' : ''}`, match: b.commitAndBranchMatch, error: b.error })),
  devServerLines: vite.length,
  processCreationErrorLines: errorLines,
}, null, 2));
