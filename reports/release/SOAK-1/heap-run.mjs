// ============================================================
// File:        heap-run.mjs
// Path:        reports/release/SOAK-1/heap-run.mjs
// Project:     RaceArena
// Created:     2026-10-08
// Description: One in-process heap check as ONE command (the SOAK-1 step-2a method): starts
//              inproc.mjs `serve` on a data copy, waits until it serves, runs the soak's load
//              (load.mjs) against it for the same time, and waits for both to finish.
//
// Usage: node heap-run.mjs <repoRoot> <dataCopy> <port> <rawDir> <minutes>
//   <rawDir> must already hold accounts.json and race-templates.json (load.mjs reads them).
// ============================================================

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWriteStream } from 'node:fs';

const HERE = dirname(fileURLToPath(import.meta.url));
const [root, data, port, rawDir, minutesArg] = process.argv.slice(2);
const minutes = Number(minutesArg ?? 60);

function start(args, logName) {
  const p = spawn(process.execPath, args, { windowsHide: true });
  const log = createWriteStream(join(rawDir, logName));
  p.stdout.pipe(log);
  p.stderr.pipe(log);
  return p;
}
const done = (p) => new Promise((resolve) => p.on('exit', (code) => resolve(code)));

const server = start(['--expose-gc', join(HERE, 'inproc.mjs'), 'serve', root, data, port, rawDir, String(minutes + 1)], 'serve.out');
await new Promise((resolve, reject) => {
  server.stdout.on('data', (b) => String(b).includes('serving on') && resolve());
  server.on('exit', (code) => reject(new Error(`the server exited (${code}) before it served`)));
});
const load = start([join(HERE, 'load.mjs'), 'run', `http://127.0.0.1:${port}`, rawDir, String(minutes / 60)], 'load.out');
const [loadCode, serverCode] = await Promise.all([done(load), done(server)]);
console.log(`load exit ${loadCode}, server exit ${serverCode}`);
