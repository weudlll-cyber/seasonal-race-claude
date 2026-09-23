// ============================================================
// File:        backup.mjs
// Path:        scripts/backup.mjs
// Project:     RaceArena — DELIVERY-BACKUP-1
// Description: Back up, and restore, the entire server runtime data root as ONE archive —
//              consistently, while the server is running.
//
// ── ★★★ WHY A FILE COPY OF THE SQLITE FILES IS NOT ACCEPTABLE ──────────────────────────────────
// `sessions.sqlite` and `races.sqlite` are live databases. SQLite writes a page at a time and keeps
// a rollback journal / WAL beside the file; a plain `copyFile` of a database that is being written
// can capture a torn page set — half of one transaction and none of the next. **The result is a
// file that looks perfectly normal**: right size, right extension, opens without complaint, and
// fails only when the damaged page is finally read. That is the worst possible failure mode for a
// backup, because it is discovered on the day it is needed.
//
// ★ SO THE DATABASES GO THROUGH SQLITE'S OWN ONLINE BACKUP API — `better-sqlite3`'s `db.backup()`,
// which wraps `sqlite3_backup_step`. It copies page by page under the database's own locking, and
// restarts itself if a writer changes a page mid-copy, so the archived file is a CONSISTENT
// SNAPSHOT of a real committed state rather than a smear of several. It needs no downtime, which is
// the second requirement: a procedure that demands the service be stopped does not get followed.
//
// `VACUUM INTO` would also produce a consistent copy and is the SQL equivalent. `.backup()` is used
// instead because it is the documented API of the driver this project already depends on, it does
// not rebuild the database (so it is cheaper and cannot change the page layout), and it reports
// progress. Stated here because the brief asked which, and why.
//
// ── EVERYTHING ELSE IS A PLAIN FILE COPY ───────────────────────────────────────────────────────
// JSON stores, uploaded sprites, logos, backgrounds and the seeded directories are ordinary files
// written with atomic rename by their stores, so copying them is safe.
//
// ── ★ WHAT IS REUSED RATHER THAN REBUILT ───────────────────────────────────────────────────────
// `server/src/dataPaths.js` — `resolveDataRoot()` is THE resolver and is imported, never
// re-derived. If the default ever moves, this tool moves with it.
//
// ── ★★ WHY IT REFUSES WHEN A PER-STORE OVERRIDE POINTS OUTSIDE THE ROOT ────────────────────────
// Three environment variables can each relocate ONE store away from the data root: `RA_USERS_DB`,
// `RA_SESSION_DB`, `RA_RACES_DB`. They exist for test isolation (`raceStore.js:30-32` says so), not
// for deployment. A backup of the root alone would then be missing a store **and would not look
// wrong** — exactly the silent-partial failure this tool exists to prevent. So it checks all three
// and REFUSES, naming the variable and the path, rather than writing a convincing half-archive.
//
// ── USAGE ──────────────────────────────────────────────────────────────────────────────────────
//   node scripts/backup.mjs --out <dir>              # write <dir>/racearena-backup-<UTC>.tar
//   node scripts/backup.mjs --restore <archive> --into <dir>
//   node scripts/backup.mjs --restore <archive> --into <dir> --force   # overwrite a non-empty dir
//
// The archive is a plain uncompressed `tar` built here rather than shelled out to, so the tool has
// no dependency on a `tar` binary being present and behaves the same on every platform.
// ============================================================

import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
  rmSync,
  accessSync,
  constants as FS,
} from 'node:fs';
import { join, resolve, relative, dirname, basename, sep } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

// ★ fileURLToPath, never URL.pathname: this repository's path contains spaces, and pathname
// percent-encodes them, which silently produced a HERE that matched nothing — the CLI guard below
// then never fired and the tool exited 0 having done nothing at all.
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

/** The databases that must go through SQLite's own backup API rather than a file copy. */
export const SQLITE_FILES = ['sessions.sqlite', 'races.sqlite'];

/** Transient SQLite side files: never archived, and they may vanish while we are listing. */
export const SQLITE_SIDE = /(^|\/)[^/]+\.sqlite-(journal|wal|shm)$|(^|\/)[^/]+-(journal|wal|shm)$/;

/** The per-store overrides that can move ONE store out of the data root. */
export const STORE_OVERRIDES = [
  ['RA_USERS_DB', 'users.json'],
  ['RA_SESSION_DB', 'sessions.sqlite'],
  ['RA_RACES_DB', 'races.sqlite'],
];

export class BackupRefusal extends Error {}

/**
 * Every override that points somewhere the data root does not contain.
 * Exported so the tests can drive it without running a backup.
 */
export function strayOverrides(dataRoot, env = process.env) {
  const rootAbs = resolve(dataRoot);
  const stray = [];
  for (const [name, expected] of STORE_OVERRIDES) {
    const v = env[name];
    if (!v) continue;
    const abs = resolve(v);
    const inside = abs === rootAbs || abs.startsWith(rootAbs + sep);
    if (!inside) stray.push({ name, value: v, resolved: abs, expected });
  }
  return stray;
}

