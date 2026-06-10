export function avg(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

export function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

// p95 uses Math.ceil(n×0.95)-1 with bounds clamping. Clamping never fires for
// non-empty arrays (idx ∈ [0, n-1] always), but guards against empty-array calls.
export function p95(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil(s.length * 0.95) - 1;
  return s[Math.max(0, Math.min(s.length - 1, idx))];
}

export function stddev(arr, mean) {
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}
