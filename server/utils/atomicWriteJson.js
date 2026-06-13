import { writeFileSync, renameSync, unlinkSync } from 'node:fs';

// Write JSON atomically: write to .tmp then rename.
// On Windows with OneDrive, renameSync can transiently fail with EPERM.
// Fall back to a direct overwrite and clean up the .tmp file in that case.
// mode applies to freshly created files only; an already-existing target keeps
// its permissions (callers needing tight perms on an existing file must chmod explicitly).
export function atomicWriteJson(filePath, data, { mode } = {}) {
  const json = JSON.stringify(data, null, 2);
  const tmp = filePath + '.tmp';
  writeFileSync(tmp, json, { encoding: 'utf8', mode });
  try {
    renameSync(tmp, filePath);
  } catch {
    writeFileSync(filePath, json, { encoding: 'utf8', mode });
    try { unlinkSync(tmp); } catch {}
  }
}
