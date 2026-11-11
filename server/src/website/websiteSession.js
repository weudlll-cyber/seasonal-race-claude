// ============================================================
// File:        websiteSession.js
// Path:        server/src/website/websiteSession.js
// Project:     RaceArena — WEBSITE-EMBED-1 piece 3a
// Created:     2026-11-11
// Description: Is a session made through the website still good? ONE answer, used by the guard for
//              website directors (auth/guards.js) and by the join page for website players
//              (routes/join.js, piece 4). A session is good while its member is known, not locked,
//              not deleted, and the session's epoch is the identity's epoch — the same comparison
//              `sessionEpoch` gets for a user record. Nothing here reads a header: the identity was
//              read once, at <base>/auth/website (websiteSignIn.js), and lives in the session.
// ============================================================

import { getDefaultIdentityStore } from './identityStore.js';

/** The fields a website sign-in writes into the session (websiteSignIn.js). */
export const SESSION_FIELDS = Object.freeze({
  member: 'websiteMember', // { websiteUserId, displayName }
  epoch: 'websiteEpoch',
});

/**
 * The identity behind a website session, when the session is still good; otherwise null.
 * @param {object|undefined} session
 * @param {{ get: (id: string) => object|null }} [identities]
 */
export function liveWebsiteIdentity(session, identities = getDefaultIdentityStore()) {
  const member = session?.[SESSION_FIELDS.member];
  if (!member?.websiteUserId) return null;
  const identity = identities.get(member.websiteUserId);
  if (!identity || identity.locked || identity.deleted) return null;
  if ((session[SESSION_FIELDS.epoch] ?? -1) !== identity.epoch) return null;
  return identity;
}

/**
 * The signed-in website member on this request — a player, or a director joining a race as a
 * player — or null. What the join page reads (piece 4).
 * @returns {{ websiteUserId: string, displayName: string } | null}
 */
export function currentWebsiteMember(req, identities) {
  const identity = liveWebsiteIdentity(req.session, identities);
  if (!identity) return null;
  return { websiteUserId: identity.websiteUserId, displayName: identity.displayName };
}

/**
 * For the guard: may this website DIRECTOR record still act? Its session must be good AND the last
 * sign-in must still have mapped the member to a director role — a host whose rights were revoked
 * signs in again as a player, which bumps the epoch, so the director session on any other device
 * ends on its next request.
 */
export function websiteDirectorSessionOk(session, user, identities) {
  const identity = liveWebsiteIdentity(session, identities);
  return (
    !!identity &&
    identity.websiteUserId === user.websiteUserId &&
    (identity.mappedRole === 'operator' || identity.mappedRole === 'admin')
  );
}
