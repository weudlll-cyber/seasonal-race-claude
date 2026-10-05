// ============================================================
// File:        reports/evolution/DEVSCREEN-CHAPTERS-1/count-controls.mjs
// Project:     RaceArena — DEVSCREEN-CHAPTERS-1 (the Plan D design, 2026-10-04)
//
// COUNTS EVERY CONTROL THE DEV SCREEN RENDERS, from source, so the number can be re-run rather than
// believed. Read-only: it reads the Dev Screen's source files and prints; it writes nothing.
//
// WHAT A CONTROL IS HERE. One thing a person can change or trigger on the Dev Screen: an input, a
// select, a textarea, a checkbox, a slider, a stepper, a pill row, or a button that acts (Save,
// Reset, Export, Delete, Run again, Verify race, Cancel, Close, page forward/back...). This is WIDER
// than docs/DEVSCREEN-INVENTORY.md, which left out reset links, export buttons and other buttons; the
// design document states the difference.
//
// HOW ONE CONTROL IS RECOGNISED — mechanically, per source file:
//   1. Every opening tag of a control element is found: <input <select <textarea <button, and the
//      Dev Screen's own control helpers <SliderRow <RangeSlider (one control each), <SubCard and
//      <SubHeading (one Reset button each, only when they are given onReset), <DefaultControls (two
//      admin-only buttons), <VerifyCell (one admin-only button), <StateProfileBlock (one Reset button
//      plus the fields of PROFILE_FIELDS) and <ConfigFields (the union of every surface generator's
//      configSchema fields).
//   2. Tags INSIDE those helpers' own definitions are templates, not controls, and are skipped; the
//      helper is counted where it is USED. A hidden <input type="file"> is skipped (its visible
//      button is the control). The sidebar's chapter-navigation button is skipped: it is the
//      screen's structure, not a control to place.
//   3. Each control gets an IDENTITY: the config key it writes if a literal one is visible
//      (set('key'), set({ key: }), setDynamics('key'), f('key'), ...); else its literal data-testid
//      (testId=, resetTestId=); else the handler it calls. Controls are de-duplicated by identity
//      within one file — so a pill row is ONE control, a −/+ stepper is ONE control, and a colour
//      picker plus its hex field (both writing the same key) is ONE control.
//   4. A control rendered inside a .map() over a literal array of { key: '...' } objects, whose key
//      is a variable, is expanded to one control per key in that array — also when the control is
//      the template of a local render function that the arrays map over (`LIST.map(renderX)`).
//
// WHAT CANNOT BE COUNTED BLIND, and how it is handled: nothing is counted by hand. The two
// helper expansions that depend on data outside the file (PROFILE_FIELDS for the camera's zoom
// profiles, and every generator's configSchema for surface classes) are READ from source by this
// script. Per-entity controls (one Edit button per track, one row of buttons per user) exist once in
// source and are counted once, as docs/DEVSCREEN-INVENTORY.md counted them.
//
// Usage:
//   node reports/evolution/DEVSCREEN-CHAPTERS-1/count-controls.mjs          # per-file counts + total
//   node reports/evolution/DEVSCREEN-CHAPTERS-1/count-controls.mjs --list   # every control, one line each
//   node reports/evolution/DEVSCREEN-CHAPTERS-1/count-controls.mjs --json   # the same, machine-readable
// ============================================================

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const DEV = join(ROOT, 'client/src/screens/DevScreen');
const LIST = process.argv.includes('--list');
const JSON_OUT = process.argv.includes('--json');

const files = [
  join(DEV, 'DevScreen.jsx'),
  ...readdirSync(join(DEV, 'sections'))
    .filter((n) => n.endsWith('.jsx') && !n.includes('.test.'))
    .map((n) => join(DEV, 'sections', n)),
  ...readdirSync(join(DEV, 'components'))
    .filter((n) => n.endsWith('.jsx') && !n.includes('.test.'))
    .map((n) => join(DEV, 'components', n)),
];

// Helpers whose OWN definitions hold template tags (skipped) and which are counted where used.
const TEMPLATE_DEFS = [
  'SliderRow',
  'StateProfileBlock',
  'ConfigFields',
  'SubHeading',
  'SubCard',
  'ResetButton',
  'RangeSlider',
  'DefaultControls',
  'VerifyCell',
];

