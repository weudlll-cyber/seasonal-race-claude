// server/scripts/restart-dev.js
// One-command dev restart: frees port 4000 (best-effort), then starts via dev-start.js.
// Works on Windows and Unix. Env defaults live solely in dev-start.js (L129 — no duplication).
// DEV ONLY — production never calls this script.

import { execSync } from 'node:child_process';

function freePort4000() {
  if (process.platform === 'win32') {
    let output;
    try {
      // findstr filters to lines referencing :4000; shell:true enables the pipe
      output = execSync('netstat -ano | findstr :4000', { encoding: 'utf8', shell: true });
    } catch {
      console.log('[restart] Port 4000 is free.');
      return;
    }

    // Collect unique PIDs from lines where the LOCAL address ends with :4000
    const pids = new Set();
    for (const line of output.split('\n')) {
      if (!/TCP\s+[^\s]+:4000\s/i.test(line)) continue; // skip :40001 etc.
      const pid = line.trim().split(/\s+/).at(-1);
      if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
    }

    if (pids.size === 0) {
      console.log('[restart] Port 4000 is free.');
      return;
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`[restart] Killed process ${pid} (was on port 4000).`);
      } catch {
        // Already gone between netstat and taskkill — safe to ignore
      }
    }
  } else {
    // Unix / macOS
    let pids;
    try {
      pids = execSync('lsof -ti tcp:4000', { encoding: 'utf8' }).trim();
    } catch {
      console.log('[restart] Port 4000 is free.');
      return;
    }
    if (!pids) {
      console.log('[restart] Port 4000 is free.');
      return;
    }
    for (const pid of pids.split('\n').filter(Boolean)) {
      try {
        execSync(`kill -9 ${pid}`);
        console.log(`[restart] Killed process ${pid} (was on port 4000).`);
      } catch {
        // Already gone
      }
    }
  }
}

freePort4000();
console.log('[restart] Starting dev server (RA_CLIENT_ORIGIN=http://localhost:5173, PORT=4000) …');
await import('./dev-start.js');
