import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../../Modal';
import { FiChevronLeft, FiChevronRight, FiExternalLink, FiFileText } from 'react-icons/fi';

// Modal displaying attachments (images/PDFs) for a feedback item
export default function AttachmentsModal({ open, onClose, item }) {
  const [sel, setSel] = useState(0);

  const imgs = useMemo(() => {
    const base = Array.isArray(item?.images) ? item.images.filter(x => typeof x === 'string') : [];
    const files = Array.isArray(item?.metadata?.files) ? item.metadata.files : [];
    const fileUrls = files
      .map(f => (typeof f?.url === 'string' ? f.url : (typeof f?.path === 'string' ? f.path : null)))
      .filter(Boolean);
    const toCanonical = (raw) => {
      if (!raw || typeof raw !== 'string') return '';
      try { if (raw.startsWith('http')) { const url = new URL(raw); return url.pathname.replace(/^\//,''); } } catch {}
      return raw.replace(/^\//,'');
    };
    const combined = [...base, ...fileUrls];
    const seen = new Set();
    const out = [];
    for (const c of combined) {
      const key = toCanonical(c);
      if (!key || seen.has(key)) continue;
      seen.add(key); out.push(c);
    }
    return out;
  }, [item]);

  useEffect(() => { if (open) setSel(0); }, [open, item]);
  if (!open || !item) return null;

  const count = imgs.length;
  const getFileName = (src) => {
    try {
      const files = item?.metadata?.files;
      if (Array.isArray(files)) {
        const hit = files.find(f => typeof f?.path === 'string' && (src.endsWith(f.path) || f.path.endsWith(src) || src.includes(f.path)));
        if (hit?.original) return String(hit.original);
      }
    } catch {}
    const seg = (src || '').split('/').pop();
    return seg || 'file.pdf';
  };
  const getUrl = (src) => (src && typeof src === 'string' && src.startsWith('http') ? src : `/storage/${src || ''}`);
  const isPdfSrc = (src) => /\.pdf($|\?)/i.test(src || '');
  const currentSrc = imgs[sel] || '';
  const currentUrl = getUrl(currentSrc);
  const currentIsPdf = isPdfSrc(currentSrc);
  const goPrev = () => setSel((p) => (count === 0 ? 0 : (p - 1 + count) % count));
  const goNext = () => setSel((p) => (count === 0 ? 0 : (p + 1) % count));

  return (
    <Modal open={open} onClose={onClose} title={`Attachments for #${item.id}`} width={860} ariaLabel="Attachments dialog" bodyClassName="modern-scrollbar">
      {imgs.length === 0 ? <div className="muted">No attachments.</div> : (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ position: 'relative', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
            {!currentIsPdf ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 360 }}>
                <img src={currentUrl} alt={`Preview ${sel + 1}`} style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: 6 }} />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 360 }}>
                <iframe title={`PDF ${sel + 1}`} src={currentUrl} style={{ width: '100%', height: '60vh', border: 'none', background: '#fff', borderRadius: 6 }} />
              </div>
            )}
            {currentIsPdf && (
              <div className="muted" style={{ position: 'absolute', left: 12, bottom: 10, fontSize: 12, background: '#ffffffcc', padding: '2px 6px', borderRadius: 6, border: '1px solid #e5e7eb' }}>{getFileName(currentSrc)}</div>
            )}
            {count > 1 && (
              <>
                <button className="pill-btn ghost sm" onClick={goPrev} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} title="Previous"><FiChevronLeft /></button>
                <button className="pill-btn ghost sm" onClick={goNext} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }} title="Next"><FiChevronRight /></button>
              </>
            )}
            <a className="pill-btn ghost sm" href={currentUrl} target="_blank" rel="noreferrer" style={{ position: 'absolute', right: 8, bottom: 8 }} title="Open in new tab"><FiExternalLink /> Open</a>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {imgs.map((raw, idx) => {
              const src = raw && typeof raw === 'string' ? raw : '';
              const url = getUrl(src);
              const isPdf = isPdfSrc(src);
              const isActive = idx === sel;
              const commonStyle = { borderRadius: 6, border: isActive ? '2px solid #3b82f6' : '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' };
              return isPdf ? (
                <button key={idx} type="button" onClick={() => setSel(idx)} title={getFileName(src)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 8px', ...commonStyle }}>
                  <FiFileText /> <span style={{ fontSize: 12, maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getFileName(src)}</span>
                </button>
              ) : (
                <button key={idx} type="button" onClick={() => setSel(idx)} title={`Select image ${idx + 1}`} style={{ padding: 0, ...commonStyle }}>
                  <img src={url} alt={`Thumb ${idx + 1}`} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6 }} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
