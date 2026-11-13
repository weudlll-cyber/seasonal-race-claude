// ============================================================
// File:        WebsiteChat.test.jsx
// Path:        client/src/components/WebsiteChat/WebsiteChat.test.jsx
// Project:     RaceArena — WEBSITE-EXTRAS-1 piece 7b (OWNER-5)
// Created:     2026-11-12
// Description: The website chat's button and side panel (the owner's decisions of 2026-11-13):
//                · standalone renders NOTHING (no button, no panel, no frame);
//                · website mode: a "Chat" button in the Setup screen's secondary button style
//                  (quickTestBtn), CLOSED by default — no panel, no iframe, aria-expanded false;
//                · a click opens the panel: an <aside> "Chat" with the fixed full-height class,
//                  its header (title, × "Close chat") and the website's embed exactly — src
//                  /embed/chat?room=race&theme=auto at the site root, title "Chat", referrerpolicy
//                  strict-origin; focus moves to the ×;
//                  the ×, Escape and the Chat button each close it (the frame leaves the DOM) and
//                  focus returns to the Chat button; a fresh mount starts closed (nothing stored);
//                · the panel's rule, read from the stylesheet: fixed to the right edge, 100dvh high,
//                  min(24rem, 100vw) wide, the whole window at the mobile width;
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
import styles from './WebsiteChat.module.css';
import setupStyles from '../../screens/SetupScreen/SetupScreen.module.css';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', '..');

async function chatIn(mode) {
  vi.resetModules();
  globalThis.__RA_RUNTIME_CONFIG__ =
    mode === 'website'
      ? { apiBaseUrl: '/games/race', basePath: '/games/race', mode: 'website' }
      : undefined;
  return (await import('./WebsiteChat.jsx')).default;
}

/** Opens the panel; returns the Chat button. */
async function openChat() {
  const WebsiteChat = await chatIn('website');
  const view = render(<WebsiteChat />);
  const button = screen.getByRole('button', { name: 'Chat' });
  fireEvent.click(button);
  return { button, ...view };
}

/** One rule's declarations from the chat's stylesheet ("" when the selector is not there). */
function ruleOf(css, selector) {
  const at = css.indexOf(`${selector} {`);
  return at < 0 ? '' : css.slice(at, css.indexOf('}', at));
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

  it('★ website mode: closed by default — a styled "Chat" button, no box, no panel, no frame', async () => {
    const WebsiteChat = await chatIn('website');
    const { container } = render(<WebsiteChat className="host" />);
    const button = screen.getByRole('button', { name: 'Chat' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.classList.contains(setupStyles.quickTestBtn)).toBe(true);
    expect(button.classList.contains('host')).toBe(true);
    // Nothing around the closed button.
    expect(container.firstElementChild).toBe(button);
    expect(container.children).toHaveLength(1);
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.queryByTestId('website-chat-panel')).toBeNull();
  });

  it("★ a click opens the panel — fixed class, header, the website's embed exactly", async () => {
    const { button } = await openChat();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const panel = screen.getByRole('complementary', { name: 'Chat' });
    expect(panel.classList.contains(styles.panel)).toBe(true);
    expect(button.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.querySelector('h2').textContent).toBe('Chat');
    const close = screen.getByRole('button', { name: 'Close chat' });
    expect(close.textContent).toBe('×');
    expect(close.classList.contains(setupStyles.removeBtn)).toBe(true);
    expect(document.activeElement).toBe(close);
    const frame = screen.getByTestId('website-chat');
    expect(frame.tagName).toBe('IFRAME');
    expect(panel.contains(frame)).toBe(true);
    // A site-root path, NOT under the race's base path: the website's own page.
    expect(frame.getAttribute('src')).toBe('/embed/chat?room=race&theme=auto');
    expect(frame.getAttribute('title')).toBe('Chat');
    expect(frame.getAttribute('referrerpolicy')).toBe('strict-origin');
  });

  it('★ the × closes it, and focus returns to the Chat button', async () => {
    const { button, container } = await openChat();
    fireEvent.click(screen.getByRole('button', { name: 'Close chat' }));
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.queryByTestId('website-chat-panel')).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('★ Escape closes it, and focus returns to the Chat button', async () => {
    const { button, container } = await openChat();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('iframe')).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('the Chat button closes it again too', async () => {
    const { button, container } = await openChat();
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

  it("★ the panel's rule: fixed to the right edge, full window height, the whole window on a phone", () => {
    const css = readFileSync(join(HERE, 'WebsiteChat.module.css'), 'utf8');
    const panel = ruleOf(css, '.panel');
    expect(panel).toMatch(/position: fixed;/);
    expect(panel).toMatch(/top: 0;/);
    expect(panel).toMatch(/right: 0;/);
    expect(panel).toMatch(/height: 100dvh;/);
    expect(panel).toMatch(/width: min\(24rem, 100vw\);/);
    const phone = css.slice(css.indexOf('@media (max-width: 768px)'));
    expect(ruleOf(phone, '.panel')).toMatch(/width: 100vw;/);
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
