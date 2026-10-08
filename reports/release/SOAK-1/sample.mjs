// ============================================================
// File:        sample.mjs
// Path:        reports/release/SOAK-1/sample.mjs
// Project:     RaceArena
// Created:     2026-10-07
// Description: SOAK-1 harness — one sample of the running server every 60 s, appended as one JSON
//              line to <out>. Runs on the host; reads the container through the docker CLI only.
//
// Usage: node sample.mjs <container> <out.jsonl> <minutes>
//
// What one sample holds, and where each number comes from:
//   docker   — `docker stats`: memory (the cgroup's own figure), CPU %, PIDs (tasks, i.e. threads)
//   proc     — /proc/1 inside the container (node is PID 1): VmRSS, VmHWM, Threads, open
//              descriptors; and every process's name, so the healthcheck's short-lived `node -e`
//              is visible as what it is and the sampler's own `sh`/`ls`/`cat` are not counted
//   files    — every file under /app/data by SIZE ONLY (`stat`; nothing is opened or read)
//   log      — the bytes and lines `docker logs` returns for the container. This is the log's
//              CONTENT. The json-file driver stores each line wrapped in a small JSON object, so
//              the file on the Docker host is larger by a fixed amount per line; SOAK-1.md states
//              the factor used. The file itself is not read: it lives inside the Docker host.
//   state    — restart count, status, health, OOM flag
// NOT sampled: the V8 heap. Reading it needs a debugger port or a code change; RSS stands in.
// ============================================================

import { execFile, spawn } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const [container, out, minutesArg] = process.argv.slice(2);
const minutes = Number(minutesArg ?? 600);

function sh(cmd, args, timeout = 30_000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout, windowsHide: true, maxBuffer: 16 << 20 }, (err, stdout, stderr) =>
      resolve({ ok: !err, stdout: String(stdout), stderr: String(stderr), err: err?.message })
    );
  });
}

// `docker logs` output can grow past any buffer, so it is counted as a stream, never held.
function logBytes() {
  return new Promise((resolve) => {
    let bytes = 0;
    let lines = 0;
    const p = spawn('docker', ['logs', container], { windowsHide: true });
    const count = (b) => {
      bytes += b.length;
      for (const x of b) if (x === 10) lines++;
    };
    p.stdout.on('data', count);
    p.stderr.on('data', count);
    const timer = setTimeout(() => p.kill(), 60_000);
    p.on('error', () => {
      clearTimeout(timer);
      resolve({ bytes: null, lines: null });
    });
    p.on('close', (code) => {
      clearTimeout(timer);
      resolve(code === 0 ? { bytes, lines } : { bytes: null, lines: null, code });
    });
  });
}

const SAMPLER_COMMS = new Set(['sh', 'stat', 'find', 'cat', 'ls', 'wc', 'grep']);

async function one() {
  const s = { t: new Date().toISOString() };
  const [stats, insp, proc, files, log] = await Promise.all([
    sh('docker', ['stats', '--no-stream', '--format', '{{json .}}', container]),
    sh('docker', ['inspect', '--format', '{{json .State}}|{{.RestartCount}}', container]),
    sh('docker', ['exec', container, 'sh', '-c',
      'grep -E "^(VmRSS|VmHWM|Threads):" /proc/1/status; echo "FD $(ls /proc/1/fd | wc -l)"; ' +
      'for p in /proc/[0-9]*; do [ -r $p/comm ] && echo "COMM ${p#/proc/} $(cat $p/comm)"; done']),
    sh('docker', ['exec', container, 'find', '/app/data', '-type', 'f', '-exec', 'stat', '-c', '%s %n', '{}', '+']),
    logBytes(),
  ]);
  try {
    const d = JSON.parse(stats.stdout);
    s.docker = { mem: d.MemUsage, memPerc: d.MemPerc, cpu: d.CPUPerc, pids: Number(d.PIDs) };
  } catch {
    s.docker = { error: stats.err ?? stats.stderr.slice(0, 200) };
  }
  try {
    const [stateJson, restarts] = insp.stdout.trim().split('|');
    const st = JSON.parse(stateJson);
    s.state = { status: st.Status, health: st.Health?.Status, startedAt: st.StartedAt, restarts: Number(restarts), oomKilled: st.OOMKilled };
  } catch {
    s.state = { error: insp.err ?? insp.stderr.slice(0, 200) };
  }
  const p = {};
  const comms = [];
  for (const line of proc.stdout.split('\n')) {
    let m;
    if ((m = /^(VmRSS|VmHWM|Threads):\s+(\d+)/.exec(line))) p[m[1]] = Number(m[2]);
    else if ((m = /^FD (\d+)/.exec(line))) p.fd = Number(m[1]);
    else if ((m = /^COMM (\d+) (.+)$/.exec(line))) comms.push(`${m[1]}:${m[2]}`);
  }
  p.processes = comms.filter((c) => !SAMPLER_COMMS.has(c.split(':')[1])).length;
  p.comms = comms;
  s.proc = p;
  const byKind = {};
  let total = 0;
  for (const line of files.stdout.split('\n')) {
    const m = /^(\d+) (.+)$/.exec(line.trim());
    if (!m) continue;
    const size = Number(m[1]);
    const path = m[2].replace(/^\/app\/data\//, '');
    let kind;
    if (/^sessions\.sqlite/.test(path)) kind = 'sessions.sqlite*';
    else if (/^races\.sqlite/.test(path)) kind = 'races.sqlite*';
    else if (/\.(png|jpe?g|webp)$/i.test(path)) kind = 'images';
    else if (/^[^/]+\//.test(path)) kind = `${path.split('/')[0]}/`;
    else kind = path;
    byKind[kind] = (byKind[kind] ?? 0) + size;
    total += size;
  }
  s.files = { total, byKind };
  s.log = log;
  appendFileSync(out, JSON.stringify(s) + '\n');
}

const t0 = Date.now();
for (let i = 0; i < minutes; i++) {
  const due = t0 + i * 60_000;
  const wait = due - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  try {
    await one();
  } catch (e) {
    appendFileSync(out, JSON.stringify({ t: new Date().toISOString(), error: String(e?.stack ?? e) }) + '\n');
  }
}
