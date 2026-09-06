// ============================================================
// File:        contentAddress.js
// Path:        server/src/races/contentAddress.js
// Project:     RaceArena — RACE-STORE-2
// Created:     2026-09-06
// Description: THE REFERENCE IS THE CONTENT. One function turns a value into the id it is stored
//              under, and this file is the argument for why that id is safe to trust.
//
// ── WHY CONTENT AND NOT A COUNTER ───────────────────────────────────────────────────────────────
// A roster and a set of tuned racer values repeat across races — they are four-fifths of the long
// identifier (IDENTIFIER-LENGTH-1) and they change rarely. Addressed by content, identical content
// lands ONCE and the second race that uses it is recognised as already stored, with no comparison
// pass and no "have I seen this" bookkeeping.
//
// The property that matters more is the one it gives for free: **a content address cannot be
// reassigned.** A counter id says "row 7", and row 7's meaning depends on what row 7 currently
// holds — so a later edit can change what an old race resolves to while every reference still
// looks correct. A content id says "the roster that hashes to abc…", which is a statement about a
// value, not about a slot. Change the values and you have named a different thing, so you get a
// different id and a different row, and last week's race keeps pointing at the row it always
// pointed at. That is the owner's requirement of 2026-09-06 made structural rather than obeyed.
//
// ── canonicalJson IS IMPORTED, NEVER COPIED ─────────────────────────────────────────────────────
// `client/src/modules/raceConfigWorld.js` carries the canonical serialiser, and its own header
// states the rule this file obeys: *"If either side ever re-implements this, the safeguard becomes
// the next silent divergence, so: never copy this logic — import it."* Two serialisers that
// disagree about key order would hash the same content to two ids, which is the dedup failing
// silently — exactly the class the module was written against.
//
// The import crosses from `server/` into `client/` and that is the ESTABLISHED pattern, not a new
// coupling: `scripts/sim-fairness.mjs:111` imports the same module the same way, and the module
// has NO imports of its own, so nothing client-only comes with it.
//
// ── WHY NOT `hashWorld` FROM THAT SAME MODULE ───────────────────────────────────────────────────
// It is FNV-1a folded to 32 bits — eight hex characters. That is a fine cache key and it is not a
// content address: at 32 bits a collision is expected among a few tens of thousands of values,
// which this store would reach and which would mean one race silently resolving to another race's
// roster. The serialisation is shared; the digest deliberately is not.
//
// ── HOW COLLISIONS ARE RULED OUT, in two parts ──────────────────────────────────────────────────
// 1. SHA-256. Finding two inputs with one digest is not something that happens by accident, and
//    nothing here is adversarial — the inputs are rosters and config values from the owner's own
//    Dev Screen, not attacker-supplied.
// 2. AND THE STORE DOES NOT RELY ON THAT ALONE. `raceStore.js` re-reads the stored content on
//    every insert whose id already exists and compares it byte for byte with what is being
//    written. Equal means this really is the same content and the row is reused; UNEQUAL THROWS.
//    So the guarantee is not "a collision is improbable" but "a collision is detected and refused
//    instead of corrupting a race" — the same shape as the store's other rules, where the unlikely
//    case is made loud rather than assumed away.
// ============================================================

import { createHash } from 'node:crypto';
import { canonicalJson } from '../../../client/src/modules/raceConfigWorld.js';

/**
 * The canonical string a value is hashed and stored as. Exported because the store writes THIS
 * string into the row — storing the bytes that were hashed, rather than re-serialising later, is
 * what lets the collision check above be a byte comparison.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function canonicalString(value) {
  return canonicalJson(value);
}

/**
 * The id a value is stored under: SHA-256 of its canonical form, hex.
 *
 * @param {unknown} value
 * @returns {string} 64 hex characters
 */
export function contentId(value) {
  return createHash('sha256').update(canonicalString(value), 'utf8').digest('hex');
}
