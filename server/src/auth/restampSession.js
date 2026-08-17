// ============================================================
// File:        restampSession.js
// Path:        server/src/auth/restampSession.js
// Project:     RaceArena
// Created:     2026-08-19
// Description: THE ONE PLACE that keeps a self-password-change from logging the changer out.
//
//              WHY THIS IS A MODULE AND NOT TWO COPIES
//              ───────────────────────────────────────
//              Session invalidation has exactly one mechanism: `updateUser` bumps the user
//              record's `sessionEpoch` inside the same serialised write that stores the new
//              hash, and `requireAuth` (guards.js) rejects any session whose stored epoch
//              differs. Two routes can change a password — `PUT /api/users/:id` (an admin
//              editing a record, possibly their own) and `POST /api/auth/change-password`
//              (anyone changing their own) — and BOTH need the requesting session to survive
//              its own change. Written inline twice, that is two definitions of one rule and
//              they would drift. It is written once, here.
//
//              This does NOT invalidate anything and must never learn how to. Every OTHER
//              session of that user keeps the old epoch and dies on its next request, which is
//              the whole point; this only re-stamps the ONE session in front of us.
// ============================================================

/**
 * Re-stamp the requesting session with the user's current sessionEpoch, so the session that
 * just changed its own password survives the bump it caused.
 *
 * FAILURE POLICY: a failure here invalidates MORE, never less. The password change is already
 * committed to disk, so the caller must still report success — the only consequence is that the
 * requester falls back to logging in again, exactly as they had to before this existed. What is
 * refused is doing that quietly, hence the error log.
 *
 * @param {object} req      the Express request (must carry a session)
 * @param {object} store    the users store (for the freshly written record)
 * @param {string} userId   the user whose epoch to adopt — ALWAYS the requesting session's own
 * @returns {Promise<boolean>} true if the session was persisted with the new epoch
 */
export async function restampSession(req, store, userId) {
  if (!req?.session) return false;

  const fresh = store.findAuthRecordById(userId);
  req.session.sessionEpoch = fresh?.sessionEpoch ?? 0;

  return new Promise((resolve) => {
    req.session.save((err) => {
      if (err) {
        console.error(
          `[auth] session re-stamp failed for user ${userId}; the password WAS changed and this session will be logged out:`,
          err.message
        );
        resolve(false);
        return;
      }
      resolve(true);
    });
  });
}
