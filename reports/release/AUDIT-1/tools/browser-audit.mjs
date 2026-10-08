// AUDIT-1 A8 / A9 / A10 (client) / A13 — one tool, one phase per run.
//
// It starts the PRODUCTION arm of the audited clone (one Node server serving the built client and
// the API on one origin) on port 4611 with a THROWAWAY data directory, creates an admin through the
// real first-run endpoint, and signs in through the real form. Nothing touches the owner's data or
// his ports (4000 / 4173 / 5173). Browsers come from PLAYWRIGHT_BROWSERS_PATH (the clone's own).
//
// Usage: node browser-audit.mjs <clone> <outDir> <phase>      phase: a8 | a9 | a10 | a13
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import os from 'node:os';

const [clone, outDir, phase] = process.argv.slice(2);
const PORT = 4611;
const BASE = `http://127.0.0.1:${PORT}`;
const TOKEN = 'audit-bootstrap-token';
const USER = { username: 'auditadmin', password: 'audit-password-1' };
const { chromium, firefox, webkit } = await import(pathToFileURL(join(clone, 'client/node_modules/playwright/index.mjs')).href);
const AXE = join(os.homedir(), 'ra-measure/AUDIT-1/tools-node/node_modules/axe-core/axe.min.js');
mkdirSync(outDir, { recursive: true });
const dataDir = mkdtempSync(join(os.tmpdir(), 'ra-audit-browser-'));
const results = {};
const save = () => writeFileSync(join(outDir, `${phase}.json`), JSON.stringify(results, null, 2));

let server;
async function startServer() {
  server = spawn(process.execPath, [join(clone, 'server/src/index.js')], {
    env: { ...process.env, PORT: String(PORT), RA_DATA_DIR: dataDir, RA_BOOTSTRAP_TOKEN: TOKEN, RA_SESSION_SECRET: 'audit-secret-0123456789abcdef0123456789', RA_BIND_ADDRESS: '127.0.0.1' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`${BASE}/api/health`)).ok) return; } catch { /* booting */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('the audit server did not start');
}
async function stopServer() {
  if (!server) return;
  const done = new Promise((r) => server.once('exit', r));
  server.kill();
  await done;
  server = null;
}
async function ensureAdmin() {
  const need = await (await fetch(`${BASE}/api/auth/setup-needed`)).json();
  if (need.setupNeeded) {
    const r = await fetch(`${BASE}/api/auth/setup`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-bootstrap-token': TOKEN }, body: JSON.stringify({ ...USER, team: 'Audit' }) });
    if (!r.ok) throw new Error(`setup refused: ${r.status}`);
  }
}
async function signIn(page) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/username/i).fill(USER.username);
  await page.getByLabel(/password/i).fill(USER.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 });
}
/**
 * Quick Test is a test aid, shown only while the test-aids switch is ON (TEST-AIDS-1; it ships OFF).
 * Turned on through the admin API of THIS throwaway install, then the setup screen is loaded and the
 * button waited for until it is enabled (it stays disabled until every track geometry is cached).
 */
