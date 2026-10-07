// ============================================================
// File:        heapdiff.mjs
// Path:        reports/release/SOAK-1/heapdiff.mjs
// Project:     RaceArena
// Created:     2026-10-07
// Description: SOAK-1 step 2a — compares V8 heap snapshots (from inproc.mjs) by what they hold:
//              objects grouped by node type and constructor name, with count and self size, and the
//              groups that grew most between the first snapshot and each later one.
//
// Usage: node --max-old-space-size=8192 heapdiff.mjs <a.heapsnapshot> <b.heapsnapshot> [...]
// ============================================================

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

function summarise(file) {
  const snap = JSON.parse(readFileSync(file, 'utf8'));
  const { node_fields: fields, node_types: types } = snap.snapshot.meta;
  const typeNames = types[0];
  const F = fields.length;
  const iType = fields.indexOf('type');
  const iName = fields.indexOf('name');
  const iSize = fields.indexOf('self_size');
  const groups = new Map();
  let total = 0;
  const nodes = snap.nodes;
  for (let i = 0; i < nodes.length; i += F) {
    const type = typeNames[nodes[i + iType]];
    let name = snap.strings[nodes[i + iName]];
    // Strings and code are grouped by type only: their "names" are their contents.
    if (type === 'string' || type === 'concatenated string' || type === 'sliced string' || type === 'code' || type === 'number') name = '';
    const key = `${type}:${name.slice(0, 80)}`;
    const size = nodes[i + iSize];
    const g = groups.get(key) ?? { count: 0, size: 0 };
    g.count += 1;
    g.size += size;
    groups.set(key, g);
    total += size;
  }
  return { file: basename(file), nodes: nodes.length / F, totalMiB: +(total / 1048576).toFixed(2), groups };
}

const files = process.argv.slice(2);
const sums = files.map(summarise);
const first = sums[0];
const out = { snapshots: sums.map(({ file, nodes, totalMiB }) => ({ file, nodes, totalMiB })), growth: [] };
for (const s of sums.slice(1)) {
  const rows = [];
  for (const [key, g] of s.groups) {
    const a = first.groups.get(key) ?? { count: 0, size: 0 };
    rows.push({ key, dCount: g.count - a.count, dKiB: +((g.size - a.size) / 1024).toFixed(1), count: g.count, KiB: +(g.size / 1024).toFixed(1) });
  }
  rows.sort((x, y) => y.dKiB - x.dKiB);
  out.growth.push({ from: first.file, to: s.file, top: rows.slice(0, 15) });
}
console.log(JSON.stringify(out, null, 2));
