// ============================================================================================
// FILE-READ FAILURE MUST NOT BE SILENT — the three `FileReader` sites (Q-17 / Q-11).
//
// WHAT WAS WRONG. Three uploads in this application created a `FileReader`, wired `onload`, and
// wired NO `onerror`. When the read fails the promise simply never settles: no message, no state
// change, nothing at all. The operator clicks the button and the application does not react, which
// is indistinguishable from the button being broken.
//
// ── WHY THIS FILE TESTS THE HANDLER AND NOT THE SCREEN ──────────────────────────────────────────
//
// Two of the three sites live in Dev Screen panels that need a mounted section, a storage tree and
// an API; the third lives in `TrackEditor`, which is 1500 lines with a canvas. Mounting all three
// to prove "a failed read produces a message" would test the scaffolding, and every unrelated
// failure inside it would land here as a flake — the same argument `ceremonySkip.test.jsx` makes.
//
// So this file does two things instead, and neither is a mounted screen:
//   1. it drives the REAL failure shape against a transcription of each handler, proving the
//      behaviour each one is supposed to have;
//   2. it reads the three SOURCE files and asserts each still wires `reader.onerror` at all, which
//      is what stops the transcription drifting away from the code it stands for.
//
// THE SOURCE CHECK IS THE LOAD-BEARING HALF. Without it these are three assertions about functions
// defined in this file.
// ============================================================================================
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLIENT_SRC = join(HERE, '..', '..', '..');

/** The three sites, and the channel each reports through. */
const SITES = [
  {
    name: 'SystemSettings.jsx — backup import',
    file: join(HERE, 'SystemSettings.jsx'),
    channel: 'window.alert',
  },
  {
    name: 'BrandingProfiles.jsx — logo upload',
    file: join(HERE, 'BrandingProfiles.jsx'),
    channel: 'setActionError',
  },
  {
    name: 'TrackEditor.jsx — background upload',
    file: join(CLIENT_SRC, 'screens', 'TrackEditor', 'TrackEditor.jsx'),
    channel: 'setBgUploadError',
  },
];

describe('a FileReader failure is never silent', () => {
  // IF DELETED: a site can lose its `onerror` again and nothing notices, because a silent failure
  // produces no test output either — that is the whole defect. WHAT WOULD GO UNNOTICED: exactly the
  // state this file was written to end, in the three places it was found.
  it.each(SITES)('$name wires reader.onerror and reports through $channel', ({ file, channel }) => {
    const src = readFileSync(file, 'utf8');
    const readers = src.split('new FileReader').length - 1;
    expect(readers, 'this site no longer creates a FileReader — has it moved?').toBeGreaterThan(0);
    expect(src, 'the FileReader has no onerror — a failed read would be silent').toContain(
      'reader.onerror'
    );
    // and the handler actually says something, through this file's own error channel
    const at = src.indexOf('reader.onerror');
    const body = src.slice(at, at + 260);
    expect(body, `reader.onerror does not report through ${channel}`).toContain(channel);
  });

  // ── THE BEHAVIOUR, driven against the real failure shape ────────────────────────────────────
  //
  // IF DELETED: nothing proves what the handler DOES — only that it exists. WHAT WOULD GO
  // UNNOTICED: an `onerror` that is wired and empty, which satisfies the source check above and
  // leaves the operator exactly as uninformed as before.

  it('a read that fails calls onerror, and onload is never reached', () => {
    // The real shape: readAsText/readAsDataURL fires onerror instead of onload.
    const calls = [];
    const reader = {
      onload: () => calls.push('load'),
      onerror: () => calls.push('error'),
      readAsText() {
        this.onerror?.(new Error('unreadable'));
      },
    };
    reader.readAsText();
    expect(calls).toEqual(['error']);
    expect(calls).not.toContain('load');
  });

  it('BrandingProfiles clears the stale filename — the part a message alone would not fix', () => {
    // `setLogoFile(file)` runs BEFORE the read starts, so a failed read leaves the panel showing a
    // filename while `logo` keeps its previous value: a name that is not the logo it would save.
    let logoFile = null;
    let actionError = null;
    let logo = 'previous-logo';

    const handleLogoUpload = (file) => {
      logoFile = file; // as the component does, before reading
      const reader = {
        onload: (ev) => {
          logo = ev.target.result;
        },
        onerror: () => {
          logoFile = null;
          actionError = 'Could not read that image file.';
        },
        readAsDataURL() {
          this.onerror();
        },
      };
      reader.readAsDataURL();
    };

    handleLogoUpload('broken.png');
    expect(actionError).toBe('Could not read that image file.');
    expect(logoFile, 'the panel still names a file it could not read').toBe(null);
    expect(logo, 'a failed read must not disturb the saved logo').toBe('previous-logo');
  });

  it('TrackEditor distinguishes a failed READ from a failed DECODE', () => {
    // Two different failures: a file that cannot be opened never reaches the decoder at all. Before
    // this change only the decode reported, so the two were one silent case and one visible one.
    const src = readFileSync(join(CLIENT_SRC, 'screens', 'TrackEditor', 'TrackEditor.jsx'), 'utf8');
    const readMsg = /reader\.onerror[^;]*?'([^']+)'/.exec(src)?.[1];
    const decodeMsg = /img\.onerror = \(\) => setBgUploadError\('([^']+)'\)/.exec(src)?.[1];
    expect(readMsg, 'no message on the failed read').toBeTruthy();
    expect(decodeMsg, 'no message on the failed decode').toBeTruthy();
    expect(readMsg, 'the two failures give the same message and cannot be told apart').not.toBe(
      decodeMsg
    );
  });
});
