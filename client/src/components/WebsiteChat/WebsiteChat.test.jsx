// ============================================================
// File:        WebsiteChat.test.jsx
// Path:        client/src/components/WebsiteChat/WebsiteChat.test.jsx
// Project:     RaceArena — WEBSITE-EXTRAS-1 piece 7b (OWNER-5)
// Created:     2026-11-12
// Description: The website chat frame:
//                · standalone renders NOTHING (no frame, no section);
//                · website mode renders the website's embed exactly — src
//                  /embed/chat?room=race&theme=auto at the site root, title "Chat", lazy,
//                  referrerpolicy strict-origin;
//                · ★ WHERE it can appear, by the source: exactly two files import it — the join page
//                  and the director's registration panel. The race screen, the result screen, the
//                  start ceremony and every other screen cannot draw a component they never import.
//              The mode comes from the server's runtime marker, read when runtimeMarker.js is
//              imported, so each mode gets a fresh module graph (vi.resetModules).
// ============================================================

import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

async function chatIn(mode) {
  vi.resetModules();
  globalThis.__RA_RUNTIME_CONFIG__ =
    mode === 'website'
      ? { apiBaseUrl: '/games/race', basePath: '/games/race', mode: 'website' }
      : undefined;
  return (await import('./WebsiteChat.jsx')).default;
}

afterEach(() => {
  cleanup();
  delete globalThis.__RA_RUNTIME_CONFIG__;
});

describe('WebsiteChat', () => {
  it('★ standalone renders nothing at all', async () => {
    const WebsiteChat = await chatIn('standalone');
    const { container } = render(<WebsiteChat />);
    expect(container.innerHTML).toBe('');
    expect(screen.queryByTestId('website-chat')).toBeNull();
  });

  it("★ website mode renders the website's embed exactly", async () => {
    const WebsiteChat = await chatIn('website');
    render(<WebsiteChat />);
    const frame = screen.getByTestId('website-chat');
    expect(frame.tagName).toBe('IFRAME');
    // A site-root path, NOT under the race's base path: the website's own page.
    expect(frame.getAttribute('src')).toBe('/embed/chat?room=race&theme=auto');
    expect(frame.getAttribute('title')).toBe('Chat');
    expect(frame.getAttribute('loading')).toBe('lazy');
    expect(frame.getAttribute('referrerpolicy')).toBe('strict-origin');
    expect(screen.getByRole('region', { name: 'Chat' })).toBeTruthy();
  });
});

describe('★ where the chat can appear, by the source', () => {
  /** Every client source file (tests excluded), relative to client/src, forward slashes. */
  function sources(dir = SRC, out = []) {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) sources(path, out);
      else if (/\.(jsx?|tsx?)$/.test(name) && !/\.test\./.test(name)) {
        out.push(relative(SRC, path).split('\\').join('/'));
      }
    }
    return out;
  }

  it('exactly the join page and the registration panel import it — nothing an audience sees', () => {
    const importers = sources()
      .filter((f) => !f.startsWith('components/WebsiteChat/'))
      .filter((f) =>
        /WebsiteChat\/WebsiteChat(\.jsx)?['"]/.test(readFileSync(join(SRC, f), 'utf8'))
      )
      .sort();
    expect(importers).toEqual([
      'screens/Join/JoinPage.jsx',
      'screens/SetupScreen/RegistrationPanel.jsx',
    ]);
  });
});
