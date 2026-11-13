// ============================================================
// File:        WebsiteChat.jsx
// Path:        client/src/components/WebsiteChat/WebsiteChat.jsx
// Project:     RaceArena — WEBSITE-EXTRAS-1 piece 7b (OWNER-5, the owner's decision of 2026-11-11)
// Created:     2026-11-12
// Description: The Seasonal Entertainment website's chat, its room `race`: a "Chat" button that
//              opens it as a side panel fixed to the window's right edge (the owner's decisions of
//              2026-11-13). WEBSITE MODE ONLY: in standalone it renders nothing at all — no button,
//              no frame, no request. Placed on exactly two screens, by the owner's decision: the
//              public join page (JoinPage.jsx) and the director's registrations
//              (RegistrationPanel.jsx, the list and one registration's detail). NEVER on the race
//              screen, the start ceremony, the result screen or the full-screen QR stage — nothing
//              shown to an audience mounts it.
//
// ── THE WEBSITE'S EMBED, AS ITS docs/EMBED.md GIVES IT ─────────────────────────────────────────
//   src     `/embed/chat?room=race&theme=auto` — the website's own page, on the same origin as the race
//           (the race runs under the website's /games/race), so a site-root path, NOT under the
//           race's base path (EMBED.md:49, the race's row; :207-209 "a relative one on this site").
//   title   "Chat" (the snippet, EMBED.md:214; Bingo's frame too, ChatDock.tsx:162).
//   size    no border (EMBED.md:216); it fills the panel below the panel's header.
//   login   the website's own session cookie, as on any page of the site (EMBED.md:33-37): a member
//           sees the room; a guest sees what the website shows a guest of a members-only room.
//   referrer  `strict-origin` on the FRAME only: the website asks the game to keep a referrer so the
//           frame can identify its parent (its GAME-INTEGRATION.md "Required"), while the race's pages
//           keep their own Referrer-Policy (helmet's no-referrer, as Bingo's and Mini Games' do) —
//           so nothing about standalone's headers changes.
//   messages  none: the race neither counts unread messages nor sizes the frame (Bingo does not use
//           them either, GAME-INTEGRATION.md "Current"); the frame works without them.
// The CSP lets it in by `frame-src 'self'`, in website mode only (server/src/csp.js).
//
// ── A BUTTON, AND A SIDE PANEL WHILE OPEN (the owner's decisions of 2026-11-13, a trial) ─────────
// The button: the Setup screen's secondary button (`quickTestBtn`, composed in the CSS), with
// aria-expanded; no box around it. Open: an <aside> fixed to the window's right edge, the full window
// height (100dvh), min(24rem, 100vw) wide — the whole window on a phone — with its own header ("Chat"
// and a × close button, aria-label "Close chat") and the frame filling the rest. Being fixed, it
// takes no room in the page: the page underneath neither moves nor scrolls because of it. Escape and
// the × close it, so does the Chat button again; focus moves to the × on open and back to the Chat
// button on close. As Seasonal Bingo Royale does it (its apps/web/src/shell/ChatDock.tsx:5-14), except,
// by the owner's words: the open/closed state is NOT stored (Bingo remembers it per browser), and
// closing REMOVES the frame (Bingo keeps it hidden) — so nothing of the chat loads before the click.
// ============================================================

import { useEffect, useId, useRef, useState } from 'react';
import { SITE_MODE } from '../../modules/runtimeMarker.js';
import styles from './WebsiteChat.module.css';

/** The website's embed page for the race's room (the website's docs/EMBED.md:49). */
export const WEBSITE_CHAT_SRC = '/embed/chat?room=race&theme=auto';

/**
 * @param {{ className?: string }} props  the host page's placement for the button (its margins)
 */
export default function WebsiteChat({ className = '' }) {
  if (SITE_MODE !== 'website') return null;
  return <ChatToggle className={className} />;
}

/** The button and, only while open, the panel. Its own component so standalone calls no hook. */
function ChatToggle({ className }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toggleRef = useRef(null);
  const closeRef = useRef(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      // Back to the button — only after a close, never on the first render.
      if (wasOpen.current) toggleRef.current?.focus();
      wasOpen.current = false;
      return undefined;
    }
    wasOpen.current = true;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        className={`${styles.toggle} ${className}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((was) => !was)}
        data-testid="website-chat-toggle"
      >
        Chat
      </button>
      {open && (
        <aside
          id={panelId}
          className={styles.panel}
          aria-label="Chat"
          data-testid="website-chat-panel"
        >
          <div className={styles.head}>
            <h2 className={styles.title}>Chat</h2>
            <button
              ref={closeRef}
              type="button"
              className={styles.close}
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              data-testid="website-chat-close"
            >
              ×
            </button>
          </div>
          <iframe
            className={styles.frame}
            title="Chat"
            src={WEBSITE_CHAT_SRC}
            referrerPolicy="strict-origin"
            data-testid="website-chat"
          />
        </aside>
      )}
    </>
  );
}
