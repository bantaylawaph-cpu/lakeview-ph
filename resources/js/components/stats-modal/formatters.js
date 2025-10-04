// Shared numeric formatting helpers
export function trimFixed(s) {
  if (typeof s !== 'string') s = String(s ?? '');
  if (!s.includes('.')) return s;
  let out = s.replace(/0+$/,'');
  if (out.endsWith('.')) out = out.slice(0, -1);
  return out;
}

export function fmt(v) {
  if (v == null) return '';
  const x = Number(v);
  if (!Number.isFinite(x)) return String(v);
  if (x === 0) return '0';
  const ax = Math.abs(x);
  if (ax >= 1e6 || ax < 1e-4) {
    const s = x.toExponential(3);
    const [mant, exp] = s.split('e');
    return `${trimFixed(mant)}e${exp}`;
  }
  return trimFixed(x.toFixed(3));
}

export const sci = fmt;