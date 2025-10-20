export const fmtNumber = (v, digits = 2) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(digits);
};

export const sci = (num) => {
  const n = Number(num);
  if (!Number.isFinite(n)) return '';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs >= 0.001 && abs < 100000) return n.toString();
  return n.toExponential(3);
};
