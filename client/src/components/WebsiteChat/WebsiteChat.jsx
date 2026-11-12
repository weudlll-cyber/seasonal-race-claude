// ============================================================
// File:        WebsiteChat.jsx
// Path:        client/src/components/WebsiteChat/WebsiteChat.jsx
// Project:     RaceArena — WEBSITE-EXTRAS-1 piece 7b (OWNER-5, the owner's decision of 2026-11-11)
// Created:     2026-11-12
// Description: The Seasonal Entertainment website's chat, its room `race`, framed below a page's own
//              content. WEBSITE MODE ONLY: in standalone it renders nothing at all — no frame, no
//              request. Placed on exactly two screens, by the owner's decision: the public join page
//              (JoinPage.jsx) and the director's registrations (RegistrationPanel.jsx, the list and
//              one registration's detail). NEVER on the race screen, the start ceremony, the result
//              screen or the full-screen QR stage — nothing shown to an audience mounts it.
//
// ── THE WEBSITE'S EMBED, AS ITS docs/EMBED.md GIVES IT ─────────────────────────────────────────
//   src     `/embed/chat?room=race&theme=auto` — the website's own page, on the same origin as the race
//           (the race runs under the website's /games/race), so a site-root path, NOT under the
//           race's base path (EMBED.md:49, the race's row; :207-209 "a relative one on this site").
//   title   "Chat" (the snippet, EMBED.md:214; Bingo's frame too, ChatDock.tsx:162).
//   size    full width, 32rem high, no border (EMBED.md:216).
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
// ── BELOW THE CONTENT, IN THE PAGE'S OWN PANEL STYLE ───────────────────────────────────────────
// It comes after everything the page is for, so on a phone the join form and the registration
// controls are never pushed down by it. `loading="lazy"`: the frame loads when it is scrolled near.
// ============================================================

import { SITE_MODE } from '../../modules/runtimeMarker.js';
import styles from './WebsiteChat.module.css';

/** The website's embed page for the race's room (the website's docs/EMBED.md:49). */
export const WEBSITE_CHAT_SRC = '/embed/chat?room=race&theme=auto';

/**
 * @param {{ className?: string }} props  the host page's own panel class, so it looks like the page
 */
export default function WebsiteChat({ className = '' }) {
  if (SITE_MODE !== 'website') return null;
  return (
    <section className={`${styles.chat} ${className}`} aria-label="Chat">
      <h2 className={styles.title}>Chat</h2>
      <iframe
        className={styles.frame}
        title="Chat"
        src={WEBSITE_CHAT_SRC}
        loading="lazy"
        referrerPolicy="strict-origin"
        data-testid="website-chat"
      />
    </section>
  );
}
