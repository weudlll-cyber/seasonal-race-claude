// ============================================================
// File:        WebsiteChat.test.jsx
// Path:        client/src/components/WebsiteChat/WebsiteChat.test.jsx
// Project:     RaceArena — WEBSITE-EXTRAS-1 piece 7b (OWNER-5)
// Created:     2026-11-12
// Description: The website chat frame:
//                · standalone renders NOTHING (no button, no frame, no section);
//                · website mode (the owner's decision of 2026-11-13): a "Chat" button, CLOSED by
//                  default — no iframe in the DOM, aria-expanded false; a click opens the website's
//                  embed exactly — src /embed/chat?room=race&theme=auto at the site root, title
//                  "Chat", referrerpolicy strict-origin; the same button closes it again (the frame
//                  leaves the DOM); a fresh mount starts closed (nothing stored);
//                · ★ WHERE it can appear, by the source: exactly two files import it — the join page
//                  and the director's registration panel. The race screen, the result screen, the
//                  start ceremony and every other screen cannot draw a component they never import.
//              The mode comes from the server's runtime marker, read when runtimeMarker.js is
//              imported, so each mode gets a fresh module graph (vi.resetModules).
// ============================================================

import { render, screen, cleanup, fireEvent } from '@testing-library/react';
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
    expect(screen.queryByRole('button', { name: 'Chat' })).toBeNull();
  });

  it('★ website mode: closed by default — a "Chat" button, and no frame in the DOM', async () => {
    const WebsiteChat = await chatIn('website');
    const { container } = render(<WebsiteChat />);
    const button = screen.getByRole('button', { name: 'Chat' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('region', { name: 'Chat' })).toBeTruthy();
  });

  it("★ a click opens the website's embed exactly; the same button closes it again", async () => {
    const WebsiteChat = await chatIn('website');
    const { container } = render(<WebsiteChat />);
    const button = screen.getByRole('button', { name: 'Chat' });
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const frame = screen.getByTestId('website-chat');
    expect(frame.tagName).toBe('IFRAME');
    expect(button.getAttribute('aria-controls')).toBe(frame.id);
    // A site-root path, NOT under the race's base path: the website's own page.
    expect(frame.getAttribute('src')).toBe('/embed/chat?room=race&theme=auto');
    expect(frame.getAttribute('title')).toBe('Chat');
    expect(frame.getAttribute('referrerpolicy')).toBe('strict-origin');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('the open state is not stored: a new mount starts closed', async () => {
    const WebsiteChat = await chatIn('website');
    const first = render(<WebsiteChat />);
    fireEvent.click(screen.getByRole('button', { name: 'Chat' }));
    expect(first.container.querySelector('iframe')).not.toBeNull();
    first.unmount();
    const second = render(<WebsiteChat />);
    expect(second.container.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('button', { name: 'Chat' }).getAttribute('aria-expanded')).toBe(
      'false'
    );
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