async function quickTestReady(page) {
  await page.evaluate(async () => {
    const r = await fetch('/api/settings/test-aids', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: true }) });
    if (!r.ok) throw new Error(`test-aids switch: ${r.status}`);
  });
  await page.goto(`${BASE}/setup`);
  await page.waitForLoadState('networkidle');
  const button = page.getByRole('button', { name: /Quick Test/ });
  await button.waitFor({ timeout: 30000 });
  for (let i = 0; i < 60 && (await button.isDisabled()); i++) await page.waitForTimeout(500);
  return button;
}
/** Collect page errors and console errors while `fn` runs. */
function watch(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 200)}`); });
  return errors;
}

const SCREENS = ['/login', '/setup', '/dev', '/track-editor'];

try {
  await startServer();
  await ensureAdmin();

  if (phase === 'a8') {
    // ── A8: axe (WCAG 2 A/AA) per screen, screenshots at three widths, keyboard order ────────────
    const browser = await chromium.launch();
    for (const [label, width, height] of [['390', 390, 844], ['768', 768, 1024], ['desktop', 1440, 900]]) {
      const ctx = await browser.newContext({ viewport: { width, height } });
      const page = await ctx.newPage();
      // `/login` is captured signed OUT (it is what a visitor sees); every other screen signed in.
      let signedIn = false;
      for (const path of SCREENS) {
        if (path !== '/login' && !signedIn) {
          await signIn(page);
          signedIn = true;
        }
        await page.goto(`${BASE}${path}`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(800);
        const shot = join(outDir, `a8-${label}${path.replace(/\//g, '_') || '_root'}.png`);
        await page.screenshot({ path: shot, fullPage: true });
        const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        (results.overflowX ??= {})[`${label} ${path}`] = overflowX;
        if (label === 'desktop' || label === '390') {
          await page.addScriptTag({ path: AXE });
          const axe = await page.evaluate(async () => {
            const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
            return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, sample: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
          });
          (results.axe ??= {})[`${label} ${path}`] = axe;
        }
      }
      await ctx.close();
    }
    // Keyboard: from a fresh login page, where does Tab go? And does the sign-in work with keys only?
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`);
    const order = [];
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      order.push(await page.evaluate(() => {
        const e = document.activeElement;
        const outline = e ? getComputedStyle(e).outlineStyle + '/' + getComputedStyle(e).boxShadow.slice(0, 20) : '';
        return e ? `${e.tagName.toLowerCase()}${e.type ? `[${e.type}]` : ''} "${(e.getAttribute('aria-label') || e.labels?.[0]?.textContent || e.textContent || '').trim().slice(0, 30)}" focus-style=${outline}` : 'none';
      }));
    }
    results.keyboardLogin = order;
    await page.goto(`${BASE}/login`);
    await page.keyboard.press('Tab');
    await page.keyboard.type(USER.username);
    await page.keyboard.press('Tab');
    await page.keyboard.type(USER.password);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2500);
    results.keyboardOnlySignIn = !page.url().includes('/login');
    // The setup screen by keyboard: the first 30 focus stops.
    await page.goto(`${BASE}/setup`);
    await page.waitForLoadState('networkidle');
    const setupOrder = [];
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab');
      setupOrder.push(await page.evaluate(() => {
        const e = document.activeElement;
        return e ? `${e.tagName.toLowerCase()} "${(e.getAttribute('aria-label') || e.labels?.[0]?.textContent || e.textContent || e.getAttribute('title') || '').trim().slice(0, 30)}"` : 'none';
      }));
    }
    results.keyboardSetup = setupOrder;
    await browser.close();
  }

  if (phase === 'a9') {
    // ── A9: smoke in Firefox and WebKit (and Chromium as the control) ────────────────────────────
    for (const [name, type] of [['chromium', chromium], ['firefox', firefox], ['webkit', webkit]]) {
      const browser = await type.launch();
      const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
      const errors = watch(page);
      const r = { signIn: false, screens: {}, race: null };
      try {
        await signIn(page);
        r.signIn = true;
        for (const path of ['/setup', '/dev']) {
          await page.goto(`${BASE}${path}`);
          await page.waitForLoadState('networkidle');
          r.screens[path] = (await page.locator('body').innerText()).length > 50;
        }
        const quick = await quickTestReady(page);
        await page.locator('input[type="number"]').first().fill('2');
        await quick.click();
        await page.waitForURL(/\/race/, { timeout: 30000 });
        await page.waitForTimeout(8000);
        const canvas = await page.locator('canvas').first().boundingBox();
        r.race = { canvas: !!canvas, size: canvas ? `${Math.round(canvas.width)}x${Math.round(canvas.height)}` : null };
        await page.screenshot({ path: join(outDir, `a9-${name}-race.png`) });
      } catch (e) {
        r.failure = e.message.split('\n')[0];
      }
      r.errors = errors;
      results[name] = r;
      await browser.close();
    }
  }

  if (phase === 'a10') {
    // ── A10 client side: server down, back, offline, two tabs ────────────────────────────────────
    const browser = await chromium.launch();
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await signIn(page);
    const visibleText = async () => (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    // 1. The server goes away while the app is open.
    await stopServer();
    await page.goto(`${BASE}/setup`).catch((e) => (results.navigateWhileDown = e.message.split('\n')[0]));
    // 2. A request from an already-loaded page while it is away: reload the app first, then stop.
    await startServer();
    await page.goto(`${BASE}/setup`);
    await page.waitForLoadState('networkidle');
    await stopServer();
    await page.goto(`${BASE}/dev`).catch(() => {});
    results.serverDown = { url: page.url() };
    // 3. It comes back: does the signed-in session survive a server restart?
    await startServer();
    await page.goto(`${BASE}/setup`);
    await page.waitForLoadState('networkidle');
    results.afterRestart = { url: page.url(), stillSignedIn: !page.url().includes('/login') };
    // 4. Offline from the browser's side while on a loaded page: what does a data action show?
    await page.goto(`${BASE}/dev`);
    await page.waitForLoadState('networkidle');
    await ctx.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.getByRole('button').first().click({ trial: true }).catch(() => {});
    await page.reload().catch((e) => (results.offlineReload = e.message.split('\n')[0]));
    await ctx.setOffline(false);
    await page.goto(`${BASE}/dev`);
    await page.waitForLoadState('networkidle');
    results.backOnline = { url: page.url(), text: (await visibleText()).slice(0, 120) };
    // 5. Two tabs: sign out in one; what does the other do on its next request?
    const tab2 = await ctx.newPage();
    await tab2.goto(`${BASE}/dev`);
    await tab2.waitForLoadState('networkidle');
    const out = await page.evaluate(async () => (await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })).status);
    await tab2.goto(`${BASE}/setup`);
    await tab2.waitForTimeout(2000);
    results.twoTabs = { logoutStatus: out, otherTabUrl: tab2.url(), otherTabSentToLogin: tab2.url().includes('/login') };
    await browser.close();
  }

  if (phase === 'a13') {
    // ── A13: one tab, 20 Quick Test races of 2 racers; heap after a forced GC every few races ─────
    const browser = await chromium.launch();
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
    await signIn(page);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    const sample = async (label) => {
      await cdp.send('HeapProfiler.collectGarbage');
      const { metrics } = await cdp.send('Performance.getMetrics');
      const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]));
      const row = { label, heapMiB: +(m.JSHeapUsedSize / 1048576).toFixed(2), nodes: m.Nodes, listeners: m.JSEventListeners, documents: m.Documents, t: new Date().toISOString() };
      (results.samples ??= []).push(row);
      save();
      console.log(JSON.stringify(row));
    };
    await quickTestReady(page);
    await sample('before race 1');
    for (let i = 1; i <= 20; i++) {
      // In-app navigation only: the tab is never reloaded, so anything a race leaves behind stays.
      await page.locator('input[type="number"]').first().fill('2');
      await page.getByRole('button', { name: /Quick Test/ }).click();
      await page.waitForURL(/\/race/, { timeout: 30000 });
      await page.waitForURL(/\/results/, { timeout: 900000 });
      await page.locator('a[href="/setup"], button').filter({ hasText: /new race|setup|back/i }).first().click().catch(async () => {
        await page.evaluate(() => { window.history.pushState({}, '', '/setup'); window.dispatchEvent(new PopStateEvent('popstate')); });
      });
      await page.waitForURL(/\/setup/, { timeout: 30000 }).catch(() => {});
      await page.waitForLoadState('networkidle');
      if ([1, 5, 10, 15, 20].includes(i)) await sample(`after race ${i}`);
    }
    await browser.close();
  }
} catch (e) {
  results.fatal = e.stack;
  console.error(e);
  process.exitCode = 1;
} finally {
  save();
  await stopServer();
  rmSync(dataDir, { recursive: true, force: true });
}
