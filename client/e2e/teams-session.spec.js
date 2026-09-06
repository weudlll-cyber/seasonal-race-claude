// ============================================================
// File:        client/e2e/teams-session.spec.js
// Path:        client/e2e/teams-session.spec.js
// Project:     RaceArena — TEAMS-1
//
// THE WHOLE PATH, IN A BROWSER: an admin assigns a team, and the team is on the session the
// assigned user gets when THEY sign in.
//
// ── WHY THIS SPEC EXISTS AND WHY UNIT TESTS WERE NOT ENOUGH ─────────────────────────────────────
// The store refuses a create with no team, and the client sends the one the admin picked. Both are
// proved at the unit layer (server/src/auth/teams.test.js, UserManagementSection.test.jsx) and both
// would keep passing if the two halves never met — a form field that is never forwarded, a router
// that drops it, a session that never carries it. The team is about to become the key that decides
// whose races a person can see, so the failure mode of a gap here is not an error: it is a user who
// sees nothing, months later, for no visible reason.
//
// So this drives the REAL controls in the REAL app: the admin's own form creates the account, the
// operator logs in through the login form, and the assertion is made against the session that
// login issued — not against a value this spec put there.
//
// ── WHAT "THE SESSION CARRIES THE TEAM" IS ASSERTED AGAINST ─────────────────────────────────────
// `/api/auth/me` is fetched FROM THE PAGE, with `credentials: 'include'`, so the request rides the
// same session cookie the browser is holding after the login form was submitted. Using Playwright's
// `request` fixture instead would open a separate context and prove nothing about the browser's
// session. The team in that response was never typed by this spec on the operator's side: it came
// from the record the admin created, through the session, back to the page.
// ============================================================

import { test, expect } from '@playwright/test';
import { E2E } from './e2e-env.js';

/** The team the isolated instance founds at setup — see server/src/auth/teams.js. */
const FOUNDING_TEAM = 'Seasonal Entertainment';

/** A fresh operator per run, so a re-run never collides with a leftover account. */
function newOperator() {
  const suffix = Math.random().toString(36).slice(2, 10);
  return { username: `teamop-${suffix}`, password: `pw-${suffix}-123` };
}

/** Read /api/auth/me over the BROWSER's own session cookie. */
async function sessionUser(page) {
  return page.evaluate(async (apiUrl) => {
    const res = await fetch(`${apiUrl}/api/auth/me`, { credentials: 'include' });
    return { status: res.status, body: res.ok ? await res.json() : null };
  }, E2E.apiUrl);
}

async function signOut(page) {
  await page.getByRole('button', { name: /log out/i }).click();
  await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
}

async function signIn(page, { username, password }) {
  await page.getByLabel(/username/i).fill(username);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(
    page,
    `sign-in as ${username} did not leave /login`
  ).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

test.describe('TEAMS-1 — the admin assigns a team and the session carries it', () => {
  // ── THIS SPEC SIGNS ITSELF IN, AND THAT IS NOT A STYLE CHOICE ─────────────────────────────────
  // Every other spec inherits `storageState` from `auth.setup.js` and starts logged in. This one
  // must SIGN OUT to do its job, and logging out DESTROYS THAT SESSION ON THE SERVER — the cookie
  // saved in `e2e/.auth/state.json` would still be sent by every later spec in the run and would
  // no longer authenticate anything. Inheriting the shared state here would leave this file
  // passing and strand whatever ran after it, which is the exact ordering coupling `auth.setup.js`
  // was written to remove.
  //
  // So this describe block starts from an EMPTY browser state and logs in with the same
  // credentials, giving it a session of its own to destroy. Discovered by running it, not
  // reasoned about in advance: the second test failed with no User Management button because the
  // first test had logged the suite out from under it.
  test.use({ storageState: { cookies: [], origins: [] } });

  /** Sign in as the admin the run created for itself, into this test's own session. */
  async function signInAsAdmin(page) {
    await page.goto('/login');
    await signIn(page, { username: E2E.username, password: E2E.password });
  }

  test('an admin creates a user with a team; that user signs in and their session has it', async ({ page }) => {
    const operator = newOperator();

    // ── 1. The admin — the account auth.setup.js created, which is the first admin and therefore
    // the founder of the first team.
    await signInAsAdmin(page);
    await page.goto('/dev');
    const admin = await sessionUser(page);
    expect(admin.status, 'the suite should start signed in as the admin').toBe(200);
    expect(admin.body.role).toBe('admin');
    // The founding team is asserted here rather than assumed, because everything below picks it
    // out of a list: if setup ever stopped founding it, the failure should name that.
    expect(admin.body.team, 'setup founds the first team').toBe(FOUNDING_TEAM);

    // ── 2. Create the user THROUGH THE ADMIN'S OWN FORM.
    await page.getByRole('button', { name: /User Management/i }).click();
    await expect(page.getByRole('heading', { name: /User Management/i })).toBeVisible();

    const teamSelect = page.locator('#um-team');
    await expect(teamSelect, 'the Team control is a picker, not a free-text box').toBeVisible();
    // The team is CHOSEN from what exists. Nothing is typed, which is the point of the control.
    await teamSelect.selectOption(FOUNDING_TEAM);

    await page.locator('#um-username').fill(operator.username);
    await page.locator('#um-password').fill(operator.password);
    await page.getByRole('button', { name: /add user/i }).click();

    // The list is the admin's own view of what was stored.
    await expect(
      page.getByText(operator.username, { exact: true }),
      'the new user should appear in the list'
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByLabel(`Team for ${operator.username}`),
      'the new user is listed with a team'
    ).toHaveValue(FOUNDING_TEAM);

    // ── 3. Sign out, and sign in as the user who was just assigned that team.
    await signOut(page);
    await signIn(page, operator);

    // ── 4. THE ASSERTION THIS SPEC EXISTS FOR.
    const session = await sessionUser(page);
    expect(session.status, 'the operator should have a live session').toBe(200);
    expect(session.body.username).toBe(operator.username);
    expect(session.body.role).toBe('operator');
    expect(
      session.body.team,
      'the session of the newly created user must carry the team the admin assigned'
    ).toBe(FOUNDING_TEAM);
  });

  test('the admin cannot create a user with no team at all', async ({ page }) => {
    const operator = newOperator();

    await signInAsAdmin(page);
    await page.goto('/dev');
    await page.getByRole('button', { name: /User Management/i }).click();

    await page.locator('#um-username').fill(operator.username);
    await page.locator('#um-password').fill(operator.password);

    // "New team…" with nothing typed is the only way to reach the form with no team named. The
    // create must be REFUSED rather than quietly filed under whatever team happens to be first.
    await page.locator('#um-team').selectOption('__new__');

    await expect(
      page.getByRole('button', { name: /add user/i }),
      'a create with no team named must not be submittable'
    ).toBeDisabled();

    // And the account really was not created: log in as it and be refused.
    await signOut(page);
    await page.getByLabel(/username/i).fill(operator.username);
    await page.getByLabel(/password/i).fill(operator.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page, 'the un-created user must not be able to sign in').toHaveURL(/\/login/);
  });
});
