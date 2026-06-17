// Defense-in-depth guard for record-stored asset filenames.
// Asset dirs are flat (filename only, no sub-paths), so any separator or
// special character is a sign of a corrupt or malicious stored value.
export function isSafeAssetFilename(name) {
  return (
    typeof name === 'string' &&
    name.length > 0 &&
    name !== '.' &&
    name !== '..' &&
    !name.includes('/') &&
    !name.includes('\\') &&
    !name.includes('\0') &&
    !name.includes(':')
  );
}