/** UTC stamp with no characters a filesystem dislikes: 20260924T143001Z. */
export function stampUtc(d = new Date()) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/** The archive name. Two backups in the same second on the same root would still collide, so the
 *  seconds-resolution stamp is the naming rule and the tests pin it. */
export function archiveName(d = new Date()) {
  return `racearena-backup-${stampUtc(d)}.tar`;
}

// ── a minimal, correct USTAR writer ────────────────────────────────────────────────────────────
// Written here rather than shelled out to `tar`: Windows has no tar with the same flags, and a
// backup tool that depends on an external binary fails on the machine where it is needed most.
function tarHeader(name, size, mtime) {
  const h = Buffer.alloc(512);
  const put = (s, off, len) => h.write(String(s).slice(0, len), off, len, 'utf8');
  // POSIX ustar splits a long path into prefix(155) + name(100).
  let nm = name.replace(/\\/g, '/');
  let prefix = '';
  if (Buffer.byteLength(nm) > 100) {
    const cut = nm.lastIndexOf('/', nm.length - 100);
    if (cut < 0) throw new BackupRefusal(`path too long for a tar entry: ${name}`);
    prefix = nm.slice(0, cut);
    nm = nm.slice(cut + 1);
    if (Buffer.byteLength(prefix) > 155 || Buffer.byteLength(nm) > 100)
      throw new BackupRefusal(`path too long for a tar entry: ${name}`);
  }
  put(nm, 0, 100);
  put('0000644', 100, 7);
  put('0000000', 108, 7);
  put('0000000', 116, 7);
  put(size.toString(8).padStart(11, '0'), 124, 12);
  put(Math.floor(mtime / 1000).toString(8).padStart(11, '0'), 136, 12);
  h.write('        ', 148, 8, 'utf8'); // checksum placeholder: eight spaces
  put('0', 156, 1); // type 0 = regular file
  put('ustar', 257, 6);
  put('00', 263, 2);
  put(prefix, 345, 155);
  let sum = 0;
  for (const b of h) sum += b;
  put(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8);
  return h;
}

const pad512 = (n) => (n % 512 === 0 ? 0 : 512 - (n % 512));

function walk(dir, base = dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) walk(abs, base, out);
    else if (e.isFile()) out.push(relative(base, abs).split(sep).join('/'));
  }
  return out;
}

/**
 * Take the backup. Returns a manifest; throws BackupRefusal rather than writing a partial archive.
 */
export async function backup({ dataRoot, outDir, env = process.env, now = new Date(), log = () => {} }) {
  const root = resolve(dataRoot);
  if (!existsSync(root) || !statSync(root).isDirectory())
    throw new BackupRefusal(`data root does not exist or is not a directory: ${root}`);

  const stray = strayOverrides(root, env);
  if (stray.length) {
    const lines = stray.map((s) => `  ${s.name}=${s.value}\n    resolves to ${s.resolved}, which is OUTSIDE ${root}`);
    throw new BackupRefusal(
      'REFUSING: a per-store override points outside the data root, so a backup of the root alone ' +
        'would be silently incomplete.\n' +
        lines.join('\n') +
        '\nBack that store up yourself, or unset the variable so the store lives under the data root.'
    );
  }

  const out = resolve(outDir);
  mkdirSync(out, { recursive: true });
  try {
    accessSync(out, FS.W_OK);
  } catch {
    throw new BackupRefusal(`target directory is not writable: ${out}`);
  }
  if (resolve(out) === root || resolve(out).startsWith(root + sep))
    throw new BackupRefusal(`the archive must be written OUTSIDE the data root; ${out} is inside ${root}`);

  const archivePath = join(out, archiveName(now));
  if (existsSync(archivePath)) throw new BackupRefusal(`archive already exists: ${archivePath}`);

  log(`data root : ${root}`);

  // ── 1 · the databases, through SQLite's own online backup ────────────────────────────────────
  const staging = join(out, `.ra-backup-staging-${stampUtc(now)}`);
  mkdirSync(staging, { recursive: true });
  const items = [];
  try {
    let Database = null;
    for (const f of SQLITE_FILES) {
      const src = join(root, f);
      if (!existsSync(src)) {
        log(`sqlite    : ${f} — absent, skipped`);
        continue;
      }
      if (!Database) {
        const mod = await import(pathToFileURL(join(ROOT, 'server', 'node_modules', 'better-sqlite3', 'lib', 'index.js')).href)
          .catch(() => import('better-sqlite3'));
        Database = mod.default ?? mod;
      }
      const dst = join(staging, f);
      const db = new Database(src, { readonly: true });
      try {
        await db.backup(dst); // ★ the online backup API — consistent while the server writes
      } finally {
        db.close();
      }
      if (!existsSync(dst)) throw new BackupRefusal(`sqlite backup produced no file for ${f}`);
      items.push({ name: f, from: dst, bytes: statSync(dst).size, how: 'sqlite .backup()' });
      log(`sqlite    : ${f} — ${statSync(dst).size} bytes (online backup)`);
    }

    // ── 2 · everything else, as files ──────────────────────────────────────────────────────────
    for (const rel of walk(root)) {
      if (SQLITE_FILES.includes(rel)) continue; // already taken, consistently
      // ★★ SQLITE SIDE FILES ARE NEVER ARCHIVED, AND `-journal` IS THE ONE THAT BIT. The rollback
      // journal, the WAL and the shared-memory file are transient state belonging to a database we
      // have already copied CONSISTENTLY through `.backup()`. Archiving them would be worse than
      // useless: restoring a stale journal beside a consistent snapshot invites SQLite to roll the
      // snapshot back to something that never existed. They also come and go between the directory
      // listing and the read — the under-load test in DELIVERY-BACKUP-1 crashed on exactly that,
      // `races.sqlite-journal` vanishing mid-run, which the quiet test could never have found.
      if (SQLITE_SIDE.test(rel)) continue;
      const abs = join(root, rel);
      try {
        accessSync(abs, FS.R_OK);
      } catch {
        throw new BackupRefusal(`cannot read an item under the data root, refusing rather than writing a partial archive: ${abs}`);
      }
      items.push({ name: rel, from: abs, bytes: statSync(abs).size, how: 'file copy' });
    }

    // ── 3 · one archive ────────────────────────────────────────────────────────────────────────
    const chunks = [];
    for (const it of items) {
      // ★ A file that disappears between the listing and the read is NOT ignored. A side file is
      // already excluded above, so anything vanishing here is real data changing under us, and a
      // silent skip is precisely the half-archive this tool refuses to produce.
      if (!existsSync(it.from))
        throw new BackupRefusal(
          `an item vanished while the backup was running, refusing rather than writing a partial archive: ${it.from}`
        );
      const body = readFileSync(it.from);
      chunks.push(tarHeader(it.name, body.length, statSync(it.from).mtimeMs), body, Buffer.alloc(pad512(body.length)));
    }
    chunks.push(Buffer.alloc(1024)); // two empty blocks end a tar
    writeFileSync(archivePath, Buffer.concat(chunks));
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }

  const total = items.reduce((s, i) => s + i.bytes, 0);
  log(`items     : ${items.length} (${total} bytes before archiving)`);
  log(`archive   : ${archivePath} (${statSync(archivePath).size} bytes)`);
  return { archivePath, items, dataRoot: root, bytes: total };
}

