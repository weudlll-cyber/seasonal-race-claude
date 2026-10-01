// ============================================================
// File:        bindAddress.test.js
// Path:        server/src/bindAddress.test.js
// Project:     RaceArena — RELEASE-BASICS-1 (c)
//
// Both values are tested by LISTENING, not only by reading the variable: the claim is about which
// interface a real socket is bound to, and only `server.address()` can confirm it.
// ============================================================

import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import { resolveBindAddress, listenOn } from './bindAddress.js';

const open = [];
afterEach(async () => {
  while (open.length) await new Promise((r) => open.pop().close(r));
});

function listen(address) {
  return new Promise((resolve, reject) => {
    const server = listenOn(express(), 0, address, () => resolve(server));
    server.on('error', reject);
    open.push(server);
  });
}

describe('resolveBindAddress — reading the setting', () => {
  it.each([[undefined], [''], ['   ']])('unset or blank (%j) → null, today’s default', (v) => {
    expect(resolveBindAddress({ RA_BIND_ADDRESS: v })).toBeNull();
  });
  it('an IPv4 literal is taken, trimmed', () => {
    expect(resolveBindAddress({ RA_BIND_ADDRESS: ' 127.0.0.1 ' })).toBe('127.0.0.1');
  });
  it('an IPv6 literal is taken', () => {
    expect(resolveBindAddress({ RA_BIND_ADDRESS: '::1' })).toBe('::1');
  });
  it.each([['localhost'], ['example.com'], ['127.0.0.1:4000'], ['http://127.0.0.1']])(
    'refuses a value that is not an IP literal (%s), naming the variable',
    (v) => {
      expect(() => resolveBindAddress({ RA_BIND_ADDRESS: v })).toThrow(/RA_BIND_ADDRESS/);
    }
  );
});

describe('listenOn — the socket actually bound', () => {
  it('DEFAULT (no setting): listens on every interface, as before', async () => {
    const server = await listen(resolveBindAddress({}));
    // `::` on a dual-stack host, `0.0.0.0` where IPv6 is absent — both mean "every interface".
    expect(['::', '0.0.0.0']).toContain(server.address().address);
  });
  it('RA_BIND_ADDRESS=127.0.0.1: listens on loopback only', async () => {
    const server = await listen(resolveBindAddress({ RA_BIND_ADDRESS: '127.0.0.1' }));
    expect(server.address().address).toBe('127.0.0.1');
  });
});
