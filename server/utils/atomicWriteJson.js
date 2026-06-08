import { writeFileSync, renameSync, unlinkSync } from 'node:fs';

// Write JSON atomically: write to .tmp then rename.
// On Windows with OneDrive, renameSync can transiently fail with EPERM.
// Fall back to a direct overwrite and clean up the .tmp file in that case.
export function atomicWriteJson(filePath, data) {
  const json = JSON.stringify(data, null, 2);
  const tmp = filePath + '.tmp';
  writeFileSync(tmp, json, 'utf8');
  try {
    renameSync(tmp, filePath);
  } catch {
    writeFileSync(filePath, json, 'utf8');
    try { unlinkSync(tmp); } catch {}
  }
}