// ── restore ────────────────────────────────────────────────────────────────────────────────────
// ★ WHY IT IS A MODE OF THIS FILE AND NOT A SECOND SCRIPT: the archive layout, the entry-name rule
// and the list of files that need special handling are ONE fact. Split across two files they would
// be one fact in two places, and the restore would drift from the backup exactly when nobody is
// looking. The brief asked which and why; this is the one-canonical-home rule applied to a format.
export function restore({ archivePath, into, force = false, log = () => {} }) {
  const arc = resolve(archivePath);
  if (!existsSync(arc)) throw new BackupRefusal(`archive not found: ${arc}`);
  const dst = resolve(into);
  if (existsSync(dst) && readdirSync(dst).length > 0 && !force)
    throw new BackupRefusal(`target is not empty: ${dst} — pass --force to overwrite into it`);
  mkdirSync(dst, { recursive: true });

  const buf = readFileSync(arc);
  let off = 0;
  const written = [];
  while (off + 512 <= buf.length) {
    const h = buf.subarray(off, off + 512);
    if (h.every((b) => b === 0)) break;
    const str = (o, l) => h.subarray(o, o + l).toString('utf8').replace(/\0.*$/, '');
    const name = str(0, 100);
    const prefix = str(345, 155);
    const full = prefix ? `${prefix}/${name}` : name;
    const size = parseInt(str(124, 12).trim() || '0', 8);
    off += 512;
    const body = buf.subarray(off, off + size);
    off += size + pad512(size);
    const target = join(dst, full);
    if (!resolve(target).startsWith(dst + sep) && resolve(target) !== dst)
      throw new BackupRefusal(`archive entry escapes the target directory: ${full}`);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, body);
    written.push({ name: full, bytes: size });
  }
  log(`restored  : ${written.length} item(s) into ${dst}`);
  return { into: dst, items: written };
}

// ── CLI ────────────────────────────────────────────────────────────────────────────────────────
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(HERE, 'backup.mjs');
if (isMain) {
  const arg = (k) => {
    const i = process.argv.indexOf(`--${k}`);
    return i >= 0 ? process.argv[i + 1] : null;
  };
  const { resolveDataRoot } = await import(pathToFileURL(join(ROOT, 'server/src/dataPaths.js')).href);
  try {
    if (process.argv.includes('--restore')) {
      const archive = arg('restore');
      const into = arg('into') ?? resolveDataRoot();
      restore({ archivePath: archive, into, force: process.argv.includes('--force'), log: console.log });
    } else {
      const outDir = arg('out');
      if (!outDir) throw new BackupRefusal('usage: node scripts/backup.mjs --out <dir>');
      await backup({ dataRoot: resolveDataRoot(), outDir, log: console.log });
    }
  } catch (e) {
    console.error(e instanceof BackupRefusal ? `\n${e.message}\n` : e);
    process.exit(1);
  }
}
