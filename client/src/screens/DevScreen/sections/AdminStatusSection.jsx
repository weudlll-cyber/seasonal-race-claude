// ============================================================
// File:        AdminStatusSection.jsx
// Path:        client/src/screens/DevScreen/sections/AdminStatusSection.jsx
// Project:     RaceArena — AUDIT-1 D2 (the admin status box)
// Description: THE STATUS BOX at the top of the Dev Screen chapter "Accounts and system": four
//              read-only lines — the build, the newest backup, the overall status and whether a
//              newer release exists — from `GET /api/admin/status`. Admins only, twice over: the
//              part is advanced tier (the All view, which only an admin has), and this component
//              renders nothing for anyone else, so it never asks the server a question the server
//              would refuse. Nothing here can change anything — there is no button.
//
// Every answer is shown as the server gave it, and an unknown is shown as unknown: the server
// never guesses a build, a backup it cannot see, or a release it could not ask about, and this box
// does not turn any of those into a reassuring line either.
// ============================================================

import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { fetchAdminStatus } from '../../../services/adminStatusApi.js';
import { Info } from './ControlInfo.jsx';
import s from '../DevScreen.module.css';

const CONTROL_ID = 'AdminStatusSection:admin-status-box';

/** An instant the server sent, in this browser's local time; the raw value if it is not one. */
function when(iso) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString();
}

function buildLine(build) {
  if (!build) return 'unknown';
  const known = build.commit !== 'unknown' || build.branch !== 'unknown';
  if (!known) return `unknown${build.reason ? ` — ${build.reason}` : ''}`;
  const dirty = build.dirty === true ? ' (with uncommitted changes)' : '';
  const why = build.reason ? ` — ${build.reason}` : '';
  return `${build.commit} on ${build.branch}${dirty}${why}`;
}

function backupLine(backup) {
  if (!backup?.visible) return 'not visible from the app';
  return backup.newest ? when(backup.newest) : 'none found in the backup directory';
}

function statusLine(status) {
  if (!status) return 'unknown';
  const failed = status.checks.filter((c) => !c.ok);
  const ran = status.checks.map((c) => c.name).join(', ');
  if (status.ok) return `OK — ${ran}`;
  return `FAILED — ${failed.map((c) => `${c.name}: ${c.detail}`).join('; ')}`;
}

function releaseLine(release) {
  if (!release || release.state !== 'ok') return 'unknown';
  const checked = release.checkedAt ? ` (checked ${when(release.checkedAt)})` : '';
  if (!release.newest) return `no release published yet${checked}`;
  if (release.newer === true)
    return `yes — ${release.newest} is newer than this build (${release.current})${checked}`;
  if (release.newer === false) return `no — this build is ${release.current}${checked}`;
  return `newest release is ${release.newest}; this build's version is not known, so it cannot be compared${checked}`;
}

function AdminStatusSection() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let live = true;
    fetchAdminStatus()
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e?.message ?? 'unknown error'));
    return () => {
      live = false;
    };
  }, [isAdmin]);

  if (!isAdmin) return null;

  const rows = data
    ? [
        ['Build', buildLine(data.build)],
        ['Newest backup', backupLine(data.backup)],
        ['Status', statusLine(data.status)],
        ['Newer release', releaseLine(data.release)],
      ]
    : null;

  return (
    <div className={s.card} data-control-id={CONTROL_ID} data-testid="admin-status-box">
      <div className={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
        Installation status (read-only)
        <Info id={CONTROL_ID} />
      </div>
      {error && (
        <p className={s.sectionDesc} role="alert">
          The status could not be read from the server: {error}
        </p>
      )}
      {!error && !rows && <p className={s.sectionDesc}>Reading the status…</p>}
      {rows && (
        <table className={s.table} style={{ marginTop: '0.5rem' }}>
          <tbody>
            {rows.map(([label, value]) => (
              <tr
                key={label}
                data-testid={`admin-status-${label.toLowerCase().replace(/ /g, '-')}`}
              >
                <th scope="row">{label}</th>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AdminStatusSection;
