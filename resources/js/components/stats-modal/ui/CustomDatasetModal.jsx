import React, { useMemo, useState } from 'react';
import Modal from '../../Modal';

function parseValues(input) {
  if (!input) return [];
  // Split by comma, whitespace, or newline; ignore empty tokens
  const toks = String(input).split(/[\s,]+/).map(t => t.trim()).filter(Boolean);
  const nums = toks.map((t) => Number(t.replace(/,/g, ''))).filter((n) => Number.isFinite(n));
  return nums;
}

function basicStats(values) {
  const xs = (values || []).map(Number).filter(Number.isFinite);
  const n = xs.length;
  if (!n) return { n: 0, mean: null, median: null, sd: null };
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  const sorted = xs.slice().sort((a, b) => a - b);
  const mid = Math.floor(n / 2);
  const median = n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const sd = n > 1 ? Math.sqrt(xs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1)) : 0;
  return { n, mean, median, sd };
}

export default function CustomDatasetModal({ open, onClose, onSave, initial = '' }) {
  const [text, setText] = useState(initial || '');
  const values = useMemo(() => parseValues(text), [text]);
  const stats = useMemo(() => basicStats(values), [values]);

  const tooMany = values.length > 5000;
  const tooFew = values.length < 2;

  const canSave = !tooMany && !tooFew && values.length >= 2;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={<span style={{ color: '#fff' }}>Custom Dataset</span>}
      ariaLabel="Custom dataset values dialog"
      width={720}
      style={{
        background: 'rgba(30, 60, 120, 0.65)',
        color: '#fff',
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.25)'
      }}
      footerStyle={{ background: 'transparent', borderTop: '1px solid rgba(255,255,255,0.18)', color: '#fff' }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            {stats.n ? `N: ${stats.n}` : 'N: 0'}
            {Number.isFinite(stats.mean) ? ` · Mean: ${stats.mean.toFixed(4)}` : ''}
            {Number.isFinite(stats.median) ? ` · Median: ${stats.median.toFixed(4)}` : ''}
            {Number.isFinite(stats.sd) ? ` · SD: ${stats.sd.toFixed(4)}` : ''}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="pill-btn" onClick={onClose}>Cancel</button>
            <button className="pill-btn liquid" disabled={!canSave} onClick={() => onSave(values)}>Save</button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13, color: '#f0f6fb' }}>Enter comma-separated or space/newline-separated numeric values. Units will depend on the parameter you select later.</div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g., 1.2, 3.4, 5.6, 7.8"
          rows={10}
          style={{ width: '100%', boxSizing: 'border-box', borderRadius: 6, padding: 10, resize: 'vertical', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
        />
        {tooFew && (
          <div style={{ color: '#ffb4b4', fontSize: 12 }}>Enter at least 2 numeric values.</div>
        )}
        {tooMany && (
          <div style={{ color: '#ffb4b4', fontSize: 12 }}>Value limit exceeded (max 5000). Please shorten the list.</div>
        )}
      </div>
    </Modal>
  );
}

