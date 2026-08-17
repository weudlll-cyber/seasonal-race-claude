// ============================================================
// File:        ChangePasswordSection.test.jsx
// Path:        client/src/screens/DevScreen/sections/ChangePasswordSection.test.jsx
// Project:     RaceArena — SELF-PASSWORD-1
// Description: The form's own behaviour. What the REQUEST looks like and what the server does
//              with it is not tested here and must not be — that is the seam, and it is covered
//              by server/src/auth/changePasswordContract.test.js, which drives the real
//              `authApi.changePassword` against the real handler. A mocked context here can only
//              show that this component calls what it says it calls; believing such a test could
//              see the wire is exactly what hid the setup-token defect for months.
//
//              WHAT BREAKS IF EACH TEST IS DELETED is written above each one.
// ============================================================

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const changePassword = vi.fn();

vi.mock('../../../contexts/AuthContext.jsx', () => ({
  useAuth: () => ({ changePassword }),
}));

import ChangePasswordSection from './ChangePasswordSection.jsx';

function fill(current, next, confirm) {
  fireEvent.change(screen.getByLabelText('Current password'), { target: { value: current } });
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: next } });
  fireEvent.change(screen.getByLabelText('Repeat new password'), { target: { value: confirm } });
}

const submit = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /change password/i }));
  });
};

beforeEach(() => {
  changePassword.mockReset();
  changePassword.mockResolvedValue({ ok: true });
});

describe('ChangePasswordSection', () => {
  // DELETE THIS and the form could stop passing the current password — the one field that stops a
  // stolen session becoming a permanent takeover — while still looking correct on screen.
  it('sends the current and the new password, in that order, and nothing else', async () => {
    render(<ChangePasswordSection />);
    fill('old-pass', 'new-pass', 'new-pass');
    await submit();

    expect(changePassword).toHaveBeenCalledTimes(1);
    expect(changePassword).toHaveBeenCalledWith('old-pass', 'new-pass');
  });

  // DELETE THIS and a typo in the repeated password would be sent as the new password, locking the
  // user out of the account they were trying to secure.
  it('refuses to submit when the two new passwords differ', async () => {
    render(<ChangePasswordSection />);
    fill('old-pass', 'new-pass', 'new-pss');
    await submit();

    expect(changePassword).not.toHaveBeenCalled();
  });

  // DELETE THIS and a rejected change could look like a successful one — the failure mode this
  // repository has spent a week removing.
  it('shows the server error and does not claim success', async () => {
    changePassword.mockRejectedValue(new Error('invalid credentials'));
    render(<ChangePasswordSection />);
    fill('wrong-pass', 'new-pass', 'new-pass');
    await submit();

    expect(await screen.findByText('invalid credentials')).toBeInTheDocument();
    expect(screen.queryByText('Password changed.')).toBeNull();
  });

  // DELETE THIS and a successful change could leave the old values sitting in the inputs, where
  // the next person at the machine reads the password that was just set.
  it('confirms success and clears the fields', async () => {
    render(<ChangePasswordSection />);
    fill('old-pass', 'new-pass', 'new-pass');
    await submit();

    expect(await screen.findByText('Password changed.')).toBeInTheDocument();
    expect(screen.getByLabelText('Current password')).toHaveValue('');
    expect(screen.getByLabelText('New password')).toHaveValue('');
    expect(screen.getByLabelText('Repeat new password')).toHaveValue('');
  });

  // DELETE THIS and the form could submit with empty fields, spending a bcrypt comparison and a
  // rate-limit slot on a request that cannot succeed.
  it('cannot be submitted until all three fields are filled', () => {
    render(<ChangePasswordSection />);
    const button = screen.getByRole('button', { name: /change password/i });
    expect(button).toBeDisabled();

    fill('old-pass', 'new-pass', 'new-pass');
    expect(button).toBeEnabled();
  });
});
