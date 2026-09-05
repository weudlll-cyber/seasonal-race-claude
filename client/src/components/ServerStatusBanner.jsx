// ============================================================
// File:        ServerStatusBanner.jsx
// Path:        client/src/components/ServerStatusBanner.jsx
// Project:     RaceArena — SERVER-GONE-1
//
// THE SERVER IS GONE AND THE PLAYER IS TOLD, IN THE INTERFACE.
//
// ── WHY THIS EXISTS ────────────────────────────────────────────────────────────────────────────
//
// Every failure was already handled and every one of them was announced to the CONSOLE.
// `trackLoader.js` warns that it is "showing N track(s) from the last successful load";
// `AuthContext.jsx` quietly falls to `offline-hint`. The result is a screen that looks exactly like
// a working one — the same list, the same buttons — while the list is stale or empty and half the
// buttons cannot do anything. Nobody running a race in a room full of people has a console open.
//
// ── WHAT IT SAYS, AND WHY IT NAMES WHAT STILL WORKS ────────────────────────────────────────────
//
// "The server is not answering" on its own leaves the reader to guess whether the evening is over.
// It is not: the race itself is entirely client-side, and the tracks already on this device are
// enough to run one. So the banner states the boundary — what still works, and what does not — which
// is the difference between a warning and an instruction.
//
// ── WHAT IT IS NOT ─────────────────────────────────────────────────────────────────────────────
//
// It does not retry, poll or reconnect: it renders `serverStatus.js`, which only records what the
// application's own requests already found out. It is not an offline mode and does not pretend the
// server is there — the actions that need the server keep failing exactly as they did, and say so
// themselves. And it renders NOTHING in the `unknown` state, before anything has been tried, because
// a status line that guesses is worse than none.
// ============================================================

import { useSyncExternalStore } from 'react';
import { getServerStatus, subscribeServerStatus } from '../modules/serverStatus.js';
import './ServerStatusBanner.css';

export default function ServerStatusBanner() {
  const status = useSyncExternalStore(subscribeServerStatus, getServerStatus, getServerStatus);

  if (status !== 'unreachable') return null;

  return (
    <div className="server-status-banner" role="status" data-testid="server-status-banner">
      <span className="server-status-banner__dot" aria-hidden="true" />
      <span>
        <strong>The server is not answering.</strong> You can still set up and run races with the
        tracks already on this device, and see the results. Signing in, saving, and editing tracks,
        racers or branding need the server and will fail until it is back.
      </span>
    </div>
  );
}
