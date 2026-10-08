// ============================================================
// File:        browser-wait.mjs
// Path:        reports/release/SOAK-1/browser-wait.mjs
// Project:     RaceArena
// Created:     2026-10-07
// Description: SOAK-1 step 2b — does a REAL BROWSER see an error when a verify blocks the server,
//              or only a wait? Chromium (Playwright) opens the app and keeps 8 fetch loops going
//              on its own keep-alive connections while this script triggers verifies.
//
// Usage (from client/, whose node_modules carry Playwright):
//   node browser-wait.mjs <base> <accounts.json> <rawDir> [verifies=6]
// ============================================================

import { chromium } from 'playwright';
import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const [base, accountsFile, rawDir, nArg] = process.argv.slice(2);
if (!/^http:\/\/(127\.0\.0\.1|\[::1\]):\d+$/.test(base ?? '')) throw new Error('base must be loopback');
const n = Number(nArg ?? 6);
const accounts = JSON.parse(readFileSync(accountsFile, 'utf8'));
const hdr = { 'X-Forwarded-For': '10.8.0.1', 'X-Forwarded-Proto': 'https', Origin: base, 'Content-Type': 'application/json' };

const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: hdr, body: JSON.stringify(accounts.admin) });
const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => /ra\.sid=/.test(c));
const page0 = await (await fetch(`${base}/api/races?limit=20`, { headers: { ...hdr, Cookie: cookie } })).json();
const keys = page0.races.filter((r) => r.fieldSize === 40).map((r) => r.shortKey);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(base);
await page.evaluate(() => {
  window.__soak = { ok: 0, errors: [], maxMs: 0, run: true };
  for (let i = 0; i < 8; i++) {
    (async () => {
      while (window.__soak.run) {
        const t0 = performance.now();
        try {
          const r = await fetch('/api/health', { cache: 'no-store' });
          await r.text();
          window.__soak.ok += 1;
        } catch (e) {
          window.__soak.errors.push(String(e));
        }
        window.__soak.maxMs = Math.max(window.__soak.maxMs, performance.now() - t0);
        await new Promise((res) => setTimeout(res, 300 + Math.random() * 1200));
      }
    })();
  }
});
const verifies = [];
for (let i = 0; i < n; i++) {
  await new Promise((r) => setTimeout(r, 10_000));
  const t0 = Date.now();
  const v = await fetch(`${base}/api/races/${keys[i % keys.length]}/verify`, { method: 'POST', headers: { ...hdr, Cookie: cookie }, body: '{}' });
  verifies.push({ status: v.status, wallMs: Date.now() - t0 });
}
await new Promise((r) => setTimeout(r, 10_000));
const result = await page.evaluate(() => {
  window.__soak.run = false;
  return { ok: window.__soak.ok, errors: window.__soak.errors, maxMs: Math.round(window.__soak.maxMs) };
});
await browser.close();
const out = { browser: 'chromium (Playwright)', verifies, ...result };
appendFileSync(join(rawDir, 'browser-wait.jsonl'), JSON.stringify(out) + '\n');
console.log(JSON.stringify(out, null, 2));
