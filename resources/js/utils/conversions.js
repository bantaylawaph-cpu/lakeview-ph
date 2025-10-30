// Numeric and unit conversion helpers used across the app.
// Keep string-based math to avoid floating-point rounding artifacts and preserve digits.

export const normalizeNumStr = (val) => {
  if (val == null) return '';
  let s = String(val).trim();
  // If JSON-like string (e.g., "[927.07]"), try to parse and pick first value
  if (s && (s[0] === '[' || s[0] === '{')) {
    try {
      const j = JSON.parse(s);
      if (Array.isArray(j)) s = String(j[0] ?? '');
      else if (j && typeof j === 'object') s = String(Object.values(j)[0] ?? '');
    } catch {}
  }
  // Remove thousands separators if any
  if (/^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
  s = s.trim();
  // Basic sanity: only digits, optional sign, one dot
  if (!/^[-+]?\d*(?:\.\d+)?$/.test(s)) return s;
  const sign = s.startsWith('-') || s.startsWith('+') ? s[0] : '';
  if (sign) s = s.slice(1);
  let [intPart, fracPart = ''] = s.split('.');
  intPart = intPart.replace(/^0+(?=\d)/, '');
  fracPart = fracPart.replace(/0+$/, '');
  const joined = fracPart ? `${intPart || '0'}.${fracPart}` : (intPart || '0');
  return sign + joined;
};

export const shiftDecimalStr = (str, places) => {
  // Shift decimal point by `places` (positive => right, negative => left)
  if (str == null || str === '') return '';
  let s = String(str);
  const sign = s.startsWith('-') ? '-' : (s.startsWith('+') ? '+' : '');
  if (sign) s = s.slice(1);
  if (!/^(?:\d+)(?:\.\d+)?$/.test(s)) return sign + s; // not a plain num
  let [i, f = ''] = s.split('.');
  const digits = i + f;
  const idx = i.length + places;
  let res;
  if (idx <= 0) {
    res = '0.' + '0'.repeat(Math.abs(idx)) + digits.replace(/^0+/, '');
    res = res.replace(/\.$/, '.0');
  } else if (idx >= digits.length) {
    res = digits + '0'.repeat(idx - digits.length);
  } else {
    res = digits.slice(0, idx) + '.' + digits.slice(idx);
  }
  return sign + normalizeNumStr(res);
};

export const ensureUnit = (text, unit) => {
  const t = String(text || '').trim();
  if (!t) return '';
  const lower = t.toLowerCase();
  if (unit === 'm') {
    if (/(^|\s)(m|meters?|metres?)\b/.test(lower)) return t; // already has meters
  }
  if (unit === 'km²') {
    if (/km\s?2|km²|square\s?kilometers?/.test(lower)) return t; // already has km²
  }
  if (unit === 'ha') {
    if (/\bha\b|hectares?/.test(lower)) return t; // already has ha
  }
  if (unit === 'm²') {
    if (/m\s?2|m²|square\s?meters?|square\s?metres?/.test(lower)) return t; // already has m²
  }
  return `${t} ${unit}`;
};

// Convenience converters
export const toKm2FromM2 = (m2) => shiftDecimalStr(normalizeNumStr(m2), -6);
export const toHaFromM2 = (m2) => shiftDecimalStr(normalizeNumStr(m2), -4);
export const toKm2FromHa = (ha) => shiftDecimalStr(normalizeNumStr(ha), -2);
export const toHaFromKm2 = (km2) => shiftDecimalStr(normalizeNumStr(km2), +2);
export const toKmFromM = (m) => shiftDecimalStr(normalizeNumStr(m), -3);