const TAG_RE =
  /<(input|select|textarea|button|SliderRow|RangeSlider|SubCard|SubHeading|DefaultControls|VerifyCell|StateProfileBlock|ConfigFields)\b/g;

// Read the attribute span of an opening tag: from `<Tag` to the `>` that closes it at brace depth 0.
function openingTag(text, start) {
  let depth = 0;
  let quote = null;
  for (let i = start + 1; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') {
        i++;
        continue;
      }
      if (c === quote) quote = null;
      continue;
    }
    if (depth > 0 && (c === "'" || c === '"' || c === '`')) {
      quote = c;
      continue;
    }
    if (depth === 0 && c === '"') {
      quote = c;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) return text.slice(start, i + 1);
  }
  return text.slice(start);
}

// The character ranges of `function Name(` ... matching `}` — template definitions.
// The index of the `}` closing the body of the function declared at `at`.
function functionBodyEnd(text, at) {
  const bodyStart = text.indexOf('{', text.indexOf(')', at));
  let depth = 0;
  for (let i = bodyStart; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return i;
  }
  return text.length;
}

function defRanges(text) {
  const out = [];
  for (const name of TEMPLATE_DEFS) {
    const re = new RegExp(`(?:export\\s+)?function\\s+${name}\\s*\\(`, 'g');
    let m;
    while ((m = re.exec(text))) out.push([m.index, functionBodyEnd(text, m.index)]);
  }
  return out;
}

// Blank out /* */ blocks and whole-line // comments, keeping every character position (and line).
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^(\s*)\/\/.*$/gm, (m, ws) => ws + ' '.repeat(m.length - ws.length));
}

const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

