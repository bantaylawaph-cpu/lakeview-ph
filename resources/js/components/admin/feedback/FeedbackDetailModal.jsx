import React, { useEffect, useState } from 'react';
import Modal from '../../Modal';
import { FiChevronLeft, FiChevronRight, FiExternalLink, FiFileText } from 'react-icons/fi';
import StatusPill from './StatusPill';
import { STATUS_ORDER, STATUS_LABEL } from './feedbackConstants';
import api from '../../../lib/api';
import { invalidateHttpCache } from '../../../lib/httpCache';

// Modal for viewing & moderating a single feedback item
export default function FeedbackDetailModal({ open, onClose, item, onSave }) {
  const [status, setStatus] = useState(item?.status || 'open');
  const [adminResponse, setAdminResponse] = useState(item?.admin_response || '');
  const [saving, setSaving] = useState(false);
  const [sel, setSel] = useState(0);

  useEffect(() => {
    if (open) {
      setStatus(item?.status || 'open');
      setAdminResponse(item?.admin_response || '');
      setSel(0);
    }
  }, [open, item]);

  if (!open || !item) return null;

  const imgs = Array.isArray(item.images) ? item.images : [];
  const count = imgs.length;
  const getUrl = (src) => (src && typeof src === 'string' && src.startsWith('http') ? src : `/storage/${src || ''}`);
  const isPdfSrc = (src) => /\.pdf($|\?)/i.test(src || '');
  const currentSrc = imgs[sel] || '';
  const currentUrl = getUrl(currentSrc);
  const currentIsPdf = isPdfSrc(currentSrc);
  const goPrev = () => setSel((p) => (count === 0 ? 0 : (p - 1 + count) % count));
  const goNext = () => setSel((p) => (count === 0 ? 0 : (p + 1) % count));
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch(`/admin/feedback/${item.id}`, { status, admin_response: adminResponse });
      try { invalidateHttpCache('/admin/feedback'); } catch {}
      onSave?.(res?.data?.data || res?.data || res);
      onClose?.();
    } catch {
      // swallow errors
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Feedback #${item.id}`}
      width={980}
      ariaLabel="Feedback detail dialog"
      bodyClassName="feedback-detail-body modern-scrollbar"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
        {/* Left: content + preview */}
        <div className="lv-settings-panel" style={{ gap: 14 }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{item.title}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Status:</span> <StatusPill status={status} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Category:</span> {item.category ? <span className="feedback-category-badge">{item.category}</span> : <span style={{ fontSize: 12 }}>—</span>}
            </div>
            {item.lake?.name && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Lake:</span> <span>{item.lake.name}</span>
              </div>
            )}
            <div style={{ fontSize: 11, color: '#64748b' }}>Submitted: {new Date(item.created_at).toLocaleString()}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Message:</div>
            <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{item.message}</div>
          </div>

          {imgs.length > 0 && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>Attachments</div>
              <div style={{ position: 'relative', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
                {!currentIsPdf ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
                    <img src={currentUrl} alt={`Preview ${sel + 1}`} style={{ maxWidth: '100%', maxHeight: '50vh', objectFit: 'contain', borderRadius: 6 }} />
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 320 }}>
                    <iframe title={`PDF ${sel + 1}`} src={currentUrl} style={{ width: '100%', height: '50vh', border: 'none', background: '#fff', borderRadius: 6 }} />
                  </div>
                )}
                {currentIsPdf && (
                  <div className="muted" style={{ position: 'absolute', left: 12, bottom: 10, fontSize: 12, background: '#ffffffcc', padding: '2px 6px', borderRadius: 6, border: '1px solid #e5e7eb' }}>
                    {getFileName(currentSrc)}
                  </div>
                )}
                {count > 1 && (
                  <>
                    <button className="pill-btn ghost sm" onClick={goPrev} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} title="Previous">
                      <FiChevronLeft />
                    </button>
                    <button className="pill-btn ghost sm" onClick={goNext} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }} title="Next">
                      <FiChevronRight />
                    </button>
                  </>
                )}
                <a className="pill-btn ghost sm" href={currentUrl} target="_blank" rel="noreferrer" style={{ position: 'absolute', right: 8, bottom: 8 }} title="Open in new tab">
                  <FiExternalLink /> Open
                </a>
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
                      <FiFileText /> <span style={{ fontSize: 12, maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getFileName(src)}</span>
                    </button>
                  ) : (
                    <button key={idx} type="button" onClick={() => setSel(idx)} title={`Select image ${idx + 1}`} style={{ padding: 0, ...commonStyle }}>
                      <img src={url} alt={`Thumb ${idx + 1}`} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: moderation */}
        <div className="lv-settings-panel" style={{ gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>Moderation</h3>
          <div className="lv-field-row">
            <label htmlFor="fb-detail-status">Status</label>
            <select
              id="fb-detail-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 10px', background: '#fff', fontSize: 14, height: 32 }}
            >
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div className="lv-field-row">
            <label htmlFor="fb-detail-response">Admin Response</label>
            <textarea
              id="fb-detail-response"
              value={adminResponse}
              onChange={(e) => setAdminResponse(e.target.value)}
              rows={8}
              maxLength={4000}
              placeholder="Provide context, resolution notes, or rationale."
              style={{ resize: 'vertical', border: '1px solid #d1d5db', borderRadius: 6, padding: '8px 10px', fontSize: 14, lineHeight: 1.4, background: '#fff' }}
            />
          </div>
          <div className="settings-actions" style={{ justifyContent: 'flex-end' }}>
            <button className="pill-btn ghost" type="button" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="btn-primary" type="button" disabled={saving} onClick={handleSave}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