// The literal key a control writes, if one is visible in its own tag.
const KEY_RES = [
  /\bset(?:Dynamics|FrameTiming|Speed|Behavior|Row)?\(\s*'(\w+)'/,
  /\bset\(\{\s*(\w+):/,
  /\bf\(\s*'(\w+)'/,
  /\.\.\.(?:f|p|prev),\s*(\w+):/,
];
function literalKey(tag) {
  for (const re of KEY_RES) {
    const m = tag.match(re);
    if (m) return m[1];
  }
  return null;
}
const DYNAMIC_KEY_RE =
  /\b(?:set|setDynamics|setFrameTiming|setSpeed|setBehavior|setRow)\(\s*key\b/;

function literalTestId(tag) {
  const m = tag.match(/\b(?:data-testid|testId|resetTestId)="([^"]+)"/);
  return m ? m[1] : null;
}

function handlerOf(tag) {
  const direct = tag.match(/\bon(?:Click|Change|Reset|Verify)=\{\s*(\w+)\s*\}/);
  if (direct) return direct[1];
  const at = tag.search(/\bon(?:Click|Change|Reset|Verify)=\{\s*\([^)]*\)\s*=>/);
  if (at < 0) return null;
  // The arrow's body: from after `=>` to the `}` that closes the attribute's `{`.
  const open = tag.indexOf('{', at);
  let depth = 0;
  let end = tag.length;
  for (let i = open; i < tag.length; i++) {
    if (tag[i] === '{') depth++;
    else if (tag[i] === '}' && --depth === 0) {
      end = i;
      break;
    }
  }
  const body = tag.slice(tag.indexOf('=>', at) + 2, end).trim();
  const calls = [...body.matchAll(/([A-Za-z_][\w.?]*)\(([^()]*)/g)].filter(
    (c) => !/^(e\.stopPropagation|Math\.\w+|Number|parseInt|parseFloat)$/.test(c[1])
  );
  if (!calls.length) return null;
  // A block that calls several setters (Clear Filters) is identified by all of them.
  if (body.startsWith('{') && calls.length > 1) return calls.map((c) => c[1]).join('+');
  const [, name, args] = calls[0];
  // The function NAME is the identity, so a segmented pair calling one function with different
  // literals (the View toggle) is one control, and the id is a token findable in the source.
  // navigate('/x') keeps its destination, because each destination is a different control.
  if (name === 'navigate') return args.includes('?') ? `navigate(${args.split('?')[0]}` : `navigate(${args})`;
  return name;
}

// The variable a control's handler is keyed on inside a .map() (`key`, `fieldName`, `field.key`).
function dynamicArg(tag) {
  const m = tag.match(/\b(?:handleChange|handleColorTextChange|handleEffectChange|onChange)\(\s*(key|fieldName|field\.key)\b/);
  return m ? m[1] : null;
}

// Keys of the literal array a .map() iterates, for a control at `idx` whose key is a variable.
function mappedKeys(text, idx) {
  const before = text.slice(0, idx);
  // The template of a local render function: the keys of every named array mapped over it.
  const fns = [...before.matchAll(/function\s+(\w+)\s*\(/g)];
  const fn = fns[fns.length - 1];
  if (fn && functionBodyEnd(text, fn.index) > idx) {
    const lists = [...text.matchAll(new RegExp(`(\\w+)\\.map\\(${fn[1]}\\)`, 'g'))];
    if (lists.length) return lists.flatMap((l) => arrayKeysOfConst(text, l[1]));
  }
  const mapAt = before.lastIndexOf('.map(');
  if (mapAt < 0) return null;
  // Inline array literal `[ ... ].map(` — walk back to its `[`.
  if (before[mapAt - 1] === ']') {
    let depth = 0;
    for (let i = mapAt - 1; i >= 0; i--) {
      if (before[i] === ']') depth++;
      else if (before[i] === '[') {
        depth--;
        if (depth === 0) {
          const arr = before.slice(i, mapAt);
          return [...arr.matchAll(/\bkey:\s*'(\w+)'/g)].map((m) => m[1]);
        }
      }
    }
  }
  // A named array `NAME.map(`: its own { key: '...' } entries, or — for the Racer Editor's
  // STANDARD_FIELDS, which is TUNABLE_FIELDS filtered in another file — the keys of FIELD_META, the
  // per-field description every rendered field must have (the modal reads FIELD_META[fieldName]).
  const named = before.slice(0, mapAt).match(/(\w+)\s*$/);
  if (named) {
    if (named[1] === 'STANDARD_FIELDS') return objectKeysOfConst(text, 'FIELD_META');
    const keys = arrayKeysOfConst(text, named[1]);
    if (keys.length) return keys;
  }
  return null;
}

function objectKeysOfConst(text, name) {
  const at = text.search(new RegExp(`const\\s+${name}\\s*=\\s*\\{`));
  if (at < 0) return [];
  const open = text.indexOf('{', at);
  let depth = 0;
  const keys = [];
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') {
      depth++;
      if (depth === 2) {
        const m = text.slice(open, i).match(/(\w+)\s*:\s*$/);
        if (m) keys.push(m[1]);
      }
    } else if (text[i] === '}' && --depth === 0) break;
  }
  return keys;
}

function arrayKeysOfConst(text, name) {
  const at = text.search(new RegExp(`const\\s+${name}\\s*=\\s*\\[`));
  if (at < 0) return [];
  let depth = 0;
  const open = text.indexOf('[', at);
  for (let i = open; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') {
      depth--;
      if (depth === 0) {
        // only top-level `key:` entries (objects directly inside the array)
        return [...text.slice(open, i).matchAll(/^\s{2,4}(?:\{\s*)?key:\s*'(\w+)'/gm)].map(
          (m) => m[1]
        );
      }
    }
  }
  return [];
}

function generatorSchemaKeys() {
  const dir = join(ROOT, 'client/src/modules/surface-effects/generators');
  const keys = new Set();
  for (const n of readdirSync(dir)) {
    if (!n.endsWith('.js') || n.includes('.test.')) continue;
    const t = readFileSync(join(dir, n), 'utf8');
    const at = t.indexOf('configSchema = [');
    if (at < 0) continue;
    const end = t.indexOf('\n];', at);
    for (const m of t.slice(at, end).matchAll(/\bkey:\s*'(\w+)'/g)) keys.add(m[1]);
  }
  return [...keys];
}

const all = [];
const perFile = [];

for (const abs of files) {
  const rel = relative(ROOT, abs).replace(/\\/g, '/');
  const text = stripComments(readFileSync(abs, 'utf8'));
  const defs = defRanges(text);
  const inDef = (i) => defs.some(([a, b]) => i > a && i < b);
  const seen = new Map();
  const add = (c) => {
    const k = `${c.idKind}:${c.id}`;
    if (seen.has(k)) {
      seen.get(k).sites.push(c.line);
      return;
    }
    c.sites = [c.line];
    seen.set(k, c);
  };
  let m;
  TAG_RE.lastIndex = 0;
  while ((m = TAG_RE.exec(text))) {
    const tagName = m[1];
    const idx = m.index;
    if (inDef(idx)) continue;
    const tag = openingTag(text, idx);
    const line = lineOf(text, idx);
    const base = { file: rel, line, tag: tagName };

    if (tagName === 'input' && /type="file"/.test(tag)) continue; // hidden picker
    if (tagName === 'button' && /setActiveId\(chapter\.id\)/.test(tag)) continue; // chapter nav

    if (tagName === 'SubCard' || tagName === 'SubHeading') {
      if (!/\bonReset=/.test(tag)) continue;
      add({ ...base, id: literalTestId(tag) ?? handlerOf(tag), idKind: literalTestId(tag) ? 'testId' : 'handler', kind: 'reset' });
      continue;
    }
    if (tagName === 'DefaultControls') {
      add({ ...base, id: 'handleSetDefault', idKind: 'handler', kind: 'admin-button' });
      add({ ...base, id: 'handleExportSeed', idKind: 'handler', kind: 'admin-button' });
      continue;
    }
    if (tagName === 'VerifyCell') {
      add({ ...base, id: 'verify-race', idKind: 'testId', kind: 'admin-button' });
      continue;
    }
    if (tagName === 'StateProfileBlock') {
      add({ ...base, id: 'resetProfileState', idKind: 'handler', kind: 'reset' });
      for (const k of arrayKeysOfConst(text, 'PROFILE_FIELDS'))
        add({ ...base, id: k, idKind: 'configKey', kind: 'profile-field' });
      continue;
    }
    if (tagName === 'ConfigFields') {
      for (const k of generatorSchemaKeys())
        add({ ...base, id: k, idKind: 'configKey', kind: 'generator-field' });
      continue;
    }

    const key = literalKey(tag);
    if (key) {
      add({ ...base, id: key, idKind: 'configKey', kind: tagName });
      continue;
    }
    if (DYNAMIC_KEY_RE.test(tag) || dynamicArg(tag)) {
      const keys = mappedKeys(text, idx);
      if (keys && keys.length) {
        for (const k of keys) add({ ...base, id: k, idKind: 'configKey', kind: `${tagName} (mapped)` });
        continue;
      }
    }
    if (tagName === 'button' && /type="submit"/.test(tag)) {
      const forms = [...text.slice(0, idx).matchAll(/<form\s+onSubmit=\{(\w+)\}/g)];
      if (forms.length) {
        add({ ...base, id: forms[forms.length - 1][1], idKind: 'handler', kind: 'submit' });
        continue;
      }
    }
    const tid = literalTestId(tag);
    if (tid) {
      add({ ...base, id: tid, idKind: 'testId', kind: tagName });
      continue;
    }
    const h = handlerOf(tag);
    if (h) {
      add({ ...base, id: h, idKind: 'handler', kind: tagName });
      continue;
    }
    add({ ...base, id: `UNIDENTIFIED@${line}`, idKind: 'unidentified', kind: tagName });
  }
  const list = [...seen.values()];
  perFile.push({ file: rel, count: list.length });
  all.push(...list);
}

if (JSON_OUT) {
  console.log(JSON.stringify(all, null, 2));
} else {
  if (LIST) {
    for (const c of all)
      console.log(`${c.file}:${c.sites.join(',')}  ${c.idKind}=${c.id}  (${c.kind})`);
    console.log('');
  }
  for (const { file, count } of perFile) if (count) console.log(`${String(count).padStart(4)}  ${file}`);
  const zero = perFile.filter((p) => p.count === 0).map((p) => p.file.split('/').pop());
  console.log(`   0  (no controls) ${zero.join(', ')}`);
  console.log(`${String(all.length).padStart(4)}  TOTAL`);
  const unidentified = all.filter((c) => c.idKind === 'unidentified');
  if (unidentified.length) {
    console.log(`\n${unidentified.length} control(s) with no identity found — inspect by hand:`);
    for (const c of unidentified) console.log(`  ${c.file}:${c.line} <${c.tag}>`);
    process.exitCode = 1;
  }
}
